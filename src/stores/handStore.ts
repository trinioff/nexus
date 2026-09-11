import { create } from "zustand";
import { EMPTY_HAND, type GestureEvent, type HandSnapshot } from "@/gesture-engine/hands/GestureRecognizer";
import type { Delegate, FrameSource, TrackerMode } from "@/gesture-engine/hands/HandTracker";

export type TrackingStatus = "off" | "starting" | "active" | "denied" | "unavailable" | "insecure" | "error";

export type GestureLabel = "sweep" | "pinch" | "release" | "freeze" | "unfreeze";

export interface TrackerInfo {
  mode: TrackerMode;
  delegate: Delegate;
  source: FrameSource;
}

export interface HandState {
  status: TrackingStatus;
  /** Human-readable reason when tracking is not active. */
  message: string | null;
  /** Where detection runs once active. */
  tracker: TrackerInfo | null;
  /** Latest loading or diagnostic stage reported by the tracker. */
  stage: string | null;
  hand: HandSnapshot;
  lastGesture: { type: GestureLabel; at: number } | null;
  /** Detection rate, frames per second. */
  fps: number;
  /** Bumped by `retry()`; the input hook restarts when it changes. */
  retryToken: number;

  setStatus: (status: TrackingStatus, message: string | null, tracker?: TrackerInfo) => void;
  setStage: (stage: string) => void;
  publish: (hand: HandSnapshot, events: readonly GestureEvent[], fps: number) => void;
  retry: () => void;
}

function labelOf(event: GestureEvent): GestureLabel | null {
  switch (event.type) {
    case "sweepStart":
      return "sweep";
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
  tracker: null,
  stage: null,
  hand: EMPTY_HAND,
  lastGesture: null,
  fps: 0,
  retryToken: 0,

  setStatus: (status, message, tracker) =>
    set({
      status,
      message,
      tracker: status === "active" ? (tracker ?? null) : null,
      ...(status !== "active" ? { hand: EMPTY_HAND, fps: 0 } : {}),
    }),
  setStage: (stage) => set({ stage }),
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
