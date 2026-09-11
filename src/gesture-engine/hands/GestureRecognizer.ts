import {
  cursor as cursorTuning,
  fingers as fingerTuning,
  palmStill as palmStillTuning,
  pinch as pinchTuning,
  sweep as sweepTuning,
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
import { OneEuroFilter } from "./OneEuroFilter";

export type Handedness = "Left" | "Right";

/** One detection result, as produced by the tracker. `t` is in milliseconds. */
export interface HandFrame {
  landmarks: Point[];
  handedness: Handedness | null;
  score: number;
  t: number;
}

/** What the rest of the app sees of the hand, refreshed every detection. */
export interface HandSnapshot {
  present: boolean;
  /** Filtered on-screen cursor, NDC. */
  cursor: Vec2;
  /** Palm centre in the normalised frame, mirrored to screen orientation. */
  palm: Vec2;
  /** Fingertip positions, NDC, thumb first. */
  fingertips: Vec2[];
  /** Extended fingers, thumb first. */
  extended: boolean[];
  openness: Openness;
  pinching: boolean;
  /** The open hand is carrying the ring. */
  sweeping: boolean;
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
  | { type: "sweepStart"; cursor: Vec2 }
  | { type: "sweepMove"; cursor: Vec2; delta: Vec2 }
  | { type: "sweepEnd"; cursor: Vec2; velocity: Vec2 }
  | { type: "stillStart" }
  | { type: "stillEnd" };

export interface RecognizerTuning {
  cursor: typeof cursorTuning;
  fingers: typeof fingerTuning;
  pinch: typeof pinchTuning;
  sweep: typeof sweepTuning;
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
  sweeping: false,
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
 * Turns a stream of hand frames into a filtered hand snapshot plus discrete gesture
 * events: pinch start/move/end with hysteresis, the open-hand sweep that carries the
 * ring, and the open-palm-held-still gesture. Pure: no DOM, no MediaPipe, no stores,
 * so it can be driven by synthetic landmarks in tests. Directions are in screen space
 * (mirrored when `cursor.mirror` is on): a positive x delta means the hand moved
 * right on screen.
 */
export class GestureRecognizer {
  private readonly tuning: RecognizerTuning;
  private snapshot: HandSnapshot = EMPTY_HAND;

  private lostCount = 0;
  private lastT: number | null = null;

  private readonly filterX: OneEuroFilter;
  private readonly filterY: OneEuroFilter;
  private cursor: Vec2 = { x: 0, y: 0 };
  private cursorReady = false;
  private cursorSamples: Sample[] = [];
  private palmSamples: Sample[] = [];

  private pinching = false;
  private pinchFrames = 0;

  private sweeping = false;
  private sweepTravel = 0;
  private sweepStoppedSince: number | null = null;

  private stillSince: number | null = null;
  private frozen = false;

  constructor(tuning: Partial<RecognizerTuning> = {}) {
    this.tuning = {
      cursor: cursorTuning,
      fingers: fingerTuning,
      pinch: pinchTuning,
      sweep: sweepTuning,
      palmStill: palmStillTuning,
      lostFrames: trackingTuning.lostFrames,
      ...tuning,
    };
    this.filterX = new OneEuroFilter(this.tuning.cursor.filter);
    this.filterY = new OneEuroFilter(this.tuning.cursor.filter);
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

    const { mirror, gain } = this.tuning.cursor;
    const { landmarks } = frame;
    const palmRaw = palmCenter(landmarks);
    const palm = { x: mirror ? 1 - palmRaw.x : palmRaw.x, y: palmRaw.y };
    const previousCursor = this.cursorReady ? { ...this.cursor } : null;

    const target = toNdc(palmRaw, mirror, gain);
    this.cursor = { x: this.filterX.filter(target.x, dt), y: this.filterY.filter(target.y, dt) };
    this.cursorReady = true;
    const delta: Vec2 = previousCursor ? { x: this.cursor.x - previousCursor.x, y: this.cursor.y - previousCursor.y } : { x: 0, y: 0 };

    this.pushSample(this.palmSamples, { t, x: palm.x, y: palm.y }, this.tuning.palmStill.windowMs + 40);
    this.pushSample(this.cursorSamples, { t, ...this.cursor }, 160);
    const speed = this.windowSpeed(this.palmSamples, t, this.tuning.palmStill.windowMs);

    const ratio = measurePinchRatio(landmarks);
    const extended = extendedFingers(landmarks, this.tuning.fingers.extendedRatio);
    const openness = classifyOpenness(extended, this.tuning.fingers.openMin, this.tuning.fingers.closedMax);

    // Pinch, with hysteresis and a confirmation window so noise never flickers it.
    const { closeRatio, openRatio, confirmFrames } = this.tuning.pinch;
    const wantPinch = this.pinching ? ratio < openRatio : ratio < closeRatio;
    let pinchChanged = false;
    if (wantPinch !== this.pinching) {
      this.pinchFrames += 1;
      if (this.pinchFrames >= confirmFrames) {
        this.pinching = wantPinch;
        this.pinchFrames = 0;
        pinchChanged = true;
      }
    } else {
      this.pinchFrames = 0;
    }

    // A pinch or a closing hand releases a sweep before anything else happens.
    events.push(...this.updateSweep(openness, speed, delta, previousCursor !== null, t));

    if (pinchChanged) {
      if (this.pinching) events.push({ type: "pinchStart", cursor: { ...this.cursor } });
      else events.push({ type: "pinchEnd", cursor: { ...this.cursor }, velocity: this.cursorVelocity(t) });
    } else if (this.pinching && previousCursor) {
      events.push({ type: "pinchMove", cursor: { ...this.cursor }, delta });
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
      sweeping: this.sweeping,
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

    if (this.sweeping) {
      this.sweeping = false;
      events.push({ type: "sweepEnd", cursor: { ...this.cursor }, velocity: { x: 0, y: 0 } });
    }
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
    this.filterX.reset();
    this.filterY.reset();
    this.cursorSamples = [];
    this.palmSamples = [];
    this.pinching = false;
    this.pinchFrames = 0;
    this.sweeping = false;
    this.sweepTravel = 0;
    this.sweepStoppedSince = null;
    this.stillSince = null;
    this.frozen = false;
    this.lostCount = 0;
  }

  private pushSample(samples: Sample[], sample: Sample, keepMs: number) {
    samples.push(sample);
    while (samples.length > 0 && sample.t - samples[0].t > keepMs) samples.shift();
  }

  /** Average speed over the trailing window, in the samples' units per second. */
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

  /**
   * Sweep: once an open, non-pinching hand has travelled `engageTravel`, the ring
   * follows every cursor delta until the hand closes, pinches, stops for `releaseMs`,
   * or is lost. The release carries the cursor velocity for the fling.
   */
  private updateSweep(openness: Openness, speed: number, delta: Vec2, hasDelta: boolean, t: number): GestureEvent[] {
    const { engageTravel, releaseSpeed, releaseMs } = this.tuning.sweep;
    const eligible = openness === "open" && !this.pinching;

    if (!this.sweeping) {
      if (eligible && hasDelta && speed >= releaseSpeed) {
        this.sweepTravel += Math.abs(delta.x);
        if (this.sweepTravel >= engageTravel) {
          this.sweeping = true;
          this.sweepTravel = 0;
          this.sweepStoppedSince = null;
          return [{ type: "sweepStart", cursor: { ...this.cursor } }];
        }
      } else {
        this.sweepTravel = 0;
      }
      return [];
    }

    if (!eligible) return this.endSweep(this.cursorVelocity(t));
    if (speed < releaseSpeed) {
      this.sweepStoppedSince ??= t;
      if (t - this.sweepStoppedSince >= releaseMs) return this.endSweep({ x: 0, y: 0 });
    } else {
      this.sweepStoppedSince = null;
    }
    return hasDelta ? [{ type: "sweepMove", cursor: { ...this.cursor }, delta }] : [];
  }

  private endSweep(velocity: Vec2): GestureEvent[] {
    this.sweeping = false;
    this.sweepTravel = 0;
    this.sweepStoppedSince = null;
    return [{ type: "sweepEnd", cursor: { ...this.cursor }, velocity }];
  }

  private updateStill(openness: Openness, speed: number, t: number): GestureEvent[] {
    const { maxSpeed, releaseSpeed, holdMs } = this.tuning.palmStill;
    const eligible = openness === "open" && !this.pinching && !this.sweeping;
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
