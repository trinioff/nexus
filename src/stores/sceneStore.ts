import { create } from "zustand";
import { gating } from "@/animations/motion";

export type QualityTier = "low" | "medium" | "high";

export interface SceneState {
  /**
   * Effective ambient motion multiplier in [0, 1], read by the frame loops. Scales
   * camera drift, beam sweep and card idle float. Eased toward `motionTarget` by
   * `tickMotion` so a freeze settles instead of stopping dead, and snapped to the
   * target exactly once close, so `0` really is zero drift. The atmosphere itself
   * (fog noise, particles) stays alive regardless.
   */
  motion: number;
  /** Where `motion` is heading: 0 when frozen, else the base value. */
  motionTarget: number;
  /** User-level setting: 1 normally, 0 under prefers-reduced-motion. */
  motionBase: number;
  /** Set by the open-palm-held-still gesture. */
  frozen: boolean;
  /** Adaptive quality tier, driven by the rendering layer's performance monitor. */
  quality: QualityTier;
  setMotion: (base: number) => void;
  setFrozen: (frozen: boolean) => void;
  /** Advance the motion easing by `dt` seconds. Called once per frame by MotionGate. */
  tickMotion: (dt: number) => void;
  setQuality: (quality: QualityTier) => void;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const useSceneStore = create<SceneState>()((set, get) => ({
  motion: 1,
  motionTarget: 1,
  motionBase: 1,
  frozen: false,
  quality: "high",

  setMotion: (base) => {
    const motionBase = clamp01(base);
    set({ motionBase, motionTarget: get().frozen ? 0 : motionBase });
  },
  setFrozen: (frozen) => set({ frozen, motionTarget: frozen ? 0 : get().motionBase }),
  tickMotion: (dt) => {
    const { motion, motionTarget } = get();
    if (motion === motionTarget) return;
    const k = 1 - Math.exp(-dt / gating.settleSeconds);
    let next = motion + (motionTarget - motion) * k;
    if (Math.abs(next - motionTarget) < gating.snapEpsilon) next = motionTarget;
    set({ motion: next });
  },
  setQuality: (quality) => set({ quality }),
}));
