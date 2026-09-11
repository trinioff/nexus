/**
 * Geometry over MediaPipe's 21 hand landmarks. Pure functions, no state. Distances
 * are measured in the normalised frame plane (x, y); the model's z is too noisy to
 * gate gestures on.
 */

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export const LANDMARK = {
  wrist: 0,
  thumbCmc: 1,
  thumbMcp: 2,
  thumbIp: 3,
  thumbTip: 4,
  indexMcp: 5,
  indexPip: 6,
  indexDip: 7,
  indexTip: 8,
  middleMcp: 9,
  middlePip: 10,
  middleDip: 11,
  middleTip: 12,
  ringMcp: 13,
  ringPip: 14,
  ringDip: 15,
  ringTip: 16,
  pinkyMcp: 17,
  pinkyPip: 18,
  pinkyDip: 19,
  pinkyTip: 20,
} as const;

/** Tip landmark of each finger, thumb first. */
export const FINGERTIPS = [
  LANDMARK.thumbTip,
  LANDMARK.indexTip,
  LANDMARK.middleTip,
  LANDMARK.ringTip,
  LANDMARK.pinkyTip,
] as const;

const PALM_POINTS = [LANDMARK.wrist, LANDMARK.indexMcp, LANDMARK.middleMcp, LANDMARK.ringMcp, LANDMARK.pinkyMcp];

/** Fingers index to pinky as [pip, tip] landmark pairs. */
const FINGER_JOINTS: ReadonlyArray<readonly [number, number]> = [
  [LANDMARK.indexPip, LANDMARK.indexTip],
  [LANDMARK.middlePip, LANDMARK.middleTip],
  [LANDMARK.ringPip, LANDMARK.ringTip],
  [LANDMARK.pinkyPip, LANDMARK.pinkyTip],
];

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Wrist to middle-finger knuckle: the hand's own size in the frame. */
export function handScale(landmarks: readonly Point[]): number {
  return Math.max(distance(landmarks[LANDMARK.wrist], landmarks[LANDMARK.middleMcp]), 1e-4);
}

/** Centre of the palm: mean of the wrist and the four finger knuckles. */
export function palmCenter(landmarks: readonly Point[]): Vec2 {
  let x = 0;
  let y = 0;
  for (const index of PALM_POINTS) {
    x += landmarks[index].x;
    y += landmarks[index].y;
  }
  return { x: x / PALM_POINTS.length, y: y / PALM_POINTS.length };
}

/** Thumb-tip to index-tip distance in hand units. */
export function pinchRatio(landmarks: readonly Point[]): number {
  return distance(landmarks[LANDMARK.thumbTip], landmarks[LANDMARK.indexTip]) / handScale(landmarks);
}

/**
 * Which of the five fingers are extended, thumb first. A finger is extended when its
 * tip is clearly farther from the wrist than its middle joint; the thumb is measured
 * against the pinky knuckle instead, since it folds across the palm.
 */
export function extendedFingers(landmarks: readonly Point[], extendedRatio: number): boolean[] {
  const wrist = landmarks[LANDMARK.wrist];
  const pinkyMcp = landmarks[LANDMARK.pinkyMcp];
  const thumb =
    distance(landmarks[LANDMARK.thumbTip], pinkyMcp) > distance(landmarks[LANDMARK.thumbIp], pinkyMcp) * extendedRatio;
  const others = FINGER_JOINTS.map(([pip, tip]) => distance(landmarks[tip], wrist) > distance(landmarks[pip], wrist) * extendedRatio);
  return [thumb, ...others];
}

export type Openness = "open" | "closed" | "neutral";

/** Open, closed or neither, from the count of extended fingers index to pinky. */
export function classifyOpenness(extended: readonly boolean[], openMin: number, closedMax: number): Openness {
  const count = extended.slice(1).filter(Boolean).length;
  if (count >= openMin) return "open";
  if (count <= closedMax) return "closed";
  return "neutral";
}

/**
 * Maps a normalised frame point to normalised device coordinates (x right, y up,
 * both in [-1, 1]), optionally mirrored, with movement around the centre amplified
 * by `gain` and the result clamped to the screen.
 */
export function toNdc(point: Vec2, mirror: boolean, gain: number): Vec2 {
  const fx = mirror ? 1 - point.x : point.x;
  return {
    x: clamp((fx - 0.5) * 2 * gain, -1, 1),
    y: clamp((0.5 - point.y) * 2 * gain, -1, 1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
