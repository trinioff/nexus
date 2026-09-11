import type { HandLandmarker } from "@mediapipe/tasks-vision";
import type { ResolvedTracking } from "./overrides";
import { frameFromResult } from "./frameFromResult";
import type { HandFrame } from "./GestureRecognizer";

/**
 * Hand landmark detection off the main thread. Two ways to receive frames: a
 * transferred camera ReadableStream<VideoFrame> that the worker pulls from itself
 * (Chromium's MediaStreamTrackProcessor), or ImageBitmaps posted by the main thread.
 * Results are plain landmark arrays, so the rendering loop never waits on inference.
 *
 * Bundled as a classic worker on purpose: MediaPipe loads its wasm loader with
 * importScripts, which module workers do not have.
 */

export type Delegate = "GPU" | "CPU";

export type WorkerInbound =
  | { type: "init"; options: ResolvedTracking }
  | { type: "stream"; readable: ReadableStream<VideoFrame> }
  | { type: "frame"; bitmap: ImageBitmap; t: number }
  | { type: "close" };

export type WorkerOutbound =
  | { type: "progress"; stage: string }
  | { type: "ready"; delegate: Delegate }
  | { type: "skipped" }
  | { type: "result"; frame: HandFrame | null; t: number }
  | { type: "error"; message: string };

interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerInbound>) => void) | null;
  postMessage: (message: WorkerOutbound) => void;
  close: () => void;
}

const scope = self as unknown as WorkerScope;

let landmarker: HandLandmarker | null = null;
let lastTimestamp = -1;
let bitmapReported = false;

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function detect(source: ImageBitmap | VideoFrame, requestedT: number): { frame: HandFrame | null; t: number } {
  // MediaPipe requires strictly increasing timestamps.
  const t = requestedT <= lastTimestamp ? lastTimestamp + 1 : requestedT;
  lastTimestamp = t;
  const result = landmarker!.detectForVideo(source, t);
  return { frame: frameFromResult(result, t), t };
}

async function init(options: ResolvedTracking) {
  try {
    scope.postMessage({ type: "progress", stage: "loading library" });
    const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
    scope.postMessage({ type: "progress", stage: "loading runtime" });
    const fileset = await FilesetResolver.forVisionTasks(options.wasmBasePath);
    const build = (delegate: Delegate) =>
      HandLandmarker.createFromOptions(fileset, {
        runningMode: "VIDEO",
        numHands: options.numHands,
        minHandDetectionConfidence: options.minHandDetectionConfidence,
        minHandPresenceConfidence: options.minHandPresenceConfidence,
        minTrackingConfidence: options.minTrackingConfidence,
        baseOptions: { modelAssetPath: options.modelAssetPath, delegate },
      });
    let delegate: Delegate = options.forceDelegate ?? "GPU";
    if (delegate === "GPU") {
      try {
        scope.postMessage({ type: "progress", stage: "loading model (GPU)" });
        // A GPU context that fails asynchronously is bounded here; one that blocks the
        // thread is caught by the main thread's ready timeout instead.
        landmarker = await Promise.race([
          build("GPU"),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("GPU landmarker timed out")), options.gpuInitTimeoutMs)),
        ]);
      } catch {
        delegate = "CPU";
      }
    }
    if (delegate === "CPU") {
      scope.postMessage({ type: "progress", stage: "loading model (CPU)" });
      landmarker = await build("CPU");
    }
    scope.postMessage({ type: "ready", delegate });
  } catch (error) {
    scope.postMessage({ type: "error", message: describe(error) });
  }
}

/** Pulls camera frames straight from the stream; the processor drops stale frames for us. */
async function consume(readable: ReadableStream<VideoFrame>) {
  let reader: ReadableStreamDefaultReader<VideoFrame>;
  try {
    reader = readable.getReader();
  } catch (error) {
    scope.postMessage({ type: "error", message: `camera stream unreadable: ${describe(error)}` });
    return;
  }
  let first = true;
  let reported = false;
  for (;;) {
    let value: VideoFrame | undefined;
    let done = false;
    try {
      ({ value, done } = await reader.read());
    } catch (error) {
      scope.postMessage({ type: "error", message: `camera stream read failed: ${describe(error)}` });
      return;
    }
    if (done || !value) {
      scope.postMessage({ type: "error", message: "camera stream ended" });
      return;
    }
    if (first) {
      first = false;
      scope.postMessage({ type: "progress", stage: "first camera frame" });
    }
    if (!landmarker) {
      value.close();
      continue;
    }
    try {
      const started = performance.now();
      if (!reported) scope.postMessage({ type: "progress", stage: "detecting first frame" });
      const { frame, t } = detect(value, started);
      if (!reported) {
        reported = true;
        scope.postMessage({ type: "progress", stage: `first detection took ${Math.round(performance.now() - started)} ms` });
      }
      scope.postMessage({ type: "result", frame, t });
    } catch (error) {
      scope.postMessage({ type: "error", message: `detection failed: ${describe(error)}` });
      value.close();
      return;
    }
    value.close();
  }
}

// A rejection that escapes the handlers above would otherwise vanish silently.
(self as unknown as { addEventListener: (type: string, listener: (event: { reason?: unknown }) => void) => void }).addEventListener(
  "unhandledrejection",
  (event) => scope.postMessage({ type: "error", message: `worker rejection: ${describe(event.reason)}` }),
);

scope.onmessage = (event) => {
  const message = event.data;
  switch (message.type) {
    case "init":
      void init(message.options);
      break;
    case "stream":
      void consume(message.readable);
      break;
    case "frame": {
      if (!landmarker) {
        scope.postMessage({ type: "skipped" });
      } else {
        try {
          const started = performance.now();
          if (!bitmapReported) scope.postMessage({ type: "progress", stage: "detecting first frame" });
          const { frame, t } = detect(message.bitmap, message.t);
          if (!bitmapReported) {
            bitmapReported = true;
            scope.postMessage({ type: "progress", stage: `first detection took ${Math.round(performance.now() - started)} ms` });
          }
          scope.postMessage({ type: "result", frame, t });
        } catch (error) {
          scope.postMessage({ type: "error", message: describe(error) });
        }
      }
      message.bitmap.close();
      break;
    }
    case "close":
      landmarker?.close();
      landmarker = null;
      scope.close();
      break;
  }
};
