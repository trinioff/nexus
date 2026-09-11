"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, CylinderGeometry, Group, ShaderMaterial } from "three";
import { drifting } from "@/animations/motion";
import { palette } from "@/rendering/palette";
import { useSceneStore } from "@/stores/sceneStore";
import { mulberry32 } from "@/utils/random";
import { noiseChunk } from "@/utils/shaders/noise.glsl";

const BEAM_COUNT = 6;
const BEAM_LENGTH = 34;
const BEAM_CENTRE_Y = 3;

interface BeamSpec {
  angle: number;
  radius: number;
  tilt: number;
  topRadius: number;
  bottomRadius: number;
  intensity: number;
  tint: number;
  phase: number;
  sweepDirection: 1 | -1;
}

function buildSpecs(count: number): BeamSpec[] {
  const rand = mulberry32(0x4245414d); // "BEAM"
  return Array.from({ length: count }, (_, i) => ({
    angle: (i / count) * Math.PI * 2 + rand() * 0.6,
    radius: 7 + rand() * 9,
    tilt: 0.08 + rand() * 0.16,
    topRadius: 0.25 + rand() * 0.25,
    bottomRadius: 1.2 + rand() * 1.4,
    intensity: 0.22 + rand() * 0.22,
    tint: rand(),
    phase: rand() * Math.PI * 2,
    sweepDirection: rand() > 0.5 ? 1 : -1,
  }));
}

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
${noiseChunk}
uniform float uTime;
uniform float uSeed;
uniform float uIntensity;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  // Cheap volumetric look: the surface facing the eye is dense, the silhouette fades.
  float facing = pow(max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.2);

  // Bright where the beam enters from above, dissolving toward the floor.
  float along = smoothstep(0.0, 0.55, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));

  // Dust drifting down the beam.
  float streaks = 0.7 + 0.3 * noise1(vUv.y * 7.0 - uTime * 0.12 + uSeed * 10.0);

  float a = facing * along * streaks * uIntensity;
  gl_FragColor = vec4(uColor * a, a);
}
`;

/**
 * Slow searchlight beams falling from above: tilted additive cones that sway on their
 * tilt and sweep around the vertical axis. Sweep and sway accumulate with the store's
 * motion value, so at zero motion they hold still without snapping.
 */
export function LightBeams() {
  const specs = useMemo(() => buildSpecs(BEAM_COUNT), []);
  const groups = useRef<(Group | null)[]>([]);
  const sweep = useRef<number[]>(specs.map((s) => s.angle));

  const geometry = useMemo(() => new CylinderGeometry(1, 1, BEAM_LENGTH, 24, 1, true), []);
  const materials = useMemo(
    () =>
      specs.map(
        (spec) =>
          new ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
              uTime: { value: 0 },
              uSeed: { value: spec.phase },
              uIntensity: { value: spec.intensity },
              uColor: { value: new Color(palette.blue).lerp(new Color(palette.white), spec.tint) },
            },
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
            fog: false,
          }),
      ),
    [specs],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
    },
    [geometry, materials],
  );

  useFrame(({ clock }, delta) => {
    const m = useSceneStore.getState().motion;
    const t = clock.elapsedTime;
    const { sway, swayRate, sweepRate } = drifting.beams;

    specs.forEach((spec, i) => {
      materials[i].uniforms.uTime.value = t;
      const group = groups.current[i];
      if (!group) return;
      sweep.current[i] += delta * sweepRate * spec.sweepDirection * m;
      group.rotation.y = sweep.current[i];
      group.rotation.z = spec.tilt + m * sway * Math.sin(t * swayRate + spec.phase);
    });
  });

  return (
    <>
      {specs.map((spec, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el;
          }}
          position={[Math.cos(spec.angle) * spec.radius, BEAM_CENTRE_Y, Math.sin(spec.angle) * spec.radius]}
          rotation={[0, spec.angle, spec.tilt]}
        >
          <mesh
            geometry={geometry}
            material={materials[i]}
            scale={[spec.bottomRadius, 1, spec.bottomRadius]}
            frustumCulled={false}
          />
        </group>
      ))}
    </>
  );
}
