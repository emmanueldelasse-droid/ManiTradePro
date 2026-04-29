# CLAUDE.md — ManiTradePro

> Règles permanentes pour toute session Claude Code sur ce repo.
> **Lire aussi `SESSION.md`** en premier — c'est le fichier de continuité vivant.

## Règle workflow Git (IMPÉRATIVE)

**Après toute livraison fonctionnelle significative, créer une PR vers `main` et la signaler explicitement à l'utilisateur.**

Erreur type à NE PAS répéter : pousser 4 commits sur la branche de feature, mentionner "poussé" à l'utilisateur, mais **laisser silencieusement les commits derrière la PR existante déjà mergée**. L'utilisateur croit que ses corrections sont live alors qu'elles sont bloquées sur la branche.

### Procédure

1. Après chaque chunk de commits qui résout un problème utilisateur ou livre un feature complet :
   - Vérifier avec `git log origin/main..origin/<branche-active>` si des commits sont derrière `main`.
   - Si oui : **créer la PR immédiatement** via `mcp__github__create_pull_request` et donner le lien à l'utilisateur.
2. Ne **jamais** dire "tout est poussé" sans avoir vérifié l'état vs `main`. "Poussé sur la branche" ≠ "livré à l'utilisateur" tant que la PR n'est pas mergée.
3. Pour du travail expérimental où on **attend** volontairement la fin du sprint pour merger, le dire clairement au début et tenir le compteur des commits en attente.

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
