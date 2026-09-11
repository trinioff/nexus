"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { palette } from "@/rendering/palette";

/**
 * Procedural environment map for glass reflections: a few soft blue and white light
 * panels rendered once into a cubemap. No HDR asset, no network request.
 */
export function Reflections() {
  return (
    <Environment resolution={256} frames={1} background={false}>
      <color attach="background" args={[palette.void]} />
      <Lightformer form="rect" intensity={3} color={palette.ice} position={[0, 6, -6]} scale={[12, 3, 1]} />
      <Lightformer form="rect" intensity={2} color={palette.white} position={[0, 5, 9]} rotation={[Math.PI / 5, 0, 0]} scale={[10, 2, 1]} />
      <Lightformer form="rect" intensity={1.5} color={palette.white} position={[7, 2, 3]} rotation={[0, -Math.PI / 2.4, 0]} scale={[4, 8, 1]} />
      <Lightformer form="ring" intensity={2} color={palette.blue} position={[-7, 3, 2]} rotation={[0, Math.PI / 2.4, 0]} scale={5} />
      <Lightformer form="rect" intensity={0.6} color={palette.haze} position={[0, -6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[14, 14, 1]} />
    </Environment>
  );
}
