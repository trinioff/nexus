"use client";

import { useEffect, useRef } from "react";
import { useCarouselStore } from "@/stores/carouselStore";
import { useHandStore } from "@/stores/handStore";
import { useSceneStore } from "@/stores/sceneStore";
import type { CarouselController } from "../CarouselController";
import { pinch, tracking } from "../tuning";
import { resolveTrackingOptions } from "./overrides";
import { CameraError, openCamera, stopStream } from "./camera";
import { GestureRecognizer } from "./GestureRecognizer";
import { HandCarouselMapper } from "./HandCarouselMapper";
import { createHandTracker, type HandTracker } from "./HandTracker";

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

/**
 * Hand-tracking input source for the carousel. Opens the camera, starts a tracker
 * (worker when possible), and runs recognise → map on every result. Status and the
 * hand snapshot go to the hand store; gestures go to the controller. Any failure
 * (permission denied, no camera, tracker unavailable) is reported through the store
 * and leaves the mouse fully in charge. Re-runs when the store's retry token changes.
 */
export function useHandCarouselInput(
  controller: CarouselController,
  hitTest: (x: number, y: number) => string | null,
  radiansPerNdc: number,
) {
  const retryToken = useHandStore((s) => s.retryToken);
  const latest = useRef({ controller, hitTest, radiansPerNdc });
  latest.current = { controller, hitTest, radiansPerNdc };

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let tracker: HandTracker | null = null;
    let video: VideoWithFrameCallback | null = null;
    let frameHandle = 0;
    let usingFrameCallback = false;

    const handStore = useHandStore.getState();
    const recognizer = new GestureRecognizer();
    const mapper = new HandCarouselMapper({
      controller: {
        dragStart: (id) => latest.current.controller.dragStart(id),
        dragMove: (delta) => latest.current.controller.dragMove(delta),
        dragEnd: (velocity) => latest.current.controller.dragEnd(velocity),
        tap: (id) => latest.current.controller.tap(id),
        dismiss: () => latest.current.controller.dismiss(),
        rotate: (steps) => latest.current.controller.rotate(steps),
      },
      hitTest: (x, y) => latest.current.hitTest(x, y),
      setHovered: (id) => useCarouselStore.getState().setHovered(id),
      setFrozen: (frozen) => useSceneStore.getState().setFrozen(frozen),
      radiansPerNdc: latest.current.radiansPerNdc,
      tapMaxTravel: pinch.tapMaxTravel,
    });

    let frames = 0;
    let fpsSince = 0;
    let fps = 0;
    let lastResultAt = 0;
    let watchdog = 0;

    const stop = (keepStream = false) => {
      clearTimeout(watchdog);
      if (video) {
        if (usingFrameCallback) video.cancelVideoFrameCallback?.(frameHandle);
        else cancelAnimationFrame(frameHandle);
        video.srcObject = null;
        video = null;
      }
      tracker?.close();
      tracker = null;
      if (!keepStream) {
        stopStream(stream);
        stream = null;
      }
    };

    const onFrame: Parameters<typeof createHandTracker>[1]["onFrame"] = (frame, t) => {
      if (cancelled) return;
      lastResultAt = performance.now();
      const { snapshot, events } = recognizer.update(frame, t);
      mapper.apply(snapshot, events);

      frames += 1;
      if (fpsSince === 0) fpsSince = t;
      const elapsed = t - fpsSince;
      if (elapsed >= 1000) {
        fps = Math.round((frames * 1000) / elapsed);
        frames = 0;
        fpsSince = t;
      }
      handStore.publish(snapshot, events, fps);
    };

    const onError = (message: string) => {
      if (cancelled) return;
      handStore.setStatus("error", `Hand tracking failed: ${message}`);
      mapper.dispose();
      stop();
    };

    const tick = (now: number) => {
      if (cancelled || !video || !tracker) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) tracker.submit(video, now);
      schedule();
    };

    const schedule = () => {
      if (!video) return;
      if (usingFrameCallback && video.requestVideoFrameCallback) {
        frameHandle = video.requestVideoFrameCallback((now) => tick(now));
      } else {
        frameHandle = requestAnimationFrame(tick);
      }
    };

    const callbacks = {
      onFrame,
      onError,
      onProgress: (stage: string) => {
        if (cancelled) return;
        handStore.setStage(stage);
        if (useHandStore.getState().status === "starting") handStore.setStatus("starting", stage);
      },
    };

    /** Starts the tracker and its frame loop; `options` decides worker or main thread. */
    const start = async (options: ReturnType<typeof resolveTrackingOptions>): Promise<boolean> => {
      if (!stream) return false;
      try {
        tracker = await createHandTracker(stream, callbacks, options);
      } catch (error) {
        if (!cancelled) {
          handStore.setStatus(
            "unavailable",
            `Hand tracking could not start (${error instanceof Error ? error.message : String(error)}). Check that public/vision holds the wasm files and the model.`,
          );
        }
        stop();
        return false;
      }
      if (cancelled) {
        stop();
        return false;
      }

      handStore.setStatus("active", null, { mode: tracker.mode, delegate: tracker.delegate, source: tracker.source });
      lastResultAt = performance.now();

      if (!tracker.selfDriven) {
        video = document.createElement("video") as VideoWithFrameCallback;
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          // A muted stream may still deliver frames; submission waits on readyState.
        }
        if (cancelled) {
          stop();
          return false;
        }
        usingFrameCallback = typeof video.requestVideoFrameCallback === "function";
        schedule();
      }

      // A worker that went quiet (a blocked thread, a stream that never delivers) is
      // replaced by main-thread detection rather than left as a silent, active tracker.
      if (tracker.mode === "worker") {
        const worker = tracker;
        watchdog = window.setTimeout(() => {
          if (cancelled || tracker !== worker) return;
          if (performance.now() - lastResultAt < options.firstResultTimeoutMs) return;
          console.warn("[nexus] hand-tracking worker produced no result; detecting on the main thread instead.");
          handStore.setStage("worker silent, switching to main thread");
          mapper.dispose();
          stop(true);
          void start({ ...options, preferWorker: false });
        }, options.firstResultTimeoutMs + 250);
      }
      return true;
    };

    (async () => {
      handStore.setStatus("starting", null);
      try {
        stream = await openCamera(tracking.video);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof CameraError) handStore.setStatus(error.kind, error.message);
        else handStore.setStatus("error", error instanceof Error ? error.message : "Camera could not be opened.");
        return;
      }
      if (cancelled) return stop();
      await start(resolveTrackingOptions());
    })();

    return () => {
      cancelled = true;
      mapper.dispose();
      stop();
      useHandStore.getState().setStatus("off", null);
    };
  }, [retryToken]);
}
