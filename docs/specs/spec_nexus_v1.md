# Spec NEXUS v1 — état des décisions

But de ce document : garder trace de toutes les décisions prises en discutant, pour servir
de base à la réécriture du prompt initial en 6 phases. Rien ici n'a encore été codé.

---

## 1. Principe général

NEXUS est un panel de gestion personnel assisté par IA, pas un simple dashboard vitrine.
Interface 3D immersive (pilotage voix + gestes), backend sur son propre CT dans le
homelab, exposé via Caddy pour être accessible depuis n'importe quelle machine.

## 2. Modules & architecture des cartes

- **Architecture** : liste plate — chaque service est une carte indépendante, pas de
  hiérarchie parent/enfant.
- **Gardés tels quels** : Calendar, Weather, Music (branchés sur les vrais comptes,
  aucune donnée mockée).
- **Projects** : contenu réel (Hashira, Nanos World, Blender, Cowork/Teapot, corrélateur
  IOC/Graylog, SOAR Shuffle). Les projets liés à l'ENS y figurent aussi, **en mode
  portfolio uniquement** (description, stack technique, liens — aucune donnée live, pour
  garder l'étanchéité pro/perso).
- **Abandonnés** : Instagram, Sports, dashboard ENS live dédié.
- **Finance/Patrimoine** (remplace Stocks) : crypto (wallet Crypto.com DeFi, lecture
  d'adresse publique sur Cronos, potentiellement multi-chain plus tard) + compte bancaire
  français via agrégateur open banking (Powens/Bridge, OAuth). **Strictement lecture
  seule** — aucune action financière déclenchable à la voix ou au geste.
- **"System" éclaté en cartes par service** (plus pertinent qu'un CPU/RAM générique
  vu l'infra réelle) :
  - **Pterodactyl** — panel de gestion des serveurs de jeu
  - **Hashira/GMod** — carte unique : statut serveur (joueurs, uptime) + contenu créatif
    (roadmap, screenshots)
  - **Nanos World Demon Slayer** — carte unique, même principe, + infos contrat client
  - **Infra/Réseau** — vue d'ensemble homelab réelle (voir §3)
  - **Automatisation** — statut des workflows n8n
  - **Lab sécu (Kali)** — **TBD**, proposé mais pas tranché
- **IA** : voir §4.
- **News** : feed mixte cybersécurité/tech + actualité générale.

## 3. Infra/Réseau — architecture de données

État réel du homelab (post-remédiation du 2026-09-11) : 16 CT + 3 VM, Prometheus 19/19
cibles up, Grafana avec dashboards + 3 règles d'alerte + contact point n8n, WireGuard
fonctionnel, tunnels Cloudflare actifs.

- **NEXUS construit ses propres visualisations** à partir des données brutes — pas
  d'iframe Grafana, les dashboards Grafana actuels restent pour l'usage humain classique,
  NEXUS ne s'appuie pas dessus.
- **Métriques** : NEXUS backend interroge **Prometheus directement** (`/api/v1/query`,
  `/api/v1/query_range`). Prometheus n'a pas d'auth native — mais **le CT NEXUS vit sur le
  même LAN homelab** (vmbr0, comme les autres CT), donc l'appel reste interne au réseau de
  confiance, sans mécanisme d'auth supplémentaire à construire. Seul le frontend/API
  public de NEXUS est exposé à l'extérieur via Caddy — jamais Prometheus lui-même.
- **État des alertes** : via l'API Grafana (`/api/alertmanager/grafana/api/v2/alerts`),
  authentifiée par un **Service Account token** Grafana (fonctionne malgré
  `disable_login_form`, qui ne bloque que le formulaire de connexion interactif, pas
  l'auth Bearer sur l'API).
- **Sécurité NEXUS lui-même** : derrière Pocket ID, comme le reste de l'infra perso.

## 4. IA — architecture à deux niveaux

- **LLM léger** (Mistral ou Gemini) pour le vocal/chat général.
- **Claude Code via le Claude Agent SDK** (TypeScript, côté serveur) pour les tâches de
  dev — voir §5 pour l'exécution à distance sur les postes de travail.
- Permissions de l'instance Claude Code scopées par **allowlist d'outils**, pour ne pas
  créer une deuxième surface d'exécution non bornée à côté du pont Phase 5.

## 5. Phase 5 — contrôle à distance des postes de travail

Réécriture complète par rapport au prompt d'origine (qui supposait loopback strict,
navigateur et serveur sur la même machine macOS). Avec NEXUS centralisé et accessible de
partout, ce modèle ne tient plus : il faut un agent installé sur chaque poste.

### 5.1 Architecture réseau

- **Agent natif par machine**, construit en **Tauri** (multi-OS : Windows/macOS/Linux,
  plus cohérent que le macOS-only d'origine vu l'usage réel).
- L'agent se connecte **en sortant** vers NEXUS via **WebSocket authentifié**, à travers
  Caddy — jamais l'inverse. C'est le seul sens qui fonctionne derrière un NAT/firewall
  quelconque (bureau, 4G, autre réseau).
- Chaque agent a un **secret propre**, généré à l'installation — pas de mot de passe
  partagé entre machines.

### 5.2 Actions bornées (héritées de la Phase 5 d'origine, inchangées)

Ouvrir une app whitelistée, ajuster le volume, verrouiller l'écran, etc. — enum de verbes
fixe, `execFile` jamais `exec`, résolution contre une liste d'apps installées. Aucune
confirmation locale nécessaire, le risque est déjà borné par construction.

### 5.3 Déclenchement Claude Code — le cas non borné

Lancer du code à distance n'est pas une action qu'on peut borner par un enum : une fois
Claude Code démarré, il peut lire/écrire des fichiers et exécuter des commandes selon ses
propres permissions. Le garde-fou ne vit donc pas au niveau du pont NEXUS↔Tauri, mais à
deux endroits :

1. **Le mécanisme de session de confiance** (§5.4), qui prouve une présence physique
   récente sur la machine avant d'autoriser un déclenchement.
2. **La configuration de permissions de Claude Code lui-même** sur chaque machine — pas
   de `bypassPermissions` pour les sessions déclenchées à distance ; garder les prompts de
   permission normaux ou un allowlist d'outils serré.

### 5.4 Session de confiance

Un seul mécanisme, pas deux chemins séparés — une "confirmation ponctuelle" est juste une
session de confiance très courte (2 min) ; une "session longue" est la même chose avec une
durée plus grande.

**Flow :**
1. Depuis NEXUS (n'importe quelle machine), tu demandes une session de confiance sur une
   machine cible précise, en choisissant la durée dans l'interface riche de NEXUS
   (préréglages ou durée libre — de 2 minutes à 2 jours).
2. La machine cible reçoit une **notification native simple** (pas de sélecteur de durée
   dedans, elle est déjà fixée) : *"NEXUS demande une session de confiance de [durée] —
   Accepter / Refuser."*
3. Le clic Accepter est **physiquement local à la machine cible** — c'est ce qui garantit
   la présence physique, même si la durée a été configurée depuis ailleurs.
4. Pendant la fenêtre de confiance, les déclenchements Claude Code sur **cette machine
   précise** passent sans nouvelle confirmation.

**Portée** : strictement par (utilisateur, machine) — jamais globale. Une session de
confiance sur le Windows du bureau ne donne aucun droit sur le Mac portable.

**Expiration** : notification native simple sur la machine concernée
("session de confiance NEXUS expirée"), purement informative.

**Révocation à distance (confirmée, v1)** : NEXUS affiche les sessions de confiance
actives par machine avec leur temps restant, et permet de les révoquer avant expiration.
L'état est de toute façon remonté à NEXUS en continu.

### 5.5 Viewer Claude Code live dans NEXUS

Le vrai levier qui change le niveau de risque acceptable : NEXUS n'est pas un
"déclenche et oublie", c'est une fenêtre interactive sur la session en cours.

- Les événements du Claude Agent SDK (tool use, résultats d'outils, texte du modèle) sont
  **streamés depuis l'agent Tauri vers NEXUS** via le même canal WebSocket.
- NEXUS les affiche comme un transcript/chat en direct, avec la possibilité d'envoyer un
  message, de changer de mode (auto-accept / demande de permission / plan mode /
  bypass), et d'interrompre la session.
- Conséquence directe : la confirmation locale ne porte que sur le **démarrage** d'une
  session sur une machine (via la session de confiance) — pas sur chaque interaction une
  fois que la session est ouverte et visible en direct.

### 5.6 Journalisation

Système de logs complet côté NEXUS (même principe que celui monté pour le corrélateur
ENS) : horodatage, machine, action déclenchée, mode (confirmation immédiate vs session de
confiance active + son identifiant/durée), résultat. Permet de repérer après coup un
déclenchement qui ne viendrait pas de toi, même sans friction au moment T.

### 5.7 Risque résiduel assumé

Avec une fenêtre de confiance pouvant aller jusqu'à 2 jours, une compromission de la
session NEXUS (protégée par Pocket ID) pendant cette fenêtre permettrait un déclenchement
sans friction locale sur la machine concernée. Le log permet de le détecter après coup,
pas de l'empêcher en temps réel. Assumé tel quel, décision prise en connaissance de cause.

---

## 6. Points encore ouverts

- **Carte "lab sécu" (Kali)** — proposée, pas tranchée.
- **Ordre final des cartes dans le carrousel** — pas de priorité, pur peaufinage.

## 7. Prochaine étape

Reprendre le prompt initial en 6 phases et le réécrire section par section selon cette
spec, en particulier la Phase 5 qui change de forme (CT centralisé + agent Tauri
multi-machine, au lieu du loopback macOS unique d'origine).
