import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { tracking } from "../tuning";
import type { HandFrame, Handedness } from "./GestureRecognizer";

export type Delegate = "GPU" | "CPU";

/**
 * Thin wrapper over MediaPipe's HandLandmarker in video mode. The library is imported
 * on demand so it never lands in the main bundle, and the wasm and model come from
 * this app's own public/vision folder. GPU delegate first, CPU if the GPU one cannot
 * be created.
 */
export class HandTracker {
  private lastTimestamp = -1;

  private constructor(
    private readonly landmarker: HandLandmarker,
    public readonly delegate: Delegate,
  ) {}

  static async create(options = tracking): Promise<HandTracker> {
    const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(options.wasmBasePath);
    const common = {
      runningMode: "VIDEO" as const,
      numHands: options.numHands,
      minHandDetectionConfidence: options.minHandDetectionConfidence,
      minHandPresenceConfidence: options.minHandPresenceConfidence,
      minTrackingConfidence: options.minTrackingConfidence,
    };
    const build = (delegate: Delegate) =>
      HandLandmarker.createFromOptions(fileset, {
        ...common,
        baseOptions: { modelAssetPath: options.modelAssetPath, delegate },
      });
    try {
      return new HandTracker(await build("GPU"), "GPU");
    } catch {
      return new HandTracker(await build("CPU"), "CPU");
    }
  }

  /** Runs detection on the current video frame. Returns null when no hand is found. */
  detect(video: HTMLVideoElement, timestampMs: number): HandFrame | null {
    // MediaPipe requires strictly increasing timestamps.
    const t = timestampMs <= this.lastTimestamp ? this.lastTimestamp + 1 : timestampMs;
    this.lastTimestamp = t;

    const result = this.landmarker.detectForVideo(video, t);
    const landmarks = result.landmarks[0];
    if (!landmarks) return null;

    const category = result.handedness[0]?.[0];
    return {
      landmarks: landmarks.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      handedness: swapHandedness(category?.categoryName),
      score: category?.score ?? 0,
      t,
    };
  }

  close() {
    this.landmarker.close();
  }
}

/**
 * MediaPipe labels handedness assuming a mirrored (selfie) image. The raw camera
 * frame given to the model is not mirrored, so the labels come out swapped.
 */
function swapHandedness(label: string | undefined): Handedness | null {
  if (label === "Left") return "Right";
  if (label === "Right") return "Left";
  return null;
}
