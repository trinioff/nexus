"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { CircleGeometry, Color, ShaderMaterial } from "three";
import { breathing } from "@/animations/motion";
import { palette } from "@/rendering/palette";

const FLOOR_Y = -5;
const RADIUS = 70;

const vertexShader = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uRadius;
uniform vec3 uBase;
uniform vec3 uLine;
varying vec3 vWorld;

// Anti-aliased grid line mask for a given cell size.
float gridLine(vec2 p, float cell) {
  vec2 q = p / cell;
  vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
  return 1.0 - min(min(g.x, g.y), 1.0);
}

void main() {
  float r = length(vWorld.xz);
  float falloff = 1.0 - smoothstep(uRadius * 0.08, uRadius * 0.65, r);

  float fine = gridLine(vWorld.xz, 2.0);
  float coarse = gridLine(vWorld.xz, 10.0);

  // A slow ripple travelling outward from the centre.
  float pulse = 0.5 + 0.5 * sin(uTime - r * 0.25);
  float lines = (fine * 0.045 + coarse * 0.11) * (0.75 + 0.25 * pulse);

  float centreGlow = exp(-r * r * 0.02);

  vec3 col = uBase + uLine * (lines + centreGlow * 0.07);
  gl_FragColor = vec4(col, falloff);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * The only thing that reads as "room": a faint grid floor that fades into the fog long
 * before any edge could be seen. No walls.
 */
export function Floor() {
  const geometry = useMemo(() => new CircleGeometry(RADIUS, 96), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uRadius: { value: RADIUS },
          uBase: { value: new Color(palette.fog) },
          uLine: { value: new Color(palette.blue) },
        },
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime * breathing.floorPulse.rate;
  });

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, FLOOR_Y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-5}
    />
  );
}
