# CLAUDE.md — ManiTradePro

> Règles permanentes pour toute session Claude Code sur ce repo.
> **Priorité absolue : `GOVERNANCE.md`** — fichier officiel de gouvernance projet, prioritaire sur tout autre document, à lire AVANT toute analyse, implémentation, review ou merge.
> Lire ensuite `SESSION.md` — le fichier de continuité vivant.

## Documentation permanente (IMPÉRATIVE — mai 2026)

À chaque session, **lire AVANT toute modif** (ordre de priorité officiel défini dans `GOVERNANCE.md`) :
- `GOVERNANCE.md` — **fichier de gouvernance projet officiel** (priorité #1). Définit rôles, règles merge/mémoire/validation, structure dossiers `/docs/`, interdictions absolues.
- `BOT_OBJECTIVE.md` — **constitution officielle du projet** : objectif réel, règles absolues, ce que le bot est et n'est pas. Source actuelle de `docs/project/PROJECT_VISION.md`.
- `PROJECT_RULES.md` — règles techniques structurelles (séparation analytique/live, snapshotId, additivité du payload)
- `SESSION.md` — état du projet
- `ARCHITECTURE.md` — structure code après merge
- `DATA_PIPELINE.md` — flux de données par écran
- `TRADING_LOGIC.md` — logique du moteur
- `PROVIDERS_MATRIX.md` — routage providers
- `KNOWN_ISSUES.md` — bugs et dette
- `CHECKLIST_MERGE.md` — checklist obligatoire avant tout merge
- `SETUPS_REGISTRY.md` — registre officiel des setups quantitatifs validés/testés/abandonnés.
- `ASSET_REGISTRY.md` — classification provisoire des actifs compatibles avec les setups.

Si une demande touche aux setups, aux backtests, au régime marché ou aux actifs compatibles, lire aussi `SETUPS_REGISTRY.md` et `ASSET_REGISTRY.md` avant toute réponse ou modification.

À chaque merge, **parcourir `CHECKLIST_MERGE.md`** et mettre à jour les fichiers concernés AVANT le merge :
- Modif architecture → `ARCHITECTURE.md`
- Modif flux donnée → `DATA_PIPELINE.md`
- Modif logique trading → `TRADING_LOGIC.md`
- Modif provider → `PROVIDERS_MATRIX.md`
- Découverte bug → `KNOWN_ISSUES.md`
- Toute évolution → `SESSION.md`

Un merge n'est PAS considéré comme terminé tant que la doc n'est pas à jour. La doc doit représenter l'ÉTAT RÉEL APRÈS MERGE, jamais une intention ou un futur.

## Règle workflow Git (IMPÉRATIVE)

**Après toute livraison fonctionnelle significative, créer une PR vers `main` et la signaler explicitement à l'utilisateur.**

Erreur type à NE PAS répéter : pousser 4 commits sur la branche de feature, mentionner "poussé" à l'utilisateur, mais **laisser silencieusement les commits derrière la PR existante déjà mergée**. L'utilisateur croit que ses corrections sont live alors qu'elles sont bloquées sur la branche.

### Procédure

1. Après chaque chunk de commits qui résout un problème utilisateur ou livre un feature complet :
   - Vérifier avec `git log origin/main..origin/<branche-active>` si des commits sont derrière `main`.
   - Si oui : **créer la PR immédiatement** via `mcp__github__create_pull_request` et **la merger directement** (squash, titre `<scope>: <résumé> (#<num>)` pour matcher l'historique). L'utilisateur a explicitement demandé l'auto-merge (session 2026-05-12) — pas la peine d'attendre une review humaine pour les changements de routine.
2. Donner le lien de la PR à l'utilisateur **après** le merge avec le statut du déploiement (Pages / Worker).
3. Ne **jamais** dire "tout est poussé" sans avoir vérifié l'état vs `main`. "Poussé sur la branche" ≠ "livré à l'utilisateur" tant que la PR n'est pas mergée.
4. **Exceptions à l'auto-merge — demander avant de merger** si :
   - Le PR touche un broker réel / passage en argent réel (cf. section "Architecture cible" de SESSION.md).
   - Le PR contient une migration SQL Supabase destructrice (DROP, TRUNCATE).
   - Le PR supprime un endpoint authentifié ou affaiblit l'auth admin (PIN, HMAC).
   - Le PR change la matrice `validateConfiguration` du moteur (worker.js).
5. Pour du travail expérimental où on **attend** volontairement la fin du sprint pour merger, le dire clairement au début et tenir le compteur des commits en attente.

## Branche de dev

Toujours développer sur la branche indiquée dans les instructions de la session (ex. `claude/next-task-XXX`). **Jamais** de push direct sur `main`.

## Stack

- PWA vanilla JS, zéro build, zéro dépendance front.
- Frontend monolithe : `assets/app.js` (~5700 l.) + `assets/styles.css` (~1300 l.) + `index.html` + `sw.js`.
- Backend : Cloudflare Worker `cloudflare-worker/worker.js` (~4000 l.). **Déploiement auto via GitHub Actions** — cf. section *Contraintes de déploiement*.
- Sync : Supabase (`mtp_positions`, `mtp_trades`).
- Auth : PIN → HMAC session token 24h.
- APIs marché : Binance, Twelve Data (4 clés rotation), Yahoo, CoinGecko, Alpha Vantage, Finnhub, Claude AI.

## Fichiers clés à lire avant toute modif

- `SESSION.md` — état du projet, TODOs, historique des sessions.
- `.claude/agents/bug-hunter.md` — 6 classes de bugs UI récurrentes documentées. Utiliser cet agent pour les rapports de bug visuels/interactifs.
- `.claude/skills/ui-ux-pro-max/` — skill UI/UX pour les refontes.

## Contraintes de déploiement

- **Frontend** : push sur `main` → GitHub Pages publie en 2-5 min.
- **Worker** : **déploiement automatique** via GitHub Action `.github/workflows/deploy-worker.yml`. Déclencheur = `push` sur `main` touchant `cloudflare-worker/**` (ou trigger manuel via `workflow_dispatch`). Le workflow utilise `cloudflare/wrangler-action@v3` + secret GitHub `CLOUDFLARE_API_TOKEN`. Durée habituelle : 30-60 s après le merge. Vérification : onglet *Actions* du repo → workflow *Deploy Cloudflare Worker*.
  - **Conséquences pour Claude** : après merge d'une PR qui touche `cloudflare-worker/**`, **ne PAS** demander à l'utilisateur de faire `wrangler deploy` ni de copier-coller dans le dashboard Cloudflare. Lui donner le lien Actions et attendre le run vert. Les secrets (`SUPABASE_URL`, `ADMIN_API_TOKEN`, etc.) sont stockés côté Cloudflare et préservés par `wrangler deploy` — pas d'action à faire dessus en routine.
  - Fallback manuel (si CI down) : `wrangler deploy` depuis `C:\Users\Emman\Documents\ManiTradePro\cloudflare-worker` sur la machine Windows de l'utilisateur, précédé d'un `git pull origin main`. Après : `wrangler secret list` pour vérifier que `SUPABASE_URL` est présent.
- **SW** : `CACHE_VERSION` dans `sw.js` à bumper à chaque release (sinon pas de réinstall). Assets en *network-first* depuis commit `176524d` — les releases suivantes se propageront sans vider le cache.

## Langue et vocabulaire

### Réponses utilisateur — **toujours en français**.
Commits, code, identifiants : anglais.

### Vocabulaire — **simple, pas de jargon**.

L'utilisateur n'est pas développeur professionnel. Il comprend le sens
général des choses techniques mais **se perd** quand on lui balance du
jargon (EV, walk-forward, bucket, curve-fitting, RR, friction, slippage,
rate limit, race condition, etc.) sans le traduire.

**Règles** :
1. **Pas de termes anglais techniques** sans traduction immédiate. Pas
   "EV +0,3 %" → écrire "le bot gagne 0,3 % par trade en moyenne".
2. **Pas d'acronymes** sans expansion. Pas "WR 37 %" → écrire
   "il gagne 37 fois sur 100".
3. **Pas de noms de fichiers/lignes/PR** dans les explications de fond.
   Garder ça pour les sections "ce que j'ai modifié" ou "à vérifier",
   pas dans le résumé pour comprendre.
4. **Métaphores avant techniques** quand on explique pourquoi quelque
   chose marche ou pas. Exemple : "le bot achète au sommet d'une
   montée" plutôt que "entrée tardive sur extension parabolic".
5. **Format préféré pour les bilans** : 3 sections max — "Ce qu'on a
   trouvé / Ce qu'on a fait / Ce que tu dois faire". Phrases courtes,
   pas de tableaux à 6 colonnes sauf si l'utilisateur demande du détail.
6. Si on **doit** utiliser un terme technique parce qu'on parle de code
   ou de procédure, le traduire entre parenthèses la première fois :
   *"on retire les frais (les coûts de courtage)"*.

Erreur type à NE PAS répéter : balancer un rapport markdown structuré
avec EV / WR / RR / friction / walk-forward / curve-fitting comme si
c'était évident. L'utilisateur perd le fil et ne peut pas décider.

## Style code

- Pas de `!important` en CSS. Si une règle ne prend pas, c'est un problème de spécificité — cherche la cause.
- Pas de `console.log` laissé dans `app.js`.
- Pas de commentaires qui décrivent le "quoi" (le code le dit). Commentaires uniquement pour le "pourquoi" non-évident.
- Pas de refonte d'architecture non demandée (monolithe → modules). Rester dans le style existant.
- Jamais de feature flags ou de code de transition : on change, on teste, on pousse.

## Thèmes

Deux thèmes : **dark** (default) et **light** via `.app-shell.theme-light`. Toute règle CSS avec un `background` sombre (`rgba(20,27,45,...)` et cousins) doit être scopée sous `.app-shell:not(.theme-light)` — sinon elle pollue le light theme. Cf. bug-hunter classe #1.

## Secrets

Jamais de commit contenant `.env`, credentials, ou valeurs de secrets. Si découvert par accident : signaler et demander à l'utilisateur de rotate.

---

# Validation obligatoire avant merge

Claude ne doit jamais merger directement une PR importante sans validation explicite de ChatGPT.

Avant chaque merge :
- tous les `.md` impactés doivent être mis à jour,
- `CHECKLIST_MERGE.md` doit être remplie,
- les diffs doivent être fournis,
- les impacts techniques doivent être documentés,
- les impacts quant doivent être documentés.

Claude doit ensuite attendre :

```text
GO MERGE explicite de ChatGPT
```

Sans ce GO explicite :
- pas de merge,
- pas de push sur `main`.

## Fichier obligatoire à lire

Avant toute réflexion stratégique ou validation importante :

```text
GPT_ROLE.md
```

## Agents et skills Claude Code

- La liste complète des agents et skills disponibles, leur rôle, leurs limites et les règles de délégation sont documentés dans `GPT_ROLE.md` (section *Claude Code Agents & Skills Governance*).
- **Toute utilisation d'un agent dans une PR doit être déclarée explicitement** dans le body : agent utilisé, tâche déléguée, résultat, limites éventuelles.
- Les moteurs quant restent implémentés directement par Claude, sans délégation à un agent isolé. Les agents ne remplacent jamais la revue ChatGPT.
