import {
  cursor as cursorTuning,
  fingers as fingerTuning,
  palmStill as palmStillTuning,
  pinch as pinchTuning,
  swipe as swipeTuning,
  tracking as trackingTuning,
} from "../tuning";
import {
  classifyOpenness,
  extendedFingers,
  FINGERTIPS,
  type Openness,
  palmCenter,
  pinchRatio as measurePinchRatio,
  type Point,
  toNdc,
  type Vec2,
} from "./landmarks";

export type Handedness = "Left" | "Right";

/** One detection result, as produced by the tracker. `t` is in milliseconds. */
export interface HandFrame {
  landmarks: Point[];
  handedness: Handedness | null;
  score: number;
  t: number;
}

/** What the rest of the app sees of the hand, refreshed every frame. */
export interface HandSnapshot {
  present: boolean;
  /** Smoothed on-screen cursor, NDC. */
  cursor: Vec2;
  /** Palm centre in the normalised frame, mirrored to screen orientation. */
  palm: Vec2;
  /** Fingertip positions, NDC, thumb first. */
  fingertips: Vec2[];
  /** Extended fingers, thumb first. */
  extended: boolean[];
  openness: Openness;
  pinching: boolean;
  /** Thumb-tip to index-tip distance in hand units. */
  pinchRatio: number;
  /** Palm speed in frame widths per second. */
  speed: number;
  handedness: Handedness | null;
  score: number;
}

export type GestureEvent =
  | { type: "handFound" }
  | { type: "handLost" }
  | { type: "pinchStart"; cursor: Vec2 }
  | { type: "pinchMove"; cursor: Vec2; delta: Vec2 }
  | { type: "pinchEnd"; cursor: Vec2; velocity: Vec2 }
  | { type: "swipe"; direction: "left" | "right"; speed: number }
  | { type: "stillStart" }
  | { type: "stillEnd" };

export interface RecognizerTuning {
  cursor: typeof cursorTuning;
  fingers: typeof fingerTuning;
  pinch: typeof pinchTuning;
  swipe: typeof swipeTuning;
  palmStill: typeof palmStillTuning;
  lostFrames: number;
}

export const EMPTY_HAND: HandSnapshot = {
  present: false,
  cursor: { x: 0, y: 0 },
  palm: { x: 0.5, y: 0.5 },
  fingertips: [],
  extended: [false, false, false, false, false],
  openness: "neutral",
  pinching: false,
  pinchRatio: 1,
  speed: 0,
  handedness: null,
  score: 0,
};

interface Sample {
  t: number;
  x: number;
  y: number;
}

/**
 * Turns a stream of hand frames into a smoothed hand snapshot plus discrete gesture
 * events: pinch start/move/end with hysteresis, horizontal swipes, and the
 * open-palm-held-still gesture. Pure: no DOM, no MediaPipe, no stores, so it can be
 * driven by synthetic landmarks in tests. Directions are in screen space (mirrored
 * when `cursor.mirror` is on): "right" means the hand moved right on screen.
 */
export class GestureRecognizer {
  private readonly tuning: RecognizerTuning;
  private snapshot: HandSnapshot = EMPTY_HAND;

  private lostCount = 0;
  private lastT: number | null = null;

  private cursor: Vec2 = { x: 0, y: 0 };
  private cursorReady = false;
  private cursorSamples: Sample[] = [];
  private palmSamples: Sample[] = [];

  private pinching = false;
  private pinchFrames = 0;
  private lastSwipeAt = Number.NEGATIVE_INFINITY;
  private stillSince: number | null = null;
  private frozen = false;

  constructor(tuning: Partial<RecognizerTuning> = {}) {
    this.tuning = {
      cursor: cursorTuning,
      fingers: fingerTuning,
      pinch: pinchTuning,
      swipe: swipeTuning,
      palmStill: palmStillTuning,
      lostFrames: trackingTuning.lostFrames,
      ...tuning,
    };
  }

  get current(): HandSnapshot {
    return this.snapshot;
  }

  /** Feed one frame (or null when nothing was detected) at time `t` in milliseconds. */
  update(frame: HandFrame | null, t: number): { snapshot: HandSnapshot; events: GestureEvent[] } {
    const events: GestureEvent[] = [];
    if (!frame) return this.handleMissing(events);

    this.lostCount = 0;
    if (!this.snapshot.present) {
      events.push({ type: "handFound" });
      this.resetTracking();
    }
    const dt = this.lastT === null ? 0 : (t - this.lastT) / 1000;
    this.lastT = t;

    const { mirror, gain, smoothingSeconds } = this.tuning.cursor;
    const { landmarks } = frame;
    const palmRaw = palmCenter(landmarks);
    const palm = { x: mirror ? 1 - palmRaw.x : palmRaw.x, y: palmRaw.y };
    const previousCursor = this.cursorReady ? { ...this.cursor } : null;

    const target = toNdc(palmRaw, mirror, gain);
    if (!this.cursorReady || dt <= 0) {
      this.cursor = target;
      this.cursorReady = true;
    } else {
      const k = 1 - Math.exp(-dt / smoothingSeconds);
      this.cursor = { x: this.cursor.x + (target.x - this.cursor.x) * k, y: this.cursor.y + (target.y - this.cursor.y) * k };
    }

    this.pushSample(this.palmSamples, { t, x: palm.x, y: palm.y }, Math.max(this.tuning.swipe.windowMs, this.tuning.palmStill.windowMs) + 40);
    this.pushSample(this.cursorSamples, { t, ...this.cursor }, 160);
    const speed = this.windowSpeed(this.palmSamples, t, this.tuning.palmStill.windowMs);

    const ratio = measurePinchRatio(landmarks);
    const extended = extendedFingers(landmarks, this.tuning.fingers.extendedRatio);
    const openness = classifyOpenness(extended, this.tuning.fingers.openMin, this.tuning.fingers.closedMax);

    // Pinch, with hysteresis and a confirmation window so noise never flickers it.
    const { closeRatio, openRatio, confirmFrames } = this.tuning.pinch;
    const wantPinch = this.pinching ? ratio < openRatio : ratio < closeRatio;
    let justChanged = false;
    if (wantPinch !== this.pinching) {
      this.pinchFrames += 1;
      if (this.pinchFrames >= confirmFrames) {
        this.pinching = wantPinch;
        this.pinchFrames = 0;
        justChanged = true;
        if (wantPinch) events.push({ type: "pinchStart", cursor: { ...this.cursor } });
        else events.push({ type: "pinchEnd", cursor: { ...this.cursor }, velocity: this.cursorVelocity(t) });
      }
    } else {
      this.pinchFrames = 0;
    }
    if (this.pinching && !justChanged && previousCursor) {
      events.push({
        type: "pinchMove",
        cursor: { ...this.cursor },
        delta: { x: this.cursor.x - previousCursor.x, y: this.cursor.y - previousCursor.y },
      });
    }

    // Swipe: a fast, mostly horizontal palm travel with the hand not pinching or closed.
    if (!this.pinching && openness !== "closed" && t - this.lastSwipeAt >= this.tuning.swipe.cooldownMs) {
      const measured = this.measureSwipe(t);
      if (measured) {
        events.push({ type: "swipe", direction: measured.dx > 0 ? "right" : "left", speed: measured.speed });
        this.lastSwipeAt = t;
        this.palmSamples = [];
      }
    }

    events.push(...this.updateStill(openness, speed, t));

    this.snapshot = {
      present: true,
      cursor: { ...this.cursor },
      palm,
      fingertips: FINGERTIPS.map((index) => toNdc(landmarks[index], mirror, gain)),
      extended,
      openness,
      pinching: this.pinching,
      pinchRatio: ratio,
      speed,
      handedness: frame.handedness,
      score: frame.score,
    };
    return { snapshot: this.snapshot, events };
  }

  private handleMissing(events: GestureEvent[]) {
    if (!this.snapshot.present) return { snapshot: this.snapshot, events };
    this.lostCount += 1;
    // Keep the last snapshot through brief dropouts.
    if (this.lostCount < this.tuning.lostFrames) return { snapshot: this.snapshot, events };

    if (this.pinching) {
      this.pinching = false;
      events.push({ type: "pinchEnd", cursor: { ...this.cursor }, velocity: { x: 0, y: 0 } });
    }
    if (this.frozen) {
      this.frozen = false;
      events.push({ type: "stillEnd" });
    }
    events.push({ type: "handLost" });
    this.snapshot = { ...EMPTY_HAND, cursor: { ...this.cursor } };
    this.resetTracking();
    this.lastT = null;
    return { snapshot: this.snapshot, events };
  }

  private resetTracking() {
    this.cursorReady = false;
    this.cursorSamples = [];
    this.palmSamples = [];
    this.pinching = false;
    this.pinchFrames = 0;
    this.stillSince = null;
    this.frozen = false;
    this.lostCount = 0;
  }

  private pushSample(samples: Sample[], sample: Sample, keepMs: number) {
    samples.push(sample);
    while (samples.length > 0 && sample.t - samples[0].t > keepMs) samples.shift();
  }

  /** Average speed over the trailing window, in frame widths (or NDC units) per second. */
  private windowSpeed(samples: Sample[], t: number, windowMs: number): number {
    const first = samples.find((s) => t - s.t <= windowMs);
    const last = samples[samples.length - 1];
    if (!first || !last || last.t - first.t <= 0) return 0;
    return Math.hypot(last.x - first.x, last.y - first.y) / ((last.t - first.t) / 1000);
  }

  private cursorVelocity(t: number): Vec2 {
    const first = this.cursorSamples.find((s) => t - s.t <= 100);
    const last = this.cursorSamples[this.cursorSamples.length - 1];
    if (!first || !last || last.t - first.t <= 0) return { x: 0, y: 0 };
    const seconds = (last.t - first.t) / 1000;
    return { x: (last.x - first.x) / seconds, y: (last.y - first.y) / seconds };
  }

  private measureSwipe(t: number): { dx: number; speed: number } | null {
    const { windowMs, minSpeed, minDistance, maxVerticalRatio } = this.tuning.swipe;
    const first = this.palmSamples.find((s) => t - s.t <= windowMs);
    const last = this.palmSamples[this.palmSamples.length - 1];
    if (!first || !last) return null;
    const seconds = (last.t - first.t) / 1000;
    if (seconds < 0.03) return null;
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const speed = Math.abs(dx) / seconds;
    if (speed < minSpeed || Math.abs(dx) < minDistance || Math.abs(dy) > Math.abs(dx) * maxVerticalRatio) return null;
    return { dx, speed };
  }

  private updateStill(openness: Openness, speed: number, t: number): GestureEvent[] {
    const { maxSpeed, releaseSpeed, holdMs } = this.tuning.palmStill;
    const eligible = openness === "open" && !this.pinching;
    if (!eligible) {
      this.stillSince = null;
      if (this.frozen) {
        this.frozen = false;
        return [{ type: "stillEnd" }];
      }
      return [];
    }
    if (this.frozen) {
      if (speed > releaseSpeed) {
        this.frozen = false;
        this.stillSince = null;
        return [{ type: "stillEnd" }];
      }
      return [];
    }
    if (speed < maxSpeed) {
      this.stillSince ??= t;
      if (t - this.stillSince >= holdMs) {
        this.frozen = true;
        return [{ type: "stillStart" }];
      }
    } else {
      this.stillSince = null;
    }
    return [];
  }
}
