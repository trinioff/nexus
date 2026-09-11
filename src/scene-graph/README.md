# scene-graph

What is in the world and where. `NexusScene` composes the room from independent
pieces, each in its own folder:

- `environment/` the procedural fog backdrop and the floor that dissolves into it
- `atmosphere/` drifting particles and slow-sweeping light beams
- `lighting/` the light rig and the procedural environment map for glass reflections
- `camera/` the floating camera drift and `MotionGate`, which eases the ambient multiplier
- `carousel/` the ring of module cards: `Carousel` owns the ring spring, hit testing,
  the controller that input sources drive and focused-card tracking; `Card` composes
  one card's pose every frame from its orbit spring, its state springs and its idle float
- `hand/` the hand cursor, a ring floating where the tracked hand points; it reads the
  hand store and knows nothing about MediaPipe

Each piece owns its geometry, material and per-frame update. Tunables come from
`animations/motion.ts` and `animations/cardMotion.ts`; colours from
`rendering/palette.ts`. Hand tracking and the HUD are not here yet.
