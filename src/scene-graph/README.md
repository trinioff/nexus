# scene-graph

What is in the world and where. `NexusScene` composes the room from independent
pieces, each in its own folder:

- `environment/` the procedural fog backdrop and the floor that dissolves into it
- `atmosphere/` drifting particles and slow-sweeping light beams
- `lighting/` the light rig
- `camera/` the floating camera drift

Each piece owns its geometry, material and per-frame update. Tunables come from
`animations/motion.ts`; colours from `rendering/palette.ts`. Cards, hand tracking and
the HUD are not here yet.
