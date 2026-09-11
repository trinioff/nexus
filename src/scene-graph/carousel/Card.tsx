"use client";

import { type SpringValue, useSpring } from "@react-spring/three";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { type Group, type Mesh, type MeshBasicMaterial, type MeshPhysicalMaterial, Vector3 } from "three";
import {
  CARD_TARGETS,
  EXPAND,
  FOCUS,
  PARALLAX,
  SELECTED_PULSE_PERIOD,
  transitionConfig,
} from "@/animations/cardMotion";
import { cardIdle, drag, springs } from "@/animations/motion";
import type { ModuleDef } from "@/modules/registry";
import { facingYaw, lerpAngle, orbitPosition, slotAngle } from "@/physics/orbit";
import { createCardFrameMaterial } from "@/rendering/materials/cardFrame";
import { palette } from "@/rendering/palette";
import { createCardLabelTexture } from "@/rendering/textures/cardLabel";
import { selectCardState, useCarouselStore } from "@/stores/carouselStore";
import { useSceneStore } from "@/stores/sceneStore";
import { clamp, TAU } from "@/utils/math";
import { mulberry32 } from "@/utils/random";
import { CAMERA_BASE } from "../camera/CameraRig";
import type { CardGeometries } from "./Carousel";
import { CARD, READING_POSITION, RING } from "./constants";

interface CardProps {
  module: ModuleDef;
  index: number;
  count: number;
  /** The ring's rotation, owned by the carousel. */
  ringAngle: SpringValue<number>;
  geometries: CardGeometries;
  registerMesh: (id: string, mesh: Mesh | null) => void;
}

const orbitPoint = new Vector3();
const position = new Vector3();
const local = new Vector3();

/**
 * One module card: a glass slab, an additive frame plane (halo, border, highlight,
 * pulse) and the label face. Its pose is composed every frame from three sources: the
 * orbit angle spring that tracks the ring, the state springs (lift, scale, tilt, glow),
 * and a seeded idle float. The expanded state blends the whole pose toward the reading
 * position.
 */
export function Card({ module, index, count, ringAngle, geometries, registerMesh }: CardProps) {
  const group = useRef<Group>(null);
  const glass = useRef<Mesh>(null);
  const glassMaterial = useRef<MeshPhysicalMaterial>(null);
  const labelMaterial = useRef<MeshBasicMaterial>(null);
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  const state = useCarouselStore((s) => selectCardState(s, module.id));
  const otherExpanded = useCarouselStore((s) => s.expandedId !== null && s.expandedId !== module.id);
  const isDragged = state === "dragging";

  const slot = slotAngle(index, count);
  const seed = useMemo(() => {
    const rand = mulberry32(0x43415244 + index); // "CARD" + index
    const [f0, f1] = cardIdle.frequency;
    const [t0, t1] = cardIdle.tiltFrequency;
    return {
      phase: rand() * TAU,
      frequency: f0 + rand() * (f1 - f0),
      tiltPhase: rand() * TAU,
      tiltFrequency: t0 + rand() * (t1 - t0),
    };
  }, [index]);

  const labelTexture = useMemo(() => createCardLabelTexture(module, index, maxAnisotropy), [module, index, maxAnisotropy]);
  useEffect(() => () => labelTexture.dispose(), [labelTexture]);

  const frameMaterial = useMemo(
    () => createCardFrameMaterial({ half: [CARD.width / 2, CARD.height / 2], radius: CARD.radius, accent: module.accent }),
    [module.accent],
  );
  useEffect(() => () => frameMaterial.dispose(), [frameMaterial]);

  useEffect(() => {
    const mesh = glass.current;
    if (!mesh) return;
    mesh.userData.cardId = module.id;
    registerMesh(module.id, mesh);
    return () => registerMesh(module.id, null);
  }, [module.id, registerMesh]);

  useEffect(() => {
    if (group.current) group.current.rotation.order = "YXZ";
  }, []);

  // State springs: rest values per state, plus the transient channels.
  const [sv, api] = useSpring(() => ({
    ...CARD_TARGETS.idle,
    tiltX: 0,
    tiltY: 0,
    highlight: 0,
    expand: 0,
    recede: 0,
    pulse: 0,
    config: springs.leaving,
  }));

  // Orbit spring: tracks slot + ring, lagging while the ring is dragged.
  const [orbit, orbitApi] = useSpring(() => ({ angle: slot + ringAngle.get(), config: springs.tracking }));

  useEffect(() => {
    api.start({
      ...CARD_TARGETS[state],
      expand: state === "expanded" ? 1 : 0,
      pulse: state === "selected" ? 1 : 0,
      config: transitionConfig(state),
    });
  }, [state, api]);

  useEffect(() => {
    api.start({ recede: otherExpanded ? 1 : 0, config: otherExpanded ? springs.arriving : springs.leaving });
  }, [otherExpanded, api]);

  const highlightAngle = useRef(0);

  const onPointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!useCarouselStore.getState().isDragging) useCarouselStore.getState().setHovered(module.id);
  };

  const onPointerOut = () => {
    const s = useCarouselStore.getState();
    if (s.hoveredId === module.id) s.setHovered(null);
    api.start({ tiltX: 0, tiltY: 0, highlight: 0, config: springs.leaving });
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const g = group.current;
    if (!g || useCarouselStore.getState().isDragging) return;
    local.copy(e.point);
    g.worldToLocal(local);
    const nx = clamp(local.x / (CARD.width / 2), -1, 1);
    const ny = clamp(local.y / (CARD.height / 2), -1, 1);
    highlightAngle.current = Math.atan2(local.y, local.x);
    api.start({ tiltX: ny * PARALLAX.tilt, tiltY: -nx * PARALLAX.tilt, highlight: 1, config: springs.parallax });
  };

  const lastTarget = useRef(Number.NaN);
  const lastAngle = useRef(slot);
  const angularVelocity = useRef(0);
  const pulseStart = useRef(-1);

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const motion = useSceneStore.getState().motion;
    const { isDragging } = useCarouselStore.getState();

    // 1. Follow the ring. Immediate for the card under the hand, lagging for the rest.
    const target = slot + ringAngle.get();
    if (target !== lastTarget.current) {
      lastTarget.current = target;
      orbitApi.start({ angle: target, immediate: isDragged, config: isDragging ? springs.following : springs.tracking });
    }
    const angle = orbit.angle.get();
    const dt = Math.max(delta, 1e-3);
    const velocity = (angle - lastAngle.current) / dt;
    lastAngle.current = angle;
    angularVelocity.current += (velocity - angularVelocity.current) * Math.min(1, dt * 12);

    // 2. Orbit pose: on the ring, facing the user, lifted or receded along that facing.
    orbitPosition(angle, RING.radius, RING.y, orbitPoint);
    const yaw = facingYaw(orbitPoint.x, orbitPoint.z, CAMERA_BASE.x, CAMERA_BASE.z);
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);
    const expand = sv.expand.get();
    const idle = motion * (1 - expand);
    const floatY = idle * cardIdle.amplitude * Math.sin(t * seed.frequency + seed.phase);
    const floatTilt = idle * cardIdle.tilt * Math.sin(t * seed.tiltFrequency + seed.tiltPhase);
    const along = sv.lift.get() - sv.recede.get() * EXPAND.recedeDistance;
    position.set(orbitPoint.x + forwardX * along, orbitPoint.y + floatY, orbitPoint.z + forwardZ * along);

    // 3. Expanded: blend the pose toward the reading position. Ring motion leans the card.
    position.lerp(READING_POSITION, expand);
    const lean = clamp(angularVelocity.current * drag.leanPerRadianPerSecond, -drag.leanMax, drag.leanMax) * (isDragged ? 1.6 : 1);
    g.position.copy(position);
    g.rotation.set(sv.tiltX.get() + floatTilt, lerpAngle(yaw, 0, expand) + sv.tiltY.get() + lean, 0);
    g.scale.setScalar(sv.scale.get() * (1 + expand * EXPAND.scale));

    // 4. Materials.
    const recede = sv.recede.get();
    const dim = 1 - recede * EXPAND.recedeDim;
    if (glassMaterial.current) {
      glassMaterial.current.opacity = sv.glassOpacity.get() * dim;
      glassMaterial.current.emissiveIntensity = 0.05 + sv.glow.get() * 0.18;
    }
    if (labelMaterial.current) labelMaterial.current.opacity = sv.labelOpacity.get() * dim;

    const u = frameMaterial.uniforms;
    u.uGlow.value = sv.glow.get() * (1 - recede);
    u.uBorder.value = sv.border.get() * (1 - recede * 0.6);
    if (state === "focused") {
      u.uHighlight.value = Math.max(sv.highlight.get(), FOCUS.highlight);
      u.uHighlightAngle.value = t * FOCUS.sweepRate;
    } else {
      u.uHighlight.value = sv.highlight.get();
      u.uHighlightAngle.value = highlightAngle.current;
    }

    const pulseStrength = sv.pulse.get();
    if (state === "selected" && pulseStart.current < 0) pulseStart.current = t;
    if (state !== "selected") pulseStart.current = -1;
    if (pulseStrength > 0.001 && pulseStart.current >= 0) {
      u.uPulse.value = ((t - pulseStart.current) % SELECTED_PULSE_PERIOD) / SELECTED_PULSE_PERIOD;
      u.uPulseStrength.value = pulseStrength;
    } else {
      u.uPulseStrength.value = 0;
    }
  });

  return (
    <group ref={group}>
      <mesh
        ref={glass}
        geometry={geometries.slab}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onPointerMove={onPointerMove}
      >
        <meshPhysicalMaterial
          ref={glassMaterial}
          color={palette.haze}
          emissive={module.accent}
          emissiveIntensity={0.05}
          roughness={0.14}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.08}
          envMapIntensity={2}
          transparent
          opacity={CARD_TARGETS.idle.glassOpacity}
        />
      </mesh>
      <mesh geometry={geometries.frame} material={frameMaterial} position={[0, 0, CARD.depth / 2 + 0.006]} />
      <mesh geometry={geometries.label} position={[0, 0, CARD.depth / 2 + 0.02]}>
        <meshBasicMaterial
          ref={labelMaterial}
          map={labelTexture}
          transparent
          opacity={CARD_TARGETS.idle.labelOpacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
