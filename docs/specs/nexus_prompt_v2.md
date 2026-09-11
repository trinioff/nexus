=== PHASE 1 — FOUNDATION + SPATIAL INTERFACE + HAND TRACKING ===

You are a Principal Creative Technologist, Graphics Engineer and Senior Frontend Architect.

Build a production-quality futuristic spatial computing web application called NEXUS.

This is NOT a dashboard.
This is NOT a website.
This should feel like an operating system.

========================
TECH STACK
========================

Use:
• Next.js 15
• React 19
• TypeScript
• Tailwind CSS v4
• React Three Fiber
• Three.js
• Drei
• GSAP
• Framer Motion
• React Spring
• Rapier Physics
• MediaPipe Tasks Vision
• Zustand
• Valtio if useful
• Lenis
• WebGL with graceful fallback
• Postprocessing (Bloom, DOF, God Rays if suitable)

Everything must be modular.
No monolithic components.
Architecture should scale for future AI modules.

========================
DESIGN LANGUAGE
========================

Do NOT copy Iron Man.
Design language should combine:
- Apple Vision Pro
- Nothing
- Linear
- Teenage Engineering
- FUI (Fictional UI)
- Spatial Computing
- Glassmorphism
- Industrial Minimalism

Dark Environment.
Blue and white holographic lighting.
Very subtle orange accents only for warnings.
Background is an infinite procedural environment.
No stars. No galaxies.
Think volumetric fog with moving particles.
The world should feel alive.

========================
SCENE
========================

Create one large 3D room.
No walls.
Just atmospheric depth.
Soft volumetric lighting.
Floating particles.
Moving light beams.
Very subtle camera drift.
The camera should feel like floating.

========================
MAIN OBJECTS
========================

Create floating holographic cards.
Cards represent future modules:
- Instagram
- Stocks
- Projects
- Sports
- Calendar
- Weather
- AI
- News
- Music
- System

Arrange them in a circular orbit around the user.
Each card should slowly float independently.
Very subtle idle movement.
Cards have glass material.
Depth.
Rounded corners.
Reflections.
Soft glow.

========================
INTERACTION
========================

Mouse should only exist as fallback.
Primary interaction is hand tracking.
Integrate MediaPipe.
Track:
- Palm
- Pinch
- Finger positions
- Swipe
- Open hand
- Closed hand

========================
GESTURES
========================

Swipe Left: Rotate carousel left.
Swipe Right: Rotate carousel right.
Pinch: Grab card.
Released pinch: Drop card with physics.
Pull toward camera: Expand card.
Push away: Collapse card.
Palm held still: Freeze movement.
Circle gesture: Reserved for future AI.

========================
ANIMATION
========================

Every interaction must use spring physics.
No linear movement.
Everything should feel physical.
Cards slightly lag behind hand.
Momentum.
Overshoot.
Elasticity.

========================
CARD STATES
========================

Idle
Hovered
Selected
Expanded
Focused
Dragging

Every state should have unique animation.

========================
VISUAL FX
========================

Bloom
Particle trails
Glow
Light streaks
Glass reflections
Animated borders
Energy pulse when selected

========================
AUDIO
========================

No voice.
Only ambient sounds.
Soft UI sounds.
Very subtle synth pad.
Gesture confirmation sounds.

========================
HUD
========================

Very minimal.

Top Left: System Status, FPS, Tracking, GPU
Bottom Right: Gesture detected, Confidence
Top Right: Clock, Date
Bottom Left: System log

========================
PERFORMANCE
========================

Target 60 FPS.
Adaptive quality.
Lazy load assets.
GPU optimized.

========================
PROJECT STRUCTURE
========================

Follow clean architecture.
Separate:
- Rendering
- Physics
- Gesture Engine
- Animations
- Scene Graph
- Components
- Utilities
- Hooks
- Stores

========================
DELIVERABLE
========================

At the end of Phase 1 I should have a beautiful futuristic operating system where I can rotate floating holographic cards entirely using hand gestures with premium animations and physics.

No Gemini.
No speech.
No AI yet.

---

=== PHASE 2 — AI BRAIN + VOICE + COMMAND ENGINE ===

Continue from Phase 1.
Do not rewrite existing architecture.
Only extend it.

========================
OBJECTIVE
========================

Turn NEXUS into an AI assistant.
Use Gemini API.
All communication must stream.

========================
VOICE
========================

Use SpeechRecognition.
Use streaming Gemini responses.
Use high-quality Text-to-Speech.
Speech must feel conversational.
Support interruption:
If user speaks while AI speaks, AI immediately stops.

========================
WAKE SYSTEM
========================

Wake phrase: "Nexus" OR Circle hand gesture.
When activated:
- Entire interface glows.
- Wave animation spreads across scene.
- Microphone appears.

========================
COMMAND ENGINE
========================

Examples:
- Open Instagram
- Show Projects
- Rotate Left
- Show Calendar
- Latest AI News
- How is Nvidia today?
- Open Stocks
- What's my schedule?
- Summarize today's AI news
- Search YouTube
- Explain MCP

========================
STREAMING
========================

Gemini should stream tokens.
Response appears word-by-word.
Speech begins before completion.

========================
MEMORY
========================

Conversation history.
Context awareness.
Current module awareness:
If Stocks module is open and user says "Explain this", Gemini understands.

========================
VISUALIZATION
========================

Instead of chat bubbles:
Generate floating holographic text.
AI responses appear in space.
Sentences assemble from particles.

========================
AUDIO
========================

Spatial audio.
Voice should come from center.
UI sounds react to speech.

========================
STATUS
========================

Listening
Thinking
Speaking
Interrupted
Offline
Streaming

---

=== PHASE 3 — PERSONAL KNOWLEDGE ENGINE ===

Continue from Phase 2.
Do not rewrite existing architecture. Only extend it.

========================
OBJECTIF
========================

Chaque carte devient réelle, branchée sur les comptes et l'infrastructure réels de
l'utilisateur. Aucun placeholder. Aucune donnée mockée, nulle part.

========================
ARCHITECTURE DES CARTES
========================

Liste plate uniquement. Chaque service ou projet est sa propre carte indépendante dans
le carrousel. Aucune hiérarchie parent/enfant, aucune carte-catégorie qui se déplie sur
des sous-cartes.

========================
CARTES DU CARROUSEL
========================

Calendar
Weather
Music
Projects
Finance/Patrimoine
Pterodactyl
Hashira/GMod
Nanos World Demon Slayer
Infra/Réseau
Automatisation
AI
News
Lab sécu (Kali) — optionnelle, voir section dédiée

========================
CALENDAR / WEATHER / MUSIC
========================

Branchées sur les vrais comptes de l'utilisateur : agenda réel, météo réelle du lieu où
il se trouve, compte de streaming musical réel. Aucune valeur d'exemple, aucun faux
événement, aucune fausse piste.

Weather : l'environnement 3D ambiant réagit aux conditions météo réelles (pluie / nuages
/ brouillard / soleil) — jamais un cycle scripté.

========================
PROJECTS
========================

Une carte par projet portfolio, contenu réel :
- Animations Blender (projet d'édition d'un asset)
- ESGI Cowork/Teapot (projet d'équipe)
- Travaux liés à l'ENS (corrélateur IOC/scoring sur Graylog, workflow SOAR Shuffle,
  script logs-sources-checker)

Contenu par carte : description, stack technique, liens GitHub, médias (images/vidéos).

Les projets liés à l'ENS sont en mode portfolio strict : description et stack technique
uniquement. Aucune donnée live, aucun appel à une infrastructure de production ENS. C'est
une frontière dure — même si la carte Infra/Réseau interroge sans problème l'infra
personnelle en temps réel, rien ici ne doit jamais toucher un système appartenant à
l'employeur.

Hashira et Nanos World Demon Slayer ne sont PAS des cartes Projects — ce sont des cartes
dédiées à part entière (voir plus bas) qui fusionnent contenu créatif et statut serveur
live. Ne pas les dupliquer ici.

========================
FINANCE / PATRIMOINE
========================

Remplace l'ancien module "Stocks". Deux sources de données :

1. Crypto — wallet Crypto.com DeFi Wallet (self-custodial). Lecture d'adresse publique
   uniquement, aucune clé privée, aucun identifiant de compte. Utiliser le SDK Crypto.com
   Developer Platform pour l'écosystème Cronos (EVM/zkEVM). Prévoir l'extension à
   d'autres chaînes (ETH mainnet, BTC...) via une API multi-chain générique par adresse
   publique si nécessaire plus tard.
2. Compte bancaire français — agrégateur open banking (Powens ou Bridge), flux OAuth
   standard DSP2. Jamais d'identifiants bancaires en clair dans l'application.

Contraintes non négociables :
- Strictement lecture seule. Aucune action financière (virement, trade, retrait)
  déclenchable par la voix, un geste, ou toute autre interaction, sous aucun prétexte.
- Tous les tokens/clés (Crypto.com, agrégateur bancaire) vivent côté serveur uniquement,
  jamais exposés au client, jamais committés dans le repo — variables d'environnement.

========================
PTERODACTYL
========================

Panel de gestion des serveurs de jeu de l'utilisateur. Liste des serveurs gérés, statut
(en ligne/hors ligne), utilisation ressources (CPU/RAM/disque) par serveur. Données
tirées de l'API Pterodactyl réelle.

========================
HASHIRA / GMOD
========================

Carte unique fusionnant :
- Statut serveur live : joueurs en ligne, uptime, version
- Contenu créatif : roadmap, description du projet RP Demon Slayer, captures d'écran

========================
NANOS WORLD DEMON SLAYER
========================

Carte unique, même principe que Hashira :
- Statut serveur live : joueurs en ligne, uptime
- Contenu projet : roadmap, description
- Infos contrat client (Dubaï) : statut du contrat, jalons

========================
INFRA/RÉSEAU
========================

Vue d'ensemble réelle du homelab. Aucune iframe Grafana — NEXUS construit ses propres
visualisations à partir des données brutes ; les dashboards Grafana existants restent
pour l'usage humain classique et ne sont pas la source de données de NEXUS.

- Métriques : le backend NEXUS interroge Prometheus directement (`/api/v1/query`,
  `/api/v1/query_range`). Prometheus n'a pas d'authentification native, mais le CT NEXUS
  vit sur le même réseau de confiance (vmbr0) que le reste du homelab — l'appel reste
  interne, sans mécanisme d'auth à construire. Seuls le frontend et l'API publique de
  NEXUS sont exposés à l'extérieur via Caddy ; Prometheus lui-même ne l'est jamais.
- État des alertes : via l'API Grafana (`/api/alertmanager/grafana/api/v2/alerts`),
  authentifiée par un Service Account token Grafana.
- Affiche : inventaire CT/VM à jour, charge par service, statut des tunnels (WireGuard,
  Cloudflare), alertes actives.

========================
AUTOMATISATION
========================

Statut des workflows n8n réels (CT dédié) : liste des workflows, dernière exécution,
succès/échec, fréquence.

========================
AI
========================

Architecture à deux niveaux, propre à cette carte (n'affecte pas le pipeline voix/wake
word de la Phase 2, qui reste tel quel) :

- LLM léger (Mistral ou Gemini) pour les questions générales, la recherche de
  connaissances, les résumés — l'usage courant de tous les jours.
- Claude Code via le Claude Agent SDK (TypeScript, côté serveur) pour les tâches de
  développement : lire/expliquer du code, aider sur un bug, travailler sur un projet
  listé dans Projects. Nécessite Node 20+ côté serveur ; clé API Anthropic jamais exposée
  côté client.
- L'instance Claude Code invoquée depuis cette carte est scopée par une allowlist
  d'outils précise — jamais les permissions par défaut d'une session Claude Code
  interactive. Objectif : ne pas créer une deuxième surface d'exécution non bornée en
  plus du pont de la Phase 5.

========================
NEWS
========================

Flux mixte : actualité cybersécurité/tech + actualité générale, résumé par IA, cartes
empilées, swipe pour naviguer.

========================
LAB SÉCU (KALI) — OPTIONNELLE
========================

Carte proposée mais non tranchée. Si implémentée : accès/état de la VM Kali dédiée aux
manipulations de sécurité personnelles, séparée du reste de l'infra de production. Ne pas
bloquer la Phase 3 sur cette carte — elle peut être ajoutée plus tard sans affecter
l'architecture des autres cartes.

---

=== PHASE 4 — AWARD-WINNING EXPERIENCE ===

Continue from Phase 3.

This phase is entirely about delight.

========================
OBJECTIVE
========================

Transform NEXUS into a cinematic spatial computing experience.

========================
ENVIRONMENTS
========================

Switch environments dynamically:
- Minimal Studio
- Dark Lab
- Glass Observatory
- Industrial Command Center
- Ocean Platform
- Fog Chamber

========================
TRANSITIONS
========================

Module transitions become cinematic.
Entire world morphs.
Camera choreography.
Particle simulations.
Lighting changes.

========================
AI WORLDS
========================

When opening Projects: Environment transforms.
When opening Stocks: Floor becomes animated market grid.
When opening Weather: Entire world reflects weather.

========================
MICROINTERACTIONS
========================

Every gesture leaves light trails.
Cards ripple.
Particles react.
Glass bends.
Ambient light responds.

========================
ADVANCED GESTURES
========================

Two-hand interactions:
- Zoom
- Throw cards
- Group cards
- Split cards
- Multi-select

========================
FINAL EXPERIENCE
========================

Opening NEXUS should feel like booting into a futuristic operating system rather than opening a web application.

The application should be visually polished enough to qualify as an Awwwards-level interactive experience while maintaining excellent performance, accessibility fallbacks, and a clean, extensible architecture suitable for future modules and AI capabilities.

---

=== PHASE 5 — CONTRÔLE À DISTANCE DES POSTES DE TRAVAIL ===

Continue from Phase 4. Do not rewrite existing architecture. Only extend it.

========================
OBJECTIF
========================

NEXUS vit désormais sur son propre CT dans le homelab et est accessible depuis
n'importe quelle machine, n'importe où. L'hypothèse d'origine (navigateur et serveur sur
la même machine macOS, communication en loopback strict) ne tient plus. Il faut un agent
natif installé sur chaque poste que l'utilisateur veut piloter, qui se connecte à NEXUS
plutôt que l'inverse.

========================
ARCHITECTURE RÉSEAU
========================

- Agent natif par machine, construit en Tauri (Windows / macOS / Linux).
- L'agent se connecte en sortant vers NEXUS via un WebSocket authentifié, à travers
  Caddy — jamais l'inverse. C'est le seul sens qui fonctionne derrière un NAT ou un
  firewall quelconque (bureau, 4G, réseau tiers).
- Chaque agent a un secret propre, généré à l'installation. Pas de mot de passe partagé
  entre machines.

========================
ACTIONS BORNÉES
========================

Héritées de la Phase 5 d'origine, inchangées dans leur périmètre : lancer une app
whitelistée, transport média, volume système, capture d'écran, lecture/écriture du
presse-papier, masquer les autres fenêtres, quitter une app (proprement, jamais tuer le
process), verrouiller l'écran, mettre l'écran en veille, Ne pas déranger, ouvrir un site
dans le navigateur, créer une note ou un rappel (selon disponibilité de l'équivalent sur
l'OS de la machine cible).

Toujours :
- `execFile`, jamais `exec` — aucun shell, donc les métacaractères d'un argument fourni
  par la voix restent des données inertes.
- Verbes en enum fixe, implémentations écrites à la main. Aucun chemin de code
  n'exécute une chaîne de commande arbitraire.
- Les applications se résolvent contre un scan réel des apps installées sur la machine
  cible — une app non installée ne peut pas être nommée.
- Jamais de shutdown, redémarrage, ou suppression de fichier. Un mot mal compris ne doit
  jamais pouvoir détruire un travail non sauvegardé.
- Aucune confirmation locale nécessaire pour ces actions — le risque est déjà borné par
  construction.
- Chaque erreur de permission (droits d'accès à l'écran, au presse-papier, à
  l'automatisation, etc.) est traduite en instruction actionnable propre à l'OS de la
  machine cible, jamais en message d'erreur brut.

========================
DÉCLENCHEMENT CLAUDE CODE — LE CAS NON BORNÉ
========================

Lancer du code à distance n'est pas une action qu'on peut borner par un enum : une fois
Claude Code démarré, il peut lire/écrire des fichiers et exécuter des commandes selon ses
propres permissions. Le garde-fou ne vit donc pas au niveau du pont NEXUS↔Tauri, mais à
deux endroits :

1. Le mécanisme de session de confiance (voir section suivante), qui prouve une présence
   physique récente sur la machine avant d'autoriser un déclenchement.
2. La configuration de permissions de Claude Code lui-même sur chaque machine — pas de
   bypassPermissions pour les sessions déclenchées à distance ; garder les prompts de
   permission normaux, ou un allowlist d'outils serré.

========================
SESSION DE CONFIANCE
========================

Un seul mécanisme, pas deux chemins séparés — une confirmation ponctuelle est juste une
session de confiance très courte (2 minutes) ; une session longue est la même chose avec
une durée plus grande.

Flow :
1. Depuis NEXUS (n'importe quelle machine), l'utilisateur demande une session de
   confiance sur une machine cible précise, en choisissant la durée dans l'interface
   riche de NEXUS (préréglages ou durée libre, de 2 minutes à 2 jours).
2. La machine cible reçoit une notification native simple (pas de sélecteur de durée
   dedans, elle est déjà fixée) : "NEXUS demande une session de confiance de [durée] —
   Accepter / Refuser."
3. Le clic Accepter est physiquement local à la machine cible — c'est ce qui garantit la
   présence physique, même si la durée a été configurée depuis ailleurs.
4. Pendant la fenêtre de confiance, les déclenchements Claude Code sur cette machine
   précise passent sans nouvelle confirmation.

Portée : strictement par (utilisateur, machine) — jamais globale. Une session de
confiance sur le poste du bureau ne donne aucun droit sur un autre poste.

Expiration : notification native simple sur la machine concernée ("session de confiance
NEXUS expirée"), purement informative.

Révocation à distance : NEXUS affiche les sessions de confiance actives par machine avec
leur temps restant, et permet de les révoquer avant expiration. L'état est remonté à
NEXUS en continu.

========================
VIEWER CLAUDE CODE EN DIRECT
========================

Le vrai levier qui change le niveau de risque acceptable : NEXUS n'est pas un
"déclenche et oublie", c'est une fenêtre interactive sur la session en cours.

- Les événements du Claude Agent SDK (tool use, résultats d'outils, texte du modèle)
  sont streamés depuis l'agent Tauri vers NEXUS via le même canal WebSocket.
- NEXUS les affiche comme un transcript/chat en direct, avec la possibilité d'envoyer un
  message, de changer de mode (auto-accept / demande de permission / plan mode /
  bypass), et d'interrompre la session.
- Conséquence directe : la confirmation locale ne porte que sur le démarrage d'une
  session sur une machine (via la session de confiance) — pas sur chaque interaction une
  fois que la session est ouverte et visible en direct.

========================
JOURNALISATION
========================

Système de logs complet côté NEXUS (même principe que celui monté pour le corrélateur
ENS) : horodatage, machine, action déclenchée, mode (confirmation immédiate vs session de
confiance active + son identifiant/durée), résultat. Permet de repérer après coup un
déclenchement qui ne viendrait pas de l'utilisateur, même sans friction au moment T.

========================
RISQUE RÉSIDUEL ASSUMÉ
========================

Avec une fenêtre de confiance pouvant aller jusqu'à 2 jours, une compromission de la
session NEXUS (protégée par Pocket ID) pendant cette fenêtre permettrait un déclenchement
sans friction locale sur la machine concernée. Le log permet de le détecter après coup,
pas de l'empêcher en temps réel. Assumé tel quel.

========================
DELIVERABLE
========================

Un agent Tauri installable sur chaque machine (Windows/macOS/Linux), qui se connecte en
sortant vers NEXUS. Les actions bornées fonctionnent instantanément, sans confirmation
locale. Le déclenchement de Claude Code exige une session de confiance active sur la
machine cible et s'affiche en direct dans NEXUS pendant toute la session. Chaque action
est journalisée. Démontrer qu'une chaîne de commande injectée se résout en "no such
application" plutôt que de s'exécuter.

---

=== PHASE 6 — MEASURED STILLNESS, CINEMATIC SEQUENCING & FILMIC COLOR GRADING ===

Continue from Phase 5. Do not rewrite existing architecture. Only extend it.

OBJECTIVE: Phase 6 is about what NEXUS feels like to use for an hour, not what it looks like in a five-second clip. Three things: hold still, show me where I am, and grade the whole room like film.

========================
MEASURED STILLNESS & MOTION GATING
========================

- Turn ambient motion OFF by default.
- Gate motion on a 0..1 multiplier rather than a boolean so toggling settles the scene smoothly over ~1 second instead of stopping dead mid-drift.
- Verify zero input drift: Carousel angle drift and camera position/rotation drift over several seconds of zero input must be EXACTLY zero.
- Expose a LOCKED / DRIFT control indicator showing its own consequence.

========================
NO MORE THROWING (PHYSICS ENGINE CLEANUP)
========================

- Released cards return directly to their orbit slot on the orbit spring. Cards are NEVER handed to a physics simulation.
- Remove all unreachable physics code: rigid bodies, collision floor, thrown/recalling regimes, and imperative registries.

========================
CINEMATIC PRESENTATION (MASTER CLOCK)
========================

Opening a module triggers a timed sequence on ONE master clock (zero desynchronization):
1. TARGETING: Ring turns, quad-based FUI bracket converges from outside frame, unrelated cards step back.
2. APPROACH: Card commits and flies to reading position as camera pushes along the VIEW AXIS to meet it. Hard-edged scan line sweeps down card face.
3. SETTLE: Bracket locks and dissolves, push relaxes, control returns.
- Asymmetric timings: targeting brisk, approach carries distance, settle slow enough that text is readable before motion stops.
- Deliberate gestures immediately cancel the sequence while committing the pending open.

========================
CINEMATIC COLOR GRADE & WORLD LUTS
========================

- Full-screen color grade splitting the ends of the blue luminance ramp: violet into shadows, warm white into highlights, mid-tones untouched, filmic contrast pivoting at 18% grey, and halation.
- 6 World-Specific Grades:
  * Industrial Deck: Sodium-warm and hard.
  * Open Water: Negative warmth for blue hour.
  * Fog Chamber: Maximum bleed and sub-1.0 contrast.
  * Spike split and halation at crossover points so world changes read as cinematic cuts.
- Widen module accent spectrum across violet -> blue -> cyan so modules are recognizable in peripheral vision mid-rotation.

========================
GOLD AT THE CENTER (RULES)
========================

Centered cards glow gold (frame, glass emissive, background light throw) adhering to 2 counter-intuitive rules:
1. Gold MUST NOT read as Warning Orange (~18° apart). A warned card is NEVER allowed to go gold — gate the gold term entirely on the warning flag.
2. Gold MUST be drawn dimmer than blue to read as gold. Avoid border multipliers > 1.0 (which clip red/green to white). Prominence comes from hue + wider outer bloom.
3. Earned Gold: Fade gold in continuously based on centered position using a power curve.

========================
MOTION VOCABULARY
========================

Replace scattered inline magic-number animations with named curves encoding INTENT (arriving, leaving, acknowledging, reporting, drifting) and a single composed boot choreography beat constant.

DELIVERABLE: Measured stillness, master clock presentation, 6 world color grades, and verified gold/warning alert isolation.
