import type { CarouselController } from "../CarouselController";
import type { GestureEvent, HandSnapshot } from "./GestureRecognizer";
import type { Vec2 } from "./landmarks";

export interface HandMapperDeps {
  controller: CarouselController;
  /** Card under a screen position, NDC. */
  hitTest: (x: number, y: number) => string | null;
  setHovered: (id: string | null) => void;
  setFrozen: (frozen: boolean) => void;
  /** Ring radians per NDC unit of horizontal cursor travel. */
  radiansPerNdc: number;
  /** NDC travel before a pinch becomes a drag rather than a tap. */
  dragThreshold: number;
}

/**
 * Maps gesture events onto the carousel controller with the same press / drag / tap
 * semantics as the mouse: a pinch is a press on whatever is under the cursor, moving
 * past the threshold turns it into a ring drag, releasing without moving is a tap. A
 * swipe rotates one slot in the swipe direction, and an open palm held still freezes
 * ambient motion. Pure: injected dependencies only.
 */
export class HandCarouselMapper {
  private pressed: string | null = null;
  private pressOrigin: Vec2 | null = null;
  private dragging = false;
  /** Last hover we applied; undefined means unknown (the store may have been changed by a drag). */
  private hovered: string | null | undefined = null;
  private frozen = false;

  constructor(private readonly deps: HandMapperDeps) {}

  apply(snapshot: HandSnapshot, events: readonly GestureEvent[]): void {
    for (const event of events) this.handle(event);

    if (!snapshot.present) {
      this.setHover(null);
    } else if (this.pressOrigin === null) {
      this.setHover(this.deps.hitTest(snapshot.cursor.x, snapshot.cursor.y));
    }
  }

  /** Releases anything held: called when tracking stops. */
  dispose(): void {
    if (this.dragging) this.deps.controller.dragEnd(0);
    if (this.frozen) this.deps.setFrozen(false);
    this.setHover(null);
    this.pressed = null;
    this.pressOrigin = null;
    this.dragging = false;
    this.frozen = false;
  }

  private handle(event: GestureEvent) {
    const { controller } = this.deps;
    switch (event.type) {
      case "pinchStart":
        this.pressed = this.deps.hitTest(event.cursor.x, event.cursor.y);
        this.pressOrigin = { ...event.cursor };
        this.dragging = false;
        break;
      case "pinchMove": {
        if (!this.pressOrigin) break;
        if (!this.dragging) {
          if (Math.abs(event.cursor.x - this.pressOrigin.x) < this.deps.dragThreshold) break;
          this.dragging = true;
          controller.dragStart(this.pressed);
        }
        controller.dragMove(event.delta.x * this.deps.radiansPerNdc);
        break;
      }
      case "pinchEnd":
        if (this.dragging) controller.dragEnd(event.velocity.x * this.deps.radiansPerNdc);
        else if (this.pressOrigin) controller.tap(this.pressed);
        this.endPress();
        break;
      case "swipe":
        controller.rotate(event.direction === "right" ? 1 : -1);
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
        if (this.dragging) controller.dragEnd(0);
        this.endPress();
        break;
      case "handFound":
        break;
    }
  }

  private endPress() {
    this.pressed = null;
    this.pressOrigin = null;
    this.dragging = false;
    // The drag cleared the store's hover; forget ours so the next frame re-applies it.
    this.hovered = undefined;
  }

  private setHover(id: string | null) {
    if (this.hovered !== undefined && id === this.hovered) return;
    this.hovered = id;
    this.deps.setHovered(id);
  }
}
