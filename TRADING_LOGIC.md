# TRADING_LOGIC — Logique du moteur de décision

> **Référence pour comprendre comment le bot ouvre, suit et ferme une position.**
> Mise à jour obligatoire à chaque PR qui touche le scoring, l'ouverture ou la fermeture.
> Dernière vérification : 2026-05-15, après PR #158.

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

**Composition** (worker.js L1982, fonction `computeTradeSafetyScore`) :
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

**Volatilité** : moyenne. Stable sur les composantes bougies daily, mais inclut `dataQualityScore` qui dépend de `quote.freshness`. Changera très peu entre deux refresh sauf si le provider change ou le régime bascule.

### `decisionScore` (0–100)

Score "directionnel" : combine structure trend + momentum + timing.

**Calcul** (worker.js L2620+) :
- Base : `0.24 × structure + 0.20 × momentum + 0.20 × timing + 0.18 × risk + 0.10 × context + 0.08 × dataQuality`
- Appliqué : `- regimeMalus + regimeBonus + newsBonus - learningMalus`

**Rôle** : valider le sens (long/short) du trade.

**Volatilité** : haute. Le `momentum` et le `risk` intègrent `quote.change24hPct` → bouge avec le prix live. ⚠️ Cette volatilité est documentée comme problème (cf. KNOWN_ISSUES.md, vague A.1 à venir).

### `exploitabilityScore` (0–100)

Score "actionnabilité" : valide que le setup est **tradable** maintenant (RR, distance entrée, horaires).

**Composantes** :
- Ratio risque/récompense (entry → TP vs entry → stop)
- Heures de marché ouvertes
- Slippage estimé acceptable
- Structure technique cohérente (RSI pas trop extrême, ADX assez fort)

**Rôle** : si haut, le trade est **propose**. Si bas, "à surveiller" ou "pas de trade".

**Volatilité** : faible. Basé sur structure bougies, peu impacté par le prix live.

### `dossierScore` / `finalScore` (0–100)

Score composite final affiché parfois sur la fiche.

- `finalScore = clamp(safetyScore + aiModifier.delta, 0, 100)` si `aiContextReview` actif
- Sinon `dossierScore ≈ safetyScore`

**Rôle** : version "tout inclus" du score, incluant l'avis Claude.

### `officialScore` (legacy)

Champ legacy qui valait `safetyScore + regimeBonus + newsBonus` (composite). Depuis PR #153, le front lit **`safetyScore` brut** en priorité, pour éviter la divergence carte / fiche.

⚠️ `officialScore` reste écrit côté worker pour compatibilité, mais ne doit plus piloter aucun affichage critique.

---

## Setups détectés

Détection dans `detectConfiguration` (worker.js, ~L2200) à partir des bougies daily.

| Setup | Direction | Description | Conditions principales |
|---|---|---|---|
| `pullback` | long | Tendance haussière, repli sain vers EMA20/50, RSI sort d'une zone basse | EMA50 > EMA100, prix ≤ EMA20 + ATR, RSI 35-50 remontant |
| `pullback_short` | short | Symétrique en baissier | EMA50 < EMA100, prix ≥ EMA20 - ATR, RSI 50-65 descendant |
| `breakout` | long | Cassure de résistance majeure (Donchian high) | Close > Donchian55_high, volume > moyenne, ATR pas en compression |
| `breakdown` | short | Cassure de support | Close < Donchian55_low, volume > moyenne |
| `continuation` | long | Suivi de tendance forte | ADX > 25, prix au-dessus de EMA20 et EMA50, momentum positif |
| `continuation_short` | short | Idem en baissier | |
| `mean_reversion` | long ou short | Excès statistique (RSI < 25 ou > 75 sur range) | Optionnel, désactivable via `mean_reversion_enabled` |
| `aucun` | — | Aucun setup clair détecté | Score peut être affiché mais `tradeNow = false` |

Le bot applique `require_structural_setup` (PR #10) : si `true` (par défaut), aucune position n'est ouverte sans setup explicite (= filtre des trades "score-only" qui historiquement perdaient).

---

## Règles d'ouverture (cron `handleTrainingAutoCycle`)

**Pré-requis** : `auto_open_enabled = true` ET `is_enabled = true` ET `tradingEnabled` (risque pas dépassé).

### Filtres successifs dans `isTrainingCandidateAllowed` (worker.js L3707)

| # | Filtre | Échec → trade refusé |
|---|---|---|
| 1 | `row.status === "ok"` | Row partielle |
| 2 | `row.decision === "Trade propose"` | Pas un trade proposé |
| 3 | `row.plan.tradeNow === true` | Engine ne dit pas "now" |
| 4 | `riskState.tradingEnabled` | Daily loss / weekly loss / consecutive losses dépassés |
| 5 | **`!isMarketHoliday(row.symbol)`** | Jour férié (PR #156) |
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

### Si tous les filtres passent
`openTrainingPositionFromRow` (worker.js L5055) :
1. `chooseTrainingExecution` → calcul de la quantité (sizing = capital × allocation_per_trade_pct, ajusté pour respecter `risk_per_trade_pct` sur la distance au stop)
2. `buildTrainingPositionRowFromSignal` → construction de la ligne `mtp_positions` incluant snapshot complet (analysis_snapshot)
3. Anti-race : vérification qu'aucune position ouverte n'existe déjà sur ce symbol+side
4. INSERT dans `mtp_positions`
5. Log `trade_opened` dans `mtp_training_events`

### Sizing du trade
- `capital_base` (USD, défaut 10 000)
- `risk_per_trade_pct` (défaut 1 %) : risque dollar absolu = capital × pct
- `allocation_per_trade_pct` (défaut 8 %) : taille position max (USD investi)
- Quantité = `min(allocation / entry_price, risk_dollar / (entry - stop))`

---

## Règles de fermeture (`trainingCloseTrigger`, worker.js L4615)

Vérifié à chaque cycle cron sur chaque position ouverte. Retourne `{ type, exitPrice, intradayDetected, intradaySource, executionAssumption }` ou `null`.

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

**⚠️ NE PAS modifier cette logique** sans réflexion approfondie — elle protège l'apprentissage des cas ambigus.

#### 2. Stop ou TP via compare scalaire (fallback)

Si pas de tracker intra-trade disponible, compare `livePrice` directement.

#### 3. Time exit

Si `Date.now() - openedAt >= max_holding_hours * 60min * 60s * 1000ms` → `time_exit`.

Default `max_holding_hours = 240` (10 jours).

#### 4. Engine invalidation

Si la nouvelle analyse (refresh fiche détail) donne `decision === "Pas de trade"` OU `exploitabilityScore < max(40, min_actionability_score - 18)` → fermeture forcée `engine_invalidation`.

Permet au bot de couper une position dont le setup ne tient plus.

#### 5. Manuel

`POST /api/trades/close/:id` depuis le front → `close_type: "manual"`.

---

## Garde-fou devise (PR #143)

Avant de comparer un live à un stop, on vérifie que les **devises matchent**.

```js
if (position.currency && livePrice.currency && position.currency !== livePrice.currency) {
  return null; // skip ce cycle, le tracker intra n'est pas non plus mis à jour
}
```

Cas réel évité : position ASML ouverte à 1531 $US Nasdaq, live arrivé à 1367 EUR Amsterdam → sans garde-fou, comparaison 1367 < 1456 → faux stop, perte de 36 € à tort.

---

## Apprentissage adaptatif

### Buckets
Groupement par `{setup}|{direction}|{regime}|{asset_class}` (ex. `pullback|long|RISK_ON|stock`).

Stats agrégées : `win_rate, avg_pnl_pct, expectancy, sample_size`.

### Filtre qualité (PR #157 + #158)
**Toutes les lectures analytiques** filtrent maintenant `or=(quality.eq.ok,quality.is.null)` :
- `computeLearningStats` (alimentation buckets)
- `aggregateFeedbackBuckets` (règles correctives 1-6)
- `observeShadowAdjustments` (shadow rules)
- `getClaudeNewsKillSwitchWeight`
- `computeMarketRegimeStats`

Trades `suspect` / `invalid` sont **exclus** de l'apprentissage. Trades historiques `quality=NULL` (avant migration 016) sont **inclus** comme `ok` par défaut.

### Malus appliqué
`applyLearningMalus` retire jusqu'à 8 pts au score si :
- Bucket mature : `sample_size >= 20`
- Expectancy négative : `expectancy < 0`
- Malus = `clamp(2, 8, round(|expectancy| × 4))`

### Règles correctives 1-6 (`aggregateFeedbackBuckets`)
| Règle | Déclencheur | Action |
|---|---|---|
| 1 | bucket WR < 30% sur 20+ trades | `raise_min_score` (+5 pts seuil) |
| 2 | bucket WR < 20% sur 30+ trades | `disable_bucket` (refus total) |
| 3 | bucket MAE moyen > 1.5× stop dist | shadow only |
| 4 | bucket MFE moyen > 1.5× tp dist | shadow only (extend_tp) |
| 5 | 3 pertes consécutives globales | `reduce_size` (-50%) |
| 6 | 3 gains consécutifs après rule 5 | rollback rule 5 |
| 7 | (réservé, non implémenté) | `retrain_weights` |

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
- Activé conditionnellement (cf. DATA_PIPELINE.md)
- Peut imposer un veto si Claude détecte forte contradiction

### Cooldown post-stop
- `post_stop_cooldown_hours` (défaut 24h) : interdit de rouvrir sur un symbole stoppé récemment

---

## Configurations bot

### Modes
- `exploration` : seuils relâchés, plus de trades, collecte de data
- `core` : seuils stricts, qualité > quantité
- `training` : legacy (n'utiliser que pour des tests)

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

## Préparation broker réel (futur)

Pas implémenté à ce jour. Quand on basculera :
- Remplacer `openTrainingPositionFromRow` par un appel à l'API broker
- Remplacer `closeTrainingPosition` par un ordre de close réel
- Ajouter `slippage-engine` (estimation slippage, calcul prix exécution réel)
- Ajouter check broker_api_available, currency_supported, market_open avant ordre
- Garder le `tradeValidationEngine` actif (utile pour audit post-trade)

**Tout le reste (scoring, learning, intra-tracking)** restera identique : c'est le but de la refonte actuelle.
