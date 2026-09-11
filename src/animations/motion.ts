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

/**
 * Spring presets named by intent. Every card and ring transition picks one of these;
 * no component defines its own tension/friction numbers.
 */
export const springs = {
  /** Quick response to attention: hover in, press. A touch of overshoot. */
  acknowledging: { tension: 420, friction: 26 },
  /** Something coming to you: select, expand. Carries weight and overshoots. */
  arriving: { mass: 1.2, tension: 190, friction: 21 },
  /** Returning to rest: no overshoot. */
  leaving: { tension: 210, friction: 30 },
  /** The ring settling onto a slot after a drag or a select. */
  orbit: { mass: 1, tension: 110, friction: 22 },
  /** Cards lagging behind the hand while the ring is dragged. */
  following: { mass: 1, tension: 230, friction: 24 },
  /** Cards tracking the ring when nothing is dragged: stiff, near-invisible. */
  tracking: { tension: 900, friction: 42 },
  /** Hover parallax tilt following the pointer. */
  parallax: { tension: 320, friction: 28 },
} as const;

/** Independent idle float of each card. Frequencies are ranges the seed picks from. */
export const cardIdle = {
  amplitude: 0.05,
  tilt: 0.02,
  frequency: [0.35, 0.65],
  tiltFrequency: [0.25, 0.5],
} as const;

/** Mouse drag of the ring. */
export const drag = {
  /** Pointer travel before a press becomes a drag rather than a tap. */
  thresholdPx: 6,
  /** How many slots a drag across the full viewport width moves the ring. */
  slotsPerViewportWidth: 5,
  /** Seconds of release velocity projected ahead before snapping to a slot. */
  flingProjection: 0.2,
  /** Yaw lean per radian/second of ring velocity, and its cap. */
  leanPerRadianPerSecond: 0.06,
  leanMax: 0.14,
} as const;
