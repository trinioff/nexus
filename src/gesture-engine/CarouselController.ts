/**
 * What an input source can ask the carousel to do. Angles are ring radians: positive
 * moves the cards to the right. The scene graph implements this; input sources call it.
 */
export interface CarouselController {
  /** A drag of the ring begins. `cardId` is the card under the pointer, if any. */
  dragStart: (cardId: string | null) => void;
  /** The ring is dragged by `deltaAngle` radians. */
  dragMove: (deltaAngle: number) => void;
  /** The drag ends with a release velocity in radians per second. */
  dragEnd: (angularVelocity: number) => void;
  /** A tap: on a card, or on empty space when `cardId` is null. */
  tap: (cardId: string | null) => void;
  /** Escape: collapse an expanded card, else clear the selection. */
  dismiss: () => void;
  /** Rotate the ring by whole slots; positive moves the cards to the right. */
  rotate: (steps: number) => void;
}
