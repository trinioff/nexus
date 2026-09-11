import { describe, expect, it } from "vitest";
import { GestureRecognizer, type GestureEvent } from "./GestureRecognizer";
import { makeHand } from "./testHand";
import { palmStill, pinch, swipe, tracking } from "../tuning";

const FRAME_MS = 33;

function types(events: GestureEvent[]) {
  return events.map((e) => e.type);
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
    const b = recognizer.update(makeHand({ palm: { x: 0.4, y: 0.5 } }, 1000), 1000).snapshot.cursor.x;
    expect(b).toBeLessThan(a);
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

    // Between the two thresholds the pinch holds (hysteresis) and reports moves.
    const held = step((pinch.closeRatio + pinch.openRatio) / 2);
    expect(held.snapshot.pinching).toBe(true);
    expect(types(held.events)).toContain("pinchMove");

    let ended = step(pinch.openRatio + 0.1);
    for (let i = 1; i < pinch.confirmFrames; i++) ended = step(pinch.openRatio + 0.1);
    expect(types(ended.events)).toContain("pinchEnd");
    expect(ended.snapshot.pinching).toBe(false);
  });

  it("detects a fast horizontal palm travel as a swipe in screen direction", () => {
    const recognizer = new GestureRecognizer();
    const found: GestureEvent[] = [];
    // Frame x decreasing = hand moving left in the camera image = right on the mirrored screen.
    for (let i = 0; i < 6; i++) {
      const t = i * FRAME_MS;
      found.push(...recognizer.update(makeHand({ palm: { x: 0.6 - i * 0.06, y: 0.5 } }, t), t).events);
    }
    const swipes = found.filter((e) => e.type === "swipe");
    expect(swipes).toHaveLength(1);
    expect(swipes[0]).toMatchObject({ direction: "right" });
    expect((swipes[0] as { speed: number }).speed).toBeGreaterThanOrEqual(swipe.minSpeed);
  });

  it("never swipes while pinching", () => {
    const recognizer = new GestureRecognizer();
    const found: GestureEvent[] = [];
    for (let i = 0; i < 8; i++) {
      const t = i * FRAME_MS;
      found.push(...recognizer.update(makeHand({ palm: { x: 0.6 - i * 0.06, y: 0.5 }, pinchRatio: 0.2 }, t), t).events);
    }
    expect(types(found)).not.toContain("swipe");
    expect(types(found)).toContain("pinchStart");
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
