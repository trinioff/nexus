import type { Vector3 } from "three";
import { TAU } from "@/utils/math";

export function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** Angle of slot `index` on a ring of `count` slots. Slot 0 is the front. */
export function slotAngle(index: number, count: number): number {
  return (index / count) * TAU;
}

/**
 * World position on the ring for an angle. Angle 0 is the front of the ring (toward
 * -z, in front of the user); positive angles move to the right (+x).
 */
export function orbitPosition(angle: number, radius: number, y: number, out: Vector3): Vector3 {
  return out.set(Math.sin(angle) * radius, y, -Math.cos(angle) * radius);
}

/** Y rotation that points an object's +z face from (x, z) toward (towardX, towardZ). */
export function facingYaw(x: number, z: number, towardX: number, towardZ: number): number {
  return Math.atan2(towardX - x, towardZ - z);
}

/** Index of the slot currently nearest the front for a given ring rotation. */
export function nearestSlotIndex(ringAngle: number, count: number): number {
  const step = TAU / count;
  return mod(Math.round(-ringAngle / step), count);
}

/** Nearest ring rotation that puts some slot exactly at the front. */
export function snapAngle(ringAngle: number, count: number): number {
  const step = TAU / count;
  return Math.round(ringAngle / step) * step;
}

/** Ring rotation, nearest to `current`, that brings slot `index` to the front. */
export function ringAngleToFront(index: number, count: number, current: number): number {
  const desired = -slotAngle(index, count);
  const turns = Math.round((current - desired) / TAU);
  return desired + turns * TAU;
}

/** Interpolates between two angles along the shortest arc. */
export function lerpAngle(a: number, b: number, t: number): number {
  const delta = mod(b - a + Math.PI, TAU) - Math.PI;
  return a + delta * t;
}
