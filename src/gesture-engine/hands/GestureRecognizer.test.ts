import { describe, expect, it } from "vitest";
import { GestureRecognizer, type GestureEvent } from "./GestureRecognizer";
import { makeHand } from "./testHand";
import { palmStill, pinch, sweep, tracking } from "../tuning";

const FRAME_MS = 33;

function types(events: GestureEvent[]) {
  return events.map((e) => e.type);
}

/** Feeds an open hand moving horizontally at `stepPerFrame` (frame units) for `frames` frames. */
function sweepRight(recognizer: GestureRecognizer, frames: number, stepPerFrame: number, startT = 0, startX = 0.7) {
  const found: GestureEvent[] = [];
  let t = startT;
  for (let i = 0; i < frames; i++) {
    // Frame x decreasing = hand moving left in the camera image = right on the mirrored screen.
    found.push(...recognizer.update(makeHand({ palm: { x: startX - i * stepPerFrame, y: 0.5 }, open: true }, t), t).events);
    t += FRAME_MS;
  }
  return { found, t };
}

describe("GestureRecognizer", () => {
  it("reports the hand, its openness and finger positions", () => {
    const recognizer = new GestureRecognizer();
    const { snapshot, events } = recognizer.update(makeHand({ palm: { x: 0.5, y: 0.5 }, open: true }, 0), 0);
    expect(types(events)).toEqual(["handFound"]);
    expect(snapshot.present).toBe(true);
    expect(snapshot.openness).toBe("open");
    expect(snapshot.extended.slice(1)).toEqual([true, true, true, true]);
    expect(snapshot.fingertips).toHaveLength(5);
    expect(snapshot.handedness).toBe("Right");

    const closed = recognizer.update(makeHand({ palm: { x: 0.5, y: 0.5 }, open: false }, FRAME_MS), FRAME_MS);
    expect(closed.snapshot.openness).toBe("closed");
  });

  it("mirrors the cursor so a hand moving right in the frame moves left on screen", () => {
    const recognizer = new GestureRecognizer();
    const a = recognizer.update(makeHand({ palm: { x: 0.3, y: 0.5 } }, 0), 0).snapshot.cursor.x;
    let b = a;
    for (let i = 1; i <= 10; i++) b = recognizer.update(makeHand({ palm: { x: 0.4, y: 0.5 } }, i * 100), i * 100).snapshot.cursor.x;
    expect(b).toBeLessThan(a);
  });

  it("filters the cursor: a tiny jitter barely moves it, a fast move follows closely", () => {
    const recognizer = new GestureRecognizer();
    let t = 0;
    const at = (x: number) => {
      const out = recognizer.update(makeHand({ palm: { x, y: 0.5 } }, t), t).snapshot.cursor.x;
      t += FRAME_MS;
      return out;
    };
    const rest = at(0.5);
    for (let i = 0; i < 10; i++) at(0.5);
    const jittered = at(0.503);
    expect(Math.abs(jittered - rest)).toBeLessThan(0.004);

    let moved = jittered;
    for (let i = 1; i <= 6; i++) moved = at(0.5 - i * 0.05);
    const target = ((1 - 0.2) - 0.5) * 2 * 1.5; // toNdc of x = 0.2 with the default mirror and gain
    expect(Math.abs(moved - target)).toBeLessThan(0.35);
  });

  it("starts a pinch after the confirmation frames and ends it past the open ratio", () => {
    const recognizer = new GestureRecognizer();
    let t = 0;
    const step = (ratio: number) => {
      const out = recognizer.update(makeHand({ palm: { x: 0.5, y: 0.5 }, pinchRatio: ratio }, t), t);
      t += FRAME_MS;
      return out;
    };
    step(0.9);
    step(0.9);
    const first = step(pinch.closeRatio - 0.1);
    expect(types(first.events)).not.toContain("pinchStart");
    let started = first;
    for (let i = 1; i < pinch.confirmFrames; i++) started = step(pinch.closeRatio - 0.1);
    expect(types(started.events)).toContain("pinchStart");
    expect(started.snapshot.pinching).toBe(true);

    const held = step((pinch.closeRatio + pinch.openRatio) / 2);
    expect(held.snapshot.pinching).toBe(true);
    expect(types(held.events)).toContain("pinchMove");

    let ended = step(pinch.openRatio + 0.1);
    for (let i = 1; i < pinch.confirmFrames; i++) ended = step(pinch.openRatio + 0.1);
    expect(types(ended.events)).toContain("pinchEnd");
    expect(ended.snapshot.pinching).toBe(false);
  });

  it("carries the ring with an open hand sweeping sideways, then releases it once the hand stops", () => {
    const recognizer = new GestureRecognizer();
    const { found, t } = sweepRight(recognizer, 8, 0.03);
    expect(types(found)).toContain("sweepStart");
    const moves = found.filter((e): e is Extract<GestureEvent, { type: "sweepMove" }> => e.type === "sweepMove");
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.delta.x > 0)).toBe(true);
    expect(recognizer.current.sweeping).toBe(true);

    // Hold still: once the palm speed (measured over its window) has dropped and the
    // stop tolerance has elapsed, the ring is released, well before the freeze hold.
    const stillEvents: GestureEvent[] = [];
    let now = t;
    const lastX = 0.7 - 7 * 0.03;
    while (now <= t + palmStill.windowMs + sweep.releaseMs + FRAME_MS * 3) {
      stillEvents.push(...recognizer.update(makeHand({ palm: { x: lastX, y: 0.5 }, open: true }, now), now).events);
      now += FRAME_MS;
    }
    expect(types(stillEvents)).toContain("sweepEnd");
    expect(types(stillEvents)).not.toContain("stillStart");
    expect(recognizer.current.sweeping).toBe(false);
  });

  it("does not sweep with a closed hand, and a pinch releases a sweep", () => {
    const recognizer = new GestureRecognizer();
    const closed: GestureEvent[] = [];
    for (let i = 0; i < 8; i++) {
      const t = i * FRAME_MS;
      closed.push(...recognizer.update(makeHand({ palm: { x: 0.7 - i * 0.03, y: 0.5 }, open: false }, t), t).events);
    }
    expect(types(closed)).not.toContain("sweepStart");

    const fresh = new GestureRecognizer();
    const { t } = sweepRight(fresh, 8, 0.03);
    expect(fresh.current.sweeping).toBe(true);
    const found: GestureEvent[] = [];
    let now = t;
    for (let i = 0; i <= pinch.confirmFrames; i++) {
      found.push(...fresh.update(makeHand({ palm: { x: 0.49 - i * 0.03, y: 0.5 }, pinchRatio: 0.2 }, now), now).events);
      now += FRAME_MS;
    }
    expect(types(found)).toContain("sweepEnd");
    expect(types(found)).toContain("pinchStart");
    expect(types(found).indexOf("sweepEnd")).toBeLessThan(types(found).indexOf("pinchStart"));
  });

  it("freezes after an open palm holds still and releases when it moves", () => {
    const recognizer = new GestureRecognizer();
    const found: GestureEvent[] = [];
    let t = 0;
    while (t <= palmStill.holdMs + FRAME_MS * 2) {
      found.push(...recognizer.update(makeHand({ palm: { x: 0.5, y: 0.5 }, open: true }, t), t).events);
      t += FRAME_MS;
    }
    expect(types(found)).toContain("stillStart");
    expect(types(found)).not.toContain("stillEnd");

    const moved = recognizer.update(makeHand({ palm: { x: 0.5 + 0.1, y: 0.5 }, open: true }, t), t);
    expect(types(moved.events)).toContain("stillEnd");
  });

  it("does not freeze a closed hand", () => {
    const recognizer = new GestureRecognizer();
    const found: GestureEvent[] = [];
    for (let t = 0; t <= palmStill.holdMs * 2; t += FRAME_MS) {
      found.push(...recognizer.update(makeHand({ palm: { x: 0.5, y: 0.5 }, open: false }, t), t).events);
    }
    expect(types(found)).not.toContain("stillStart");
  });

  it("reports the hand lost only after the dropout tolerance, ending any pinch", () => {
    const recognizer = new GestureRecognizer();
    let t = 0;
    for (let i = 0; i < pinch.confirmFrames + 1; i++) {
      recognizer.update(makeHand({ palm: { x: 0.5, y: 0.5 }, pinchRatio: 0.2 }, t), t);
      t += FRAME_MS;
    }
    expect(recognizer.current.pinching).toBe(true);

    const found: GestureEvent[] = [];
    for (let i = 0; i < tracking.lostFrames - 1; i++) {
      found.push(...recognizer.update(null, t).events);
      t += FRAME_MS;
    }
    expect(found).toEqual([]);
    expect(recognizer.current.present).toBe(true);

    const lost = recognizer.update(null, t);
    expect(types(lost.events)).toEqual(["pinchEnd", "handLost"]);
    expect(lost.snapshot.present).toBe(false);
  });
});
