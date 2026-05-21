# TRADING_ENGINE — Moteur / exécution / paper trading / safety / sizing

> **Source canonique** pour la **logique moteur** : pipeline, snapshot analytique, validation live, safety gate, sizing, règles d'ouverture, règles de fermeture, garde-fou devise, orchestration cron, paper trading.
>
> Contenu issu de l'ancien `TRADING_LOGIC.md` racine (split documentaire — PR `claude/split-trading-logic`). Aucun changement de fond métier.
>
> La logique quant / scoring / setups / régimes / modulateurs / apprentissage adaptatif vit dans `docs/quant/TRADING_LOGIC.md`.

Voir aussi :
- `docs/project/ARCHITECTURE.md` — structure code (worker, front, storage).
- `docs/project/DATA_PIPELINE.md` — flux de données par écran.
- `docs/monitoring/PROVIDERS_MATRIX.md` — routage providers / TTL / fallback.
- `docs/monitoring/KNOWN_ISSUES.md` — bugs et dette.
- `docs/quant/TRADING_LOGIC.md` — logique quant / scoring / setups / régimes.
- `PROJECT_RULES.md` — règles techniques structurelles (R3-bis, R3-ter, R4, snapshotId).

## Explication simple

Ce fichier explique **comment le moteur exécute concrètement les trades du bot** : comment il ouvre une position, comment il la suit en intra-trade, comment il décide de la fermer, comment il se protège contre les quotes douteuses et comment il dimensionne le risque.

---

## Vue d'ensemble (couches d'exécution)

Le moteur de décision combine quatre couches. Les deux premières sont **quant** (cf. `docs/quant/TRADING_LOGIC.md`), les deux dernières sont **engine** (couvertes dans ce fichier) :

1. **Analyse technique** sur bougies daily → score 0–100 *(quant)*
2. **Modulateurs contextuels** : régime macro, news, IA, apprentissage *(quant)*
3. **Décision** : Trade proposé / À surveiller / Pas de trade *(orchestration — ici)*
4. **Exécution paper** : sizing, stop, take profit, suivi intra-trade *(engine — ici)*

---

## Contenants pipeline du payload analytique

### `liveContext` (objet, **volatile**)

Container exposé à côté de `strategicAnalysis`. Contient `change24hPct`, `volume24h`, `freshness`, `quotedAt`, `price`, `regimeBonus`, `newsBonus`, et un objet `scoreImpact: { strategicScore, compositeScore, delta }` qui mesure l'écart entre les deux versions.

**Rôle** : isole tout ce qui change avec le prix live, pour l'affichage temps réel, la validation d'entrée, le calcul TP/SL, le PnL paper et l'exécution réelle future.

### `snapshotId` (8 chars hex, **analytique pur**) — vague B.4

Identifiant de cohérence analytique exposé à la racine du payload et dans `strategicAnalysis`. Hash FNV-1a déterministe sur `symbol | timeframe | analysisType | candlesAt | regimeAt | learningAt`.

**Garanties** :
- Deux analyses avec mêmes inputs analytiques → même `snapshotId`
- Prix live qui change → `snapshotId` inchangé
- Nouvelle bougie / nouveau régime / nouveau learning → `snapshotId` change

**Non-garanties** :
- Ce n'est PAS un timestamp live, PAS une cache key, PAS un tradeId, PAS un userId
- N'inclut PAS `quotedAt`, `change24hPct`, `volume24h`, `freshness`, `spread`

**Rôle** : permet de comparer carte d'opportunité vs fiche détail (`card.snapshotId === detail.snapshotId` ⇒ même état analytique), de détecter les recalculs, et de préparer l'audit learning + la validation broker réel.

### Timestamps analytiques — vague B.4

Quatre timestamps exposés à la racine du payload **et** dans `strategicAnalysis`, strictement analytiques (zéro source live) :

| Champ | Signification |
|---|---|
| `strategicCalculatedAt` | Quand `calcDetailScore` a tourné (ISO) |
| `candlesUpdatedAt` | Timestamp de la dernière bougie utilisée |
| `regimeUpdatedAt` | Quand le régime macro a été calculé |
| `learningSnapshotAt` | Quand le `learningContext` a été pré-fetché |

**Note** : `liveContext.quotedAt` reste exposé séparément pour le côté live. Les timestamps analytiques et le timestamp live sont volontairement séparés pour ne jamais mélanger les deux notions de fraîcheur.

### `quoteQuality` (objet, **validation live**) — vague B.6

Exposé dans `liveContext.quoteQuality`. Diagnostic structuré de la qualité de la quote live, produit par `quoteQualityEngine(quote, candles, options)`.

**Champs principaux** : `trustScore` (0-100), `executionSafe` (bool), `validationStatus` (string), `reasons` (string[]), 6 flags booléens (`stale`, `delayed`, `marketClosed`, `abnormalSpread`, `currencyMismatch`, `providerConfidence`).

**Rôle** : préparer la validation d'entrée, le suivi TP/SL live et la future validation broker réel. Permet de bloquer une exécution sur une quote douteuse SANS toucher au scoring stratégique.

**Ce que `quoteQuality` N'EST PAS** :
- Ne remplace PAS le `strategicAnalysis`
- Ne remplace PAS le moteur trading
- Ne décide PAS des setups ni des scores
- Ne pilote PAS encore le paper trading (à brancher dans une PR future)

**Ce que `quoteQuality` valide** :
- Qualité live (âge, freshness)
- Sécurité quote (cohérence devise, écart vs candles)
- Cohérence exécution (provider confidence, market hours)

Cf. `docs/project/DATA_PIPELINE.md` pour la structure complète et les règles de détection.

---

## Règles d'ouverture (cron `handleTrainingAutoCycle`)

**Pré-requis** : `auto_open_enabled = true` ET `is_enabled = true` ET `tradingEnabled` (risque pas dépassé).

### Filtres successifs dans `isTrainingCandidateAllowed`

| # | Filtre | Échec → trade refusé |
|---|---|---|
| 1 | `row.status === "ok"` | Row partielle |
| 2 | `row.decision === "Trade propose"` | Pas un trade proposé |
| 3 | `row.plan.tradeNow === true` | Engine ne dit pas "now" |
| 4 | `riskState.tradingEnabled` | Daily / weekly / consecutive losses dépassés |
| 5 | **`!isMarketHoliday(row.symbol)`** | Jour férié |
| 6 | `newsWindow.blocked === false` | Event macro high-impact ±30 min |
| 7 | `require_structural_setup` + setup détecté | Setup obligatoire et aucun reconnu |
| 8 | `allow_long` / `allow_short` selon direction | Direction interdite côté settings |
| 9 | `mean_reversion_enabled` si setup=mean_reversion | Mean reversion désactivé |
| 10 | `min_actionability_score` | Score actionnabilité trop bas |
| 11 | `min_dossier_score` | Score dossier trop bas |
| 12 | `max_open_positions` global | Limite atteinte |
| 13 | `max_positions_per_symbol` | Déjà 1+ position sur ce symbole |
| 14 | `post_stop_cooldown_hours` | Stoppé récemment, attendre N h |
| 15 | Adjustments actifs (raise_min_score, disable_bucket) | Bucket désactivé par règles 1-6 |
| 16 | Horaires de marché ouverts | Hors séance |
| **17** | **`evaluateExecutionSafety(row).safe === true`** (vague B.9) | **Quote unsafe — bloqué quote_unsafe** |

### Filtre 17 — Safety gate execution (vague B.9, mai 2026)

Après tous les filtres précédents et juste avant `openTrainingPositionFromRow`, l'auto-cycle vérifie `evaluateExecutionSafety(row)`. Si `safe === false`, la position n'est PAS ouverte. Le candidat reste visible côté UI (badge B.8 "Prix périmé" / "Devise incohérente" / etc.), mais le bot s'abstient.

Causes possibles de blocage (champ `code`) :
- `currency_mismatch` — devise quote ≠ devise attendue
- `stale` — quote périmée (cf. seuils B.6.1)
- `abnormal_spread` — écart > 3 ATR (5 pour crypto)
- `provider_unsafe` — fournisseur ne donne pas confiance
- `no_price` — `price` absent ou non fini
- `quote_unsafe` — fallback générique
- `quote_quality_missing` — diagnostic absent, blocage par prudence

**Important** : `delayed` et `marketClosed` ne sont PAS des bloquants par eux-mêmes (BMW.DE différé hors heures EU reste exécutable côté bot tant que `executionSafe=true`).

Chaque blocage écrit un événement `auto_open_blocked_unsafe` dans `mtp_training_events` avec `{symbol, code, human, source_used, freshness, quoted_at}` pour observabilité.

### Si tous les filtres passent

`openTrainingPositionFromRow` (côté worker) :

1. `chooseTrainingExecution` → calcul de la quantité (sizing)
2. `buildTrainingPositionRowFromSignal` → construction de la ligne `mtp_positions` incluant snapshot complet (`analysis_snapshot`)
3. **PR-LIVE-PAPER-ANALYTICS-1** : ajoute `analysis_snapshot.livePaperAnalytics` (try/catch silencieux, n'influence aucune décision — cf. `docs/quant/LIVE_PAPER_ANALYTICS.md`)
4. Anti-race : vérification qu'aucune position ouverte n'existe déjà sur ce symbol+side
5. INSERT dans `mtp_positions`
6. Log `trade_opened` dans `mtp_training_events`

### Sizing du trade

- `capital_base` (USD, défaut 10 000)
- `risk_per_trade_pct` (défaut 1 %) : risque dollar absolu = capital × pct
- `allocation_per_trade_pct` (défaut 8 %) : taille position max (USD investi)
- Quantité = `min(allocation / entry_price, risk_dollar / (entry - stop))`

---

## Règles de fermeture (`trainingCloseTrigger`)

Vérifié à chaque cycle cron sur chaque position ouverte. Retourne `{ type, exitPrice, intradayDetected, intradaySource, executionAssumption }` ou `null`.

### Filtre 0 — Safety gate execution (vague B.9, mai 2026)

**AVANT** d'appeler `trainingCloseTrigger`, le cycle vérifie `evaluateExecutionSafety(detailPayload)`. Si la quote sur laquelle on baserait la décision n'est pas fiable (`executionSafe=false` ou diagnostic absent), le close est **différé d'un cycle** :
- pas de stop/TP déclenché ce tour
- log `auto_close_blocked_unsafe` dans `mtp_training_events`
- `position.live.highSinceOpen` / `lowSinceOpen` continuent d'être mis à jour (avec check `currencyMatches`), donc si le stop a été touché en intraday, l'info est conservée
- au cycle suivant, dès que la quote redevient fiable (`executionSafe=true`), `trainingCloseTrigger` rejoue normalement et le close se déclenche si les niveaux ont été franchis

**Conséquence** : sur un provider en panne prolongée, les stops peuvent rester non exécutés tant que la quote reste unsafe. Acceptable côté paper trading. À surveiller pour le futur broker réel — la gate sera réactivable / configurable séparément à ce moment-là.

### Ordre de priorité

#### 1. Stop ou TP via tracker intra-trade

Si `position.live.highSinceOpen` et `position.live.lowSinceOpen` existent (tracker depuis l'ouverture) :

- Pour **long** :
  - `lowSinceOpen <= stopLoss` → stop touché
  - `highSinceOpen >= takeProfit` → TP touché
- Pour **short** :
  - `highSinceOpen >= stopLoss` → stop touché
  - `lowSinceOpen <= takeProfit` → TP touché

**Règle prudente quand stop ET TP sont touchés dans la même fenêtre intra-cycle** :
→ On considère que le **stop a été touché EN PREMIER** (`executionAssumption: "ambiguous_intraday_stop_first"`).

Justification : aucune source ne donne l'ordre intra-bougie de façon fiable, donc hypothèse défavorable au bot.

**Ne pas modifier cette logique** sans réflexion approfondie — elle protège l'apprentissage des cas ambigus.

#### 2. Stop ou TP via compare scalaire (fallback)

Si pas de tracker intra-trade disponible, compare `livePrice` directement.

#### 3. Time exit

Si `Date.now() - openedAt >= max_holding_hours * 60 * 60 * 1000` → `time_exit`.

Défaut `max_holding_hours = 240` (10 jours).

#### 4. Engine invalidation

Si la nouvelle analyse (refresh fiche détail) donne `decision === "Pas de trade"` OU `exploitabilityScore < max(40, min_actionability_score - 18)` → fermeture forcée `engine_invalidation`.

Permet au bot de couper une position dont le setup ne tient plus.

#### 5. Manuel

`POST /api/trades/close/:id` depuis le front → `close_type: "manual"`.

---

## Garde-fou devise (vague A déjà livrée)

Avant de comparer un live à un stop, on vérifie que les **devises matchent**.

```js
if (position.currency && livePrice.currency && position.currency !== livePrice.currency) {
  return null; // skip ce cycle, le tracker intra n'est pas non plus mis à jour
}
```

Cas réel évité : position ASML ouverte à 1531 $US Nasdaq, live arrivé à 1367 EUR Amsterdam → sans garde-fou, comparaison `1367 < 1456` → faux stop, perte de 36 € à tort.

---

## Configurations bot

### Modes

- `exploration` : seuils relâchés, plus de trades, collecte de data
- `core` : seuils stricts, qualité > quantité
- `training` : legacy, à n'utiliser que pour des tests

### Toggles principaux

- `auto_open_enabled`, `auto_close_enabled`
- `allow_long`, `allow_short`
- `mean_reversion_enabled`
- `require_structural_setup`
- `learning_enabled`

### Risk limits

- `max_daily_loss_pct` (défaut 30 %)
- `max_weekly_loss_pct` (défaut 80 %, 100 = OFF)
- `max_consecutive_losses` (défaut 20, 999 = OFF)
- `post_stop_cooldown_hours` (défaut 24)

> Le cooldown post-stop interdit de rouvrir sur un symbole stoppé récemment. Filtre 14 dans `isTrainingCandidateAllowed` ci-dessus.

---

## Non encore fait (engine)

- **`snapshotId` sur les payloads** : livré en vague B.4. La cohérence carte ↔ fiche est désormais garantie analytiquement (cf. `PROJECT_RULES.md` R4 et `docs/project/DATA_PIPELINE.md`).
- **`tradeValidationEngine` étendu** : actuellement 5 règles (`invalid_price`, `extreme_move`, `stale_quote`, `partial_data`, `instant_close`). Pas de règle pour `currency_unknown`, `provider_divergence` ou `news_window_breach`. À étendre selon les besoins observés.
- **Live Paper Analytics V1** : livré (PR-LIVE-PAPER-ANALYTICS-1). Chaque close ajoute `analysis_snapshot.livePaperOutcome` (signalQuality / validationStatus / MAE / MFE / etc.) via try/catch silencieux. Aucune décision modifiée. Cf. `docs/quant/LIVE_PAPER_ANALYTICS.md` § 3.2.
- **Slippage et exécution réaliste** : aucun modèle de slippage en paper. Le prix d'exécution = entry/exit théorique. Hors périmètre actuel.
- **Préparation broker réel** : pas d'`execution-engine` adapter pour Interactive Brokers / Alpaca / autre. Tout le code paper trade actuel devra être doublé d'un mode "real" quand on basculera. Conditions de passage : cf. `BOT_OBJECTIVE.md` § *Conditions avant passage en bot réel*.

---

## Limites de fiabilité (engine)

- La règle prudente "stop d'abord en cas d'ambiguïté intra" est une **décision de design** documentée ici. Toute modification doit passer par une PR explicite avec mise à jour de ce fichier.

Les limites côté quant (pondérations, seuils règles 1-6, etc.) sont documentées dans `docs/quant/TRADING_LOGIC.md`.

---

## Vague B.10 — durcissement safety gate (mai 2026)

Trois ajustements critiques de la chaîne de décision exécutive du paper trading auto-cycle.

### Filtre 17 (open) et filtre 0 (close) — snapshot/EOD non exécutable

Le brief B.6 stipulait que `quoteQualityEngine` produirait `executionSafe=true` pour toute quote non aberrante. L'audit a montré qu'une quote `sourceUsed:"snapshot"` (filet ultime EOD veille) passait ce filtre. **Conséquence avant B.10** : pendant une panne Yahoo + EODHD simultanée, le bot ouvrait des positions au prix de clôture de la veille, immédiatement stop-loss au cycle suivant.

**Règle B.10 (vérifiée par `quoteQualityEngine`)** :
> Une quote dont `sourceUsed === "snapshot"` ou `freshness === "eod"` est marquée `isSnapshot=true`, `executionSafe=false`, `validationStatus="eod_snapshot"`. Le drapeau `"eod_snapshot"` est poussé dans `reasons[]` pour audit. `providerConfidenceForSource("snapshot")` retourne `"unsafe"` en complément.

Côté UI : la quote reste affichable (tone `warn`, libellé "Dernier prix dispo"). Côté exécution : `evaluateExecutionSafety` bloque.

### Ordre d'évaluation au close — gate AVANT le tracker MAE/MFE

Le tracker intra-trade (`updatePositionIntraExcursion` → persistence en BDD `position.live.highSinceOpen` / `lowSinceOpen`) était mis à jour AVANT la safety gate. Une quote `abnormalSpread` polluait l'intra-trade et provoquait un faux close intraday au cycle suivant (gate passe, trigger lit l'intra pollué, déclare `intraday_low_breach`).

**Règle B.10 (vérifiée par `handleTrainingAutoCycle` phase fermeture)** :
> `evaluateExecutionSafety(detailPayload)` est exécutée AVANT `updatePositionIntraExcursion`. Si `!safe`, log + return. Le tracker n'est jamais alimenté avec une quote unsafe.

### Alignement quote validée ↔ quote exécutée (close)

Avant B.10, la phase close appelait `resolveUnifiedMarketQuote` (bypass KV) pour `liveQuote.price`, et `buildStableMarketPayload` (via `resolveLiveQuote`, KV) pour `detailPayload.liveContext.quoteQuality`. La gate validait la deuxième, le trigger utilisait la première.

**Règle B.10** :
> Le close repose sur UNE seule quote. `liveQuote = resolveLiveQuote(...)`. `effectivePrice = detailPayload.price ?? liveQuote.price ?? stalePrice`. La quote validée est la quote utilisée.

### Fraîcheur réelle Yahoo

`getYahooBatchQuotes` et `getYahooQuoteFromChart` posaient `freshness:"live"` + `quotedAt:nowIso()` quel que soit l'âge réel du payload. Détection `stale` impossible sur Yahoo.

**Règle B.10** :
> `quotedAt` est dérivé de `regularMarketTime` (epoch s). `freshness` est dérivé de `exchangeDataDelayedBy` (minutes) — ≥ 15 min → `"delayed_15m"`, > 0 → `"delayed"`, sinon `"live"`.

### Fallback abnormalSpread si ATR absent

Le check `abnormalSpread` (écart livePrice vs lastClose en multiples d'ATR) nécessitait ≥ 14 bougies ET `atr > 0`. Quote aberrante avec moins de bougies passait silencieusement.

**Règle B.10** : si ATR indispo, bascule sur seuil en pourcentage brut — 15 % non-crypto, 30 % crypto. Champ `spreadPct` exposé dans `quoteQuality`.
