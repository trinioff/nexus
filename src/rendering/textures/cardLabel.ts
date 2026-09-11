import { CanvasTexture, SRGBColorSpace } from "three";
import type { ModuleDef } from "@/modules/registry";
import { palette } from "../palette";

/** Canvas size for a card label. Aspect matches the card face (1.5 : 2.0). */
export const LABEL_TEXTURE = { width: 512, height: 688 } as const;

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Draws text centred on `x` with manual letter spacing (canvas letterSpacing is not universal). */
function drawSpaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = x - total / 2;
  ctx.textAlign = "left";
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
}

/**
 * Renders a module's placeholder face (index, glyph, accent bar, name) into a texture.
 * Uses system fonts only, so it works offline and never blocks on a font download.
 */
export function createCardLabelTexture(module: ModuleDef, index: number, maxAnisotropy = 4): CanvasTexture {
  const { width, height } = LABEL_TEXTURE;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  ctx.clearRect(0, 0, width, height);

  // Index, top left.
  ctx.font = `500 26px ${MONO}`;
  ctx.fillStyle = withAlpha(palette.ice, 0.55);
  ctx.textBaseline = "alphabetic";
  drawSpaced(ctx, String(index + 1).padStart(2, "0"), 70, 76, 4);

  // Glyph, upper centre.
  ctx.save();
  ctx.translate(width / 2, 284);
  ctx.strokeStyle = module.accent;
  ctx.fillStyle = module.accent;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  module.glyph(ctx, 170);
  ctx.restore();

  // Accent bar between glyph and name.
  ctx.fillStyle = module.accent;
  ctx.fillRect(width / 2 - 22, 474, 44, 3);

  // Name, lower centre. Long lines get a smaller size so they never touch the edges.
  const lines = module.label.map((l) => l.toUpperCase());
  const longest = Math.max(...lines.map((l) => l.length));
  const fontSize = longest > 11 ? 34 : 42;
  const lineHeight = fontSize + 12;
  ctx.font = `600 ${fontSize}px ${SANS}`;
  ctx.fillStyle = palette.white;
  ctx.textBaseline = "middle";
  const y0 = 556 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => drawSpaced(ctx, l, width / 2, y0 + i * lineHeight, fontSize * 0.12));

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}
