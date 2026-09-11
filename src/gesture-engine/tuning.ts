/**
 * Hand-tracking and gesture thresholds. Everything the recogniser compares against
 * lives here under a name, so tuning on a real camera never means digging into the
 * detection logic. Units are stated on every value.
 *
 * Coordinates: MediaPipe landmarks are normalised to the video frame, x to the right
 * and y down, in [0, 1]. Palm speeds are in frame widths per second. The cursor is in
 * NDC (x right, y up, screen width is 2). "Hand units" are distances divided by the
 * hand's own scale (wrist to middle-finger knuckle), which makes a threshold
 * independent of how far the hand is from the camera.
 */

export const tracking = {
  /** Served from public/vision by scripts/fetch-vision-assets.mjs. No CDN. */
  wasmBasePath: "/vision/wasm",
  modelAssetPath: "/vision/models/hand_landmarker.task",
  numHands: 1,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  /** Requested camera format. Lower resolution keeps detection cheap. */
  video: { width: 640, height: 480, frameRate: 30 },
  /** Consecutive frames without a hand before it is reported gone. */
  lostFrames: 6,
  /** Run inference in a Web Worker when the browser allows it, so detection never stalls rendering. */
  preferWorker: true,
  /**
   * How long building the GPU landmarker may take, in milliseconds, before the CPU one
   * is built instead. Guards against a WebGL context that never comes up in a worker.
   */
  gpuInitTimeoutMs: 10000,
  /** How long the worker may take to load the runtime and the model before the main thread takes over, in ms. */
  workerReadyTimeoutMs: 30000,
  /** Once active, how long the worker may go without producing a result before the main thread takes over, in ms. */
  firstResultTimeoutMs: 8000,
} as const;

export type TrackingOptions = typeof tracking;

export const cursor = {
  /** Mirror the camera horizontally so the cursor follows the hand like a mirror would. */
  mirror: true,
  /** Amplifies palm movement around the frame centre so a comfortable hand range covers the screen. */
  gain: 1.5,
  /**
   * One Euro filter on the cursor, applied per axis in NDC. minCutoff (Hz) is how much
   * slow jitter is removed: lower is steadier at rest but laggier. beta (per NDC unit
   * per second of cursor speed) raises the cutoff as the hand speeds up, so fast moves
   * come through with little lag. derivativeCutoff (Hz) smooths the speed estimate.
   */
  filter: { minCutoff: 1.2, beta: 2.5, derivativeCutoff: 1.0 },
} as const;

export const fingers = {
  /** A finger is extended when its tip is this many times farther from the wrist than its PIP joint. */
  extendedRatio: 1.15,
  /** Extended fingers (index to pinky) needed for an "open" hand. */
  openMin: 4,
  /** At most this many extended fingers (index to pinky) for a "closed" hand. */
  closedMax: 1,
} as const;

export const pinch = {
  /** Thumb-tip to index-tip distance, in hand units, below which a pinch begins. */
  closeRatio: 0.45,
  /** Distance above which a pinch ends. Hysteresis: keep it above closeRatio. */
  openRatio: 0.62,
  /** Consecutive frames the distance must satisfy the threshold before the state flips. */
  confirmFrames: 2,
  /** Cursor travel, in NDC units, a pinch may drift before releasing it no longer counts as a tap. */
  tapMaxTravel: 0.08,
} as const;

/** An open hand moving sideways carries the ring with it; stopping or closing releases it. */
export const sweep = {
  /** Cursor travel, in NDC units, an open hand must cover before the ring starts following it. */
  engageTravel: 0.05,
  /** Palm speed, in frame widths per second, under which a sweep counts as stopped. */
  releaseSpeed: 0.12,
  /** How long the hand must stay stopped before the ring is released to snap, in milliseconds. */
  releaseMs: 220,
  /** Carousel slots moved by a sweep across the full screen width. */
  slotsPerScreenWidth: 3,
} as const;

export const palmStill = {
  /** Palm speed, in frame widths per second, under which the open hand counts as still. */
  maxSpeed: 0.1,
  /** Speed above which a frozen scene is released. Hysteresis: keep it above maxSpeed. */
  releaseSpeed: 0.25,
  /** How long the open palm must stay still before the scene freezes, in milliseconds. */
  holdMs: 500,
  /** Window over which palm speed is averaged, in milliseconds. */
  windowMs: 120,
} as const;
