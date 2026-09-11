# gesture-engine

Turns input into carousel intents. `CarouselController` is the contract every input
source drives: drag start/move/end, tap, dismiss. `pointer/` is the mouse fallback that
exists today. Hand tracking (MediaPipe Tasks Vision) will be a second source producing the
same intents; the scene graph never talks to an input device directly.
