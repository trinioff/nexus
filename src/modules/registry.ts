import { glyphs, type Glyph } from "./glyphs";

export interface ModuleDef {
  /** Stable identifier, used as the card id everywhere. */
  id: string;
  /** Display name, split into the lines shown on the card. */
  label: readonly string[];
  /** Accent colour. The set spans violet to cyan so cards read apart mid-rotation. */
  accent: string;
  /** Placeholder line glyph until Phase 3 wires real content. */
  glyph: Glyph;
}

/**
 * Flat list of carousel cards, in carousel order. No hierarchy: one card per service
 * or project (Phase 3 list; the Phase 1 card names are obsolete).
 */
export const MODULES: readonly ModuleDef[] = [
  { id: "calendar", label: ["Calendar"], accent: "#8b6cff", glyph: glyphs.calendar },
  { id: "weather", label: ["Weather"], accent: "#7f74ff", glyph: glyphs.weather },
  { id: "music", label: ["Music"], accent: "#737cff", glyph: glyphs.music },
  { id: "projects", label: ["Projects"], accent: "#6684ff", glyph: glyphs.projects },
  { id: "finance", label: ["Finance", "Patrimoine"], accent: "#5a8cff", glyph: glyphs.finance },
  { id: "pterodactyl", label: ["Pterodactyl"], accent: "#4e94ff", glyph: glyphs.pterodactyl },
  { id: "hashira", label: ["Hashira", "GMod"], accent: "#429dff", glyph: glyphs.hashira },
  { id: "nanos", label: ["Nanos World", "Demon Slayer"], accent: "#38a6ff", glyph: glyphs.nanos },
  { id: "infra", label: ["Infra", "Réseau"], accent: "#30afff", glyph: glyphs.infra },
  { id: "automation", label: ["Automatisation"], accent: "#2ab8ff", glyph: glyphs.automation },
  { id: "ai", label: ["AI"], accent: "#26c2ff", glyph: glyphs.ai },
  { id: "news", label: ["News"], accent: "#24ccf5", glyph: glyphs.news },
];
