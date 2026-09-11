import { describe, expect, it } from "vitest";
import type { CarouselController } from "../CarouselController";
import { EMPTY_HAND, type GestureEvent, type HandSnapshot } from "./GestureRecognizer";
import { HandCarouselMapper } from "./HandCarouselMapper";

function harness(cardUnderCursor: string | null = "calendar") {
  const calls: string[] = [];
  const controller: CarouselController = {
    dragStart: (id) => calls.push(`dragStart:${id}`),
    dragMove: (delta) => calls.push(`dragMove:${delta.toFixed(3)}`),
    dragEnd: (v) => calls.push(`dragEnd:${v.toFixed(3)}`),
    tap: (id) => calls.push(`tap:${id}`),
    dismiss: () => calls.push("dismiss"),
    rotate: (steps) => calls.push(`rotate:${steps}`),
  };
  const hovered: (string | null)[] = [];
  const frozen: boolean[] = [];
  const mapper = new HandCarouselMapper({
    controller,
    hitTest: () => cardUnderCursor,
    setHovered: (id) => hovered.push(id),
    setFrozen: (f) => frozen.push(f),
    radiansPerNdc: 1,
    dragThreshold: 0.03,
  });
  const present: HandSnapshot = { ...EMPTY_HAND, present: true };
  const run = (events: GestureEvent[], snapshot = present) => mapper.apply(snapshot, events);
  return { mapper, calls, hovered, frozen, run, present };
}

describe("HandCarouselMapper", () => {
  it("treats a pinch released without travel as a tap on the card under the cursor", () => {
    const h = harness("calendar");
    h.run([{ type: "pinchStart", cursor: { x: 0, y: 0 } }]);
    h.run([{ type: "pinchMove", cursor: { x: 0.01, y: 0 }, delta: { x: 0.01, y: 0 } }]);
    h.run([{ type: "pinchEnd", cursor: { x: 0.01, y: 0 }, velocity: { x: 0, y: 0 } }]);
    expect(h.calls).toEqual(["tap:calendar"]);
  });

  it("turns a pinch that travels past the threshold into a ring drag with the card pressed", () => {
    const h = harness("news");
    h.run([{ type: "pinchStart", cursor: { x: 0, y: 0 } }]);
    h.run([{ type: "pinchMove", cursor: { x: 0.02, y: 0 }, delta: { x: 0.02, y: 0 } }]);
    expect(h.calls).toEqual([]);
    h.run([{ type: "pinchMove", cursor: { x: 0.05, y: 0 }, delta: { x: 0.03, y: 0 } }]);
    h.run([{ type: "pinchEnd", cursor: { x: 0.05, y: 0 }, velocity: { x: 0.5, y: 0 } }]);
    expect(h.calls).toEqual(["dragStart:news", "dragMove:0.030", "dragEnd:0.500"]);
  });

  it("taps empty space when nothing is under the cursor, which dismisses", () => {
    const h = harness(null);
    h.run([{ type: "pinchStart", cursor: { x: 0, y: 0 } }]);
    h.run([{ type: "pinchEnd", cursor: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } }]);
    expect(h.calls).toEqual(["tap:null"]);
  });

  it("rotates one slot in the swipe direction", () => {
    const h = harness();
    h.run([{ type: "swipe", direction: "right", speed: 2 }]);
    h.run([{ type: "swipe", direction: "left", speed: 2 }]);
    expect(h.calls).toEqual(["rotate:1", "rotate:-1"]);
  });

  it("freezes and releases ambient motion with the still palm", () => {
    const h = harness();
    h.run([{ type: "stillStart" }]);
    h.run([{ type: "stillEnd" }]);
    expect(h.frozen).toEqual([true, false]);
  });

  it("hovers the card under the cursor and clears it when the hand is gone", () => {
    const h = harness("music");
    h.run([]);
    h.run([]);
    h.run([{ type: "handLost" }], EMPTY_HAND);
    expect(h.hovered).toEqual(["music", null]);
  });

  it("releases a drag and a freeze on dispose", () => {
    const h = harness("ai");
    h.run([{ type: "pinchStart", cursor: { x: 0, y: 0 } }]);
    h.run([{ type: "pinchMove", cursor: { x: 0.1, y: 0 }, delta: { x: 0.1, y: 0 } }]);
    h.run([{ type: "stillStart" }]);
    h.mapper.dispose();
    expect(h.calls).toEqual(["dragStart:ai", "dragMove:0.100", "dragEnd:0.000"]);
    expect(h.frozen).toEqual([true, false]);
  });
});
