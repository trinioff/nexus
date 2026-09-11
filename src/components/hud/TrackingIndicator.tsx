"use client";

import { useEffect, useState } from "react";
import { type GestureLabel, useHandStore } from "@/stores/handStore";

const GESTURE_TEXT: Record<GestureLabel, string> = {
  "swipe-left": "SWIPE ←",
  "swipe-right": "SWIPE →",
  pinch: "PINCH",
  release: "RELEASE",
  freeze: "FREEZE",
  unfreeze: "RESUME",
};

/** How long a detected gesture stays on screen, in milliseconds. */
const GESTURE_HOLD_MS = 900;

/**
 * Minimal tracking readout in the bottom-right corner: the seed of the final HUD's
 * "gesture detected / confidence" block, not the HUD itself. States the fallback
 * plainly whenever hands are not driving the scene, and offers a retry.
 */
export function TrackingIndicator() {
  const status = useHandStore((s) => s.status);
  const message = useHandStore((s) => s.message);
  const present = useHandStore((s) => s.hand.present);
  const lastGesture = useHandStore((s) => s.lastGesture);
  const retry = useHandStore((s) => s.retry);

  const [gestureText, setGestureText] = useState<string | null>(null);
  useEffect(() => {
    if (!lastGesture) return;
    setGestureText(GESTURE_TEXT[lastGesture.type]);
    const timer = window.setTimeout(() => setGestureText(null), GESTURE_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [lastGesture]);

  if (status === "off") return null;

  const warning = status === "denied" || status === "unavailable" || status === "insecure" || status === "error";
  const label =
    status === "starting"
      ? "HANDS · STARTING"
      : status === "active"
        ? present
          ? "HANDS · TRACKING"
          : "HANDS · SHOW A HAND"
        : status === "denied"
          ? "CAMERA DENIED · MOUSE ACTIVE"
          : status === "unavailable"
            ? "NO HAND TRACKING · MOUSE ACTIVE"
            : status === "insecure"
              ? "CAMERA NEEDS HTTPS · MOUSE ACTIVE"
              : "TRACKING ERROR · MOUSE ACTIVE";

  const hint =
    status === "denied"
      ? "Allow the camera in the browser's site settings, then retry."
      : warning
        ? message
        : null;

  return (
    <aside
      aria-live="polite"
      className="pointer-events-none fixed right-6 bottom-6 z-10 flex max-w-xs flex-col items-end gap-1 text-right font-mono text-[11px] tracking-[0.18em] text-nexus-ice/70 select-none"
    >
      {gestureText && <div className="text-nexus-white/90">{gestureText}</div>}
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            warning ? "bg-nexus-warning" : status === "starting" ? "animate-pulse bg-nexus-blue" : present ? "bg-nexus-ice" : "bg-nexus-ice/40"
          }`}
        />
      </div>
      {hint && <p className="max-w-[26ch] text-[10px] leading-relaxed tracking-normal text-nexus-ice/50">{hint}</p>}
      {warning && (
        <button
          type="button"
          onClick={retry}
          className="pointer-events-auto mt-1 rounded-full border border-nexus-ice/25 px-3 py-1 text-[10px] tracking-[0.18em] text-nexus-ice/80 transition-colors hover:border-nexus-ice/60 hover:text-nexus-white"
        >
          RETRY
        </button>
      )}
    </aside>
  );
}
