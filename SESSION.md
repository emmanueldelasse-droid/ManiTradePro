# SESSION.md — ManiTradePro

> Carnet de bord court et exploitable du projet. Source de l'état **actuel**, pas un historique complet.
>
> Les règles, registres et détails techniques font autorité dans les fichiers spécialisés (cf. § *Fichiers sources à consulter*). `SESSION.md` ne fait que résumer.
>
> **Mise à jour obligatoire avant chaque demande de `GO MERGE`** (cf. `CHECKLIST_MERGE.md` et `GOVERNANCE.md` § *Règles synchronisation mémoire*).

## État actuel

- **Projet** : ManiTradePro — moteur quant de sélection / allocation / gestion du risque, orienté swing / rotation / momentum structurel multi-jours.
- **Date dernière mise à jour** : 2026-05-21.
- **Branche / PR active** : aucune. Maintenance documentaire post-merge PR #250 sur `claude/session-md-post-1b-merge`.
- **Dernier merge connu** : PR #250 `quant(analytics): riskContext + contextCaptureStatus + no-decision-drift proof (PR-LIVE-PAPER-EXEC-1b)` (commit `aa91eca` sur `main`).
- **Phase projet** : **VÉRITÉ MARCHÉ** (validation ChatGPT 2026-05-21 post-merge #249/#250). Le bot paper continue à fonctionner comme avant ; chaque trade est désormais entièrement contextualisé (setup, régime, risk engine, qualité données, autorisation CTX-3 observée, MAE/MFE). Mission suivante : laisser tourner plusieurs semaines/mois, accumuler la vérité marché, observer les setups en conditions réelles AVANT toute nouvelle sophistication runtime.
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

## PR en cours

- **PR** : aucune PR de feature. Maintenance documentaire post-merge PR #250 uniquement (`claude/session-md-post-1b-merge`).
- **Phase actuelle** : *« vérité marché »*. Chaque trade paper est désormais entièrement contextualisé (setup, régime, risk engine, qualité données, qualité quote, autorisation CTX-3 observée, MAE/MFE, signalQuality post-mortem). Le bot continue à fonctionner comme avant. Mission suivante = observer.

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
