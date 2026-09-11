import { ExtrudeGeometry, Shape } from "three";

/**
 * A thin rounded-rectangle slab with a small edge bevel, centred on the origin, front
 * face toward +z. Unlike drei's RoundedBox the corner radius is independent of the
 * depth, so a thin card can still have generous corners.
 */
export function createCardSlabGeometry(width: number, height: number, depth: number, radius: number): ExtrudeGeometry {
  const w = width / 2;
  const h = height / 2;
  const r = radius;

  const shape = new Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(w, h - r);
  shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-w + r, h);
  shape.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-w, -h + r);
  shape.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false);
  shape.closePath();

  const bevel = Math.min(0.012, depth / 4);
  const body = depth - bevel * 2;
  const geometry = new ExtrudeGeometry(shape, {
    depth: body,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -body / 2);
  return geometry;
}
