"use client";

import { palette } from "@/rendering/palette";
import { Particles } from "./atmosphere/Particles";
import { LightBeams } from "./atmosphere/LightBeams";
import { CameraRig } from "./camera/CameraRig";
import { Backdrop } from "./environment/Backdrop";
import { Floor } from "./environment/Floor";
import { Lighting } from "./lighting/Lighting";

/** Density of the exponential fog that standard materials (future cards) will pick up. */
const FOG_DENSITY = 0.045;

/** One large room with no walls: atmospheric depth, soft light, living fog. */
export function NexusScene() {
  return (
    <>
      <fogExp2 attach="fog" args={[palette.fog, FOG_DENSITY]} />
      <CameraRig />
      <Lighting />
      <Backdrop />
      <Floor />
      <LightBeams />
      <Particles />
    </>
  );
}
