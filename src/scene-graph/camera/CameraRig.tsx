"use client";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { drifting } from "@/animations/motion";
import { useSceneStore } from "@/stores/sceneStore";

/** Resting pose. With `motion` at 0 the camera sits here exactly. */
export const CAMERA_BASE = new Vector3(0, 0.8, 9);
export const CAMERA_TARGET = new Vector3(0, 0.4, 0);

const target = new Vector3();

/**
 * Makes the camera feel like it is floating: layered sines with incommensurate
 * frequencies push the position and the look-at target around the base pose, plus a
 * hint of roll. Everything is multiplied by the store's motion value, so the offset is
 * exactly zero when motion is zero and no easing can leave a residual drift.
 */
export function CameraRig() {
  useFrame(({ camera, clock }) => {
    const m = useSceneStore.getState().motion;
    const t = clock.elapsedTime;
    const { position, target: targetAmp, roll, frequencies } = drifting.camera;
    const [fxA, fxB, fyA, fyB, fz, fRoll] = frequencies;

    const dx = position.x * (Math.sin(t * fxA) * 0.6 + Math.sin(t * fxB + 1.3) * 0.4);
    const dy = position.y * (Math.sin(t * fyA + 2.1) * 0.7 + Math.sin(t * fyB) * 0.3);
    const dz = position.z * Math.sin(t * fz + 0.7);

    camera.position.set(
      CAMERA_BASE.x + m * dx,
      CAMERA_BASE.y + m * dy,
      CAMERA_BASE.z + m * dz,
    );

    target.set(
      CAMERA_TARGET.x + m * targetAmp.x * Math.sin(t * fxB * 0.7 + 0.4),
      CAMERA_TARGET.y + m * targetAmp.y * Math.sin(t * fyA * 0.8 + 1.9),
      CAMERA_TARGET.z,
    );
    camera.lookAt(target);
    camera.rotateZ(m * roll * Math.sin(t * fRoll));
  });

  return null;
}
