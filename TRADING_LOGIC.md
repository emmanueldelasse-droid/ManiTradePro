# TRADING_LOGIC — Logique du moteur de décision

## Explication simple

Ce fichier explique **comment le bot décide quoi acheter, quand fermer, et comment il apprend de ses trades passés**. C'est la référence pour comprendre les scores, les setups et les règles d'ouverture/fermeture.

---

## Vue d'ensemble

Le moteur de décision combine quatre couches :

1. **Analyse technique** sur bougies daily → score 0–100
2. **Modulateurs contextuels** : régime macro, news, IA, apprentissage
3. **Décision** : Trade proposé / À surveiller / Pas de trade
4. **Exécution paper** : sizing, stop, take profit, suivi intra-trade

---

## Scores

### `safetyScore` (0–100)

Score principal de **sûreté du setup**. Le plus visible côté UX (ring, badges).

Calculé par `computeTradeSafetyScore` dans `cloudflare-worker/worker.js`. Composition (à recroiser dans le code si modifié) :

```
safety = 0.34 × decisionScore
       + 0.24 × exploitabilityScore
       + 0.14 × entryQualityScore
       + 0.14 × riskQualityScore
       + 0.08 × contextQualityScore
       + 0.06 × dataQualityScore
       + bonus setup détecté
       + bonus hardFilters passés
```

**Rôle** : choisir QUOI trader. Plus c'est haut, plus l'engine considère que le setup est propre.

**Affichage** :
- Ring opportunités (carte)
- "Score de sûreté X/100" sur la fiche détail
- Tri du panel opp

**Volatilité** : moyenne. Stable sur les composantes bougies daily, mais inclut `dataQualityScore` qui dépend de `quote.freshness`. Bouge peu entre deux refresh sauf si le provider change ou le régime bascule.

### `decisionScore` (0–100)

Score directionnel : combine structure trend + momentum + timing.

Calcul base (dans `calcDetailScore`) :

```
base = 0.24 × structure
     + 0.20 × momentum  ← inclut quote.change24hPct (LIVE)
     + 0.20 × timing
     + 0.18 × risk      ← inclut quote.change24hPct (LIVE)
     + 0.10 × context
     + 0.08 × dataQuality
```

Puis appliqué : `- regimeMalus + regimeBonus + newsBonus - learningMalus`.

**Rôle** : valider le sens (long/short) du trade.

**Volatilité** : haute. Le `momentum` et le `risk` intègrent `quote.change24hPct` → bouge avec le prix live. **Pour la version stable, lire `strategicAnalysis.score`** (cf. ci-dessous).

### `strategicAnalysis.score` (0–100, **stable**)

Vague A.1 (mai 2026) — exposé par `calcDetailScore` à côté du `score` legacy.

Recalculé en retirant **toutes** les contributions live :
- `momentum` strategic = momentum composite − contribution `change24hPct`
- `risk` strategic = risk composite + contribution `change24hPct` − contribution `volume24h`
- `context` strategic = context composite − contribution `volume24h`
- `participation` strategic = participation composite − contribution `change24hPct` − bascule baseline `volume24h`
- `dataQuality` strategic = constante 80 (les bougies clôturées sont reliables par définition)
- **PAS** de `regimeBonus` (F&G/VIX recalculés en live toutes les 5 min)
- **PAS** de `newsBonus` (cache 3-6 h mais la news en elle-même est volatile)
- **OUI** `regimeMalus` (validité config ↔ régime, stable par batch)
- **OUI** `learningMalus` (bucket histoire, stable)

**Rôle** : score conçu pour rester stable entre deux clôtures de bougies sur les entrées live directes (prix, volume, freshness). Utilisé pour l'analyse stratégique, le diagnostic de régression, et l'affichage front "score stable" (à venir). Ne pilote PAS encore le paper trading (le `plan.safetyScore` continue d'utiliser le score composite).

**Limites de stabilité** (pas une garantie absolue) :
- `regimeMalus` peut changer si le régime macro est rafraîchi (cache KV 1 h)
- `learningMalus` peut changer si un nouveau trade clos publie ses stats dans le bucket
- `detectConfiguration` reçoit `quote` mais ne lit aucun champ live (paramètre dead, vérifié) — donc stable
- La dernière bougie daily peut être encore ouverte selon le provider et le fuseau
- `snapshotId` n'est pas encore propagé (vague B.4) → deux requêtes successives peuvent voir des candles différentes

Cf. `DATA_PIPELINE.md` pour la structure du payload.

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

Cf. `DATA_PIPELINE.md` pour la structure complète et les règles de détection.

### `exploitabilityScore` (0–100)

Score d'**actionnabilité** : valide que le setup est tradable maintenant (RR, distance entrée, horaires).

Composantes :
- Ratio risque/récompense (entry → TP vs entry → stop)
- Heures de marché ouvertes
- Slippage estimé acceptable
- Structure technique cohérente (RSI pas trop extrême, ADX assez fort)

**Rôle** : si haut, le trade est `Trade propose`. Si bas, `À surveiller` ou `Pas de trade`.

**Volatilité** : faible. Basé sur structure bougies, peu impacté par le prix live.

### `dossierScore` / `finalScore` (0–100)

Score composite final affiché parfois sur la fiche.

- `finalScore = clamp(safetyScore + aiModifier.delta, 0, 100)` si `aiContextReview` actif
- Sinon `dossierScore ≈ safetyScore`

### `officialScore` (legacy)

Champ legacy qui valait `safetyScore + regimeBonus + newsBonus` (composite). Depuis la PR #153, le front lit **`safetyScore` brut** en priorité, pour éviter la divergence carte / fiche.

`officialScore` reste écrit côté worker pour compatibilité, mais ne pilote plus aucun affichage critique.

---

## Setups détectés

Détection dans `detectConfiguration` (côté worker), à partir des bougies daily.

| Setup | Direction | Description | Conditions principales |
|---|---|---|---|
| `pullback` | long | Tendance haussière, repli sain vers EMA20/50, RSI sort d'une zone basse | EMA50 > EMA100, prix ≤ EMA20 + ATR, RSI 35–50 remontant |
| `pullback_short` | short | Symétrique en baissier | EMA50 < EMA100, prix ≥ EMA20 - ATR, RSI 50–65 descendant |
| `breakout` | long | Cassure de résistance majeure (Donchian high) | Close > Donchian55_high, volume > moyenne, ATR pas en compression |
| `breakdown` | short | Cassure de support | Close < Donchian55_low, volume > moyenne |
| `continuation` | long | Suivi de tendance forte | ADX > 25, prix > EMA20 et EMA50, momentum positif |
| `continuation_short` | short | Idem en baissier | |
| `mean_reversion` | long ou short | Excès statistique (RSI < 25 ou > 75 sur range) | Optionnel, désactivable via `mean_reversion_enabled` |
| `aucun` | — | Aucun setup clair détecté | Score peut être affiché mais `tradeNow = false` |

Le bot applique `require_structural_setup` : si `true` (par défaut), aucune position n'est ouverte sans setup explicite — filtre les trades "score-only" qui historiquement perdaient.

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
3. Anti-race : vérification qu'aucune position ouverte n'existe déjà sur ce symbol+side
4. INSERT dans `mtp_positions`
5. Log `trade_opened` dans `mtp_training_events`

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

## Apprentissage adaptatif

### Buckets

Groupement par `${setup}|${direction}|${regime}|${asset_class}` (ex. `pullback|long|RISK_ON|stock`).

Stats agrégées : `win_rate, avg_pnl_pct, expectancy, sample_size`.

### Filtre qualité

**Toutes les lectures analytiques** filtrent maintenant `or=(quality.eq.ok,quality.is.null)` :

- `computeLearningStats` (alimentation buckets)
- `aggregateFeedbackBuckets` (règles correctives 1-6)
- `observeShadowAdjustments` (shadow rules)
- `getClaudeNewsKillSwitchWeight`
- `computeMarketRegimeStats`

Trades `suspect` / `invalid` sont **exclus**. Trades historiques `quality = NULL` (avant migration 016) sont **inclus** comme `ok` par défaut.

### Malus appliqué

`applyLearningMalus` retire jusqu'à 8 pts au score si :
- Bucket mature : `sample_size >= 20`
- Expectancy négative : `expectancy < 0`
- Malus = `clamp(2, 8, round(|expectancy| × 4))`

### Règles correctives 1-6 (`aggregateFeedbackBuckets`)

| Règle | Déclencheur | Action |
|---|---|---|
| 1 | bucket WR < 30 % sur 20+ trades | `raise_min_score` (+5 pts seuil) |
| 2 | bucket WR < 20 % sur 30+ trades | `disable_bucket` (refus total) |
| 3 | bucket MAE moyen > 1.5× stop dist | shadow only |
| 4 | bucket MFE moyen > 1.5× tp dist | shadow only (extend_tp) |
| 5 | 3 pertes consécutives globales | `reduce_size` (-50 %) |
| 6 | 3 gains consécutifs après rule 5 | rollback rule 5 |
| 7 | (réservée, non implémentée) | `retrain_weights` |

---

## Modulateurs contextuels

### Régime macro (`regimeBonus`)

- Calculé via SPY/QQQ/TLT bougies daily
- Valeurs : `RISK_ON | RISK_OFF | RANGE`
- Bonus ±5 pts selon alignement avec direction du trade

### News bonus (`newsBonus`)

- ±10 pts max
- Niveau 2 : sentiment des sources (CryptoPanic / Alpha Vantage)
- Niveau 3 : signal Claude `direction + confidence`, pondéré par `claudeKillSwitchWeight`

### AI modifier (`aiModifier`)

- ±5 pts max
- Activé conditionnellement (cf. `DATA_PIPELINE.md`)
- Peut imposer un veto si Claude détecte forte contradiction

### Cooldown post-stop

- `post_stop_cooldown_hours` (défaut 24 h) : interdit de rouvrir sur un symbole stoppé récemment

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

---

## Non encore fait

- **`strategicScore` stable** (séparé du `liveContext`) : le score actuel mélange composantes stables et live. Prévu en vague A.1.
- **`snapshotId` sur les payloads** : la cohérence entre carte opportunité et fiche détail n'est pas garantie. Prévu en vague B.4.
- **`tradeValidationEngine` étendu** : actuellement 5 règles (`invalid_price`, `extreme_move`, `stale_quote`, `partial_data`, `instant_close`). Pas de règle pour `currency_unknown`, `provider_divergence` ou `news_window_breach`. À étendre selon les besoins observés.
- **Slippage et exécution réaliste** : aucun modèle de slippage en paper. Le prix d'exécution = entry/exit théorique. Hors périmètre actuel.
- **Préparation broker réel** : pas d'`execution-engine` adapter pour Interactive Brokers / Alpaca / autre. Tout le code paper trade actuel devra être doublé d'un mode "real" quand on basculera.

---

## Limites de fiabilité

- Les pondérations exactes (0.34, 0.24, etc.) sont prises du code au moment de la documentation. À recroiser avec `computeTradeSafetyScore` et `calcDetailScore` si ces nombres changent.
- La règle prudente "stop d'abord en cas d'ambiguïté intra" est une **décision de design** documentée ici. Toute modification doit passer par une PR explicite avec mise à jour de ce fichier.
- Les seuils des règles 1-6 (WR < 30 %, sample_size >= 20) sont prises de `aggregateFeedbackBuckets`. À revérifier si ajustement.

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
