"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useWebGLSupport } from "@/hooks/useWebGLSupport";
import { NexusScene } from "@/scene-graph/NexusScene";
import { useCarouselStore } from "@/stores/carouselStore";
import { useHandStore } from "@/stores/handStore";
import { useSceneStore } from "@/stores/sceneStore";
import { TrackingIndicator } from "./hud/TrackingIndicator";
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

  // Dev-only handle for driving the stores from the console or a browser script
  // (for example forcing a quality tier to check that the look does not change).
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const debugWindow = window as Window & { __nexus?: unknown };
    debugWindow.__nexus = { useSceneStore, useCarouselStore, useHandStore };
    return () => {
      delete debugWindow.__nexus;
    };
  }, []);

  if (support === "unsupported") return <WebGLFallback />;
  if (support === "unknown") return null;

  return (
    <>
      <NexusCanvas>
        <NexusScene />
      </NexusCanvas>
      <TrackingIndicator />
    </>
  );
}
