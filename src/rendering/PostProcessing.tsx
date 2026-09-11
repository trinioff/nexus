"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { type QualityTier, useSceneStore } from "@/stores/sceneStore";

/**
 * Bloom cost per quality tier. The look must stay the same on every tier: the custom
 * shaders rely on this composer's final pass for tone mapping and the linear-to-sRGB
 * conversion, so the composer is never unmounted; lower tiers only shrink the bloom
 * buffers and their mip chain.
 */
const BLOOM_BY_TIER: Record<QualityTier, { resolutionScale: number; levels: number }> = {
  high: { resolutionScale: 1, levels: 8 },
  medium: { resolutionScale: 0.5, levels: 6 },
  low: { resolutionScale: 0.5, levels: 4 },
};

/** Bloom for holographic glow plus a soft vignette. */
export function PostProcessing() {
  const quality = useSceneStore((s) => s.quality);
  const bloom = BLOOM_BY_TIER[quality];

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        luminanceThreshold={0.28}
        luminanceSmoothing={0.35}
        intensity={0.9}
        radius={0.7}
        levels={bloom.levels}
        resolutionScale={bloom.resolutionScale}
      />
      <Vignette offset={0.3} darkness={0.55} />
    </EffectComposer>
  );
}
