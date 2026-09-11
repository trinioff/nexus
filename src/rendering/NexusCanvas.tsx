"use client";

import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import { NeutralToneMapping } from "three";
import { palette } from "./palette";
import { PostProcessing } from "./PostProcessing";
import { Quality } from "./Quality";

export const CAMERA_FOV = 50;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 200;

/** Full-bleed WebGL canvas with the NEXUS renderer configuration. Fills its parent. */
export function NexusCanvas({ children }: { children: ReactNode }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: CAMERA_FOV, near: CAMERA_NEAR, far: CAMERA_FAR, position: [0, 0.9, 3.2] }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: NeutralToneMapping,
        toneMappingExposure: 1.0,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(palette.void, 1);
      }}
    >
      <Quality />
      {children}
      <PostProcessing />
    </Canvas>
  );
}

export default NexusCanvas;
