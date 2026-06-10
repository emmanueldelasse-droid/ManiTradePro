# SESSION.md — ManiTradePro

> Carnet de bord court et exploitable du projet. Source de l'état **actuel**, pas un historique complet.
>
> Les règles, registres et détails techniques font autorité dans les fichiers spécialisés (cf. § *Fichiers sources à consulter*). `SESSION.md` ne fait que résumer.
>
> **Mise à jour obligatoire avant chaque demande de `GO MERGE`** (cf. `CHECKLIST_MERGE.md` et `GOVERNANCE.md` § *Règles synchronisation mémoire*).

## 🆕 SESSION 2026-06-09 — MANITRADEPRO V2 (LEARNING BOT, reconstruction propre)

> Branche `claude/manitradepro-v2-learning-bot`. **Pas de PR, pas de merge** : livraison sur branche uniquement (gouvernance — un `GO MERGE` reste requis avant tout merge sur `main`).

- **Mission** : recréer l'app depuis zéro en V2, **sans réparer la V1**. Objectif réel = bot d'apprentissage qui *prend* des trades (paper) pour mesurer quels setups gagnent. Fin du modèle V1 « 0 trade parfaitement filtré ».
- **Décision créateur (cette session)** : livrer sur la branche `claude/manitradepro-v2-learning-bot` + **fichiers V2 séparés** (la V1 — `worker.js`, `assets/`, tables `mtp_*` — reste 100 % intacte).
- **Livré** :
  - `tools/v2/lib/engine-v2.mjs` — moteur pur (source de vérité unique) : univers 47 actifs, indicateurs (EMA20/50, RSI14, ATR14, volume), 4 setups (pullback, breakout, mean reversion, GLD breakout), validation de plan, sizing, résolution de position, statistiques.
  - `tools/v2/test/engine-v2.test.mjs` — **31 tests `node:test`, 31/31 pass**. Invariant testé : tout setup détecté+validé est ouvrable.
  - `cloudflare-worker/worker-v2.js` — worker HTTP + cron INDÉPENDANT (importe le moteur). Données Binance/EODHD/TwelveData/Yahoo, persistance Supabase avec repli KV, gestion du cycle complet. Endpoints `/api/v2/*`.
  - `cloudflare-worker/wrangler-v2.toml` — déploiement `manitradepro-v2` (cron horaire).
  - `cloudflare-worker/migrations/v2/001_v2_learning_schema.sql` — tables `mtp_v2_positions`, `mtp_v2_trades`, `mtp_v2_cycles`, `mtp_v2_setup_stats` (idempotent, V1 non touchée).
  - `v2/` — front PWA V2 (index/app/styles/sw/manifest) : santé bot, performance, stats par setup, opportunités ouvrables, trades. Pas de score, dark/light.
  - `docs/v2/ARCHITECTURE_V2.md` + `docs/v2/README_V2.md` — architecture, schéma, endpoints, déploiement.
- **Règle absolue respectée** : « si un trade est affiché ouvrable, il est ouvrable, sinon il n'est pas affiché ». Aucun score, aucun filtre caché.
- **Sécurité** : paper trading strict. Aucun broker, aucun argent réel, aucun secret modifié/exposé.
- **À faire (créateur)** : appliquer la migration SQL V2, `wrangler deploy -c wrangler-v2.toml`, vérifier `wrangler secret list -c wrangler-v2.toml`, lancer un premier cycle (front admin ou `POST /api/v2/cycle`).
- **Agents / skills utilisés** : aucun (moteur quant implémenté directement, conforme `GOVERNANCE.md`).
- **Correctifs post-déploiement (audit créateur, branche)** :
  - Écritures Supabase KO → cache de schéma PostgREST non rechargé après création des tables (la base acceptait les INSERT). Rechargé côté Supabase + champ `debug` temporaire ajouté à `POST /api/v2/cycle`.
  - Fermeture immédiate des trades (stop en 0 min, durée 0) → la même bougie daily servait à ouvrir ET à tester stop/TP. Fix : `opened_bar_time` (migration 002), une position n'est évaluée que sur une bougie STRICTEMENT postérieure à sa bougie d'entrée. Risque par trade réduit 1,0 %→0,5 %, `riskPerTrade` affiché. Moteur de setup non modifié.

## État actuel

- **Projet** : ManiTradePro — moteur quant de sélection / allocation / gestion du risque, orienté swing / rotation / momentum structurel multi-jours.
- **Date dernière mise à jour** : 2026-06-02.
- **Branche / PR active** : `claude/manitradepro-bot-blockage-JiOJl` — déblocage bot d'apprentissage (auth Analytics + diagnostic moteur + mode exploration). Pas encore de PR ni de GO MERGE.
- **🔧 SESSION 2026-06-02 — DÉBLOCAGE BOT D'APPRENTISSAGE** (branche `claude/manitradepro-bot-blockage-JiOJl`) :
  - **Auth Analytics réparée** : `loadTradeFeedback()` et `loadReports()` (assets/app.js) passaient par `api()` (sans token) → 403 sur `/api/training/feedback` et `/api/reports/weekly` (routes `requireAdminAccess`). Bascule sur `apiGetAuth()`. Erreurs 403 désormais affichées dans l'UI Analytics (`state.tradeFeedbackError`, `.lpi-error`) au lieu d'un échec silencieux.
  - **Diagnostic moteur** : nouvelle route `GET /api/training/debug-opportunities` (admin, lecture seule). Pour chaque actif : score, decision, tradeNow, blockers, confirmations, safety/actionability/dossier, quoteQuality, setup, régime, ET la première garde qui bloque l'auto-open (`explainAutoOpenBlock`). But : comprendre pourquoi un actif à 70+ reste « Pas de trade » ou n'ouvre aucun paper trade.
  - **Mode exploration (plancher de classement)** : `applyExplorationFloor` dans `buildWorkerPlan`. score ≥ 65 + confirmations ≥ 3 + aucun blocage critique → au minimum « À surveiller ». score ≥ 70 + risque acceptable → « Trade proposé » exploration (paper, taille réduite). N'altère JAMAIS la garde quote unsafe (R5, `applyUnsafeDowngrade` reste en aval) ni l'argent réel (inexistant).
  - **Auto-open exploration** : `isTrainingCandidateAllowed` accepte les trades exploration à seuils de score assouplis (`exploration_min_safety` 60 vs 68) et `chooseTrainingExecution` applique `exploration_size_factor` (0.5). Toutes les autres gardes (setup structurel, heures marché, buckets toxiques, cooldown, news window, risk state, rr ≥ 1.6) restent intactes. Nouveaux réglages : `exploration_auto_open` (true), `exploration_size_factor` (0.5), `exploration_min_safety` (60).
  - **Tests** : `tools/engine-tests.mjs` (13 tests, `npm test`) — classement 70 sans blocage, blocage critique conservé, table de vérité exploration, éligibilité auto-open exploration + garde R5 non contournée, auth feedback/reports.
  - **Badge UI « Exploration · paper réduit »** (revue ChatGPT, condition GO MERGE) : `rowIsExploration()` + badge ambre (`.badge.exploration`) sur les cartes opportunité (mobile + desktop) et la fiche détail, pour ne pas confondre un trade d'apprentissage avec un vrai « Trade proposé ».
  - **À vérifier (créateur)** : déployer le Worker, ouvrir `GET /api/training/debug-opportunities` avec le token admin pour lire la vraie raison de blocage de NVDA & co.
  - **PR #264 mergée** dans `main` (squash `ac6e541`), Worker déployé (Action #90, success).
- **🔧 SESSION 2026-06-02 (suite) — COHÉRENCE AFFICHAGE SCORES (UI only)** :
  - Problème post-#264 : la carte Opportunités affichait un chiffre (sûreté) sans libellé → « NVDA 73 mais Pas de trade », « ETH 64 mais Trade proposé » paraissaient incohérents.
  - Cercle aligné sur la décision : `getScoreState` affiche `decisionScore` (repli `officialScore` → brut). Ton/label restent pilotés par la décision.
  - Détail lisible sous chaque carte (`.opp-score-detail`) : Décision / Sûreté / Brut / Confirmations / Blocage.
  - Explication explicite (`opportunityScoreExplain`) : « Score brut élevé (73), mais bloqué par : … » pour les Pas de trade ; « Trade exploration : décision X / sûreté Y · taille réduite » pour l'exploration.
  - **Aucun changement moteur / seuil / auto-open.** Tests : `npm test` 17/17 (4 nouveaux sur l'affichage). bug-hunter : 0 régression.
  - **PR #265 mergée** dans `main` (squash `946aeff`). Front-only, pas de déploiement Worker.
- **🔧 SESSION 2026-06-02 (suite) — B.14 DÉCOUPLAGE QUALITÉ DONNÉE / EXÉCUTION (moteur)** (branche `claude/manitradepro-eodhd-data-quality`) :
  - Audit terrain : les actions (EODHD/Twelve « delayed_15m ») restaient « Pas de trade » quel que soit le score, alors que les cryptos (Binance live) passaient. Cause : `calcDetailScore` mappait toute fraîcheur ≠ live/recent à `dataQuality = 48` → `data_quality_low` (blocage MAJEUR), y compris le différé légal 15 min — incohérent avec `quoteQualityEngine` qui, lui, tolère le différé (`executionSafe = true`).
  - Fix B.14 : `data_quality_low` n'est plus déclenché que si `dataQuality < 55 ET quoteQuality.executionSafe === false`. Le différé exécutable cesse d'être un blocage ; eod/snapshot/stale/devise restent bloqués. **`dataQuality` (donc le scoring) reste inchangé** ; `quoteQuality` calculé une fois et réutilisé.
  - Effet : NVDA/COIN/NFLX repassent en « Trade proposé exploration » ; la garde d'exécution (R5) reste seule juge de la fiabilité du prix réel.
  - Tests : `npm test` 19/19 (2 nouveaux B.14 exécutant le vrai `calcDetailScore` : delayed_15m execution-safe ⇒ pas de `data_quality_low` ; eod/snapshot ⇒ blocage conservé).
- **Dernier merge connu** : PR #261 `feat(ui): Live Paper Analytics — sous-vue Analytics dans Trade (PR-UI-LIVE-PAPER-INSIGHTS-1)` (commit `aabffe8` sur `main`).
- **Phase officielle** : *VÉRITÉ MARCHÉ VISIBLE* — les analytics livePaperAnalytics + livePaperOutcome sont désormais observables côté UI dans l'onglet Trade.
- **✅ STACK SUPPRESSION HISTORIQUE TRADES — VALIDÉE BOUT EN BOUT (2026-05-22)** :
  - V1 tombstone local (PR #254) actif.
  - V2 tombstone serveur Supabase (PR #256 + migration 017 appliquée par le créateur le 2026-05-22 à 20:54 UTC) actif.
  - V3 wipe local-first iPhone (PR #258, sw.js CACHE_VERSION v8.6) actif.
  - Test iPhone manuel confirmé OK par le créateur.
  - Multi-device PC ↔ iPhone cohérent.
- **Prochaine étape débloquée** : PR-UI-LIVE-PAPER-INSIGHTS-1 (dashboard Analytics) sur nouveau brief ChatGPT.
- **À VÉRIFIER MANUELLEMENT (créateur)** : supprimer historique dans l'app → refresh → fermer/réouvrir app → confirmer que l'historique ne revient pas. Vérifier Supabase si possible (`mtp_trades` doit rester vide après wipe).
- **Prochaine étape après vérification** : PR-UI-LIVE-PAPER-INSIGHTS-1 (dashboard Analytics) sur nouveau brief ChatGPT.
- **Phase projet** : **VÉRITÉ MARCHÉ** — *« scaler l'observation avant de scaler l'exécution »*. ManiTradePro analyse désormais ~170 actifs (analysisUniverse + experimental visibles côté UI) MAIS limite les ouvertures paper auto à 42 actifs livePaperCore (filtre RESTRICTIF `auvIsLivePaperCore` dans `isTrainingCandidateAllowed`). Architecture cohérente : **on n'a pas scalé l'exécution avant de scaler la compréhension**.
- **Statut global** : phase de recherche quantitative active, sous **gel méthodologique** (Research Framework Freeze v1, cf. `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`).
- **Mode actuel** : recherche + documentation. Pas de capital réel. Pas de bot live actif.
- **Ce qui est réel** : aucun trading capital réel. Rien.
- **Ce qui est paper trading** : infrastructure paper existe (`mtp_positions`, `mtp_trades` Supabase) mais aucun setup n'est branché en automatique sans supervision humaine.
- **Ce qui est recherche** : tous les setups quantitatifs en cours d'évaluation, sous le pipeline 10 étapes du Framework Freeze v1.
- **Statuts setups officiels** (vocabulaire `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 8, détails dans `docs/quant/SETUPS_REGISTRY.md`) :
  - RS Rotation simple → **`RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED`**
  - Mean Reversion → **`EXPERIMENTAL_ONLY / FRICTION_REQUIRED`**
  - SECTOR_RELATIVE_STRENGTH v1 → **`FRAGILE / CONCENTRATION_EXCESSIVE`** (top 5 tickers = 103 % du PnL, edge non diversifiable)
  - TREND_PULLBACK_DYNAMIC_SUPPORT v1 → **`FRAGILE`**
  - GLD Breakout isolated → **`CONDITIONAL_RESEARCH_CANDIDATE`** (n=47, single-symbol)
  - Pullback Momentum → **`DEAD / DO_NOT_TRADE`** (PR #207 INVALID_BACKTEST)
  - Breakout agrégé → **`DEAD_AGGREGATED`** (PR #208)
  - Volatility Compression → **`DEAD / ABANDONED`**
- **Ce qui n'est pas encore live** : tout. **Aucun setup `VALIDATED_RESEARCH_CORE`** au 2026-05-19. **Aucun setup `LIVE_READY`** au 2026-05-19.

## Dernière session / dernière PR mergée

- **Date** : 2026-05-19.
- **PR** : #222 — `docs(session): clean session state and enforce update rule`.
- **Objectif** : réduire `SESSION.md` à un carnet de bord court, formaliser l'obligation de mise à jour avant chaque `GO MERGE`.
- **Résultat** : merge squash sur `main` (commit `c6d6d91`). `SESSION.md` réduit à ~100 lignes, règle synchro mémoire renforcée dans `GOVERNANCE.md` et `CHECKLIST_MERGE.md`.
- **Fichiers modifiés** : `SESSION.md`, `CHECKLIST_MERGE.md`, `GOVERNANCE.md`, `CLAUDE.md`.
- **Impact runtime** : aucun.
- **Impact quant** : aucun.
- **Impact documentation** : `SESSION.md` redevient un résumé d'état, pas un journal complet.
- **Statut merge** : `GO MERGE` explicite reçu, merge effectué en squash.

## Dernière session / dernière PR mergée (bis)

- **Date** : 2026-05-19.
- **PR** : #231 — `docs(decisions): add first project decision record`.
- **Objectif** : système officiel d'historique des décisions structurantes + première décision archivée (`DECISION-001`).
- **Résultat** : merge squash sur `main` (commit `a4249d8`). `docs/decisions/README.md` réécrit, `DECISION-001` archivée (statut ACTIVE), GOVERNANCE.md § Décisions historiques en place.
- **Fichiers ajoutés** : `docs/decisions/DECISION-001-gpt-role-merged-into-governance.md`.
- **Impact runtime / quant** : aucun.
- **Statut merge** : `GO MERGE` reçu (créateur).

## Dernière session / dernière PR mergée (ter)

- **Date** : 2026-05-19.
- **PR** : #244 — `docs(governance): require ChatGPT to suggest Claude Code agents in prompts`.
- **Objectif** : codifier officiellement dans `GOVERNANCE.md` la règle que ChatGPT doit suggérer les agents Claude Code disponibles dans les prompts qu'il rédige pour Claude, quand pertinent.
- **Résultat** : merge squash sur `main` (commit `8b3ccc0`). Bullet ajouté dans § *Format obligatoire ChatGPT ↔ Claude*, nouvelle sous-section § *Délégation d'agents par ChatGPT* (~50 lignes) avec table des cas, format de recommandation, justifications, limites.
- **Impact runtime / quant** : aucun.
- **Statut merge** : `GO MERGE` reçu (créateur).

## Dernière session / dernière PR mergée (quater)

- **Date** : 2026-05-21.
- **PR** : #245 — `docs(regime): canonise market regimes V1 + factor into shared lib (CLEAN-2)`.
- **Objectif** : factoriser la définition des régimes marché V1 dans `docs/quant/REGIME_RULES.md` (doc) + `tools/quant/lib/regime-rules-v1.mjs` (module pur déterministe).
- **Résultat** : merge squash sur `main` (commit `cac413c`). Source canonique unique pour les 4 régimes officiels (RISK_ON, RANGE, RISK_OFF, HIGH_VOL override). 3 scripts actifs migrés avec validation anti-régression byte-à-byte 3/3 IDENTICAL. 8 scripts historiques en dette CLEAN-2b documentée.
- **Impact runtime / quant** : aucun. Pure factorisation.
- **Statut merge** : `GO MERGE` reçu (créateur).

## Dernière session / dernière PR mergée (quinquies)

- **Date** : 2026-05-21.
- **PR** : #246 — `quant(context): add Context Engine V1 analytical module (PR-CTX-2)`.
- **Objectif** : module analytique pur Context Engine V1 produisant un snapshot lisible, déterministe et testable du contexte marché (régime, breadth, leadership sectoriel, vol-proxy SPY 20j, défensifs TLT/GLD) à partir de 16 ETF figés. Régime délégué à la lib canonique CLEAN-2 (`regime-rules-v1.mjs`). Aucun appel VIX externe.
- **Résultat** : merge squash sur `main` (commit `31c9a6b`). Tests 6/6 pass. Smoke réel sur datasets 2021-2025 : regime RISK_ON, rvol 0.0861 LOW, 0 warning. Issue qualité données #15 ajoutée (splits non ajustés XLY/XLE/XLU détectés).
- **Impact runtime / quant** : aucun. Module read-only.
- **Statut merge** : `GO MERGE` reçu (ChatGPT).

## Dernière session / dernière PR mergée (sexies)

- **Date** : 2026-05-21.
- **PR** : #247 — `quant(authorization): add Setup Authorization Matrix V1 (PR-CTX-3)`.
- **Objectif** : matrice DÉCLARATIVE pure d'autorisation par setup (5 setups × 4 régimes officiels V1), alignée sur les statuts `SETUPS_REGISTRY.md`. Aucun statut modifié. Aucun branchement runtime. Aucun setup activé.
- **Résultat** : merge squash sur `main` (commit `93851a2`). 12/12 tests pass. Invariants explicites contre consommation prématurée de `sectorLeadership` / XLY / XLE / XLU (KNOWN_ISSUES #15 OPEN). Sanity check intégration PR-CTX-2 → PR-CTX-3 sur snapshot smoke réel cohérent.
- **Impact runtime / quant** : aucun. La matrice **reflète** les statuts, ne les modifie pas.
- **Statut merge** : `GO MERGE` reçu (ChatGPT) avec recommandation explicite : ne PAS lancer PR-CTX-5 avant décision architecture complète. Priorité réelle suivante = validation empirique des setups, pas multiplication des couches système.

## Dernière session / dernière PR mergée (septies)

- **Date** : 2026-05-21.
- **PR** : #249 — `quant(analytics): add Live Paper Analytics V1 (PR-LIVE-PAPER-ANALYTICS-1)`.
- **Objectif** : instrumentation analytique pure des trades paper existants. Capture `livePaperAnalytics` à l'ouverture et `livePaperOutcome` à la clôture dans le JSONB `analysis_snapshot`. AUCUNE décision modifiée. CTX-2/CTX-3 observés, jamais bloquants.
- **Résultat** : merge squash sur `main` (commit `f2c427c`). 11/11 tests pass. 3 bug-hunters OK. 0 ligne supprimée dans worker.js. Issue qualité données #15 toujours OPEN (tagué automatiquement par `sector_leadership_untrusted`).
- **Impact runtime / quant** : aucun.
- **Statut merge** : `GO MERGE` reçu (ChatGPT).

## Dernière session / dernière PR mergée (octies)

- **Date** : 2026-05-21.
- **PR** : #250 — `quant(analytics): riskContext + contextCaptureStatus + no-decision-drift proof (PR-LIVE-PAPER-EXEC-1b)`.
- **Objectif** : micro-PR par-dessus PR #249. Ajout `riskContext` (lecture seule), `contextCaptureStatus` sentinelle, 7 tests EXEC-1b (5 obligatoires A-E + 2 bonus), preuve structurelle « no decision drift ».
- **Résultat** : merge squash sur `main` (commit `aa91eca`). 18/18 tests pass. 4 bug-hunters OK. Preuve no-decision-drift : 2 nouveaux `if` (helpers analytics uniquement) ; 0 mutation de seuil ; 0 modification de fonction décisionnelle.
- **Impact runtime / quant** : aucun.
- **Statut merge** : `GO MERGE` reçu (ChatGPT) avec recommandation explicite : **« Le projet vient de franchir une étape majeure »** (première vraie base sérieuse du futur moteur d'apprentissage). Priorité maintenant = laisser tourner plusieurs semaines/mois de vérité marché paper live. **Ne PAS accélérer vers broker réel / IA complexe / RL / auto-learning agressif.**

## Dernière session / dernière PR mergée (novies)

- **Date** : 2026-05-21.
- **PR** : #252 — `quant(universe): add Asset Universe staged V1 (PR-ASSET-UNIVERSE-170-STAGED-V1)`.
- **Objectif** : taxonomie staged 4 buckets (livePaperCore 42, analysisUniverse 168, experimentalUniverse 19, blockedUniverse 6) + filtre worker RESTRICTIF dans `isTrainingCandidateAllowed`. Analyse élargie à ~170 actifs sans élargir l'exécution.
- **Résultat** : merge squash sur `main` (commit `c76dc4d`). 14/14 tests pass. 2 bug-hunters OK (scan #1 a remonté un ReferenceError critique, corrigé immédiatement). 0 ligne supprimée dans worker.js, 0 mutation de seuil décisionnel.
- **Impact runtime** : filtre RESTRICTIF par construction. Aucun nouvel actif ne s'ouvre en auto-open vs pré-PR. KNOWN_ISSUES #15 explicitement protégée.
- **Impact quant (fond)** : aucun.
- **Statut merge** : `GO MERGE` reçu (ChatGPT) avec point pédagogique explicite : *« vous avez évité une erreur très fréquente : scaler l'exécution avant de scaler la compréhension »*.

## Dernière session / dernière PR mergée (decies)

- **Date** : 2026-05-21.
- **PR** : #254 — `fix(trades): historique supprimé qui réapparaît — tombstone permanent (PR-TRADES-HISTORY-DELETE-FIX)`.
- **Objectif** : bugfix prioritaire « historique supprimé qui réapparaît ». Cause racine identifiée (4 vecteurs front : TTL tombstone 5 min, absence de filtre remote, restore backup, sync sans filtre). Fix : tombstone PERMANENT côté front + filtres aux 3 vecteurs critiques.
- **Résultat** : merge squash sur `main` (commit `c50cdfe`). 15/15 tests pass. 4 bug-hunters OK (scan #1 a remonté un crash critique, corrigé immédiatement). Worker non touché, Supabase non touché.
- **Impact runtime** : front uniquement. Le `wipeTradesOnServer` existant vide déjà la base ; cette PR empêche juste la réapparition côté UI.
- **Impact quant** : aucun.
- **Impact learning** : positif indirect — les anciens trades supprimés ne peuvent plus alimenter Live Paper Analytics ni learning.
- **Statut merge** : `GO MERGE` reçu (ChatGPT). Bug prioritaire corrigé avant dashboard Analytics.

## Dernière session / dernière PR mergée (undecies)

- **Date** : 2026-05-22.
- **PR** : #256 — `fix(trades): tombstone serveur multi-device (PR-TRADES-TOMBSTONE-SERVER-V2)`.
- **Objectif** : tombstone SERVEUR multi-device par-dessus V1 local (PR #254). Vérité centrale Supabase via table `mtp_trades_meta`. PC↔iPhone synchronisés au prochain refresh / sync.
- **Résultat** : merge squash sur `main` (commit `e450c8c`). 24/24 tests pass (15 V1 + 9 V2). 9 bug-hunters OK. Migration 017 idempotente livrée (à appliquer manuellement). Worker (3 handlers étendus) + front (4 zones) + module pur étendu.
- **Impact runtime** : worker `handleTradesState` / `handleTradesSync` / `handleTradesWipe` enrichis. Front `loadTradesState` / `syncTradesToSupabase` / `wipeTradesOnServer` enrichis. 0 fonction décisionnelle modifiée.
- **Impact quant** : aucun.
- **⚠ Action créateur post-merge** : appliquer la migration `017_trades_meta.sql` dans Supabase Studio. Sinon V2 reste inactif (comportement gracieux V1 fallback).
- **Statut merge** : `GO MERGE` reçu (ChatGPT) après resync (PR initialement behind_by=2 — corrigé via merge main, head e903c4c).

## Dernière session / dernière PR mergée (duodecies)

- **Date** : 2026-05-22.
- **PR** : #258 — `fix(trades): wipe local-first iPhone Safari (PR-TRADES-WIPE-LOCAL-FIRST-V3)`.
- **Objectif** : bugfix V3 critique iPhone Safari. Les 2 handlers wipe (`data-clear-all-history` + `data-clear-history` par source) étaient server-first → Safari "Load failed" bloquait le wipe local. Refactor en local-first.
- **Résultat** : merge squash sur `main` (commit `4648cdf`). 24/24 tests pass. 2 bug-hunters OK (scan #1 a remonté une fragilité mineure → corrigée immédiatement). `sw.js` CACHE_VERSION bumpé `v8.5` → `v8.6` pour cache-bust iPhone PWA.
- **Impact runtime** : front uniquement (assets/app.js + sw.js). Worker non touché. Migration 017 inchangée.
- **Impact quant** : aucun. 0 fonction décisionnelle modifiée.
- **Point clé ChatGPT** : *« Le serveur ne doit jamais empêcher une suppression locale demandée par l'utilisateur. »*
- **Statut merge** : `GO MERGE` reçu (ChatGPT).

## Dernière session / dernière PR mergée (terdecies)

- **Date** : 2026-05-22.
- **PR** : #261 — `feat(ui): Live Paper Analytics — sous-vue Analytics dans Trade (PR-UI-LIVE-PAPER-INSIGHTS-1)`.
- **Objectif** : phase officielle *VÉRITÉ MARCHÉ VISIBLE*. Sous-vue Analytics READ-ONLY dans l'onglet Trade qui expose les `livePaperAnalytics` + `livePaperOutcome` déjà capturés en base depuis PR #249/#250.
- **Résultat** : merge squash sur `main` (commit `aabffe8`). 5 sections livrées (Overview, Setup insights, Régimes, Warnings, Derniers trades instrumentés). État vide géré. Trades legacy comptés séparément. Responsive iPhone + dark/light theme.
- **Impact runtime** : front uniquement (assets/app.js + assets/styles.css). 0 worker / migration / endpoint / write Supabase / module quant touchés.
- **Impact quant** : aucun.
- **Statut merge** : `GO MERGE` reçu (ChatGPT). *« ManiTradePro change de nature : observable au lieu d'opaque »*.

## PR en cours

- **PR** : aucune PR de feature. Maintenance documentaire post-merge PR #261 uniquement (`claude/session-md-post-analytics-merge`).
- **Phase actuelle** : *VÉRITÉ MARCHÉ VISIBLE* — observabilité analytique livrée. Stack suppression historique trades validée (V1+V2+V3 + migration 017).
- **À vérifier manuellement (créateur)** : ouvrir l'app après déploiement Pages, aller dans Trades, scroller en bas → vérifier que la section "📊 Analytics — Live Paper Insights" s'affiche (avec état vide si aucun trade instrumenté, ou les 5 sections si trades présents). Tester iPhone + dark/light.
- **Philosophie projet officiellement validée (ChatGPT 2026-05-22 post-#261)** : *« ManiTradePro n'est plus seulement un bot qui ouvre des trades, mais devient un système observable qui apprend du marché vivant. »*
- **Directive ChatGPT post-#261 — interdictions immédiates** :
  - ❌ Pas de RL.
  - ❌ Pas d'IA opaque.
  - ❌ Pas de broker réel.
  - ❌ Pas d'auto-learning agressif.
  - ❌ Pas de sur-ingénierie graphique.
- **Priorité réelle suivante (ChatGPT)** : laisser tourner le moteur paper live plusieurs **semaines** pour accumuler vérité marché. Observer : dégradation, stabilité, survie setups, comportement multi-régime.
- **Prochaines grandes étapes possibles** (à activer SEULEMENT après accumulation suffisante de données live) :
  1. Cohort analysis V1.
  2. Timeline dégradation setups.
  3. Drill-down trade detail.
  4. Export analytics CSV/JSON.
  5. MAE/MFE visualization.
  6. Setup stability monitor.
  7. Training dataset extraction V1.
- **Pistes quant en parallèle** (directive ChatGPT post-CTX-3, validation empirique des setups) : (a) walk-forward conditionnel régime sur RS Rotation, (b) friction ×2/×3 hardening complémentaire, (c) décision A/B/C Mean Reversion V1, (d) audit anti-look-ahead sectorMomentum (préalable à toute reprise SECTOR_RS), (e) re-ingestion ajustée datasets pour fermer KNOWN_ISSUES #15.

## Mission précédente (PR-UI-LIVE-PAPER-INSIGHTS-1, livrée 2026-05-22)

> Bloc archivé pour traçabilité. Détails dans la fiche § *Dernière session / dernière PR mergée (terdecies)* + PR #261.

- **PR** : PR-UI-LIVE-PAPER-INSIGHTS-1 — sous-vue Analytics dans l'onglet Trade — branche `claude/ui-live-paper-insights-v1`.
- **Mission créateur** (2026-05-22, phase officielle *VÉRITÉ MARCHÉ VISIBLE*) : rendre observable la vie analytique du bot. `livePaperAnalytics` (PR #249) + `livePaperOutcome` (PR #250) existent en base depuis fin mai mais sont invisibles côté UI. Cette PR les expose en lecture seule.
- **Scope strict** : UI / READ-ONLY uniquement. AUCUN worker touché. AUCUN write Supabase. AUCUN endpoint ajouté.
- **Placement UI** : pas de nouvel onglet principal. Section "📊 Analytics — Live Paper Insights" ajoutée en bas de l'onglet Trade (après bot mini + rapport hebdo).
- **5 sections livrées** :
  1. **Overview** — 7 cartes compactes (ouverts, fermés, instrumentés, legacy, PnL total, winrate, PnL moyen) + distribution `signalQuality` (GOOD/NOISY/BAD/UNKNOWN) + distribution `validationStatus` (OK/SUSPECT/INVALID/UNKNOWN).
  2. **Setup insights** — table par `setupId` (N, WR, PnL, régime dominant, qualité signal).
  3. **Régimes** — table par régime officiel (RISK_ON, RANGE, RISK_OFF, HIGH_VOL).
  4. **Warnings** — top warnings bucketisés (préfixe avant `:`).
  5. **Derniers trades instrumentés** — table responsive limitée à 20 (date, symbole, setup, régime, signal, validation, PnL, sortie + 2 warnings).
- **État vide** : message explicite si aucun trade instrumenté + mention legacy count si applicable.
- **Fichiers modifiés** :
  - `assets/app.js` — bloc ~330 lignes inséré avant `renderPortfolio` : helpers extraction (`extractLivePaperAnalytics`, `extractLivePaperOutcome`, `isInstrumentedTrade`), agrégations (`lpiBuildOverview`, `lpiBuildBySetup`, `lpiBuildByRegime`, `lpiBuildWarningsTop`, `lpiBuildRecentInstrumented`), rendu (`renderTradesAnalyticsSection`, `lpiBadge*`, `lpiFmt*`). Appel ajouté dans `renderPortfolio` (mode training, juste après `renderWeeklyReportSection`).
  - `assets/styles.css` — ~200 lignes CSS classes `lpi-*` (cartes compactes, badges colorés par qualité/régime, table responsive, dark + light theme override, breakpoints 620px / 430px iPhone).
  - `SESSION.md` — cette mise à jour.
- **Worker.js / migrations / tools/quant/lib** : NON touchés. Aucun endpoint ajouté.
- **Bug-hunters** (3 scans monolithic-file hook) : tous OK.
  - Scan #1 (bloc analytics insert) : VERDICT OK 7/7 (collision noms, scope safeText, console.log, await, mutation state, return string toujours, Array.isArray guards).
  - Scan #2 (integration renderPortfolio) : VERDICT OK 3/3 (hoisting, commentaire inline, template literal).
  - Scan #3 (CSS bloc styles.css) : en cours.
- **Validation tests** : `node --check assets/app.js` → OK. Tests automatiques : non applicables (UI). Tests manuels iPhone + dark/light à faire par le créateur.
- **Limites V1** :
  - Pas de chart externe (recharts, etc.). Tables et badges uniquement.
  - Pas de filtre interactif (tri par PnL est fixe).
  - Pas de drill-down par trade (cliquer sur un trade ne déplie rien).
  - Trades legacy (avant PR #249) exclus des stats avancées, comptés séparément.
  - 20 derniers trades affichés max (anti-perf sur device faible).
- **Impact runtime** : front uniquement. Aucun changement worker / Supabase / décision bot / scoring / sizing / safety gate / learning.
- **Statut merge** : attente `GO MERGE explicite de ChatGPT`.

## Mission précédente (PR-TRADES-WIPE-LOCAL-FIRST-V3, livrée 2026-05-22)

> Bloc archivé pour traçabilité. Détails dans la fiche § *Dernière session / dernière PR mergée (duodecies)* + PR #258 + KNOWN_ISSUES #16 V3.

- **PR** : PR-TRADES-WIPE-LOCAL-FIRST-V3 — bugfix iPhone Safari "Load failed" — branche `claude/trades-wipe-local-first-v3`.
- **Mission créateur** (2026-05-22, priorité ABSOLUE) : la suppression iPhone ne fonctionne toujours pas même avec V1 + V2. Bug réel dans le flux UI. Règle non négociable : *« L'utilisateur ne doit jamais voir "Rien n'a été supprimé" si la suppression locale peut être faite. »*
- **Cause racine V2 → V3** : les 2 handlers (`data-clear-all-history` global + `data-clear-history` par source) sont **server-first**. Si `wipeTradesOnServer` échoue (Safari "Load failed", offline, worker indispo), l'alert "Rien n'a été supprimé" affiche et `return` → **wipe local jamais effectué**.
- **Solution V3 livrée** : refactor en **local-first**. UI/localStorage purgés AVANT l'await réseau. Best-effort serveur en arrière-plan. Toast honnête au lieu d'un alert anxiogène.
- **Fichiers modifiés** :
  - `assets/app.js` — 2 handlers refactorés en local-first (`data-clear-all-history` lignes ~7964, `data-clear-history` par source lignes ~7940). Fix mineur défense en profondeur : `wipeTradesOnServer` catch pose `pendingRemoteWipe` aussi pour wipe par-source (symétrie avec wipeAll).
  - `sw.js` — `CACHE_VERSION` bumpé `manitradepro-v8.5` → `manitradepro-v8.6` pour cache-bust iPhone PWA.
  - `docs/monitoring/KNOWN_ISSUES.md` — issue #16 étendue V3 avec cause racine précise (server-first → local-first), 10 tests obligatoires brief couverts.
  - `SESSION.md` — cette mise à jour.
- **Worker.js** : non touché. Migration 017 : déjà livrée par PR #256.
- **Bug-hunters** (2 scans monolithic-file hook) : tous OK. Scan #1 a noté une fragilité mineure (pendingRemoteWipe non posé par catch pour mode par-source) → corrigé immédiatement par fix défense en profondeur.
- **Garanties V3** :
  - UI vide IMMÉDIATEMENT après confirmation, même si Safari renvoie "Load failed".
  - localStorage vide IMMÉDIATEMENT (clés + backups).
  - Tombstone local PR #254 posé IMMÉDIATEMENT → blocage réapparition au refresh.
  - `pendingRemoteWipe` posé AUTOMATIQUEMENT sur échec serveur → retry au prochain wipe ou `loadTradesState`.
  - Toast honnête : succès "supprimé local + serveur" / échec "supprimé localement, synchro en attente".
- **Validation tests** : `node --test tools/quant/test/trades-history-tombstone-v1.test.mjs` → 24/24 pass. `node --check assets/app.js` → OK.
- **Cache iPhone PWA** : CACHE_VERSION bumpé force le réinstall du service worker côté iPhone → user récupère la nouvelle app.js sans hard refresh manuel.
- **Statut merge** : attente `GO MERGE explicite de ChatGPT`. Priorité ABSOLUE avant interface Analytics.

## Mission précédente (PR-TRADES-TOMBSTONE-SERVER-V2, livrée 2026-05-22)

> Bloc archivé pour traçabilité. Détails dans la fiche § *Dernière session / dernière PR mergée (undecies)* + PR #256 + KNOWN_ISSUES #16 V2.

- **PR** : PR-TRADES-TOMBSTONE-SERVER-V2 — tombstone serveur multi-device — branche `claude/trades-tombstone-server-v2`.
- **Mission créateur** (2026-05-21, priorité ABSOLUE) : le tombstone local PR #254 ne suffit pas multi-device. Si je supprime sur PC, doit disparaître sur iPhone. Si je supprime sur iPhone, doit disparaître sur PC. Vérité centrale côté serveur.
- **Cause racine V1 → V2** : V1 (PR #254) = tombstone localStorage uniquement. Limite : pas de communication entre devices. Un iPhone avec localStorage obsolète peut réinjecter ses anciens trades via sync UPSERT `Prefer=resolution=merge-duplicates`, et PC peut voir réapparaître l'historique au prochain refresh.
- **Solution V2** : nouvelle table Supabase `mtp_trades_meta` (key='global', last_wiped_at, wipe_version, updated_at) — vérité centrale.
- **Fichiers créés** :
  - `cloudflare-worker/migrations/017_trades_meta.sql` (idempotent : `CREATE TABLE IF NOT EXISTS` + `INSERT ... ON CONFLICT DO NOTHING`).
- **Fichiers modifiés** :
  - `cloudflare-worker/worker.js` — 4 helpers ajoutés (`TRADES_META_TABLE`, `readTradesGlobalMeta`, `bumpTradesGlobalMeta`, `isTradeOlderThanServerTombstone`) + modification de 3 handlers : `handleTradesState` (lit + filtre + renvoie meta), `handleTradesSync` (filtre input antérieur au tombstone + retourne meta + `rejectedAsObsolete[]`), `handleTradesWipe` branche `wipeAll=true` (bump le marker après DELETE).
  - `assets/app.js` — `loadTradesFromWorker` récupère `serverMeta` ; `loadTradesState` merge local/server (le max gagne, adoption locale si server > local, flag `pendingRemoteWipe` si local > server) ; `syncTradesToSupabase` adopte aussi le marker server au passage ; `wipeTradesOnServer` adopte serverMeta sur succès, set `pendingRemoteWipe` sur échec wipeAll.
  - `tools/quant/lib/trades-history-tombstone-v1.mjs` — extension V2 : helpers `parseIsoToMsSafeV1`, `mergeTombstonesV1`, `shouldPushPendingWipeV1`.
  - `tools/quant/test/trades-history-tombstone-v1.test.mjs` — 9 nouveaux tests V2 (merge server/local, pendingRemoteWipe, flux multi-device PC↔iPhone, device offline qui revient).
  - `docs/monitoring/KNOWN_ISSUES.md` — issue #16 étendue avec section V2 + table de comportement + tests obligatoires couverts.
  - `docs/project/DATA_PIPELINE.md` — section V2 multi-device server tombstone + flux.
  - `SESSION.md` — cette mise à jour.
- **Bug-hunters lancés** (7 scans monolithic-file hook) : tous OK.
- **Comportement gracieux si migration 017 non appliquée** : `readTradesGlobalMeta` / `bumpTradesGlobalMeta` retournent `null` silencieusement. Le wipe DELETE Supabase fonctionne quand même. V1 tombstone local reste actif comme pré-V2.
- **Validation tests** : `node --test tools/quant/test/trades-history-tombstone-v1.test.mjs` → 24/24 pass (15 V1 + 9 V2). `node --input-type=module --check < worker.js` → OK. `node --check assets/app.js` → OK.
- **Migration SQL à appliquer manuellement** : ouvrir Supabase Studio → SQL Editor → exécuter le contenu de `cloudflare-worker/migrations/017_trades_meta.sql`. Idempotent, aucune action destructive.
- **Impact runtime** : worker + front. Aucun changement de logique de scoring / sizing / safety gate. Le wipe existant fonctionne identique côté DELETE Supabase, plus le bump du marker.
- **Impact quant** : aucun.
- **Statut merge** : attente `GO MERGE explicite de ChatGPT`. Priorité ABSOLUE avant interface Analytics.

## Mission précédente (PR-TRADES-HISTORY-DELETE-FIX, livrée 2026-05-21)

> Bloc archivé pour traçabilité. Détails dans la fiche § *Dernière session / dernière PR mergée (decies)* + PR #254 + KNOWN_ISSUES #16.

- **PR** : PR-TRADES-HISTORY-DELETE-FIX — bugfix prioritaire « historique supprimé qui réapparaît » — branche `claude/trades-history-delete-fix`.
- **Mission créateur** (2026-05-21, priorité ABSOLUE, AVANT le dashboard Analytics) : auditer et corriger définitivement le bug où l'historique supprimé dans l'onglet Trades réapparaît ensuite. Confiance dans le paper trading en jeu.
- **Cause racine identifiée** (audit complet via Explore) :
  1. TTL du tombstone trop court (5 min, `loadTradesState` l. 680). Après, `recentWipe=false` et Supabase reprend la main si de nouveaux trades arrivent entre temps via cron auto-cycle.
  2. Aucun filtre tombstone côté front : trades remote consommés tels quels, même ceux antérieurs au wipe.
  3. `restoreTradesFromBackupIfEmpty` peut restaurer depuis backup local non synchronisé.
  4. `syncTradesToSupabase` ne filtre pas les trades obsolètes → réinjection multi-onglet/device.
- **Solution livrée** : tombstone PERMANENT côté front, source canonique `tools/quant/lib/trades-history-tombstone-v1.mjs` + miroir inline dans `assets/app.js`.
- **Fichiers créés** :
  - `tools/quant/lib/trades-history-tombstone-v1.mjs` (~135 lignes) — module pur testable.
  - `tools/quant/test/trades-history-tombstone-v1.test.mjs` — 15 tests `node:test`, tous pass.
- **Fichiers modifiés** :
  - `assets/app.js` — 4 modifications ciblées : ajout helper `isTradeOlderThanTombstone`, filtre remote dans `loadTradesState`, `recentWipe` permanent (plus de TTL 5 min), filtre sync dans `syncTradesToSupabase`, guard tombstone dans `restoreTradesFromBackupIfEmpty`.
  - `docs/monitoring/KNOWN_ISSUES.md` — issue #16 ajoutée + marquée résolue avec cause racine détaillée et tests validés.
  - `docs/project/DATA_PIPELINE.md` — section « Tombstone de suppression historique » ajoutée.
  - `SESSION.md` — cette mise à jour.
- **Worker.js** : non touché. Le filtre côté front suffit (Supabase est déjà vidé par `wipeTradesOnServer`).
- **Bug-hunters** (4 scans monolithic-file hook) :
  - Scan #1 (filtre tombstone) : BLOQUANT (helper non défini) → corrigé immédiatement.
  - Scan #2 (helper ajouté) : VERDICT OK.
  - Scan #3 (sync filter) : VERDICT OK.
  - Scan #4 (restore guard) : VERDICT OK.
- **Validation tests** : `node --test tools/quant/test/trades-history-tombstone-v1.test.mjs` → 15/15 pass. `node --check assets/app.js` → OK.
- **Impact runtime** : front uniquement. Aucun changement worker. Aucun changement Supabase (DB déjà vidée par le wipe existant — le tombstone empêche juste la réapparition).
- **Impact quant** : aucun.
- **Statut merge** : attente `GO MERGE explicite de ChatGPT`. Priorité ABSOLUE avant dashboard Analytics.

## Mission précédente (PR-ASSET-UNIVERSE-170-STAGED-V1, livrée 2026-05-21)

> Bloc archivé pour traçabilité. Détails dans la fiche § *Dernière session / dernière PR mergée (novies)* + PR #252.

- **PR** : PR-ASSET-UNIVERSE-170-STAGED-V1 — Asset Universe staged V1 — branche `claude/asset-universe-staged-v1`.
- **Mission créateur** (2026-05-21, post-VÉRITÉ MARCHÉ) : étendre ManiTradePro vers ~170 actifs analysables, **SANS** transformer ces 170 actifs en univers d'exécution paper live automatique. Séparation explicite analyse vs live execution. Filtre worker RESTRICTIF uniquement.
- **Objectif unique** : nouveau module `tools/quant/lib/asset-universe-v1.mjs` exportant `ASSET_UNIVERSE_V1` (4 buckets : livePaperCore 42, analysisUniverse 168, experimentalUniverse 19, blockedUniverse 6) + helpers `getAssetTierV1`, `isLivePaperCoreV1`, `isAnalysisAllowedV1`, `isBlockedV1`, `validateAssetUniverseInvariantsV1`. Filtre worker : `if (!auvIsLivePaperCore(row.symbol)) return false;` ajouté dans `isTrainingCandidateAllowed` (RESTRICTIF additif).
- **Buckets V1** :
  - `livePaperCore` (42) : SPY, QQQ, GLD, TLT, XLK, XLF, XLV, SMH, IWM, NVDA, AAPL, MSFT, META, GOOGL, AMZN, TSLA, NFLX, AVGO, ORCL, AMD, ASML, TSM, ARM, PLTR, CRWD, PANW, NOW, SHOP, CRM, COST, LLY, JPM, V, MA, AXP, LVMH, SAP, AIR, BTC, ETH, SOL, COIN.
  - `analysisUniverse` (168) : universe-v2 ∩ data/*.json moins blockedUniverse.
  - `experimentalUniverse` (19) : ANET, CDNS, CFLT, DELL, GEN, HCP, IGM, INTC, PATH, PAYX, RBRK, SENT, SIE, SNPS, SPLK, SPYG, VUG, XSW, ZEN.
  - `blockedUniverse` (6) : XLY, XLE, XLU (#15) + EURUSD, GBPUSD, USDJPY (FX BLACKLIST).
- **Fichiers créés** :
  - `tools/quant/lib/asset-universe-v1.mjs` (~280 lignes) — module pur testable.
  - `tools/quant/test/asset-universe-v1.test.mjs` — 14 tests `node:test` (10 obligatoires brief + 4 bonus). Tous pass.
  - `docs/quant/ASSET_UNIVERSE_V1.md` (~315 lignes) — source canonique.
- **Fichiers modifiés** (strictement additifs) :
  - `cloudflare-worker/worker.js` — bloc inline `ASSET UNIVERSE V1` (miroir figé) + filtre `!auvIsLivePaperCore(row.symbol)` dans `isTrainingCandidateAllowed`. **RESTRICTIF** par construction.
  - `docs/quant/ASSET_REGISTRY.md` — section pointeur vers `ASSET_UNIVERSE_V1.md`.
  - `docs/project/TRADING_ENGINE.md` — filtre 4-bis ajouté à la liste des filtres `isTrainingCandidateAllowed`.
  - `SESSION.md` — cette mise à jour.
- **Bug-hunters** (2 scans monolithic-file hook) :
  - Scan #1 (filtre avant définition helper) : BLOQUANT détecté → corrigé immédiatement (ajout bloc inline AVANT `isTrainingCandidateAllowed`).
  - Scan #2 (bloc inline) : VERDICT VERT. Ordre OK, pas de TDZ, pas de collision, pattern cohérent avec LIVE PAPER ANALYTICS V1.
- **Innocuité garantie** :
  - Filtre RESTRICTIF par construction. Symbole inconnu / null / blocked → `false` → trade rejeté.
  - Au pire identique au pré-PR, au mieux concentre les ouvertures sur le core.
  - Aucune modification de seuils, sizing, allocation, safety gate, learning filters.
  - KNOWN_ISSUES #15 explicitement protégée (XLY/XLE/XLU dans blockedUniverse).
  - Aucun broker, aucun argent réel, aucun LIVE_READY, aucun apprentissage automatique.
- **Validation tests** : `node --test tools/quant/test/asset-universe-v1.test.mjs` → 14/14 pass. `node --input-type=module --check < worker.js` → OK.
- **Impact runtime** : RESTRICTIF (peut diminuer les ouvertures, jamais les augmenter). Conforme directive ChatGPT « ne pas multiplier agressivement les ouvertures paper ».
- **Impact quant (fond)** : aucun. Aucun statut setup touché, aucun verdict modifié.
- **Statut merge** : attente `GO MERGE explicite de ChatGPT`.

## Mission précédente (PR-LIVE-PAPER-EXEC-1b, livrée 2026-05-21)

> Bloc archivé pour traçabilité. Détails dans la fiche § *Dernière session / dernière PR mergée (octies)* ci-dessus + PR #250.

- **PR** : PR-LIVE-PAPER-ANALYTICS-1 — Live Paper Analytics V1 — branche `claude/live-paper-analytics-v1`.
- **Mission créateur** (2026-05-21, post-CTX-3) : instrumenter le paper trading **existant** pour mesurer les setups en conditions réelles, **sans** activer d'argent réel, **sans** broker, **sans** changer la logique de décision principale. Réponse directe à la directive « validation empirique des setups » (priorité 18 SESSION.md post-CTX-3).
- **Décision produit assumée** : Live Paper Analytics — paper live OUI, suivi réel OUI, apprentissage empirique OUI, argent réel NON, broker NON, auto-trading réel NON, LIVE_READY NON.
- **Objectif unique** : enrichir chaque trade paper de metadata analytique structurée (setup utilisé, régime à l'entrée, autorisation CTX-3 *observée* mais non bloquante, scores, plan, qualité signal, MAE/MFE, raison sortie). Persisté dans le JSONB `analysis_snapshot` déjà existant — **aucune migration SQL**.
- **Fichiers créés** :
  - `tools/quant/lib/live-paper-analytics-v1.mjs` (~290 lignes) — module pur testable. Exports : `buildLivePaperAnalyticsV1`, `buildLivePaperOutcomeV1`, `assessSignalQualityV1`, `markSectorLeadershipUntrusted`, `normalizeValidationStatus`, `LIVE_PAPER_ENGINE_SETUP_MAP_V1`.
  - `tools/quant/test/live-paper-analytics-v1.test.mjs` — 11 tests `node:test` (7 obligatoires brief + 4 bonus). Tous pass.
  - `docs/quant/LIVE_PAPER_ANALYTICS.md` (~310 lignes) — source canonique.
- **Fichiers modifiés** :
  - `cloudflare-worker/worker.js` — bloc inline `LIVE PAPER ANALYTICS V1` (~200 lignes) inséré ENTRE `computePnlForClose` et `buildTrainingPositionRowFromSignal` + 2 try/catch additifs dans `buildTrainingPositionRowFromSignal` (point d'ouverture) et `closeTrainingPosition` (point de clôture, après `tradeValidationEngine`). **Strictement additif** — aucune ligne supprimée, aucun seuil modifié.
  - `docs/project/DATA_PIPELINE.md` — section "Live Paper Analytics V1" ajoutée sous "Stockage".
  - `docs/project/TRADING_ENGINE.md` — étape additive référencée dans pipeline d'ouverture + entrée dans "Non encore fait" basculée vers livré.
  - `SESSION.md` — cette mise à jour.
- **Bug-hunters lancés sur worker.js** (3 scans monolithique-file hook) :
  - Scan #1 (bloc inline) : VERDICT OK. Aucune collision de noms, aucun effet de bord.
  - Scan #2 (ouverture) : VERDICT OK. Try/catch silencieux conforme, scope correct.
  - Scan #3 (clôture) : VERDICT OK. Le spread `{ ...existingSnapshot, livePaperOutcome }` préserve correctement le bloc `intraday` éventuel.
- **Innocuité garantie** (cf. brief créateur § *Règle majeure*) :
  - Aucune modification des seuils d'entrée, sizing, allocation, safety gate, learning filters, provider routing.
  - 2 points d'instrumentation wrappés dans `try/catch` silencieux : si l'instrumentation plante, l'ouverture/clôture continuent normalement.
  - CTX-2/CTX-3 sont **observés** dans les metadata, **ne décident pas**. `setupAuthorization.allowed === false` produit un warning observable mais n'empêche jamais l'ouverture.
  - `sectorLeadership` automatiquement tagué `sector_leadership_untrusted` si capturé (KNOWN_ISSUES #15).
  - Aucun champ `LIVE_READY` ni `broker` n'est produit (vérifié par test obligatoire #6).
- **Validation tests** : `node --test tools/quant/test/live-paper-analytics-v1.test.mjs` → 11/11 pass, 153 ms. `node --input-type=module --check < cloudflare-worker/worker.js` → OK.
- **Impact runtime** : **strictement additif**. Aucune décision modifiée. Aucun trade qui ne s'ouvrait pas avant ne s'ouvre maintenant.
- **Impact quant (fond)** : aucun. Aucune formule, aucun paramètre, aucun statut setup, aucun verdict touché.
- **Impact documentation** : oui. `docs/quant/LIVE_PAPER_ANALYTICS.md` devient la source canonique du dispositif. `DATA_PIPELINE.md` et `TRADING_ENGINE.md` reflètent les nouveaux champs JSONB.
- **Statut merge** : attente `GO MERGE explicite de ChatGPT`.

## Mission précédente (PR-CTX-3, livrée 2026-05-21)

> Bloc archivé pour traçabilité. Détails dans la fiche § *Dernière session / dernière PR mergée (sexies)* ci-dessus + PR #247.

- **Objectif unique** : nouveau module `tools/quant/lib/setup-authorization-matrix-v1.mjs` exportant `SETUP_AUTHORIZATION_MATRIX_V1` (5 setups × 4 régimes officiels V1) + helpers `getSetupAuthorizationV1`, `isSetupAllowedInRegimeV1`, `explainSetupAuthorizationV1(setupId, contextSnapshot)`. La matrice reflète strictement les statuts officiels `SETUPS_REGISTRY.md` (truth-sync 2026-05-19), elle ne les modifie pas.
- **Objectif unique** : nouveau module `tools/quant/lib/setup-authorization-matrix-v1.mjs` exportant `SETUP_AUTHORIZATION_MATRIX_V1` (5 setups × 4 régimes officiels V1) + helpers `getSetupAuthorizationV1`, `isSetupAllowedInRegimeV1`, `explainSetupAuthorizationV1(setupId, contextSnapshot)`. La matrice reflète strictement les statuts officiels `SETUPS_REGISTRY.md` (truth-sync 2026-05-19), elle ne les modifie pas.
- **Setups couverts** (5, conformes au brief) :
  - `RS_ROTATION_SIMPLE` (`RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED`) : autorisé `RANGE`, `RISK_ON` ; bloqué `RISK_OFF`, `HIGH_VOL`.
  - `MEAN_REVERSION` (`EXPERIMENTAL_ONLY / FRICTION_REQUIRED`) : autorisé `RANGE` seulement.
  - `SECTOR_RELATIVE_STRENGTH` (`FRAGILE / CONCENTRATION_EXCESSIVE`) : `blockedByStatus: true`, bloqué partout.
  - `TREND_PULLBACK_DYNAMIC_SUPPORT` (`FRAGILE`) : `blockedByStatus: true`, bloqué partout.
  - `GLD_BREAKOUT_ISOLATED` (`CONDITIONAL_RESEARCH_CANDIDATE`) : autorisé `RISK_ON`, `RANGE` ; restreint à GLD via `symbolWhitelist`.
- **Fichiers créés** :
  - `tools/quant/lib/setup-authorization-matrix-v1.mjs` (~230 lignes) — matrice figée `Object.freeze`, helpers purs, invariant validator.
  - `tools/quant/test/setup-authorization-matrix-v1.test.mjs` (~210 lignes) — 6 tests obligatoires brief (setup inconnu, RISK_OFF bloque RS, HIGH_VOL bloque directionnels fragiles, GLD découplé du leadership sectoriel, aucun usage de XLY/XLE/XLU tant que #15 OPEN, déterminisme JSON) + 6 tests bonus (forme exhaustive, preferredConditions informatives, blockedConditions bloquantes, regime invalide géré, snapshot.regime=null sans exception, couverture exhaustive des 5 setups).
  - `docs/quant/SETUP_AUTHORIZATION_MATRIX.md` (~310 lignes) — source canonique : rôle, philosophie, couverture, contrat API, DSL conditions, statuts par setup, invariants, tests, intégration de bout en bout, limites, règles d'évolution, relation PR-CTX-5.
- **Fichiers modifiés** :
  - `SESSION.md` — cette mise à jour.
- **Invariants explicites garantis par tests** :
  1. Aucune référence à `sectorLeadership` dans la matrice tant que KNOWN_ISSUES #15 OPEN.
  2. Aucun symbole `XLY` / `XLE` / `XLU` n'apparaît dans la matrice.
  3. Tous les setups déclarent `doNotDependOnSectorLeadership: true`.
  4. Régimes référencés strictement dans `{RISK_ON, RANGE, RISK_OFF, HIGH_VOL}`.
  5. `allowedRegimes ∩ blockedRegimes = ∅` pour chaque setup.
- **Sanity check intégration PR-CTX-2 → PR-CTX-3** sur smoke réel (asOf 2025-12-31, regime RISK_ON, vol.state LOW) :
  - RS_ROTATION_SIMPLE : `allowed=true`
  - MEAN_REVERSION : `allowed=false`, `blockedBy=["regime_blocked:RISK_ON"]`
  - SECTOR_RELATIVE_STRENGTH : `allowed=false`, `blockedBy=["status:FRAGILE / CONCENTRATION_EXCESSIVE", "regime_blocked:RISK_ON"]`
  - TREND_PULLBACK_DYNAMIC_SUPPORT : `allowed=false`, `blockedBy=["status:FRAGILE", "regime_blocked:RISK_ON"]`
  - GLD_BREAKOUT_ISOLATED : `allowed=true`
- **Validation tests** : `node --test tools/quant/test/setup-authorization-matrix-v1.test.mjs` → 12/12 pass, 126 ms.
- **Impact runtime** : **aucun**. `cloudflare-worker/worker.js` non touché. `assets/app.js` non touché. Aucun setup activé. Aucun statut SETUPS_REGISTRY modifié. Aucune `validateConfiguration` modifiée. Aucun trade automatique. Aucun setup promu LIVE_READY.
- **Impact quant (fond)** : aucun. La matrice **reflète** les statuts officiels — elle ne les modifie pas.
- **Impact documentation** : oui. `docs/quant/SETUP_AUTHORIZATION_MATRIX.md` devient la source canonique de la matrice d'autorisation.
- **Interdictions respectées** : pas de runtime, pas de modification SETUPS_REGISTRY, pas de promotion LIVE_READY, pas de consommation de sectorLeadership tant que #15 OPEN, pas de feature flag, pas de touch worker.js / frontend, pas de modification de l'authorization matrix worker existante.
- **Statut merge** : attente `GO MERGE explicite de ChatGPT`.

## Mission complémentaire (PR-LIVE-PAPER-EXEC-1b, livrée 2026-05-21)

> Bloc archivé pour traçabilité. Détails dans la fiche § *Dernière session / dernière PR mergée (octies)* + PR #250.

- **PR** : PR-LIVE-PAPER-EXEC-1b — micro-PR par-dessus PR #249 — branche `claude/live-paper-exec-1b` (base = `claude/live-paper-analytics-v1`, pas main).
- **Décision ChatGPT 2026-05-21 (Option 2)** : garder PR #249 ouverte ; créer une PR complémentaire scope minimal pour finaliser le passage `analytics observables → paper live execution contextualisée complète`.
- **Objectif unique** : ajouter 4 éléments par-dessus PR #249 :
  1. **`riskContext`** dans `livePaperAnalytics` (allocationPct, riskPerTradePct, maxOpenPositions, maxPositionsPerSymbol, currentOpenPositions, symbolExposurePct, portfolioExposurePct, postStopCooldownActive, executionSafety, quoteValidationStatus). Lecture seule, aucun impact décisionnel.
  2. **5 tests non-régression explicites (A-E + 2 bonus F/G)** : immutabilité des inputs, déterminisme sizing, CTX-3 blocked → metadata uniquement, riskContext absent → no crash, instrumentation failure → ouverture continue.
  3. **Preuve no decision drift** : 0 `if` décisionnel ajouté, 0 score muté, 0 seuil muté, 0 nouveau path auto-open (vérifiable par grep ciblé sur le diff worker.js).
  4. **`contextCaptureStatus: "NOT_CAPTURED_RUNTIME_SAFE"`** ajouté explicitement (sentinelle pour éviter ambiguïté future côté consommateurs offline).
- **Fichiers modifiés** :
  - `tools/quant/lib/live-paper-analytics-v1.mjs` — ajout `buildRiskContextV1`, sentinelle `CONTEXT_CAPTURE_STATUS`, champs `riskContext` et `contextCaptureStatus` dans `buildLivePaperAnalyticsV1`.
  - `tools/quant/test/live-paper-analytics-v1.test.mjs` — 7 tests ajoutés (EXEC-1b A-G) ; 2 tests anciens ajustés pour refléter le nouveau warning `risk_context_not_provided` par défaut.
  - `cloudflare-worker/worker.js` — ajout `LPA_CONTEXT_CAPTURE_STATUS` sentinelle + helper `lpaBuildRiskContext({...})` + extension du call site dans `buildTrainingPositionRowFromSignal` pour passer `riskContext` calculé depuis `settings` + `payload.liveContext.quoteQuality`. Strictement additif, dans le `try/catch` silencieux existant.
  - `docs/quant/LIVE_PAPER_ANALYTICS.md` — nouvelles sections `contextCaptureStatus`, `riskContext`, tests EXEC-1b.
- **Validation tests** : `node --test tools/quant/test/live-paper-analytics-v1.test.mjs` → 18/18 pass, 107 ms.
- **Bug-hunters lancés** (4 scans monolithic-file hook) : VERDICT OK x4.
- **Impact runtime** : strictement additif. Aucun `if` décisionnel ajouté. Aucun seuil modifié. Aucun nouveau path d'auto-open. La fonction `isTrainingCandidateAllowed`, le sizing `chooseTrainingExecution`, le safety gate `evaluateExecutionSafety` sont tous intacts.
- **Impact quant (fond)** : aucun.
- **Statut merge** : attente `GO MERGE explicite de ChatGPT` après merge préalable de PR #249.

## Décisions actives

- **Gouvernance** : `GOVERNANCE.md` = source canonique unique (IA, projet, validation, merge, agents/skills, gouvernance quant). `GPT_ROLE.md` a été supprimé après période de transition ; l'historique de sa fusion dans `GOVERNANCE.md` est conservé dans `docs/decisions/DECISION-001-gpt-role-merged-into-governance.md`. `CLAUDE.md` = manuel opérationnel Claude Code.
- **Provider principal** : EODHD (daily / swing). Détails et fallbacks dans `docs/monitoring/PROVIDERS_MATRIX.md`.
- **Capital réel** : interdit tant que les conditions de `BOT_OBJECTIVE.md` § *Conditions avant passage en bot réel* ne sont pas remplies (walk-forward, frictions, sizing, kill switch, paper trading prolongé, etc.).
- **Research Framework Freeze v1** : actif. Toute PR de recherche doit s'y conformer ou marquer explicitement `⚠ DÉVIATION FRAMEWORK FREEZE v1` + justification.
- **Cadence imposée** : maximum 1 nouvelle famille de setup par 2 semaines. Pas de PR « polissage » sans valeur incrémentale claire.
- **Anti-hallucination** : aucun résultat « qui semble bon » n'est valide sans walk-forward + multi-régimes + multi-années (cf. `GOVERNANCE.md` § *Règle anti-hallucination*).

## Points de vigilance

- **Aucun setup `VALIDATED_RESEARCH_CORE`** au 2026-05-19.
- **Aucun setup `LIVE_READY`** au 2026-05-19. Détail des statuts dans `docs/quant/SETUPS_REGISTRY.md`.
- **SECTOR_RS v1** : `FRAGILE / CONCENTRATION_EXCESSIVE`. PF brut 2.16 séduisant **mais** top 5 tickers = 103 % du PnL (sans eux PF = 0.94). Edge non diversifiable. À ne pas activer paper / live. Correction concentration + stress tests + audit `sectorMomentum` requis avant toute promotion.
- **PEAD** : seule piste structurellement distincte de momentum, mais bloquée par absence de dataset earnings.
- **RS Rotation simple** : crédible côté exécution mais fragile temporellement (0 cellule ROBUST/STABLE rolling). Walk-forward conditionnel régime + friction obligatoires avant tout passage paper / live.
- **Détecteur runtime ≠ setup validé** : `detectConfiguration` côté worker continue d'exposer `pullback`, `breakout`, `mean_reversion`, etc. Aucun de ces détecteurs n'est `VALIDATED_RESEARCH_CORE` au sens Freeze v1. Aucun trade automatique sur ces détecteurs sans `GO MERGE` ChatGPT dédié. Cf. `docs/quant/TRADING_LOGIC.md` § *Setups détectés*.
- **Biais d'exécution historiques** : les anciens PF / winrate antérieurs aux audits PR #207 et #208 sont annulés. Voir bannière en tête de `docs/quant/SETUPS_REGISTRY.md`.
- **Dépendance KV `MTP_CACHE`** : la cohérence prix cross-worker dépend du binding KV. Sans lui, bug cross-worker silencieux (cf. `PROJECT_RULES.md` R4).
- **`buildSnapshotId`** : purement analytique, aucune dépendance live autorisée. Toute modif casse l'historique des snapshots.
- **Documentation** : `SESSION.md` doit refléter l'état réel **après** chaque merge. Ne jamais y mettre une intention non livrée.

## Prochaines priorités

Plan PR par PR validé par ChatGPT (réponse Q3 message 2026-05-19, ordre ajusté post-PR #233) :

1. ✅ **PR documentaire truth-sync** mergée (PR #233, commit `19872ac` sur `main`).
2. ✅ **PR-R1 RS Rotation robustness improvement evidence** mergée (PR #234, commit `1641abf` sur `main`).
3. ✅ **PR-R3A Mean Reversion diagnostic** mergée (PR #235, commit `fc622fa` sur `main`).
4. ✅ **PR-VISION Architecture produit + philosophie** mergée (PR #236, commit `44a39e6` sur `main`).
5. ❌ **PR-R3B v1 test isolé V1 Mean Reversion** (PR #237 fermée NOGO ChatGPT — univers incomplet 4/15 ETF).
6. ✅ **PR-R3B-v2 dataset integrity fix** mergée (PR #238, commit `f826acc`) — cause racine identifiée, SYMBOL_MAP fixé.
7. ✅ **Dataset SPDR complété** (commit `cdbc1cb` créateur) — 11 ETF SPDR ajoutés (DIA + 10 sectoriels).
8. ✅ **PR-R3B-v3 rerun strict 15 ETF** mergée (PR #239, commit `c91a23a`) — verdict NEEDS_MORE_DATA + indicateurs qualitatifs catastrophiques. Décision A/B/C Mean Reversion en attente.
9. ✅ **PR-RS-HARDENING Phase 1** mergée (PR #240, commit `17113b6`) — stress tests A.1-A.8 + matrice 4 régimes. Verdict `HARDENED_FRAGILE`. Findings : friction ×3 OK (PF 1.30), RANGE régime optimal (PF 2.04), 2022 PF 0.146 caveat unique.
10. ✅ **PR-CTX-1 documentation Univers Core officiel V1** mergée (PR #241, commit `314182f`) — 78 actifs figés (27 ETF + 35 leaders US + 10 Europe + 6 crypto). Prerequisite Phase 2.
11. ✅ **PR-DOC-AUDIT-V1 documentation consistency audit** mergée (PR #242, commit `d93a6ed`) — plan CLEAN-1 à CLEAN-10.
12. ✅ **PR CLEAN-1 canonisation friction V1** mergée (PR #243, commit `700ecc2`).
13. ✅ **PR-GOV-AGENTS** mergée (PR #244, commit `8b3ccc0`) — règle "ChatGPT recommande agents Claude" dans GOVERNANCE.md § Format obligatoire.
14. ✅ **PR CLEAN-2 canonisation régimes 4 états** mergée (PR #245, commit `cac413c`) — `REGIME_RULES.md` canonique + lib partagée `tools/quant/lib/regime-rules-v1.mjs` + migration 3 scripts actifs. Validation byte-à-byte 3/3 IDENTICAL. 8 scripts historiques en dette CLEAN-2b. Prerequisite PR-CTX-2.
15. ✅ **PR-CTX-2 Context Engine V1 analytical module** mergée (PR #246, commit `31c9a6b`) — module analytique pur lisant 16 ETF, classification régime 4-état via lib CLEAN-2, breadth, leadership 20j/63j vs SPY, VIX-proxy via realized vol SPY 20j, défensifs TLT/GLD. 6 tests node:test (pass) + smoke réel. Read-only, aucun runtime. Issue qualité données #15 ouverte (splits non ajustés XLY/XLE/XLU).
16. ✅ **PR-CTX-3 Setup Authorization Matrix V1** mergée (PR #247, commit `93851a2`) — matrice DÉCLARATIVE pure pour 5 setups × 4 régimes officiels V1, alignée sur les statuts SETUPS_REGISTRY. Aucun statut modifié. Aucun branchement runtime. Invariants vérifiés par tests (aucune consommation `sectorLeadership` / XLY/XLE/XLU tant que #15 OPEN). 12/12 tests + sanity check intégration avec snapshot CTX-2 réel.
17. ⏸ **PR-CTX-5 Runtime authorization layer** : **EN PAUSE par décision ChatGPT 2026-05-21**. Motif : brancher la matrice côté runtime maintenant = sur-ingénierie prématurée tant qu'aucun setup ne possède une preuve robuste d'edge stable multi-régime/multi-période. À reprendre **uniquement après décision architecture complète** et seulement si l'étape (18) ci-dessous produit au moins un setup stabilisé.
18. 🟢 **Priorité réelle suivante (directive ChatGPT 2026-05-21)** : **validation empirique des setups**, pas multiplication des couches système. Pistes concrètes (à arbitrer par créateur + ChatGPT) : (a) walk-forward conditionnel régime sur RS Rotation simple ; (b) friction ×2/×3 hardening complémentaire sur RS Rotation, GLD Breakout isolé ; (c) décision A/B/C Mean Reversion V1 ; (d) audit anti-look-ahead spécifique `sectorMomentum` (préalable à toute reprise de SECTOR_RS) ; (e) re-ingestion ajustée des datasets `data/{SYMBOL}_2025.json` pour fermer KNOWN_ISSUES #15.
19. ✅ **PR-LIVE-PAPER-ANALYTICS-1 Live Paper Analytics V1** mergée (PR #249, commit `f2c427c`) — instrumentation analytique pure des trades paper. `analysis_snapshot.livePaperAnalytics` à l'ouverture + `analysis_snapshot.livePaperOutcome` à la clôture. 11/11 tests + 3 bug-hunters OK.
19a. ✅ **PR-LIVE-PAPER-EXEC-1b Live Paper Execution complémentaire** mergée (PR #250, commit `aa91eca`) — ajout `riskContext` (lecture seule), `contextCaptureStatus` sentinelle, 7 tests non-régression EXEC-1b, preuve structurelle « no decision drift ». 18/18 tests + 4 bug-hunters OK. ChatGPT : *« Le projet vient de franchir une étape majeure — première vraie base sérieuse du futur moteur d'apprentissage »*.
19b. 🟢 **Phase actuelle : « VÉRITÉ MARCHÉ »** (directive ChatGPT 2026-05-21 post-merge #249/#250) : laisser tourner le paper live, accumuler plusieurs semaines/mois de données réelles contextualisées (setup × régime × risk × qualité données × qualité quote × MAE/MFE × signalQuality). Mission = OBSERVER. **Ne PAS accélérer** vers broker réel, IA complexe, RL, auto-learning agressif. Objectif factuel à mesurer ensuite : quels setups survivent réellement, dans quels régimes, avec quelle stabilité, dégradation, qualité signal, robustesse.
20. ⏸ **PR-CTX-4 Architecture diagram + doc flux décisionnel** (subordonnée décision créateur) — initialement prévue comme synthèse Phase 2 ; reportée tant que la directive ChatGPT du 2026-05-21 (priorité = validation empirique) n'est pas levée.
21. **PR-RS-HARDENING Phase 3** (subordonnée GO Phase 2) — design Exposure Control couche C du brief (max positions secteur, vol scaling, risk budget, correlation caps).
22. **PR-RS-HARDENING Phase 4** (subordonnée Phase 3) — Quality Metrics couche D (sample confidence, regime confidence, edge durability, fragility score, concentration risk score).
23. **Décision A/B/C Mean Reversion** : en attente ChatGPT/créateur (classement V1 DATA_INSUFFICIENT_BUT_STRUCTURALLY_WEAK / DEAD_AGGREGATED / PR-R3A bis V1bis).
24. **GLD Breakout isolated validation** : audit anti-look-ahead spécifique, friction ×1/×2/×3, walk-forward 3 splits sur la variante unique. n=47 plafonne le statut maximal à `EXPERIMENTAL_ONLY`.
25. **Pullback reconstruction** : **uniquement si** hypothèse économique nouvelle documentée. Sinon, ne pas lancer.
26. **Documentaire** : enrichir les stubs `docs/quant/WALK_FORWARD_RULES.md`, `BACKTEST_RULES.md` (FRICTION_MODEL.md ✅ fait par CLEAN-1).
27. **Décomposition `SESSION.md`** : extraction blocs vers `docs/project/`, `docs/quant/`, `docs/decisions/`, retour à un carnet de bord court.

Autres :

- **Décision politique sur le sourcing PEAD** (quant) : trouver / abandonner le dataset earnings nécessaire pour valider PEAD.
- **Toute PR future de recherche** : doit référencer `RESEARCH_FRAMEWORK_FREEZE_V1.md` et joindre la checklist `docs/research/SETUP_VALIDATION_CHECKLIST.md` cochée avec valeurs mesurées.
- **Optionnel** : modernisation du script `scripts/check-doc-impact.mjs` pour retirer les noms racine obsolètes de son matcher (faux positifs identifiés depuis PR #228).
- **Optionnel** : archivage des outputs `tools/backtests/output/*.md` (hors gouvernance documentaire).

## Fichiers sources à consulter

- **Gouvernance projet (priorité absolue)** : `GOVERNANCE.md`.
- **Manuel opérationnel Claude Code** : `CLAUDE.md`.
- **Objectif produit / constitution** : `BOT_OBJECTIVE.md`.
- **Règles techniques structurelles** : `PROJECT_RULES.md`.
- **Architecture code** : `docs/project/ARCHITECTURE.md`.
- **Pipeline de données** : `docs/project/DATA_PIPELINE.md`.
- **Logique quant / scoring / setups** : `docs/quant/TRADING_LOGIC.md`.
- **Moteur trading / exécution / safety / sizing** : `docs/project/TRADING_ENGINE.md`.
- **Setups quantitatifs** : `docs/quant/SETUPS_REGISTRY.md`.
- **Classification actifs** : `docs/quant/ASSET_REGISTRY.md`.
- **Providers** : `docs/monitoring/PROVIDERS_MATRIX.md`.
- **Bugs / dette** : `docs/monitoring/KNOWN_ISSUES.md`.
- **Checklist merge** : `CHECKLIST_MERGE.md`.
- **Matrice d'impact documentaire** : `docs/project/DOC_IMPACT_MATRIX.md` (aide anti-oubli : `npm run check:doc-impact`).
- **Plan de consolidation Markdown** : `docs/project/MARKDOWN_CONSOLIDATION_PLAN.md`.
- **Décisions structurantes historiques** : `docs/decisions/` (format dans `docs/decisions/README.md`).
- **Framework recherche (gel actif)** : `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`, `docs/research/SETUP_VALIDATION_CHECKLIST.md`, `docs/research/ANTI_LOOKAHEAD_RULES.md`, `docs/research/DATASET_GOVERNANCE.md`.

## Non encore fait

- Migration physique des fichiers Markdown (racine → `/docs/`) : **terminée**. Consolidation Markdown finalisée par la PR de nettoyage final (`claude/final-doc-stub-cleanup`).
- Sourcing dataset PEAD : décision politique en attente.
- Walk-forward conditionnel régime sur RS Rotation simple : non lancé.
- Migration physique racine → `/docs/` : terminée pour les 7 fichiers concernés ; les arbitrages restants (`BOT_OBJECTIVE.md`, `PROJECT_RULES.md`, `CHECKLIST_MERGE.md`) restent intentionnellement à la racine (cf. `GOVERNANCE.md` § *Arbitrages assumés*).
- Aucun setup activé en paper trading automatique sans supervision humaine.
- Aucune connexion broker réel (pas de passage en argent réel).

## Règles de reprise importantes

- **Ne jamais inventer l'état du projet.** Toujours partir de ce fichier + des fichiers sources, jamais de la mémoire.
- **Toujours vérifier les fichiers sources** quand une décision dépend du domaine (setups, actifs, architecture, trading, providers). `SESSION.md` ne fait que résumer ; il n'est pas la source de vérité du domaine.
- **Ne pas considérer `SESSION.md` comme source unique** : c'est le carnet de bord, pas la mémoire complète. Les règles détaillées vivent dans les fichiers spécialisés.
- **Lecture obligatoire au début de chaque session** : appliquer le protocole `GOVERNANCE.md` § *Session start protocol — reprise officielle de session* — socle obligatoire (`GOVERNANCE.md`, `BOT_OBJECTIVE.md`, `PROJECT_RULES.md`, `SESSION.md`, `docs/monitoring/KNOWN_ISSUES.md`) puis fichiers spécialisés selon le sujet. Ne jamais partir uniquement de `SESSION.md`.
- **Mise à jour obligatoire avant chaque PR / merge** : voir section suivante.

## Règle : mise à jour de `SESSION.md` avant chaque PR / merge

`SESSION.md` doit être mis à jour **avant chaque demande de `GO MERGE`**. Il doit refléter l'état réel **après** la PR :

- objectif livré ;
- fichiers modifiés ;
- impacts (runtime / quant / documentation) ;
- limites ;
- prochaine étape.

Une PR ne doit pas recevoir `GO MERGE` si `SESSION.md` est absent, obsolète ou contradictoire avec les fichiers sources. Règles canoniques : `CHECKLIST_MERGE.md` § *Documentation* et `GOVERNANCE.md` § *Règles synchronisation mémoire*.
