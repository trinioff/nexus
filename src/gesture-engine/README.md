# gesture-engine

Turns input into carousel intents. `CarouselController` is the contract every input
source drives: drag start/move/end, tap, dismiss, rotate. Two sources exist:

- `pointer/` the mouse and touch fallback, always active.
- `hands/` MediaPipe hand tracking. `hand.worker.ts` runs the landmarker off the main
  thread (frames pulled from the camera stream on Chromium, posted as bitmaps
  elsewhere); `HandTracker` picks the worker or, failing that, main-thread detection;
  `camera.ts` opens the webcam and names every failure; `GestureRecognizer` is the pure
  landmarks-to-gestures state machine (One Euro filtered cursor, pinch, open-hand
  sweep, palm held still); `HandCarouselMapper` maps gestures onto the controller
  (sweep = ring drag, pinch = tap); `useHandCarouselInput` is the React glue that
  reports status to the hand store and replaces a worker that never reports ready or
  goes silent with main-thread detection. Wasm and model are served from
  `public/vision`.

Every threshold lives in `tuning.ts` under a name with its unit. The scene graph never
talks to an input device directly: it reads the hand store for the cursor and status.
