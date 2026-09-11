/**
 * Puts the MediaPipe hand-tracking assets under public/vision so the app serves them
 * itself and works offline in the homelab. Runs on postinstall and via
 * `npm run vision:assets`; safe to re-run.
 *
 * - The wasm loader and binaries are copied from the installed
 *   @mediapipe/tasks-vision package, so they always match its version.
 * - The hand landmarker model is not part of the npm package. It is downloaded once
 *   from Google's model storage; on an offline machine, place the file manually at
 *   public/vision/models/hand_landmarker.task.
 */
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
// The package only exports its entry points, so locate the wasm folder through one of them.
const wasmSourceDir = dirname(require.resolve("@mediapipe/tasks-vision/vision_wasm_internal.js"));

const WASM_FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const outDir = join(process.cwd(), "public", "vision");
const wasmDir = join(outDir, "wasm");
const modelPath = join(outDir, "models", "hand_landmarker.task");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

await mkdir(wasmDir, { recursive: true });
await mkdir(dirname(modelPath), { recursive: true });

for (const file of WASM_FILES) {
  await copyFile(join(wasmSourceDir, file), join(wasmDir, file));
}
console.log(`[vision] wasm files copied to public/vision/wasm (${WASM_FILES.length} files)`);

if (await exists(modelPath)) {
  console.log("[vision] model already present at public/vision/models/hand_landmarker.task");
} else {
  try {
    const response = await fetch(MODEL_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    await writeFile(modelPath, bytes);
    console.log(`[vision] model downloaded (${(bytes.byteLength / 1e6).toFixed(1)} MB)`);
  } catch (error) {
    console.warn(
      `[vision] could not download the hand landmarker model (${error.message}).\n` +
        `         Hand tracking will report itself unavailable and the mouse stays active.\n` +
        `         To fix offline: download ${MODEL_URL}\n` +
        `         and save it as public/vision/models/hand_landmarker.task`,
    );
  }
}
