"use client";

import { palette } from "@/rendering/palette";
import { Particles } from "./atmosphere/Particles";
import { LightBeams } from "./atmosphere/LightBeams";
import { CameraRig } from "./camera/CameraRig";
import { Carousel } from "./carousel/Carousel";
import { Backdrop } from "./environment/Backdrop";
import { Floor } from "./environment/Floor";
import { Lighting } from "./lighting/Lighting";
import { Reflections } from "./lighting/Reflections";

/** Density of the exponential fog that standard materials (future cards) will pick up. */
const FOG_DENSITY = 0.045;

/** One large room with no walls: atmospheric depth, soft light, living fog, and the ring of cards around the user. */
export function NexusScene() {
  return (
    <>
      <fogExp2 attach="fog" args={[palette.fog, FOG_DENSITY]} />
      <CameraRig />
      <Lighting />
      <Reflections />
      <Backdrop />
      <Floor />
      <LightBeams />
      <Particles />
      <Carousel />
    </>
  );
}
