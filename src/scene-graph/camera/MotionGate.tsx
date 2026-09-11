"use client";

import { useFrame } from "@react-three/fiber";
import { useSceneStore } from "@/stores/sceneStore";

/** Advances the ambient motion easing once per frame, before anything reads it. */
export function MotionGate() {
  useFrame((_, delta) => {
    useSceneStore.getState().tickMotion(Math.min(delta, 0.1));
  }, -1);
  return null;
}
