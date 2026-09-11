"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useSceneStore } from "@/stores/sceneStore";

/** Bloom for holographic glow plus a soft vignette. Skipped entirely on the low tier. */
export function PostProcessing() {
  const quality = useSceneStore((s) => s.quality);
  if (quality === "low") return null;

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        luminanceThreshold={0.28}
        luminanceSmoothing={0.35}
        intensity={quality === "high" ? 0.9 : 0.6}
        radius={0.7}
      />
      <Vignette offset={0.3} darkness={0.55} />
    </EffectComposer>
  );
}
