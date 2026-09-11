"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { CarouselController } from "../CarouselController";
import { drag } from "@/animations/motion";

export type HitTest = (clientX: number, clientY: number) => string | null;

interface Sample {
  t: number;
  x: number;
}

/**
 * Mouse and touch fallback for the carousel. Listens on the canvas element: a press
 * that travels less than the drag threshold is a tap on whatever `hitTest` finds under
 * it; further travel becomes a ring drag with release velocity measured over the last
 * moments of movement.
 */
export function usePointerCarouselInput(controller: CarouselController, hitTest: HitTest, radiansPerPixel: number) {
  const gl = useThree((s) => s.gl);
  const latest = useRef({ controller, hitTest, radiansPerPixel });
  latest.current = { controller, hitTest, radiansPerPixel };

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";

    let active = false;
    let pointerId = -1;
    let startX = 0;
    let lastX = 0;
    let moved = false;
    let pressed: string | null = null;
    let samples: Sample[] = [];

    const onDown = (e: PointerEvent) => {
      if (active || (e.pointerType === "mouse" && e.button !== 0)) return;
      active = true;
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      moved = false;
      pressed = latest.current.hitTest(e.clientX, e.clientY);
      samples = [{ t: e.timeStamp, x: e.clientX }];
      el.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!active || e.pointerId !== pointerId) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      if (!moved) {
        if (Math.abs(e.clientX - startX) < drag.thresholdPx) return;
        moved = true;
        latest.current.controller.dragStart(pressed);
      }
      latest.current.controller.dragMove(dx * latest.current.radiansPerPixel);
      samples.push({ t: e.timeStamp, x: e.clientX });
      if (samples.length > 10) samples.shift();
    };

    const finish = (e: PointerEvent, cancelled: boolean) => {
      if (!active || e.pointerId !== pointerId) return;
      active = false;
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
      if (!moved) {
        if (!cancelled) latest.current.controller.tap(pressed);
        return;
      }
      const recent = samples.filter((s) => e.timeStamp - s.t <= 100);
      const first = recent[0] ?? samples[0];
      const dt = (e.timeStamp - first.t) / 1000;
      const velocity = !cancelled && dt > 0.016 ? ((e.clientX - first.x) / dt) * latest.current.radiansPerPixel : 0;
      latest.current.controller.dragEnd(velocity);
    };

    const onUp = (e: PointerEvent) => finish(e, false);
    const onCancel = (e: PointerEvent) => finish(e, true);

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
    };
  }, [gl]);
}
