/**
 * NEXUS colour vocabulary for Three.js materials. Mirrors the CSS tokens in
 * `app/globals.css`. Dark void, blue/white holographic light.
 * `warning` (orange) is reserved for warning states and is not used by the ambient scene.
 */
export const palette = {
  void: "#03060d",
  fog: "#060c1c",
  haze: "#0e2050",
  blue: "#3d7bff",
  ice: "#9ccaff",
  white: "#e6f1ff",
  warning: "#ff8a3d",
} as const;
