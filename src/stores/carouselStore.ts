import { create } from "zustand";
import type { CardState } from "@/animations/cardMotion";

export interface CarouselState {
  /** Card under the pointer. */
  hoveredId: string | null;
  /** Card chosen with a tap; the ring rotates to bring it to the front. */
  selectedId: string | null;
  /** Selected card opened at the reading position. */
  expandedId: string | null;
  /** Card whose slot is nearest the front, updated by the carousel every frame. */
  focusedId: string | null;
  /** Card that was under the pointer when a ring drag started, if any. */
  draggedId: string | null;
  isDragging: boolean;

  setHovered: (id: string | null) => void;
  setFocused: (id: string | null) => void;
  select: (id: string) => void;
  expand: (id: string) => void;
  collapse: () => void;
  deselect: () => void;
  beginDrag: (id: string | null) => void;
  endDrag: () => void;
}

export const useCarouselStore = create<CarouselState>()((set) => ({
  hoveredId: null,
  selectedId: null,
  expandedId: null,
  focusedId: null,
  draggedId: null,
  isDragging: false,

  setHovered: (id) => set({ hoveredId: id }),
  setFocused: (id) => set({ focusedId: id }),
  select: (id) => set({ selectedId: id, expandedId: null }),
  expand: (id) => set({ selectedId: id, expandedId: id }),
  collapse: () => set({ expandedId: null }),
  deselect: () => set({ selectedId: null, expandedId: null }),
  beginDrag: (id) =>
    set({ isDragging: true, draggedId: id, hoveredId: null, selectedId: null, expandedId: null }),
  endDrag: () => set({ isDragging: false, draggedId: null }),
}));

/** Resolves the single state a card is in, highest priority first. */
export function selectCardState(s: CarouselState, id: string): CardState {
  if (s.isDragging && s.draggedId === id) return "dragging";
  if (s.expandedId === id) return "expanded";
  if (s.selectedId === id) return "selected";
  if (s.hoveredId === id && !s.isDragging) return "hovered";
  if (s.focusedId === id && s.expandedId === null) return "focused";
  return "idle";
}
