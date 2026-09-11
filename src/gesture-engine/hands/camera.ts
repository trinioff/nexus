export type CameraErrorKind = "denied" | "unavailable" | "insecure" | "error";

export class CameraError extends Error {
  constructor(
    public readonly kind: CameraErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "CameraError";
  }
}

export interface CameraFormat {
  width: number;
  height: number;
  frameRate: number;
}

/**
 * Opens the user-facing camera. Every failure becomes a CameraError with a kind the
 * UI can explain: permission denied, no camera, insecure context, or anything else.
 */
export async function openCamera(format: CameraFormat): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      throw new CameraError("insecure", "The camera needs a secure context (HTTPS or localhost).");
    }
    throw new CameraError("unavailable", "This browser has no camera access API.");
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: format.width },
        height: { ideal: format.height },
        frameRate: { ideal: format.frameRate },
      },
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    switch (name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
      case "SecurityError":
        throw new CameraError("denied", "Camera access was denied.");
      case "NotFoundError":
      case "DevicesNotFoundError":
      case "OverconstrainedError":
        throw new CameraError("unavailable", "No camera was found.");
      case "NotReadableError":
      case "TrackStartError":
        throw new CameraError("error", "The camera is in use by another application.");
      default: {
        const detail = error instanceof Error ? `${name || error.name}: ${error.message}` : "Camera could not be opened.";
        throw new CameraError("error", detail);
      }
    }
  }
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
