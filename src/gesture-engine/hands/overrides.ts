import { tracking, type TrackingOptions } from "../tuning";

/**
 * Query-string overrides for where detection runs, for comparing on a real machine
 * without editing tuning: `?hands=cpu` (worker, CPU delegate), `?hands=gpu` (worker,
 * GPU delegate), `?hands=main` (no worker, main thread); `&frames=bitmap` makes the
 * page post bitmaps to the worker instead of handing it the camera stream. Anything
 * else keeps the defaults.
 */
export interface ResolvedTracking extends Omit<TrackingOptions, "preferWorker"> {
  preferWorker: boolean;
  /** Force this delegate instead of trying GPU first. */
  forceDelegate: "GPU" | "CPU" | null;
  /** Hand the worker the camera stream when the browser supports it (else post bitmaps). */
  preferStream: boolean;
}

export function resolveTrackingOptions(search = typeof location === "undefined" ? "" : location.search): ResolvedTracking {
  const params = new URLSearchParams(search);
  const mode = params.get("hands");
  return {
    ...tracking,
    preferWorker: mode === "main" ? false : tracking.preferWorker,
    forceDelegate: mode === "cpu" ? "CPU" : mode === "gpu" ? "GPU" : null,
    preferStream: params.get("frames") !== "bitmap",
  };
}
