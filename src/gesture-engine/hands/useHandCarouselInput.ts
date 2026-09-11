"use client";

import { useEffect, useRef } from "react";
import { useCarouselStore } from "@/stores/carouselStore";
import { useHandStore } from "@/stores/handStore";
import { useSceneStore } from "@/stores/sceneStore";
import type { CarouselController } from "../CarouselController";
import { pinch, tracking } from "../tuning";
import { CameraError, openCamera, stopStream } from "./camera";
import { GestureRecognizer, type HandFrame } from "./GestureRecognizer";
import { HandCarouselMapper } from "./HandCarouselMapper";
import { HandTracker } from "./HandTracker";

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

/**
 * Hand-tracking input source for the carousel. Opens the camera, loads the tracker
 * on demand, and runs detect → recognise → map every video frame. Status and the
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
      dragThreshold: pinch.dragThreshold,
    });

    let frames = 0;
    let fpsSince = 0;
    let fps = 0;

    const stop = () => {
      if (video) {
        if (usingFrameCallback) video.cancelVideoFrameCallback?.(frameHandle);
        else cancelAnimationFrame(frameHandle);
        video.srcObject = null;
      }
      tracker?.close();
      tracker = null;
      stopStream(stream);
      stream = null;
    };

    const tick = (now: number) => {
      if (cancelled || !video || !tracker) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        let frame: HandFrame | null = null;
        try {
          frame = tracker.detect(video, now);
        } catch (error) {
          handStore.setStatus("error", `Hand tracking failed: ${error instanceof Error ? error.message : String(error)}`);
          mapper.dispose();
          stop();
          return;
        }
        const { snapshot, events } = recognizer.update(frame, now);
        mapper.apply(snapshot, events);

        frames += 1;
        if (fpsSince === 0) fpsSince = now;
        const elapsed = now - fpsSince;
        if (elapsed >= 1000) {
          fps = Math.round((frames * 1000) / elapsed);
          frames = 0;
          fpsSince = now;
        }
        handStore.publish(snapshot, events, fps);
      }
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

      video = document.createElement("video") as VideoWithFrameCallback;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // A muted stream may still deliver frames; detection waits on readyState.
      }

      try {
        tracker = await HandTracker.create();
      } catch (error) {
        if (!cancelled) {
          handStore.setStatus(
            "unavailable",
            `Hand tracking could not start (${error instanceof Error ? error.message : String(error)}). Check that public/vision holds the wasm files and the model.`,
          );
        }
        return stop();
      }
      if (cancelled) return stop();

      handStore.setStatus("active", null);
      usingFrameCallback = typeof video.requestVideoFrameCallback === "function";
      schedule();
    })();

    return () => {
      cancelled = true;
      mapper.dispose();
      stop();
      useHandStore.getState().setStatus("off", null);
    };
  }, [retryToken]);
}
