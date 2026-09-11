# physics

The spring and orbit maths that move cards. `orbit.ts` is pure geometry: slot angles on
the ring, positions from an angle, which slot is nearest the front, and the shortest ring
rotation that brings a card to the front. Springs themselves are React Spring values
owned by the scene components; their presets live in `animations/motion.ts`.

Phase 1 specifies a Rapier drop-with-physics on pinch release. It arrives with the
gesture engine and lives here, and Phase 6 removes it again (released cards then return
to their orbit slot on the spring). Keep the orbit maths independent of Rapier so that
removal is clean.
