"use client";

import { useEffect, useState } from "react";

export type WebGLSupport = "unknown" | "supported" | "unsupported";

/** Probes for a WebGL 2 (or WebGL 1) context once on the client. */
export function useWebGLSupport(): WebGLSupport {
  const [support, setSupport] = useState<WebGLSupport>("unknown");

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      setSupport(gl ? "supported" : "unsupported");
    } catch {
      setSupport("unsupported");
    }
  }, []);

  return support;
}
