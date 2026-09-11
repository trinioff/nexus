# physics

The spring and orbit maths that move cards. `orbit.ts` is pure geometry: slot angles on
the ring, positions from an angle, which slot is nearest the front, and the shortest ring
rotation that brings a card to the front. Springs themselves are React Spring values
owned by the scene components; their presets live in `animations/motion.ts`.

Per Phase 6 of the spec, cards are never handed to a rigid-body simulation: a released
card returns to its orbit slot on a spring. Do not add Rapier here.
