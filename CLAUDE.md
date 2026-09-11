# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state of the repository

Phase 1 is partially built: the Next.js scaffold, the layered folder structure, the
ambient 3D room, and the card carousel with mouse interaction and the six card states.
Hand tracking, gestures, the Rapier drop-with-physics on pinch release, and the HUD do
not exist yet; they come with the gesture-engine pass. The two spec documents under
`docs/specs/` remain the source of truth.

## Commands

```
npm install          # Node 22 is what the project was scaffolded with; Node 20+ required
npm run dev          # Next dev server on http://localhost:3000
npm run build        # production build; also runs lint and type checks
npm run start        # serve the production build
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm run typecheck    # tsc --noEmit
```

There is no test runner yet. When one is added, record here how to run a single test.

To check the scene visually without a GPU, build or run dev, then drive the pre-installed
headless Chromium with Playwright using the flags `--use-angle=swiftshader
--enable-unsafe-swiftshader --ignore-gpu-blocklist` and take a screenshot; WebGL 2 works
under SwiftShader. Expect one console warning, "THREE.Clock: This module has been
deprecated", which comes from React Three Fiber's internals, not from project code.

## Source layout (Phase 1 layers)

`src/` is split into the layers Phase 1 asks for. Each layer folder has a short README
stating its responsibility; keep those boundaries when adding code.

- `app/` Next.js App Router shell only: layout, page, global CSS with the design tokens.
- `components/` React DOM components. `NexusRoot` is the client boundary: WebGL gate,
  reduced-motion preference, then the canvas loaded with `ssr: false`.
- `modules/registry.ts` the flat list of cards (Phase 3 list, in carousel order) with
  label lines, accent colour (violet to cyan across the ring) and placeholder glyph.
- `rendering/` how a frame is drawn: `NexusCanvas` (renderer settings, Neutral tone
  mapping), `PostProcessing` (bloom, vignette; always mounted, cheaper on lower tiers),
  `Quality` (drei PerformanceMonitor driving DPR and the quality tier), `palette.ts`, plus the
  card building blocks: `geometry/cardSlab.ts` (rounded slab, corner radius independent
  of depth), `materials/cardFrame.ts` (additive halo/border/highlight/pulse shader),
  `textures/cardLabel.ts` (canvas-drawn face using system fonts, no font download).
- `scene-graph/` what is in the world. `NexusScene` composes `environment/` (fbm fog
  backdrop on an inverted sphere, grid floor dissolving into fog), `atmosphere/`
  (seeded particle motes, additive searchlight beams), `lighting/` (light rig and the
  procedural env map for glass reflections), `camera/` (`CameraRig`, the floating
  drift) and `carousel/` (`Carousel` owns the ring spring, hit testing and the
  controller; `Card` composes one card's pose every frame).
- `physics/orbit.ts` pure ring maths: slot angles, orbit positions, nearest slot, the
  shortest rotation that brings a card to the front. Rapier drop-with-physics arrives
  with the gesture engine, as Phase 1 literally requires, and is removed again in Phase
  6 (see known conflicts below). Keep the orbit maths independent of Rapier so that
  removal is clean.
- `gesture-engine/` input sources producing carousel intents. `CarouselController` is
  the contract; `pointer/usePointerCarouselInput.ts` is the mouse and touch source. Hand
  tracking will be a second source driving the same controller.
- `animations/motion.ts` the motion vocabulary: ambient amplitudes and rates under
  intent names (`drifting`, `breathing`), spring presets by intent (`acknowledging`,
  `arriving`, `leaving`, `orbit`, `following`, `tracking`, `parallax`), idle float and
  drag tunables. `animations/cardMotion.ts` maps the six card states to spring targets.
  No inline magic numbers in scene code.
- `stores/sceneStore.ts` Zustand: `motion` (0..1 ambient multiplier) and `quality`.
  `stores/carouselStore.ts`: hovered, selected, expanded, focused, dragged ids and
  `selectCardState`, which resolves a card's single state by priority.
- `utils/` pure helpers: math, seeded PRNG, shared GLSL noise chunk.
- `hooks/` browser-API hooks (WebGL support, reduced motion).

Conventions already in place:

- Frame-loop code reads stores with `getState()` inside `useFrame`; never subscribe
  with the hook there, it would re-render the scene graph every change. Cards subscribe
  with hooks only to their own derived state, which changes rarely.
- Springs are React Spring values sampled with `.get()` inside `useFrame` and composed
  into the object's pose by hand; no `animated.*` wrappers. A card's pose is
  `orbit(angle) + facing * lift + idle float`, blended toward the reading position by
  the `expand` spring, so state changes never fight the ring rotation.
- Card state priority (in `selectCardState`): dragging, expanded, selected, hovered,
  focused, idle. Focused is derived every frame from the ring angle (the slot nearest
  the front), not set by input.
- The ring drag sets the ring spring immediately; the pressed card tracks it
  immediately while the other cards follow on the `following` spring, which is what
  makes them lag the hand. Release projects the velocity ahead and snaps to a slot.
- A tap on a card selects it (ring rotates it to the front), a second tap expands it,
  Escape or a tap on empty space collapses then deselects. Starting a drag clears
  selection and expansion.
- Camera drift is `base + motion * f(t)` with no easing, so `motion = 0` means the camera
  sits exactly on its base pose (Phase 6 requires exactly zero drift under zero input).
  Beam sweep accumulates `delta * rate * motion` so it holds still without snapping.
- Every object owns its geometry and material in `useMemo` and disposes them on unmount.
- Layout of particles and beams uses the seeded PRNG in `utils/random.ts`; do not use
  `Math.random` in scene code, the scene must be identical on every load.
- ESLint's `react/no-unknown-property` is off for `src/rendering` and `src/scene-graph`
  because React Three Fiber elements take Three.js props. Keep it on elsewhere.
- The design tokens exist twice on purpose: CSS `@theme` in `app/globals.css` and
  `rendering/palette.ts` for Three.js. Change both together.
- Card faces are canvas textures drawn with system fonts; do not add a web font or a
  CDN-loaded SDF font. The app must render offline in the homelab.
- The glass reflections come from a drei `Environment` built from Lightformers and
  rendered once. Do not swap in an HDR preset: presets download from the internet.
- In additive shaders, gate every term to the region it belongs to. The frame shader
  once had a rim term that evaluated to 1 outside the card and drew a visible rectangle
  behind every card.
- Quality tiers change cost only (DPR, particle count, bloom buffer size and mip
  levels), never the look. The EffectComposer is always mounted: every custom
  ShaderMaterial ends with `#include <tonemapping_fragment>` and
  `#include <colorspace_fragment>`, but the scene once unmounted the composer on the
  low tier and the whole background went dark once the performance monitor fell back.
  If you add a ShaderMaterial, end its fragment shader with those two includes.
- Card glass is `MeshPhysicalMaterial` with `transmission: 1`: three renders the opaque
  scene (only the backdrop) once per frame into a shared buffer and the roughness blurs
  it, which is what gives the frosted look. The glass has `depthWrite: false` so the
  floor, beams and motes behind a card (all transparent, absent from that buffer) are
  drawn over the pane and read as seen through it. Keep the glass colour near neutral;
  the module accent belongs to the frame shader, not the pane.
- In development, `window.__nexus` exposes the Zustand stores (`useSceneStore`,
  `useCarouselStore`) so a browser script can force a tier or a card state. It is not
  set in production builds.

## The two spec documents and how they relate

- `docs/specs/spec_nexus_v1.md` (French) is the decision log. It records every choice made in discussion: which modules are kept, dropped, or replaced, the data architecture for the homelab card, the two-tier AI design, and the full rewrite of Phase 5. It states that nothing in it has been coded.
- `docs/specs/nexus_prompt_v2.md` is the build prompt, written as six sequential phases. It is the rewrite that spec v1 §7 calls for. Phases 1, 2, 4 and 6 are in English; Phases 3 and 5 are in French.

Reading rule: where two phases or the two documents conflict, the decision log and the later phase win over earlier phase text. Known conflicts:

- Phase 1 still lists the original card set (Instagram, Stocks, Sports, System). Spec v1 §2 and Phase 3 drop Instagram and Sports, replace Stocks with Finance/Patrimoine, and split System into per-service cards (Pterodactyl, Hashira/GMod, Nanos World Demon Slayer, Infra/Réseau, Automatisation). Phase 4's "Stocks" world means Finance/Patrimoine.
- Phase 1 has released cards "drop with physics" via Rapier. Phase 6 removes that entirely: released cards return to their orbit slot on the orbit spring, and rigid bodies, collision floor, throw/recall regimes and imperative registries are deleted. Build the Rapier version as Phase 1 literally describes it, then remove it in Phase 6 as specified — do not skip straight to the orbit spring during Phase 1 just because it's the eventual end state. Phase 6 also turns ambient motion off by default (gated by a 0..1 multiplier) and requires exactly zero carousel and camera drift under zero input.
- Phase 2 wires voice and the wake word to Gemini. Phase 3's AI card adds a second tier (Claude Agent SDK) and explicitly leaves the Phase 2 pipeline unchanged.
- Phase 1 uses `NeutralToneMapping` instead of ACES because ACES desaturated the dark blues into grey. Phase 6's cinematic color grade is specified in classic-film terms (18% grey pivot, halation) that assume a filmic response curve underneath. On a Neutral base, build Phase 6's grade as its own explicit full-screen pass — don't assume it composites on top of an existing filmic curve the way the spec's wording implies.

"Do not rewrite existing architecture. Only extend it." opens Phases 2, 3, 5 and 6 verbatim — treat it as binding for those four. Phase 4 does not contain this line (it opens with "Continue from Phase 3" and nothing else); treat "extend, don't rewrite" as the default posture there too unless a Phase 4 instruction explicitly says otherwise.

## What NEXUS is

A personal, AI-assisted management panel rendered as a 3D spatial interface. Hand tracking via MediaPipe is the primary input, mouse is a fallback, voice is activated by the wake phrase "Nexus" or a circle gesture. It should feel like an operating system, not a dashboard or a website. The backend runs on its own container (CT) in the user's homelab, exposed through Caddy and protected by Pocket ID.

Planned stack (Phase 1): Next.js 15, React 19, TypeScript, Tailwind CSS v4, React Three Fiber with Three.js and Drei, GSAP, Framer Motion, React Spring, Rapier Physics (used for Phase 1's drop-with-physics gesture only — removed again in Phase 6, see known conflicts above), MediaPipe Tasks Vision, Zustand, Lenis, postprocessing (Bloom, DOF, God Rays). Phase 1 requires separated layers: rendering, physics, gesture engine, animations, scene graph, components, utilities, hooks, stores. Design language is Vision Pro / Nothing / Linear / Teenage Engineering / FUI glassmorphism: dark environment, blue and white holographic light, orange reserved for warnings, no stars or galaxies.

## Architecture in brief

Cards are a flat list in a circular carousel: one card per service or project, no parent/child hierarchy, no category cards that unfold. Every card connects to the user's real accounts and infrastructure.

Data sources per card (Phase 3):

- Infra/Réseau: the NEXUS backend queries Prometheus directly (`/api/v1/query`, `/api/v1/query_range`) over the trusted homelab LAN (vmbr0). Alert state comes from the Grafana Alertmanager API authenticated with a Service Account token. NEXUS builds its own visualisations; no Grafana iframes.
- Finance/Patrimoine: public-address read of a Crypto.com DeFi wallet on Cronos (Crypto.com Developer Platform SDK, multi-chain later) plus a French bank account through a DSP2 open-banking aggregator (Powens or Bridge, OAuth).
- Pterodactyl, Hashira/GMod, Nanos World Demon Slayer, Automatisation (n8n), Calendar, Weather, Music, News: their real APIs. Hashira and Nanos World are dedicated cards merging live server status with creative content; they are not Projects entries.
- Projects: one portfolio card per project with description, stack, GitHub links and media.

AI is two-tier (spec v1 §4, Phase 3 AI section): Gemini (Flash / Flash-Lite) for chat, voice and everyday questions — chosen over Mistral because Google's free tier is a standing tier meant for sustained light use (no card, no expiry), while Mistral's free "Experiment" tier is explicitly evaluation-only and not meant for real traffic; it also keeps a single AI vendor across this card and Phase 2's voice pipeline. Free-tier inputs/outputs may be used by Google to improve its products — accepted trade-off, revisit if it becomes a concern. Claude Code through the Claude Agent SDK (TypeScript, server-side, Node 20+) for dev tasks, scoped by a strict tool allowlist rather than interactive-session defaults.

Phase 5 remote workstation control: a Tauri agent per machine (Windows/macOS/Linux) connects outbound to NEXUS over an authenticated WebSocket through Caddy, never the reverse, each with its own install-time secret. Bounded actions (open whitelisted app, media transport, volume, screenshot, clipboard, hide other windows, quit an app gracefully, lock screen, sleep display, DND, open URL, note/reminder) use a fixed enum of verbs with hand-written implementations and need no local confirmation. Launching Claude Code remotely is the unbounded case: it requires an active trust session on the target machine, accepted by a physical click on that machine, scoped per (user, machine), lasting 2 minutes to 2 days, revocable from NEXUS, with the Agent SDK event stream shown live in NEXUS (send message, change mode, interrupt). Every action is logged with timestamp, machine, action, mode and result.

Phase 6 adds a single master clock for the open-module sequence (targeting, approach, settle), six world-specific film color grades, a named motion vocabulary replacing inline magic numbers, and gold highlighting for the centered card.

## Hard constraints (apply in every phase)

- No mocked or placeholder data anywhere. Every card reads real accounts and infrastructure.
- Finance is strictly read-only. No financial action may ever be triggered by voice, gesture, or any other interaction.
- ENS (employer) projects are portfolio-only: description, stack and links. Never call employer infrastructure.
- All API keys and tokens (Gemini, Anthropic, Crypto.com, bank aggregator, Grafana, Pterodactyl, n8n) live server-side in environment variables, never in client code or the repo.
- Remote agent: `execFile` only, never `exec`. No shutdown, reboot, file deletion, or process kill. App names resolve against a real scan of installed apps, so an injected command string must resolve to "no such application" rather than execute. Permission errors are translated into OS-specific actionable instructions.
- Remote Claude Code sessions never run with `bypassPermissions`.
- Prometheus and other homelab internals are never exposed outside the LAN. Only the NEXUS frontend and public API go through Caddy.
- Gold (centered card) is gated off entirely when a card carries a warning flag, so it can never read as warning orange. Gold is drawn dimmer than blue; no border multiplier above 1.0.

## Open decisions

- Lab sécu (Kali) card: proposed, not decided. Do not block any phase on it.
- Final card order in the carousel: undecided, cosmetic.