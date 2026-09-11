# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state of the repository

NEXUS has not been coded yet. The repository contains only two specification documents under `docs/specs/`. There is no package manifest, no build, lint, test, or CI tooling. Do not assume any command exists. When the project is scaffolded, record the real commands here (install, dev server, build, lint, typecheck, and how to run a single test).

## The two spec documents and how they relate

- `docs/specs/spec_nexus_v1.md` (French) is the decision log. It records every choice made in discussion: which modules are kept, dropped, or replaced, the data architecture for the homelab card, the two-tier AI design, and the full rewrite of Phase 5. It states that nothing in it has been coded.
- `docs/specs/nexus_prompt_v2.md` is the build prompt, written as six sequential phases. It is the rewrite that spec v1 §7 calls for. Phases 1, 2, 4 and 6 are in English; Phases 3 and 5 are in French.

Reading rule: where two phases or the two documents conflict, the decision log and the later phase win over earlier phase text. Known conflicts:

- Phase 1 still lists the original card set (Instagram, Stocks, Sports, System). Spec v1 §2 and Phase 3 drop Instagram and Sports, replace Stocks with Finance/Patrimoine, and split System into per-service cards (Pterodactyl, Hashira/GMod, Nanos World Demon Slayer, Infra/Réseau, Automatisation). Phase 4's "Stocks" world means Finance/Patrimoine.
- Phase 1 has released cards "drop with physics" via Rapier. Phase 6 removes that entirely: released cards return to their orbit slot on the orbit spring, and rigid bodies, collision floor, throw/recall regimes and imperative registries are deleted. Build the Rapier version as Phase 1 literally describes it, then remove it in Phase 6 as specified — do not skip straight to the orbit spring during Phase 1 just because it's the eventual end state. Phase 6 also turns ambient motion off by default (gated by a 0..1 multiplier) and requires exactly zero carousel and camera drift under zero input.
- Phase 2 wires voice and the wake word to Gemini. Phase 3's AI card adds a second tier (Claude Agent SDK) and explicitly leaves the Phase 2 pipeline unchanged.

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
