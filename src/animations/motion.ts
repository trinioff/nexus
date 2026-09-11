/**
 * Motion vocabulary. Every ambient animation in the scene reads its amplitudes and
 * rates from here so that the feel of NEXUS is tuned in one place.
 *
 * Units: distances in world units, angles in radians, rates in radians or units per second.
 */

/** Slow, idle wandering. The camera floats; light beams search; particles rise. */
export const drifting = {
  camera: {
    /** Peak positional offset from the base pose, per axis. */
    position: { x: 0.35, y: 0.18, z: 0.45 },
    /** Peak offset applied to the look-at target. */
    target: { x: 0.12, y: 0.08 },
    /** Peak roll around the view axis. */
    roll: 0.012,
    /**
     * Incommensurate frequencies so the path never visibly repeats.
     * [posX a, posX b, posY a, posY b, posZ, roll]
     */
    frequencies: [0.21, 0.37, 0.17, 0.29, 0.13, 0.19],
  },
  beams: {
    /** Sway around the beam's own tilt. */
    sway: 0.05,
    swayRate: 0.11,
    /** Slow rotation of the tilted beam around the vertical axis. */
    sweepRate: 0.03,
  },
  particles: {
    /** Vertical rise speed. */
    rise: 0.35,
    /** Lateral sway amplitude. */
    sway: 0.6,
  },
  fog: {
    /** Noise field scroll speed for the backdrop. */
    speed: 0.02,
  },
} as const;

/** Soft periodic intensity changes that read as the room breathing. */
export const breathing = {
  keyLight: { amplitude: 0.08, rate: 0.35 },
  floorPulse: { rate: 0.4 },
} as const;
