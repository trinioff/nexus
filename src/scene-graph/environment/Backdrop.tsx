"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { BackSide, Color, ShaderMaterial, SphereGeometry } from "three";
import { drifting } from "@/animations/motion";
import { palette } from "@/rendering/palette";
import { noiseChunk } from "@/utils/shaders/noise.glsl";

const RADIUS = 90;

const vertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
${noiseChunk}
uniform float uTime;
uniform vec3 uVoid;
uniform vec3 uHaze;
uniform vec3 uGlow;
uniform vec3 uBlue;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float t = uTime;

  // Two scales of slowly scrolling fbm: broad banks and finer wisps.
  float banks = fbm3(d * 2.2 + vec3(t, t * 0.6, -t * 0.4));
  float wisps = fbm3(d * 5.0 - vec3(t * 1.3, 0.0, t * 0.8));
  float fog = smoothstep(0.4, 0.86, banks * 0.65 + wisps * 0.35);

  // Haze pools around and just below the horizon; straight up stays deep.
  float horizon = exp(-pow((d.y + 0.1) * 2.2, 2.0));
  float overhead = smoothstep(0.15, 0.85, d.y);

  vec3 col = uVoid;
  col = mix(col, uHaze, (fog * 0.55 + horizon * 0.3) * (1.0 - overhead * 0.7));

  // Luminous threads inside the banks, so the fog reads as lit from within.
  float threads = smoothstep(0.62, 0.88, wisps) * fog;
  col += uGlow * threads * 0.05;

  // One distant light source ahead and above: a tight white-blue core inside a faint
  // blue halo, breathing with the wisps.
  float facing = max(dot(d, normalize(vec3(-0.35, 0.5, -0.75))), 0.0);
  float core = pow(facing, 16.0);
  float halo = pow(facing, 4.0);
  col += mix(uBlue, uGlow, core) * (core * 0.45 + halo * 0.05) * (0.8 + 0.2 * wisps);

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Infinite procedural backdrop: an inverted sphere carrying a slowly scrolling fbm fog
 * field. No stars, no galaxies. Drawn first, behind everything, and never fogged
 * itself because it is the fog.
 */
export function Backdrop() {
  const geometry = useMemo(() => new SphereGeometry(RADIUS, 48, 32), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uVoid: { value: new Color(palette.void) },
          uHaze: { value: new Color(palette.haze) },
          uGlow: { value: new Color(palette.ice) },
          uBlue: { value: new Color(palette.blue) },
        },
        side: BackSide,
        depthWrite: false,
        depthTest: false,
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
    material.uniforms.uTime.value = clock.elapsedTime * drifting.fog.speed;
  });

  return <mesh geometry={geometry} material={material} renderOrder={-10} frustumCulled={false} />;
}
