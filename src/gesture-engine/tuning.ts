/**
 * Hand-tracking and gesture thresholds. Everything the recogniser compares against
 * lives here under a name, so tuning on a real camera never means digging into the
 * detection logic. Units are stated on every value.
 *
 * Coordinates: MediaPipe landmarks are normalised to the video frame, x to the right
 * and y down, in [0, 1]. Speeds below are in frame widths per second. "Hand units"
 * are distances divided by the hand's own scale (wrist to middle-finger knuckle), which
 * makes a threshold independent of how far the hand is from the camera.
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
} as const;

export const cursor = {
  /** Mirror the camera horizontally so the cursor follows the hand like a mirror would. */
  mirror: true,
  /** Amplifies palm movement around the frame centre so a comfortable hand range covers the screen. */
  gain: 1.5,
  /** Exponential smoothing time constant of the on-screen cursor, in seconds. */
  smoothingSeconds: 0.06,
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
  /** Cursor travel, in NDC units (screen width is 2), before a pinch becomes a drag rather than a tap. */
  dragThreshold: 0.03,
  /** Carousel slots moved by a pinch-drag across the full screen width. */
  slotsPerScreenWidth: 4,
} as const;

export const swipe = {
  /** Horizontal palm speed, in frame widths per second, that qualifies as a swipe. */
  minSpeed: 1.6,
  /** Horizontal palm travel over the window, in frame widths, that qualifies. */
  minDistance: 0.12,
  /** Window over which speed and travel are measured, in milliseconds. */
  windowMs: 180,
  /** Vertical travel must stay below this fraction of the horizontal travel. */
  maxVerticalRatio: 0.6,
  /** Minimum time between two swipes, in milliseconds. */
  cooldownMs: 650,
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
