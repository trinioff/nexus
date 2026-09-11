# gesture-engine

Turns input into carousel intents. `CarouselController` is the contract every input
source drives: drag start/move/end, tap, dismiss, rotate. Two sources exist:

- `pointer/` the mouse and touch fallback, always active.
- `hands/` MediaPipe hand tracking. `HandTracker` wraps the landmarker (wasm and model
  served from `public/vision`, imported on demand), `camera.ts` opens the webcam and
  names every failure, `GestureRecognizer` is the pure landmarks-to-gestures state
  machine, `HandCarouselMapper` maps gestures onto the controller with the mouse's
  press / drag / tap semantics, and `useHandCarouselInput` is the React glue that runs
  the loop and reports status to the hand store.

Every threshold lives in `tuning.ts` under a name with its unit. The scene graph never
talks to an input device directly: it reads the hand store for the cursor and status.
