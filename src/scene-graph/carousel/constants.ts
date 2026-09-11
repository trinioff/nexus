import { Vector3 } from "three";

/** Glass card dimensions in world units. */
export const CARD = { width: 1.5, height: 2.0, depth: 0.06, radius: 0.14 } as const;

/** The ring the cards orbit on, centred on the world origin. The user sits inside it. */
export const RING = { radius: 4.5, y: 0.5 } as const;

/** Extra margin around the glass for the halo plane. */
export const HALO_MARGIN = 0.5;

/** Where an expanded card comes to rest: straight ahead of the camera's base pose. */
export const READING_POSITION = new Vector3(0, 0.75, -0.4);
