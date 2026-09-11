import { create } from "zustand";

export type QualityTier = "low" | "medium" | "high";

export interface SceneState {
  /**
   * Ambient motion multiplier in [0, 1]. Scales camera drift and light-beam sweep.
   * At exactly 0 the camera sits on its base pose with no drift at all.
   * The atmosphere itself (fog noise, particles) stays alive regardless.
   */
  motion: number;
  /** Adaptive quality tier, driven by the rendering layer's performance monitor. */
  quality: QualityTier;
  setMotion: (motion: number) => void;
  setQuality: (quality: QualityTier) => void;
}

export const useSceneStore = create<SceneState>()((set) => ({
  motion: 1,
  quality: "high",
  setMotion: (motion) => set({ motion: Math.min(1, Math.max(0, motion)) }),
  setQuality: (quality) => set({ quality }),
}));
