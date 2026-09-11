import { springs } from "./motion";

/** The six card states of Phase 1. Priority when several apply is decided in the store. */
export type CardState = "idle" | "hovered" | "selected" | "expanded" | "focused" | "dragging";

export interface CardTargets {
  /** Offset toward the user along the card's facing direction, in world units. */
  lift: number;
  scale: number;
  /** Halo and rim strength. */
  glow: number;
  /** Hairline border strength. */
  border: number;
  labelOpacity: number;
  glassOpacity: number;
}

/** Rest values each state springs toward. */
export const CARD_TARGETS: Record<CardState, CardTargets> = {
  idle: { lift: 0, scale: 1, glow: 0.22, border: 0.35, labelOpacity: 0.8, glassOpacity: 0.5 },
  focused: { lift: 0.08, scale: 1.02, glow: 0.45, border: 0.6, labelOpacity: 0.95, glassOpacity: 0.55 },
  hovered: { lift: 0.22, scale: 1.045, glow: 0.7, border: 0.85, labelOpacity: 1, glassOpacity: 0.58 },
  selected: { lift: 0.34, scale: 1.06, glow: 1, border: 1, labelOpacity: 1, glassOpacity: 0.62 },
  expanded: { lift: 0, scale: 1, glow: 0.8, border: 1, labelOpacity: 1, glassOpacity: 0.66 },
  dragging: { lift: -0.12, scale: 0.965, glow: 0.15, border: 0.3, labelOpacity: 0.7, glassOpacity: 0.45 },
};

/** Which spring carries a card from one state to the next. */
export function transitionConfig(to: CardState) {
  switch (to) {
    case "hovered":
    case "dragging":
      return springs.acknowledging;
    case "selected":
    case "expanded":
      return springs.arriving;
    default:
      return springs.leaving;
  }
}

/** Expanded state: extra scale, and how far the other cards step back and dim. */
export const EXPAND = { scale: 0.28, recedeDistance: 0.8, recedeDim: 0.5 } as const;

/** Hover parallax: peak tilt in radians toward the pointer. */
export const PARALLAX = { tilt: 0.11 } as const;

/** Focused state: a highlight slowly orbiting the border. */
export const FOCUS = { sweepRate: 1.1, highlight: 0.5 } as const;

/** Selected state: period in seconds of the energy pulse leaving the card edge. */
export const SELECTED_PULSE_PERIOD = 1.7;
