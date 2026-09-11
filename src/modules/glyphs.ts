/**
 * Placeholder line glyphs, one per module, drawn on a 2D canvas that is already
 * translated to the glyph centre with stroke style, width and caps set by the caller.
 * `s` is the glyph box size; every glyph stays inside [-s/2, s/2] on both axes.
 */
export type Glyph = (ctx: CanvasRenderingContext2D, s: number) => void;

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

const calendar: Glyph = (ctx, s) => {
  roundedRect(ctx, -0.4 * s, -0.3 * s, 0.8 * s, 0.68 * s, 0.06 * s);
  ctx.stroke();
  line(ctx, -0.4 * s, -0.1 * s, 0.4 * s, -0.1 * s);
  line(ctx, -0.2 * s, -0.42 * s, -0.2 * s, -0.22 * s);
  line(ctx, 0.2 * s, -0.42 * s, 0.2 * s, -0.22 * s);
  dot(ctx, -0.18 * s, 0.14 * s, 0.045 * s);
};

const weather: Glyph = (ctx, s) => {
  circle(ctx, -0.1 * s, -0.12 * s, 0.22 * s);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    line(ctx, -0.1 * s + Math.cos(a) * 0.3 * s, -0.12 * s + Math.sin(a) * 0.3 * s, -0.1 * s + Math.cos(a) * 0.38 * s, -0.12 * s + Math.sin(a) * 0.38 * s);
  }
  ctx.beginPath();
  ctx.moveTo(-0.28 * s, 0.34 * s);
  ctx.arc(-0.14 * s, 0.34 * s, 0.14 * s, Math.PI, 0, false);
  ctx.arc(0.12 * s, 0.3 * s, 0.2 * s, Math.PI * 1.1, Math.PI * 1.95, false);
  ctx.lineTo(0.36 * s, 0.34 * s);
  ctx.closePath();
  const fill = ctx.fillStyle;
  ctx.fillStyle = "#03060d";
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.stroke();
};

const music: Glyph = (ctx, s) => {
  const heights = [0.28, 0.6, 0.42, 0.7, 0.34];
  heights.forEach((h, i) => {
    const x = (-0.36 + i * 0.18) * s;
    line(ctx, x, 0.36 * s, x, (0.36 - h) * s);
  });
};

const projects: Glyph = (ctx, s) => {
  ctx.beginPath();
  ctx.moveTo(-0.38 * s, -0.16 * s);
  ctx.lineTo(0, -0.38 * s);
  ctx.lineTo(0.38 * s, -0.16 * s);
  ctx.lineTo(0, 0.06 * s);
  ctx.closePath();
  ctx.stroke();
  [0.04, 0.24].forEach((dy) => {
    ctx.beginPath();
    ctx.moveTo(-0.38 * s, dy * s);
    ctx.lineTo(0, (dy + 0.22) * s);
    ctx.lineTo(0.38 * s, dy * s);
    ctx.stroke();
  });
};

const finance: Glyph = (ctx, s) => {
  ctx.beginPath();
  ctx.moveTo(-0.38 * s, 0.24 * s);
  ctx.lineTo(-0.14 * s, 0.0);
  ctx.lineTo(0.04 * s, 0.12 * s);
  ctx.lineTo(0.38 * s, -0.3 * s);
  ctx.stroke();
  line(ctx, 0.2 * s, -0.3 * s, 0.38 * s, -0.3 * s);
  line(ctx, 0.38 * s, -0.3 * s, 0.38 * s, -0.12 * s);
  line(ctx, -0.4 * s, 0.4 * s, 0.4 * s, 0.4 * s);
};

const pterodactyl: Glyph = (ctx, s) => {
  [-0.36, 0.04].forEach((y) => {
    roundedRect(ctx, -0.38 * s, y * s, 0.76 * s, 0.3 * s, 0.05 * s);
    ctx.stroke();
    dot(ctx, -0.24 * s, (y + 0.15) * s, 0.04 * s);
    line(ctx, -0.06 * s, (y + 0.15) * s, 0.24 * s, (y + 0.15) * s);
  });
};

const hashira: Glyph = (ctx, s) => {
  line(ctx, -0.16 * s, 0.16 * s, 0.36 * s, -0.36 * s);
  line(ctx, 0.36 * s, -0.36 * s, 0.4 * s, -0.24 * s);
  line(ctx, -0.28 * s, 0.04 * s, -0.04 * s, 0.28 * s);
  line(ctx, -0.16 * s, 0.16 * s, -0.38 * s, 0.38 * s);
};

const nanos: Glyph = (ctx, s) => {
  circle(ctx, 0, 0, 0.38 * s);
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.16 * s, 0.38 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
  line(ctx, -0.38 * s, 0, 0.38 * s, 0);
  line(ctx, -0.3 * s, -0.2 * s, 0.3 * s, -0.2 * s);
  line(ctx, -0.3 * s, 0.2 * s, 0.3 * s, 0.2 * s);
};

const infra: Glyph = (ctx, s) => {
  const nodes: [number, number][] = [
    [-0.32, 0.22],
    [0.32, 0.22],
    [0, -0.32],
  ];
  nodes.forEach(([x, y]) => line(ctx, x * s, y * s, 0, 0));
  nodes.forEach(([x, y]) => circle(ctx, x * s, y * s, 0.08 * s));
  dot(ctx, 0, 0, 0.06 * s);
};

const automation: Glyph = (ctx, s) => {
  circle(ctx, 0, 0, 0.2 * s);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    line(ctx, Math.cos(a) * 0.28 * s, Math.sin(a) * 0.28 * s, Math.cos(a) * 0.4 * s, Math.sin(a) * 0.4 * s);
  }
  dot(ctx, 0, 0, 0.05 * s);
};

const ai: Glyph = (ctx, s) => {
  const star = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx, cy, cx + r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + r);
    ctx.quadraticCurveTo(cx, cy, cx - r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - r);
    ctx.closePath();
    ctx.stroke();
  };
  star(-0.06 * s, 0.04 * s, 0.38 * s);
  star(0.28 * s, -0.28 * s, 0.12 * s);
};

const news: Glyph = (ctx, s) => {
  roundedRect(ctx, -0.3 * s, -0.38 * s, 0.6 * s, 0.76 * s, 0.05 * s);
  ctx.stroke();
  line(ctx, -0.16 * s, -0.18 * s, 0.16 * s, -0.18 * s);
  line(ctx, -0.16 * s, -0.02 * s, 0.16 * s, -0.02 * s);
  line(ctx, -0.16 * s, 0.14 * s, 0.04 * s, 0.14 * s);
};

export const glyphs = {
  calendar,
  weather,
  music,
  projects,
  finance,
  pterodactyl,
  hashira,
  nanos,
  infra,
  automation,
  ai,
  news,
} as const;
