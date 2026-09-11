import type { Handedness, HandFrame } from "./GestureRecognizer";
import type { Point } from "./landmarks";

export interface HandShape {
  /** Palm centre in normalised frame coordinates, before mirroring. */
  palm: { x: number; y: number };
  /** Thumb-tip to index-tip distance in hand units. */
  pinchRatio?: number;
  /** Fingers index to pinky extended (true) or curled (false). */
  open?: boolean;
  handedness?: Handedness;
}

/**
 * Builds a synthetic upright hand with a wrist-to-knuckle scale of 0.1 frame units,
 * fingers straight up when open and curled back toward the wrist when not, and the
 * thumb tip placed at the requested pinch distance from the index tip.
 */
export function makeHand({ palm, pinchRatio = 0.9, open = true, handedness = "Right" }: HandShape, t: number): HandFrame {
  const scale = 0.1;
  const { x, y } = palm;
  const wrist: Point = { x, y: y + 0.05, z: 0 };
  const knuckles: Point[] = [
    { x: x - 0.04, y: y - 0.05, z: 0 }, // index
    { x: x - 0.01, y: y - 0.05, z: 0 }, // middle
    { x: x + 0.02, y: y - 0.05, z: 0 }, // ring
    { x: x + 0.05, y: y - 0.04, z: 0 }, // pinky
  ];
  const finger = (mcp: Point): Point[] => [
    mcp,
    { x: mcp.x, y: mcp.y - 0.03, z: 0 },
    { x: mcp.x, y: mcp.y - (open ? 0.06 : 0.02), z: 0 },
    { x: mcp.x, y: mcp.y - (open ? 0.09 : -0.01), z: 0 },
  ];
  const [index, middle, ring, pinky] = knuckles.map(finger);
  const indexTip = index[3];
  const thumb: Point[] = [
    { x: x - 0.05, y: y + 0.02, z: 0 },
    { x: x - 0.07, y: y - 0.01, z: 0 },
    { x: x - 0.08, y: y - 0.04, z: 0 },
    { x: indexTip.x - pinchRatio * scale, y: indexTip.y, z: 0 },
  ];
  return {
    landmarks: [wrist, ...thumb, ...index, ...middle, ...ring, ...pinky],
    handedness,
    score: 0.95,
    t,
  };
}
