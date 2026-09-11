"use client";

import { useSpring } from "@react-spring/three";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { type Mesh, PlaneGeometry, Raycaster, Vector2 } from "three";
import { drag, springs } from "@/animations/motion";
import type { CarouselController } from "@/gesture-engine/CarouselController";
import { usePointerCarouselInput } from "@/gesture-engine/pointer/usePointerCarouselInput";
import { MODULES } from "@/modules/registry";
import { nearestSlotIndex, ringAngleToFront, snapAngle } from "@/physics/orbit";
import { createCardSlabGeometry } from "@/rendering/geometry/cardSlab";
import { useCarouselStore } from "@/stores/carouselStore";
import { TAU } from "@/utils/math";
import { Card } from "./Card";
import { CARD, HALO_MARGIN } from "./constants";

export interface CardGeometries {
  slab: ReturnType<typeof createCardSlabGeometry>;
  frame: PlaneGeometry;
  label: PlaneGeometry;
}

/**
 * The ring of module cards. Owns the ring rotation spring, the controller that input
 * sources drive, hit testing against the glass meshes, and the focused-card tracking.
 */
export function Carousel() {
  const count = MODULES.length;
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const width = useThree((s) => s.size.width);

  const [ring, ringApi] = useSpring(() => ({ angle: 0, config: springs.orbit }));

  const geometries = useMemo<CardGeometries>(
    () => ({
      slab: createCardSlabGeometry(CARD.width, CARD.height, CARD.depth, CARD.radius),
      frame: new PlaneGeometry(CARD.width + HALO_MARGIN * 2, CARD.height + HALO_MARGIN * 2),
      label: new PlaneGeometry(CARD.width - 0.12, CARD.height - 0.12),
    }),
    [],
  );
  useEffect(
    () => () => {
      geometries.slab.dispose();
      geometries.frame.dispose();
      geometries.label.dispose();
    },
    [geometries],
  );

  const meshes = useRef(new Map<string, Mesh>());
  const registerMesh = useCallback((id: string, mesh: Mesh | null) => {
    if (mesh) meshes.current.set(id, mesh);
    else meshes.current.delete(id);
  }, []);

  const raycaster = useMemo(() => new Raycaster(), []);
  const hitTest = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects([...meshes.current.values()], false);
      return hits.length ? (hits[0].object.userData.cardId as string) : null;
    },
    [camera, gl, raycaster],
  );

  const dragAngle = useRef(0);
  const controller = useMemo<CarouselController>(() => {
    const dismiss = () => {
      const s = useCarouselStore.getState();
      if (s.expandedId) s.collapse();
      else if (s.selectedId) s.deselect();
    };
    return {
      dragStart(cardId) {
        ringApi.stop();
        dragAngle.current = ring.angle.get();
        useCarouselStore.getState().beginDrag(cardId);
      },
      dragMove(delta) {
        dragAngle.current += delta;
        ringApi.set({ angle: dragAngle.current });
      },
      dragEnd(velocity) {
        useCarouselStore.getState().endDrag();
        const target = snapAngle(dragAngle.current + velocity * drag.flingProjection, count);
        ringApi.start({ angle: target, config: springs.orbit });
      },
      tap(cardId) {
        if (cardId === null) {
          dismiss();
          return;
        }
        const s = useCarouselStore.getState();
        if (s.expandedId === cardId) {
          s.collapse();
        } else if (s.selectedId === cardId) {
          s.expand(cardId);
        } else {
          s.select(cardId);
          const index = MODULES.findIndex((m) => m.id === cardId);
          ringApi.start({ angle: ringAngleToFront(index, count, ring.angle.get()), config: springs.arriving });
        }
      },
      dismiss,
    };
  }, [count, ring, ringApi]);

  usePointerCarouselInput(controller, hitTest, (drag.slotsPerViewportWidth * TAU) / count / width);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") controller.dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controller]);

  // Pointer cursor mirrors the interaction state.
  useEffect(() => {
    const el = gl.domElement;
    const apply = (s: { isDragging: boolean; hoveredId: string | null }) => {
      el.style.cursor = s.isDragging ? "grabbing" : s.hoveredId ? "pointer" : "default";
    };
    apply(useCarouselStore.getState());
    return useCarouselStore.subscribe(apply);
  }, [gl]);

  // Whichever slot is nearest the front is the focused card.
  const lastFocused = useRef<string | null>(null);
  useFrame(() => {
    const id = MODULES[nearestSlotIndex(ring.angle.get(), count)].id;
    if (id !== lastFocused.current) {
      lastFocused.current = id;
      useCarouselStore.getState().setFocused(id);
    }
  });

  return (
    <group>
      {MODULES.map((module, index) => (
        <Card
          key={module.id}
          module={module}
          index={index}
          count={count}
          ringAngle={ring.angle}
          geometries={geometries}
          registerMesh={registerMesh}
        />
      ))}
    </group>
  );
}
