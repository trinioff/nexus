import { create } from "zustand";
import { EMPTY_HAND, type GestureEvent, type HandSnapshot } from "@/gesture-engine/hands/GestureRecognizer";

export type TrackingStatus = "off" | "starting" | "active" | "denied" | "unavailable" | "insecure" | "error";

export type GestureLabel = "swipe-left" | "swipe-right" | "pinch" | "release" | "freeze" | "unfreeze";

export interface HandState {
  status: TrackingStatus;
  /** Human-readable reason when tracking is not active. */
  message: string | null;
  hand: HandSnapshot;
  lastGesture: { type: GestureLabel; at: number } | null;
  /** Detection rate, frames per second. */
  fps: number;
  /** Bumped by `retry()`; the input hook restarts when it changes. */
  retryToken: number;

  setStatus: (status: TrackingStatus, message: string | null) => void;
  publish: (hand: HandSnapshot, events: readonly GestureEvent[], fps: number) => void;
  retry: () => void;
}

function labelOf(event: GestureEvent): GestureLabel | null {
  switch (event.type) {
    case "swipe":
      return event.direction === "right" ? "swipe-right" : "swipe-left";
    case "pinchStart":
      return "pinch";
    case "pinchEnd":
      return "release";
    case "stillStart":
      return "freeze";
    case "stillEnd":
      return "unfreeze";
    default:
      return null;
  }
}

export const useHandStore = create<HandState>()((set) => ({
  status: "off",
  message: null,
  hand: EMPTY_HAND,
  lastGesture: null,
  fps: 0,
  retryToken: 0,

  setStatus: (status, message) => set({ status, message, ...(status !== "active" ? { hand: EMPTY_HAND } : {}) }),
  publish: (hand, events, fps) => {
    let lastGesture: HandState["lastGesture"] | undefined;
    for (const event of events) {
      const type = labelOf(event);
      if (type) lastGesture = { type, at: performance.now() };
    }
    set(lastGesture ? { hand, fps, lastGesture } : { hand, fps });
  },
  retry: () => set((s) => ({ retryToken: s.retryToken + 1 })),
}));
