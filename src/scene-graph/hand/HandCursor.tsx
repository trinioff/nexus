"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, CircleGeometry, Group, MathUtils, Mesh, MeshBasicMaterial, RingGeometry, Vector3 } from "three";
import { handCursor } from "@/animations/motion";
import { palette } from "@/rendering/palette";
import { useHandStore } from "@/stores/handStore";

/** Distance in front of the camera at which the cursor floats. */
const CURSOR_DISTANCE = 3.2;

const point = new Vector3();
const target = new Vector3();

/**
 * Where the hand is pointing: a thin ring with a centre dot, floating in front of the
 * camera at the hand's projected position. Detections arrive at camera rate, so the
 * ring closes on each new position with a short time constant every rendered frame,
 * which reads as continuous motion. It tightens on a pinch, opens a little on an open
 * hand, and fades out when no hand is tracked. Reads the hand store; knows nothing
 * about MediaPipe.
 */
export function HandCursor() {
  const group = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const presence = useRef(0);
  const ringScale = useRef(1);
  const placed = useRef(false);

  const geometries = useMemo(() => ({ ring: new RingGeometry(0.07, 0.085, 48), dot: new CircleGeometry(0.018, 24) }), []);
  const materials = useMemo(
    () => ({
      ring: new MeshBasicMaterial({ color: palette.ice, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
      dot: new MeshBasicMaterial({ color: palette.white, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    }),
    [],
  );
  useEffect(
    () => () => {
      geometries.ring.dispose();
      geometries.dot.dispose();
      materials.ring.dispose();
      materials.dot.dispose();
    },
    [geometries, materials],
  );

  useFrame(({ camera }, delta) => {
    const g = group.current;
    if (!g) return;
    const { status, hand } = useHandStore.getState();
    const visible = status === "active" && hand.present;

    presence.current = MathUtils.damp(presence.current, visible ? 1 : 0, 14, delta);
    if (presence.current < 0.001) {
      g.visible = false;
      placed.current = false;
      return;
    }
    g.visible = true;

    if (visible) {
      point.set(hand.cursor.x, hand.cursor.y, 0.5).unproject(camera).sub(camera.position).normalize();
      target.copy(camera.position).addScaledVector(point, CURSOR_DISTANCE);
      if (!placed.current) {
        g.position.copy(target);
        placed.current = true;
      } else {
        g.position.lerp(target, 1 - Math.exp(-delta / handCursor.followSeconds));
      }
    }
    g.quaternion.copy(camera.quaternion);
    g.scale.setScalar(presence.current);

    const targetRing = hand.pinching ? 0.5 : hand.openness === "open" ? 1.2 : 1;
    ringScale.current = MathUtils.damp(ringScale.current, targetRing, 18, delta);
    if (ring.current) ring.current.scale.setScalar(ringScale.current);
    materials.ring.opacity = hand.pinching ? 1 : 0.75;
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={ring} geometry={geometries.ring} material={materials.ring} />
      <mesh geometry={geometries.dot} material={materials.dot} />
    </group>
  );
}
