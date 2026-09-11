import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { type ResolvedTracking, resolveTrackingOptions } from "./overrides";
import { frameFromResult } from "./frameFromResult";
import type { HandFrame } from "./GestureRecognizer";
import type { Delegate, WorkerInbound, WorkerOutbound } from "./hand.worker";

export type { Delegate } from "./hand.worker";
export type TrackerMode = "worker" | "main";
/** How frames reach detection: pulled from the camera stream, posted as bitmaps, or read from the video element. */
export type FrameSource = "stream" | "bitmap" | "video";

export interface TrackerCallbacks {
  onFrame: (frame: HandFrame | null, t: number) => void;
  onError: (message: string) => void;
  /** Loading stages while the tracker starts, for the status readout. */
  onProgress?: (stage: string) => void;
}


/**
 * A source of hand frames. Results always arrive through `onFrame`, whether
 * detection ran synchronously on the main thread or asynchronously in a worker.
 */
export interface HandTracker {
  readonly mode: TrackerMode;
  readonly delegate: Delegate;
  readonly source: FrameSource;
  /** The tracker pulls camera frames itself; `submit` is not needed. */
  readonly selfDriven: boolean;
  /** Offer the current video frame. Ignored while a previous frame is still being processed. */
  submit: (video: HTMLVideoElement, t: number) => void;
  close: () => void;
}

/** Chromium-only: hands camera frames to the worker without touching the main thread. */
interface TrackProcessorLike {
  readable: ReadableStream<VideoFrame>;
}
type TrackProcessorCtor = new (init: { track: MediaStreamTrack }) => TrackProcessorLike;

function trackProcessor(): TrackProcessorCtor | null {
  const ctor = (globalThis as { MediaStreamTrackProcessor?: TrackProcessorCtor }).MediaStreamTrackProcessor;
  return typeof ctor === "function" ? ctor : null;
}

/**
 * Picks the best available tracker: a worker (frames pulled from the camera stream
 * where the browser allows, posted as bitmaps otherwise), falling back to detection
 * on the main thread when workers or OffscreenCanvas are missing.
 */
export async function createHandTracker(
  stream: MediaStream,
  callbacks: TrackerCallbacks,
  options: ResolvedTracking = resolveTrackingOptions(),
): Promise<HandTracker> {
  if (options.preferWorker && typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined") {
    try {
      return await WorkerHandTracker.create(stream, callbacks, options);
    } catch (error) {
      console.warn("[nexus] hand-tracking worker unavailable, detecting on the main thread instead:", error);
    }
  }
  return MainThreadHandTracker.create(callbacks, options);
}

class WorkerHandTracker implements HandTracker {
  readonly mode = "worker" as const;
  readonly source: FrameSource;
  private busy = false;
  private closed = false;

  private constructor(
    private readonly worker: Worker,
    readonly delegate: Delegate,
    readonly selfDriven: boolean,
    private readonly callbacks: TrackerCallbacks,
  ) {
    this.source = selfDriven ? "stream" : "bitmap";
    worker.onmessage = (event: MessageEvent<WorkerOutbound>) => {
      const message = event.data;
      if (message.type === "result") {
        this.busy = false;
        if (!this.closed) this.callbacks.onFrame(message.frame, message.t);
      } else if (message.type === "skipped") {
        this.busy = false;
      } else if (message.type === "progress") {
        if (!this.closed) this.callbacks.onProgress?.(message.stage);
      } else if (message.type === "error") {
        this.busy = false;
        if (!this.closed) this.callbacks.onError(message.message);
      }
    };
    worker.onerror = (event) => {
      if (!this.closed) this.callbacks.onError(event.message || "Hand-tracking worker crashed.");
    };
  }

  static async create(stream: MediaStream, callbacks: TrackerCallbacks, options: ResolvedTracking): Promise<WorkerHandTracker> {
    const worker = new Worker(new URL("./hand.worker.ts", import.meta.url));
    let lastStage = "starting";
    const delegate = await new Promise<Delegate>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`worker did not become ready within ${options.workerReadyTimeoutMs / 1000}s (last stage: ${lastStage})`)),
        options.workerReadyTimeoutMs,
      );
      worker.onmessage = (event: MessageEvent<WorkerOutbound>) => {
        const message = event.data;
        if (message.type === "progress") {
          lastStage = message.stage;
          callbacks.onProgress?.(message.stage);
        } else if (message.type === "ready") {
          clearTimeout(timer);
          resolve(message.delegate);
        } else if (message.type === "error") {
          clearTimeout(timer);
          reject(new Error(message.message));
        }
      };
      worker.onerror = (event) => {
        clearTimeout(timer);
        reject(new Error(event.message || "worker failed to start"));
      };
      const init: WorkerInbound = { type: "init", options };
      worker.postMessage(init);
    }).catch((error) => {
      worker.terminate();
      throw error;
    });

    const Processor = options.preferStream ? trackProcessor() : null;
    const track = stream.getVideoTracks()[0];
    let selfDriven = false;
    if (Processor && track) {
      try {
        const processor = new Processor({ track });
        const message: WorkerInbound = { type: "stream", readable: processor.readable };
        worker.postMessage(message, [processor.readable]);
        selfDriven = true;
      } catch (error) {
        console.warn("[nexus] camera stream could not be handed to the worker, posting bitmaps instead:", error);
      }
    }
    return new WorkerHandTracker(worker, delegate, selfDriven, callbacks);
  }

  submit(video: HTMLVideoElement, t: number) {
    if (this.selfDriven || this.busy || this.closed) return;
    this.busy = true;
    createImageBitmap(video)
      .then((bitmap) => {
        if (this.closed) {
          bitmap.close();
          this.busy = false;
          return;
        }
        const message: WorkerInbound = { type: "frame", bitmap, t };
        this.worker.postMessage(message, [bitmap]);
      })
      .catch(() => {
        this.busy = false;
      });
  }

  close() {
    this.closed = true;
    const message: WorkerInbound = { type: "close" };
    this.worker.postMessage(message);
    // Give the worker a moment to release the landmarker, then make sure it is gone.
    setTimeout(() => this.worker.terminate(), 250);
  }
}

class MainThreadHandTracker implements HandTracker {
  readonly mode = "main" as const;
  readonly source = "video" as const;
  readonly selfDriven = false;
  private lastTimestamp = -1;
  private closed = false;

  private constructor(
    private readonly landmarker: HandLandmarker,
    readonly delegate: Delegate,
    private readonly callbacks: TrackerCallbacks,
  ) {}

  static async create(callbacks: TrackerCallbacks, options: ResolvedTracking): Promise<MainThreadHandTracker> {
    callbacks.onProgress?.("loading library (main thread)");
    const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(options.wasmBasePath);
    callbacks.onProgress?.("loading model (main thread)");
    const build = (delegate: Delegate) =>
      HandLandmarker.createFromOptions(fileset, {
        runningMode: "VIDEO",
        numHands: options.numHands,
        minHandDetectionConfidence: options.minHandDetectionConfidence,
        minHandPresenceConfidence: options.minHandPresenceConfidence,
        minTrackingConfidence: options.minTrackingConfidence,
        baseOptions: { modelAssetPath: options.modelAssetPath, delegate },
      });
    if (options.forceDelegate === "CPU") return new MainThreadHandTracker(await build("CPU"), "CPU", callbacks);
    try {
      return new MainThreadHandTracker(await build("GPU"), "GPU", callbacks);
    } catch {
      return new MainThreadHandTracker(await build("CPU"), "CPU", callbacks);
    }
  }

  submit(video: HTMLVideoElement, requestedT: number) {
    if (this.closed) return;
    const t = requestedT <= this.lastTimestamp ? this.lastTimestamp + 1 : requestedT;
    this.lastTimestamp = t;
    try {
      const result = this.landmarker.detectForVideo(video, t);
      this.callbacks.onFrame(frameFromResult(result, t), t);
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error.message : String(error));
    }
  }

  close() {
    this.closed = true;
    this.landmarker.close();
  }
}
