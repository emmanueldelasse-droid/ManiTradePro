# LIVE_PAPER_ANALYTICS.md — Live Paper Analytics V1 ManiTradePro

> **Statut** : OFFICIAL — livré par PR-LIVE-PAPER-ANALYTICS-1 (2026-05-21). Source canonique unique du dispositif d'instrumentation analytique pure du paper trading.
>
> **Module** : instrumentation **read-only** des trades paper existants. **N'influence aucune décision**. Ne modifie aucun seuil, sizing, allocation, safety gate, learning filter. Ne crée aucune notion `LIVE_READY`. Ne consomme pas `sectorLeadership` tant que `KNOWN_ISSUES.md` #15 est OPEN.
>
> **Subordination** :
> - `BOT_OBJECTIVE.md` — constitution produit.
> - `docs/project/TRADING_ENGINE.md` — moteur paper trading existant (préservé).
> - `docs/quant/CONTEXT_ENGINE.md` — V1 du contexte (consommable par PR future).
> - `docs/quant/SETUP_AUTHORIZATION_MATRIX.md` — matrice CTX-3 (observée, jamais bloquante).
>
> **Implémentation** :
> - Source canonique testable : `tools/quant/lib/live-paper-analytics-v1.mjs`.
> - Miroir inline figé dans `cloudflare-worker/worker.js` (bloc `LIVE PAPER ANALYTICS V1` situé entre `computePnlForClose` et `buildTrainingPositionRowFromSignal`). Maintenir synchrones.

---

## 1. Rôle et philosophie

### 1.1 Ce que Live Paper Analytics V1 fait

Pour chaque position paper :

- **À l'ouverture** : capture un bloc `livePaperAnalytics` (setup, régime du moment, plan, scores, qualité quote, autorisation que la matrice CTX-3 *aurait* donnée). Stocké dans `mtp_positions.analysis_snapshot.livePaperAnalytics`.
- **À la clôture** : capture un bloc `livePaperOutcome` (raison de sortie, P&L, durée, MAE/MFE, qualité du signal post-mortem, validation status). Stocké dans `mtp_trades.analysis_snapshot.livePaperOutcome`.

Objectif : pouvoir **mesurer empiriquement**, sur un historique réel de trades paper, comment chaque setup se comporte vraiment dans le marché vivant — avec des annotations exploitables pour l'audit, **sans** changer la façon dont le bot décide.

### 1.2 Ce qu'il n'est PAS

- ❌ **Pas une couche de décision.** Ne décide aucune ouverture, aucune fermeture, aucun sizing.
- ❌ **Pas une matrice runtime CTX-5.** Si CTX-3 *aurait* bloqué le trade, c'est noté en warning observable — le worker continue d'ouvrir comme avant.
- ❌ **Pas une promotion de setup.** Aucun statut `SETUPS_REGISTRY.md` n'est touché. Aucun `LIVE_READY` n'apparaît dans les artefacts générés.
- ❌ **Pas un nouvel apprentissage automatique.** Les buckets d'apprentissage continuent à se nourrir des trades validés `quality=ok` comme avant. Aucun trade n'est rendu apprenable du fait de cette PR.
- ❌ **Pas de modification UI.** L'affichage front n'est pas touché — une PR ultérieure pourra exposer ces metadata dans les onglets Opportunités / Trades.

### 1.3 Principe d'innocuité

> *Cette PR ne doit pas rendre le bot plus agressif.*
> *Si un trade aurait été ouvert avant cette PR → il peut être ouvert pareil.*
> *Si un trade n'aurait pas été ouvert avant cette PR → cette PR ne doit pas l'ouvrir.*

Conformément au brief créateur, **l'instrumentation est strictement additive** :

- 0 modification des seuils du worker.
- 0 modification de la safety gate (`evaluateExecutionSafety`).
- 0 modification de la matrice `validateConfiguration`.
- 0 modification du sizing / allocation.
- 0 modification des filtres learning (`or=(quality.eq.ok,quality.is.null)`).
- 0 modification du routing providers.

Garantie technique : les 2 points d'instrumentation sont **wrappés dans `try/catch` silencieux**. Si jamais l'instrumentation plante, l'ouverture et la fermeture continuent comme avant.

---

## 2. Schémas de capture

### 2.1 À l'ouverture — `livePaperAnalytics`

Attaché à `mtp_positions.analysis_snapshot.livePaperAnalytics` (JSONB, additif).

```javascript
{
  version: "live-paper-analytics-v1",
  capturedAt: "2026-05-21T14:32:18.000Z",          // ISO, déterministe
  setupId: "TREND_PULLBACK_DYNAMIC_SUPPORT" | null, // mapping engine→matrice CTX-3
  engineSetupType: "pullback" | "mean_reversion" | "breakout" | "continuation" | null,
  setupStatusRef: "FRAGILE" | "EXPERIMENTAL_ONLY / FRICTION_REQUIRED" | ... | null,
  regime: "RISK_ON" | "RANGE" | "RISK_OFF" | "HIGH_VOL" | null,
  regimeConfidence: 0-100 | null,
  contextSnapshot: null,                             // V1 worker : non capturé inline
  contextCaptureStatus:                              // PR-LIVE-PAPER-EXEC-1b — sentinelle explicite
    "CAPTURED" | "NOT_CAPTURED_RUNTIME_SAFE" | "NOT_CAPTURED_NO_INPUT",
  setupAuthorization: {                              // observation CTX-3, jamais bloquante
    version: "setup-authorization-matrix-v1",
    setupId, allowed: true|false|null,
    blockedBy: ["regime_blocked:RISK_OFF", "status:FRAGILE", ...],
    statusRef: "...",
  } | null,
  scores: {
    strategicScore, decisionScore, safetyScore, exploitabilityScore
  } | null,
  plan: { entry, stopLoss, takeProfit, rr, horizon } | null,
  riskContext: {                                     // PR-LIVE-PAPER-EXEC-1b — lecture seule
    allocationPct,                                   // settings.allocation_per_trade_pct
    riskPerTradePct,                                 // settings.risk_per_trade_pct
    maxOpenPositions,                                // settings.max_open_positions
    maxPositionsPerSymbol,                           // settings.max_positions_per_symbol
    currentOpenPositions,                            // runtime counter (null si indispo)
    symbolExposurePct,                               // runtime % invested sur ce symbole
    portfolioExposurePct,                            // runtime % capital engagé global
    postStopCooldownActive,                          // runtime flag cooldown post-stop
    executionSafety,                                 // evaluateExecutionSafety().safe
    quoteValidationStatus,                           // liveContext.quoteQuality.validationStatus
  } | null,
  dataQuality: null,                                 // V1 worker : non capturé inline
  quoteQuality: {                                    // miroir de liveContext.quoteQuality
    executionSafe, trustScore, validationStatus, reasons: [...]
  } | null,
  warnings: [
    "ctx3_would_block:regime_blocked:RISK_ON|status:FRAGILE",
    "quote_quality_unsafe_at_open",
    "risk_context_not_provided" | "risk_context_all_fields_null",  // PR-LIVE-PAPER-EXEC-1b
    // ...
  ]
}
```

#### `contextCaptureStatus` — sentinelle explicite (PR-LIVE-PAPER-EXEC-1b)

Évite toute ambiguïté côté consommateurs offline (rapports, replays). 3 valeurs possibles :

- **`CAPTURED`** : `contextSnapshot` est rempli avec un snapshot CTX-2 réel.
- **`NOT_CAPTURED_RUNTIME_SAFE`** : omission **volontaire** côté worker pour ne pas introduire de dépendance runtime sur les 16 ETF du contexte V1. Ce n'est **pas un bug** — c'est une décision d'architecture documentée § 4.
- **`NOT_CAPTURED_NO_INPUT`** : absence non documentée (ne devrait pas se produire en V1 worker, signal d'anomalie pour une PR future).

#### `riskContext` — état du risk engine (PR-LIVE-PAPER-EXEC-1b)

Capture **lecture seule** des paramètres et stats du risk engine au moment de l'ouverture. **Aucun impact décisionnel.** Aucun champ ne modifie sizing ni allocation.

Champs disponibles depuis `settings` (paramètres bot) :

- `allocationPct`, `riskPerTradePct`, `maxOpenPositions`, `maxPositionsPerSymbol`.

Champs runtime (peuvent être `null` selon le point d'appel — V1 worker laisse ces 4 à `null` car non accessibles depuis `buildTrainingPositionRowFromSignal`) :

- `currentOpenPositions`, `symbolExposurePct`, `portfolioExposurePct`, `postStopCooldownActive`.

Champs dérivés de `liveContext.quoteQuality` :

- `executionSafety` (`quoteQuality.executionSafe`), `quoteValidationStatus`.

Si `riskContext` n'est pas fourni → warning `risk_context_not_provided` + champ `null`. Si tous les champs sont `null` après normalisation → warning `risk_context_all_fields_null`.

### 2.2 À la clôture — `livePaperOutcome`

Attaché à `mtp_trades.analysis_snapshot.livePaperOutcome` (JSONB, additif).

```javascript
{
  version: "live-paper-analytics-v1",
  closedAt: "2026-05-28T20:00:00.000Z",
  exitReason: "stop_loss" | "take_profit" | "time_exit" | "engine_invalidation" | "manual" | ...,
  entryPrice, exitPrice, pnl, pnlPct, durationDays,
  hitStop: boolean,
  hitTakeProfit: boolean,
  maxFavorableExcursion: 0.05,                       // calculé à partir de live.highSinceOpen
  maxAdverseExcursion: -0.02,                        // calculé à partir de live.lowSinceOpen
  signalQuality: "GOOD" | "NOISY" | "BAD" | "UNKNOWN",
  validationStatus: "OK" | "SUSPECT" | "INVALID" | "UNKNOWN",  // normalisé tradeValidationEngine
  qualityFlags: ["stale_quote", ...],                // copie de validation.flags
  quoteQualityAtClose: {                             // miroir de detailPayload.liveContext.quoteQuality
    executionSafe, trustScore, validationStatus, reasons: [...]
  } | null,
  intradayDetected: boolean,
  notes: null,
  warnings: ["validation_status:suspect", ...],
}
```

### 2.3 Heuristique `signalQuality`

Déterministe, conservatrice, dans cet ordre de priorité :

1. `validationStatus === "INVALID"` → `"BAD"`.
2. `quoteQualityAtClose.executionSafe === false` → `"BAD"`.
3. `validationStatus === "SUSPECT"` → `"NOISY"`.
4. `durationDays < 1h` ET `hitStop === true` → `"NOISY"` (instant close).
5. `dataQuality` incomplet → `"NOISY"`.
6. `validationStatus === "UNKNOWN"` ET pas de durée → `"UNKNOWN"`.
7. Sinon → `"GOOD"`.

Pas de seuil P&L. Un trade peut être perdant ET `signalQuality="GOOD"` (c'est précisément l'info utile : *« le signal était propre, mais le marché a tourné »*).

---

## 3. Cartographie des points d'instrumentation

### 3.1 Point #1 — Ouverture (`buildTrainingPositionRowFromSignal`)

Localisation : `cloudflare-worker/worker.js` dans la fonction `buildTrainingPositionRowFromSignal` (créatrice de la ligne `mtp_positions` à chaque nouvelle position).

Mécanisme :

```javascript
function buildTrainingPositionRowFromSignal(payload, execution, settings) {
  const analysisSnapshot = buildTrainingAnalysisSnapshotFromPayload(...);
  // ... [code existant inchangé]

  try {
    const lpaMeta = lpaBuildAnalyticsAtOpen({ ... });
    analysisSnapshot.livePaperAnalytics = lpaMeta;
  } catch (e) {
    // silencieux par construction
  }

  return { ..., analysis_snapshot: analysisSnapshot, ... };
}
```

Le try/catch garantit qu'aucune erreur d'instrumentation ne casse l'ouverture.

### 3.2 Point #2 — Clôture (`closeTrainingPosition`)

Localisation : `cloudflare-worker/worker.js` dans la fonction `closeTrainingPosition`, **après** l'appel à `tradeValidationEngine` (pour disposer du `validation.quality` officiel) et **avant** l'INSERT Supabase.

Mécanisme :

```javascript
async function closeTrainingPosition(env, position, exitPrice, closeType, detailPayload, triggerMeta) {
  const closedRow = buildClosedTradeRowFromPosition(...);
  // ... [code existant inchangé : intraday + validation]
  const validation = tradeValidationEngine(closedRow, position, closeType, triggerMeta);
  closedRow.quality = validation.quality;
  closedRow.quality_flags = validation.flags.length ? validation.flags : null;

  try {
    const lpaOutcome = lpaBuildOutcomeAtClose({ ... });
    closedRow.analysis_snapshot = { ...existingSnapshot, livePaperOutcome: lpaOutcome };
  } catch (e) {
    // silencieux
  }

  await supabaseFetch(env, ...);  // INSERT mtp_trades — inchangé
}
```

L'instrumentation préserve le bloc `intraday` éventuellement ajouté plus haut (spread `{...existingSnapshot, livePaperOutcome}`).

### 3.3 Aucune migration SQL

L'instrumentation utilise la colonne JSONB **existante** `analysis_snapshot` des deux tables `mtp_positions` et `mtp_trades`. Aucune migration SQL n'est requise.

---

## 4. Relation avec CTX-2 et CTX-3

| Aspect | Statut V1 |
|---|---|
| Lecture matrice CTX-3 | **OUI** — miroir figé dans `worker.js` (`LPA_SETUP_AUTH_V1`). |
| Décision basée sur CTX-3 | **NON** — `setupAuthorization.allowed` n'est qu'un warning observable. Le worker ouvre comme avant. |
| Capture snapshot CTX-2 inline | **NON** en V1 worker. `contextSnapshot` est `null` dans le metadata. |
| Tag `sector_leadership_untrusted` (#15) | **OUI** — appliqué automatiquement si jamais `sectorLeadership` est capturé. |
| Module pur `tools/quant/lib/context-engine-v1.mjs` | **NON consommé** côté worker en V1. Reste disponible pour PR analytique offline. |

Justification : capturer un `contextSnapshot` inline côté worker nécessiterait de dupliquer la logique de `context-engine-v1.mjs` (chargement des 16 ETF candles, calcul EMA200, etc.) dans `worker.js`. Hors scope de cette PR (qui se veut additive et minimale). Une PR future pourra l'ajouter si nécessaire.

---

## 5. Règles qualité

### 5.1 Filtres learning préservés

Le learning continue à filtrer sur `quality=ok|null` comme avant (cf. `PROJECT_RULES.md` R5 et `BOT_OBJECTIVE.md` règle 7). **Aucune** modification des SELECTs `computeLearningStats`.

### 5.2 Trades suspects

Un trade :

- Avec `quoteQuality` unsafe au close → `signalQuality = "BAD"`.
- Avec `tradeValidationEngine` quality `suspect` → `signalQuality = "NOISY"` minimum.
- Avec données manquantes (`dataQuality` partiel) → `signalQuality = "NOISY"` minimum.

Tous ces trades restent persistés dans `mtp_trades` comme aujourd'hui — le learning les exclut déjà via `quality_flags` / `quality`. La nouveauté est uniquement la **traçabilité analytique** post-mortem.

### 5.3 Aucun trade `suspect` ne devient preuve d'edge

Conformément au brief : *« Aucun trade suspect ne doit devenir preuve d'edge. »* — la chaîne `validation.quality → quality (Supabase) → SELECT filter learning` reste intacte.

---

## 6. KNOWN_ISSUES #15 — protection sectorLeadership

Tant que `docs/monitoring/KNOWN_ISSUES.md` #15 est OPEN (splits non ajustés détectés sur XLY/XLE/XLU) :

- Tout `contextSnapshot` capturé voit son champ `sectorLeadership` taggé `untrusted: true` avec `reason: "known_issues_15_open:datasets_xly_xle_xlu_unadjusted"`.
- Le contenu original est préservé sous la clé `_raw` pour audit forensique uniquement.
- Un warning `"sector_leadership_untrusted"` est poussé dans `livePaperAnalytics.warnings`.
- Aucune décision (paper ou future runtime) ne doit consommer ce champ avant la fermeture de #15.

Helper exposé : `markSectorLeadershipUntrusted(contextSnapshot)` côté module pur.

---

## 7. Tests

`tools/quant/test/live-paper-analytics-v1.test.mjs` — 18 tests `node:test` (11 PR-LIVE-PAPER-ANALYTICS-1 + 7 PR-LIVE-PAPER-EXEC-1b) :

1. Création metadata analytics à l'ouverture (structure complète).
2. Clôture outcome (structure + signalQuality calculé).
3. Trade suspect si quote unsafe au close → BAD + warnings.
4. CTX-3 bloqué → warning + observation, AUCUN blocage réel.
5. `sectorLeadership` tagué `untrusted` (KNOWN_ISSUES #15).
6. Aucun champ `LIVE_READY` ou `broker` n'est jamais produit.
7. Déterminisme JSON byte-à-byte.
8. (bonus) `assessSignalQualityV1` ordre de priorité.
9. (bonus) `normalizeValidationStatus` mapping complet.
10. (bonus) `LIVE_PAPER_ENGINE_SETUP_MAP_V1` — DEAD setups non mappés.
11. (bonus) inputs invalides → null + warnings, jamais d'exception.

Tests PR-LIVE-PAPER-EXEC-1b (7) :

- **EXEC-1b A** : immutabilité des inputs (les helpers ne mutent jamais les objets reçus).
- **EXEC-1b B** : déterminisme sizing/plan (mêmes inputs → champs `plan` et `scores` strictement identiques).
- **EXEC-1b C** : CTX-3 blocked → metadata warning UNIQUEMENT, `plan` et `scores` identiques entre cas allowed/blocked.
- **EXEC-1b D** : `riskContext` absent → aucun crash, warning explicite ; aussi `buildRiskContextV1(null/undefined/invalid)` null-safe.
- **EXEC-1b E** : worker instrumentation failure → ouverture continue (simulation `try/catch` silencieux côté worker).
- **EXEC-1b F** : `contextCaptureStatus` présent et correct selon le cas (CAPTURED / NOT_CAPTURED_RUNTIME_SAFE / NOT_CAPTURED_NO_INPUT).
- **EXEC-1b G** : aucun `LIVE_READY` / `broker` même avec `riskContext` riche.

```bash
node --test tools/quant/test/live-paper-analytics-v1.test.mjs
# tests 18 / pass 18 / fail 0
```

---

## 8. Preuve d'innocuité côté worker

Diff `cloudflare-worker/worker.js` strictement additif :

1. Bloc inline (`LIVE PAPER ANALYTICS V1`) inséré **entre** `computePnlForClose` et `buildTrainingPositionRowFromSignal` (entre deux fonctions, n'affecte aucun code existant).
2. Bloc `try/catch` additif dans `buildTrainingPositionRowFromSignal` (mutation locale `analysisSnapshot.livePaperAnalytics`, le `return` final est inchangé).
3. Bloc `try/catch` additif dans `closeTrainingPosition` (mutation locale `closedRow.analysis_snapshot`, l'INSERT Supabase suivant est inchangé).

Aucune ligne supprimée. Aucune ligne modifiée. Aucun seuil touché.

Vérifiable :

```bash
git diff origin/main..HEAD -- cloudflare-worker/worker.js | grep -E "^-" | grep -vE "^---" | wc -l
# attendu : 0 (zéro ligne supprimée)
```

---

## 9. Limites V1

- **`contextSnapshot` complet non capturé** côté worker (cf. § 4). À ajouter si besoin via PR séparée + accès aux candles 16 ETF côté runtime.
- **Pas d'export UI** vers les onglets Opportunités / Trades. PR séparée si désirée.
- **MAE/MFE pourcentages bruts** (vs entry), pas en R-multiples. Conversion en R-multiples possible mais nécessite le risk size par trade — laissé pour PR analytique offline.
- **Pas de comparaison "matrix vs worker actual" agrégée**. Le metadata permet la comparaison post-hoc via requête Supabase, mais aucun dashboard automatique n'est livré.

---

## 10. Règles d'évolution

### 10.1 Modification du schéma de capture

- Additive uniquement (nouvelle clé OK, retrait/renommage interdit — casse les consommateurs offline).
- MAJ simultanée du module pur ET du miroir worker.
- MAJ tests + cette doc.

### 10.2 Levée du tag `sector_leadership_untrusted`

- Conditionnée à la fermeture de `KNOWN_ISSUES.md` #15 (re-ingestion ajustée des datasets).
- PR documentaire + test régression sur les helpers.

### 10.3 Bascule vers décisionnel (PR-CTX-5)

- Hors scope V1. Conditionnée à :
  - directive ChatGPT explicite (la pause CTX-5 actuelle doit être levée) ;
  - au moins un setup avec preuve d'edge stable multi-régime/multi-période (priorité 18 SESSION.md) ;
  - audit qualité données complet (fermeture #15).

---

## 11. Sources

- Brief créateur 2026-05-21 « PR-LIVE-PAPER-ANALYTICS-1 ».
- `BOT_OBJECTIVE.md` — règle 7 (apprentissage propre).
- `PROJECT_RULES.md` R3-ter (safety gate), R5 (paper trading intouchable sans demande explicite).
- `docs/project/TRADING_ENGINE.md` — règles d'ouverture/fermeture préservées.
- `docs/quant/CONTEXT_ENGINE.md` — V1 du contexte (non consommé inline en V1 worker).
- `docs/quant/SETUP_AUTHORIZATION_MATRIX.md` — matrice CTX-3 (miroir figé dans worker).
- `docs/monitoring/KNOWN_ISSUES.md` #15 — dette qualité données.

---

> **Conclusion-mémo** : instrumentation additive et silencieuse du paper trading existant. Chaque trade ouvre/ferme désormais avec un blob analytique structuré (`livePaperAnalytics`, `livePaperOutcome`) stocké dans le JSONB `analysis_snapshot`. Aucune décision n'est touchée. Aucun seuil n'est modifié. Aucun trade qui ne s'ouvrait pas avant ne s'ouvre maintenant. Le metadata permet l'audit post-mortem et la validation empirique des setups en conditions réelles, sans risquer d'illusion `LIVE_READY`.
