import { AdditiveBlending, Color, ShaderMaterial, Vector2 } from "three";
import { palette } from "../palette";

const vertexShader = /* glsl */ `
varying vec2 vPos;
void main() {
  vPos = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec2 uHalf;
uniform float uRadius;
uniform vec3 uAccent;
uniform vec3 uBase;
uniform float uGlow;
uniform float uBorder;
uniform float uHighlight;
uniform float uHighlightAngle;
uniform float uPulse;
uniform float uPulseStrength;
varying vec2 vPos;

const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;

float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float d = sdRoundRect(vPos, uHalf, uRadius);
  float aa = fwidth(d) * 1.5;

  // Soft halo outside the glass, dying quickly inward; a faint rim just inside the
  // edge, fading toward the centre; nothing at all by the plane's own boundary.
  float outside = smoothstep(0.0, 0.01, d);
  float edgeFade = 1.0 - smoothstep(0.34, 0.5, d);
  float halo = mix(exp(d * 20.0), exp(-d * 5.0), outside) * edgeFade * 0.32 * uGlow;
  float rim = (1.0 - outside) * exp(d * 6.0) * 0.14 * uGlow;

  // Hairline border.
  float line = (1.0 - smoothstep(0.006, 0.006 + aa, abs(d))) * uBorder;

  // A bright spot travelling along the border (pointer-anchored on hover, orbiting on focus).
  float ang = atan(vPos.y, vPos.x);
  float dAng = abs(mod(ang - uHighlightAngle + PI, TAU) - PI);
  float spot = exp(-dAng * dAng * 5.0) * uHighlight;

  // Energy pulse: a ring leaving the edge and fading as it travels outward.
  float ringD = d - uPulse * 0.55;
  float pulse = exp(-ringD * ringD * 900.0) * (1.0 - uPulse) * uPulseStrength * edgeFade * 0.7;

  vec3 tint = mix(uBase, uAccent, 0.65);
  float energy = halo + rim + line * (0.55 + spot * 1.1) + pulse;
  vec3 col = tint * energy + vec3(0.9, 0.95, 1.0) * (line * spot * 0.6 + pulse * 0.25);
  gl_FragColor = vec4(col, 1.0);
}
`;

export interface CardFrameOptions {
  /** Half extents of the glass face. */
  half: [number, number];
  /** Corner radius of the glass face. */
  radius: number;
  /** Module accent colour. */
  accent: string;
}

/**
 * Additive plane drawn just in front of the glass: halo, rim, hairline border, running
 * highlight and the selected-state energy pulse, all driven by uniforms the card
 * updates every frame. The plane is larger than the glass so the halo has room.
 */
export function createCardFrameMaterial({ half, radius, accent }: CardFrameOptions): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uHalf: { value: new Vector2(half[0], half[1]) },
      uRadius: { value: radius },
      uAccent: { value: new Color(accent) },
      uBase: { value: new Color(palette.blue) },
      uGlow: { value: 0 },
      uBorder: { value: 0 },
      uHighlight: { value: 0 },
      uHighlightAngle: { value: 0 },
      uPulse: { value: 0 },
      uPulseStrength: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
  });
}
