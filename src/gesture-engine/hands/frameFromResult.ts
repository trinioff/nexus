import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import type { HandFrame, Handedness } from "./GestureRecognizer";

/**
 * Converts a MediaPipe result into the plain frame the recogniser consumes. Shared by
 * the worker and the main-thread tracker. MediaPipe labels handedness assuming a
 * mirrored (selfie) image; the raw camera frame is not mirrored, so the labels are
 * swapped here.
 */
export function frameFromResult(result: HandLandmarkerResult, t: number): HandFrame | null {
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

function swapHandedness(label: string | undefined): Handedness | null {
  if (label === "Left") return "Right";
  if (label === "Right") return "Left";
  return null;
}
