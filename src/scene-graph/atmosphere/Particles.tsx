"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from "three";
import { drifting } from "@/animations/motion";
import { palette } from "@/rendering/palette";
import { useSceneStore, type QualityTier } from "@/stores/sceneStore";
import { mulberry32 } from "@/utils/random";

const COUNT_BY_TIER: Record<QualityTier, number> = { low: 600, medium: 1200, high: 2000 };
const VOLUME_RADIUS = 32;
const VOLUME_HEIGHT = 26;

const vertexShader = /* glsl */ `
attribute float aSize;
attribute vec3 aSeed;
uniform float uTime;
uniform float uPixelRatio;
uniform float uHeight;
uniform float uRise;
uniform float uSway;
varying float vAlpha;
varying float vTint;

void main() {
  vec3 p = position;
  float t = uTime;

  // Rise slowly and wrap inside the volume; the edge fade below hides the wrap.
  float y = mod(p.y + t * uRise * (0.4 + aSeed.x * 0.8) + uHeight * 0.5, uHeight) - uHeight * 0.5;
  p.y = y;
  p.x += sin(t * (0.15 + aSeed.y * 0.2) + aSeed.z * 6.2831) * uSway;
  p.z += cos(t * (0.12 + aSeed.z * 0.2) + aSeed.x * 6.2831) * uSway;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (40.0 / max(-mv.z, 1.0));

  float edge = 1.0 - smoothstep(uHeight * 0.32, uHeight * 0.5, abs(y));
  float twinkle = 0.6 + 0.4 * sin(t * (0.5 + aSeed.y) + aSeed.x * 6.2831);
  float near = smoothstep(1.5, 5.0, -mv.z);
  vAlpha = edge * twinkle * near;
  vTint = aSeed.z;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uBlue;
uniform vec3 uWhite;
uniform float uOpacity;
varying float vAlpha;
varying float vTint;

void main() {
  float d = length(gl_PointCoord - 0.5);
  // Gaussian falloff: a mote of light in fog, never a pinpoint star.
  float disc = exp(-d * d * 18.0) * (1.0 - smoothstep(0.42, 0.5, d));
  vec3 col = mix(uBlue, uWhite, vTint * vTint);
  float a = disc * vAlpha * uOpacity;
  gl_FragColor = vec4(col * a, a);
}
`;

function buildGeometry(count: number): BufferGeometry {
  const rand = mulberry32(0x4e455855); // "NEXU"
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * VOLUME_RADIUS;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = (rand() - 0.5) * VOLUME_HEIGHT;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    seeds[i * 3] = rand();
    seeds[i * 3 + 1] = rand();
    seeds[i * 3 + 2] = rand();
    sizes[i] = 1.4 + Math.pow(rand(), 3) * 3.2;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 3));
  geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));
  return geometry;
}

/**
 * The fog's motes: thousands of soft additive points rising and swaying through the
 * room. Layout is seeded so the field is identical on every load; count follows the
 * quality tier.
 */
export function Particles() {
  const quality = useSceneStore((s) => s.quality);
  const geometry = useMemo(() => buildGeometry(COUNT_BY_TIER[quality]), [quality]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uHeight: { value: VOLUME_HEIGHT },
          uRise: { value: drifting.particles.rise },
          uSway: { value: drifting.particles.sway },
          uBlue: { value: new Color(palette.blue) },
          uWhite: { value: new Color(palette.white) },
          uOpacity: { value: 0.55 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock, gl }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
