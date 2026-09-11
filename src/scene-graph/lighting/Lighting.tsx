"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { PointLight } from "three";
import { breathing } from "@/animations/motion";
import { palette } from "@/rendering/palette";

const KEY_INTENSITY = 40;

/**
 * Soft light rig: a dim blue ambient, a cool hemisphere, a white-blue key that breathes,
 * and a deep blue rim from behind. The ambient shaders ignore lights; this rig is what
 * future glass cards will be lit by.
 */
export function Lighting() {
  const key = useRef<PointLight>(null);

  useFrame(({ clock }) => {
    if (!key.current) return;
    const { amplitude, rate } = breathing.keyLight;
    key.current.intensity = KEY_INTENSITY * (1 + amplitude * Math.sin(clock.elapsedTime * rate));
  });

  return (
    <>
      <ambientLight color={palette.haze} intensity={0.6} />
      <hemisphereLight color={palette.blue} groundColor={palette.void} intensity={0.5} />
      <pointLight
        ref={key}
        color={palette.ice}
        intensity={KEY_INTENSITY}
        position={[4, 6, 3]}
        distance={40}
        decay={2}
      />
      <pointLight color={palette.blue} intensity={25} position={[-6, 3, -5]} distance={40} decay={2} />
    </>
  );
}
