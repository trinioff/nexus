# stores

Global client state (Zustand). One store per concern. Frame-loop code reads with
`useStore.getState()` inside `useFrame` rather than subscribing, so a state change never
re-renders the scene graph.
