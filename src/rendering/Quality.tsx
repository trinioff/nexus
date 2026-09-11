"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useSceneStore } from "@/stores/sceneStore";

/**
 * Adaptive quality. Watches frame timing and steps the device pixel ratio and the
 * scene's quality tier up or down. Never exceeds the device's own pixel ratio. Tiers
 * change cost only (particle count, bloom buffers, DPR), never the look: see
 * PostProcessing for why the composer must stay mounted on every tier.
 */
export function Quality() {
  const setDpr = useThree((s) => s.setDpr);
  const setQuality = useSceneStore((s) => s.setQuality);

  return (
    <PerformanceMonitor
      bounds={(refreshRate) => (refreshRate > 90 ? [45, 90] : [35, 60])}
      flipflops={5}
      onChange={({ factor }) => {
        const target = Math.round((1 + factor) * 4) / 4; // 1.0 .. 2.0 in quarter steps
        setDpr(Math.min(window.devicePixelRatio || 1, target));
      }}
      onIncline={() => setQuality("high")}
      onDecline={() => setQuality("medium")}
      onFallback={() => setQuality("low")}
    />
  );
}
