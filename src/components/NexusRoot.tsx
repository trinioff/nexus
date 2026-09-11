"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useWebGLSupport } from "@/hooks/useWebGLSupport";
import { NexusScene } from "@/scene-graph/NexusScene";
import { useSceneStore } from "@/stores/sceneStore";
import { WebGLFallback } from "./WebGLFallback";

const NexusCanvas = dynamic(() => import("@/rendering/NexusCanvas"), { ssr: false });

/** Client boundary: capability gate, accessibility preferences, then the canvas. */
export function NexusRoot() {
  const support = useWebGLSupport();
  const reducedMotion = usePrefersReducedMotion();
  const setMotion = useSceneStore((s) => s.setMotion);

  useEffect(() => {
    setMotion(reducedMotion ? 0 : 1);
  }, [reducedMotion, setMotion]);

  if (support === "unsupported") return <WebGLFallback />;
  if (support === "unknown") return null;

  return (
    <NexusCanvas>
      <NexusScene />
    </NexusCanvas>
  );
}
