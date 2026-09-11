import type { CarouselController } from "../CarouselController";
import type { GestureEvent, HandSnapshot } from "./GestureRecognizer";
import type { Vec2 } from "./landmarks";

export interface HandMapperDeps {
  controller: CarouselController;
  /** Card under a screen position, NDC. */
  hitTest: (x: number, y: number) => string | null;
  setHovered: (id: string | null) => void;
  setFrozen: (frozen: boolean) => void;
  /** Ring radians per NDC unit of horizontal sweep travel. */
  radiansPerNdc: number;
  /** NDC travel a pinch may drift before its release no longer counts as a tap. */
  tapMaxTravel: number;
}

/**
 * Maps gesture events onto the carousel controller. An open-hand sweep is the ring
 * drag (start, move, end with fling velocity), exactly like a mouse drag on empty
 * space. A pinch is a tap on whatever was under the cursor when it closed, as long as
 * the hand did not drift away before releasing; pinching and moving does nothing yet
 * (grabbing the card itself is a later pass). An open palm held still freezes ambient
 * motion. Pure: injected dependencies only.
 */
export class HandCarouselMapper {
  private pressed: string | null = null;
  private pressOrigin: Vec2 | null = null;
  private pressTravel = 0;
  private sweeping = false;
  /** Last hover we applied; undefined means unknown (the store may have been changed by a drag). */
  private hovered: string | null | undefined = null;
  private frozen = false;

  constructor(private readonly deps: HandMapperDeps) {}

  apply(snapshot: HandSnapshot, events: readonly GestureEvent[]): void {
    for (const event of events) this.handle(event);

    if (!snapshot.present) {
      this.setHover(null);
    } else if (this.pressOrigin === null && !this.sweeping) {
      this.setHover(this.deps.hitTest(snapshot.cursor.x, snapshot.cursor.y));
    }
  }

  /** Releases anything held: called when tracking stops. */
  dispose(): void {
    if (this.sweeping) this.deps.controller.dragEnd(0);
    if (this.frozen) this.deps.setFrozen(false);
    this.setHover(null);
    this.pressed = null;
    this.pressOrigin = null;
    this.pressTravel = 0;
    this.sweeping = false;
    this.frozen = false;
  }

  private handle(event: GestureEvent) {
    const { controller } = this.deps;
    switch (event.type) {
      case "pinchStart":
        this.pressed = this.deps.hitTest(event.cursor.x, event.cursor.y);
        this.pressOrigin = { ...event.cursor };
        this.pressTravel = 0;
        break;
      case "pinchMove":
        if (this.pressOrigin) {
          this.pressTravel = Math.max(this.pressTravel, Math.hypot(event.cursor.x - this.pressOrigin.x, event.cursor.y - this.pressOrigin.y));
        }
        break;
      case "pinchEnd":
        if (this.pressOrigin && this.pressTravel <= this.deps.tapMaxTravel) controller.tap(this.pressed);
        this.endPress();
        break;
      case "sweepStart":
        this.sweeping = true;
        this.hovered = undefined;
        controller.dragStart(null);
        break;
      case "sweepMove":
        if (this.sweeping) controller.dragMove(event.delta.x * this.deps.radiansPerNdc);
        break;
      case "sweepEnd":
        if (this.sweeping) controller.dragEnd(event.velocity.x * this.deps.radiansPerNdc);
        this.sweeping = false;
        this.hovered = undefined;
        break;
      case "stillStart":
        this.frozen = true;
        this.deps.setFrozen(true);
        break;
      case "stillEnd":
        this.frozen = false;
        this.deps.setFrozen(false);
        break;
      case "handLost":
        if (this.sweeping) controller.dragEnd(0);
        this.sweeping = false;
        this.endPress();
        break;
      case "handFound":
        break;
    }
  }

  private endPress() {
    this.pressed = null;
    this.pressOrigin = null;
    this.pressTravel = 0;
    this.hovered = undefined;
  }

  private setHover(id: string | null) {
    if (this.hovered !== undefined && id === this.hovered) return;
    this.hovered = id;
    this.deps.setHovered(id);
  }
}
