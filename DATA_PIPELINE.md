# DATA_PIPELINE — Flux de données par écran

## Explication simple

Ce fichier explique **d'où viennent les prix, les scores, les bougies et les données affichées dans l'application**. C'est la référence pour comprendre où arrive chaque chiffre, quel cache est traversé, et quelle est sa volatilité.

---

## Principe général

L'app distingue deux natures de données :

- **STABLE** : ce qui se calcule sur des bougies clôturées (EMA, RSI, ATR, score de sûreté). Ne doit pas changer entre deux refresh.
- **LIVE** : le prix actuel, le change 24h, le delta vs stop/TP. Volatile par définition.

Aujourd'hui (mai 2026), cette séparation **n'est pas encore stricte côté worker** : le `score` actuel mélange composantes stables et live. C'est la vague A.1 de refonte planifiée (cf. section "Non encore fait" et `KNOWN_ISSUES.md`).

---

## Prix live d'une action ou crypto

### Flux

1. Le worker reçoit `GET /api/opportunities` ou `GET /api/opportunity-detail/:symbol`
2. La fonction `resolveUnifiedMarketQuote` ou la Phase 1 batch dispatch route par devise (cf. `PROVIDERS_MATRIX.md`)
3. La quote retournée porte : `price, currency, sourceUsed, freshness, quotedAt`
4. Stockée en cache mémoire `market:snapshot:${symbol}` pour 2 min
5. Renvoyée au front via le payload

### Cas par type d'actif

#### Crypto (BTC, ETH, SOL, ...)
- **Source** : Binance `api.binance.com/api/v3/ticker/24hr`
- **Cache** : 30 s mémoire
- **Devise** : USD (USDT)
- **Freshness** : `live`
- **Utilisé pour** : prix affiché, calcul P&L position ouverte, déclenchement stop/TP
- **NON utilisé pour** : score stratégique (basé bougies daily)
- **Risque** : si Binance rate-limit ou tombe, aucun fallback. Le symbole sortira en partial.

#### Actions US (AAPL, NVDA, ...)
- **Source primaire** : EODHD `/real-time` (temps réel sur plan "All World Extended")
- **Fallback 1** : Yahoo v8 chart `query1.finance.yahoo.com/v8/finance/chart`
- **Fallback 2** : Twelve `/quote`
- **Cache** : 2 min mémoire (`market:snapshot:AAPL`)
- **Devise** : USD
- **Freshness** : `live` (EODHD US RT et Yahoo v8) ou `delayed_15m` (Twelve)
- **Utilisé pour** : prix, P&L, stop/TP
- **NON utilisé pour** : score stratégique
- **Risque** : EODHD quota mensuel peut être atteint → bascule sur Yahoo (toujours OK actuellement)

#### Actions Europe (LVMH, RMS, AIR, SAP, ASML, ...)
- **Source primaire** : Yahoo v8 chart (Yahoo donne le temps réel sur Euronext, Xetra, etc.)
- **Fallback 1** : EODHD `/real-time` (différé 15 min sur EU sur plan All World Extended)
- **Fallback 2** : Twelve
- **Cache** : 2 min mémoire
- **Devise** : EUR
- **Freshness** : `live` (Yahoo) ou `delayed_15m` (EODHD/Twelve)
- **Utilisé pour** : prix affiché, P&L position ouverte
- **NON utilisé pour** : score stratégique
- **Risque** : Yahoo rate-limit possible si trop d'appels individuels — la Phase 1 du scan utilise un batch pour minimiser

#### Actions Suisse (NESN, ROG.SW, UBSG.SW)
- Comme actions EU mais **devise CHF**
- Bourse SIX, horaires 09:00–17:30 CET
- EODHD `/real-time` souvent vide hors heures → fallback Yahoo systématique

#### Actions UK (HSBA.L, ULVR.L)
- Comme actions EU mais **devise GBP**
- Bourse LSE, horaires 08:00 GMT (= 09:00 Paris) → 16:30 GMT (= 17:30 Paris)
- Suffixe Yahoo `.L`, suffixe EODHD `.LSE` — traduction automatique dans `normalizeEodhdSymbol`

#### Forex (EURUSD, GBPUSD, ...)
- **Source primaire** : Twelve `/quote` avec format `EUR/USD`
- **Fallback** : Yahoo `EURUSD=X`, Alpha Vantage `CURRENCY_EXCHANGE_RATE`
- **Cache** : 60 min mémoire
- **Horaires** : 24h/24 Lun-Ven, ferme dim. 22h UTC, réouvre dim. 22h UTC

#### Commodities (GOLD, SILVER, OIL)
- **Source** : Twelve (`XAU/USD`, `BRENT`) ou Yahoo (`GC=F`, `SI=F`, `CL=F`)
- **Cache** : 60 min
- **Horaires** : CME, 23h–22h UTC Lun-Ven avec pause 22-23h

---

## Bougies daily (analyse technique)

### Flux

`getCandlesBySymbol(symbol, "1d", limit, env, ctx)` dans `cloudflare-worker/worker.js` :

1. Crypto → `getCryptoCandlesTf` (Binance `/klines`, cache 5 min)
2. Non-crypto + timeframe daily/weekly + EODHD configuré → `getEodhdCandlesWithKV` (cache KV 12h)
3. Sinon ou si EODHD KO → `getTwelveCandlesWithKV` (cache KV 12h)
4. Sinon ou si Twelve KO sur daily/weekly → fallback Yahoo `getYahooCandles`

### Détails

- **Source primaire** : EODHD `/eod/${symbol}.EXCH` (jusqu'à 1000 bougies)
- **Cache KV** : `candles:eodhd:${symbol}:1d` pendant 12 h
- **Devise** : devise locale de la bourse
- **Utilisé pour** : EMA, RSI, ATR, Donchian, score stratégique, indicateurs régime (SPY/QQQ/TLT)
- **Risque** : la bougie du jour pas encore clôturée peut polluer certains calculs. Cf. vague A.1 en cours.

### Bougies 4h / 1h

- EODHD ne couvre PAS l'intraday sur le plan All World Extended
- Source primaire : Twelve Data `/time_series`
- Cache KV : 2 h (4h) ou 30 min (1h)

---

## Score stratégique (sûreté + exploitabilité)

### Flux actuel

1. `calcDetailScore(quote, candles, regime, env, regimeIndicators, newsContext, claudeWeight, learningContext)` dans `cloudflare-worker/worker.js`
2. Calcul 6 composantes pondérées (composite, intègre le live) :
   - structure 24 %
   - momentum 20 % (inclut `quote.change24hPct` → **LIVE**)
   - timing 20 %
   - risk 18 % (inclut `quote.change24hPct` → **LIVE**)
   - context 10 %
   - dataQuality 8 % (basé sur `quote.freshness` → **LIVE**)
3. Applique modulateurs : `-regimeMalus +regimeBonus +newsBonus -learningMalus`
4. Si `aiContextReview` actif : applique `aiModifier.delta`
5. `safetyScore` recompose via `computeTradeSafetyScore` : 0.34×decision + 0.24×exploitability + 0.14×entry + 0.14×risk + 0.08×context + 0.06×dataQuality

### Séparation strategicAnalysis / liveContext (vague A.1, mai 2026)

Depuis la vague A.1, `calcDetailScore` retourne **deux objets supplémentaires** à côté du payload composite legacy :

```
{
  // legacy (composite, intègre live) — inchangé pour back-compat
  score, breakdown, plan, ...,

  // NOUVEAU — vague A.1
  strategicAnalysis: {
    score,                  // recalculé sans change24hPct ni volume24h ni regimeBonus ni newsBonus
    direction,
    confidence,
    setupType,
    configuration,
    hardFilters: { passed, flags },
    breakdown: { trend, momentum, timing, risk, context, participation, dataQuality:80 },
    regimeMalus,            // appliqué (stable par batch)
    learningMalus,          // appliqué (stable)
    learningReason
  },
  liveContext: {
    change24hPct, volume24h, freshness, quotedAt, price,
    regimeBonus, regimeBonusReason,
    newsBonus, newsBonusReason,
    scoreImpact: { strategicScore, compositeScore, delta }
  }
}
```

`strategicAnalysis.score` ne change qu'à clôture de bougie. `liveContext` est l'unique source de vérité pour les valeurs volatiles.

Plumberie :
- `buildStablePayload` (`cloudflare-worker/worker.js`) propage `strategicAnalysis` et `liveContext` du `scored` au payload de fiche.
- `toOpportunityRow` (`cloudflare-worker/worker.js`) propage les deux objets dans chaque row de `/api/opportunities`.
- `buildPartialAnalysisPayload` (cas données insuffisantes) renvoie `strategicAnalysis: null` + un `liveContext` minimal (sans `scoreImpact`).

### Stockage

- Position ouverte : `mtp_positions.score` + `mtp_positions.analysis_snapshot` (JSON complet)
- Trade clos : `mtp_trades.score` + `mtp_trades.analysis_snapshot`
- Feedback bucket : `mtp_trade_feedback.bucket_key` = `${setup}|${direction}|${regime}|${asset_class}`

`analysis_snapshot` contient désormais `strategicAnalysis` et `liveContext` (additif, ne casse pas l'existant).

### Affichage front

- Carte opportunités : ring = `safetyScoreFrom(item)` → `plan.safetyScore` brut (composite, inchangé)
- Fiche détail : `plan.safetyScore`, `plan.exploitabilityScore`, `plan.finalScore` (composite, inchangé)
- Tri opportunités : `safetyScore > dossierScore > actionScore` (helper `sorter` dans `assets/app.js`)
- **Adaptation front à venir** (PR séparée) : afficher `strategicAnalysis.score` à côté du composite pour montrer la valeur stable + un badge "Impact live" basé sur `liveContext.scoreImpact.delta`.

---

## Régime macro

### Flux

1. `kvGet("market:regime", env)` — cache 1 h
2. Si cache vide, calcul via `getCandlesBySymbol("SPY", "1d", 90)`, `QQQ`, `TLT` → `detectMarketRegime`
3. Retourne `{ regime: "RISK_ON" | "RISK_OFF" | "RANGE", reason, spySignal, qqqSignal, tltSignal, updatedAt }`

### Utilisé pour

- `regimeBonus` (±5 pts dans `calcDetailScore`)
- Affichage dans la fiche détail
- Bucket d'apprentissage (`regime_at_open`)

### Risque

- Bougies SPY/QQQ/TLT du jour pas clôturées → régime peut osciller en cours de journée
- Pas de seuil de confidence : un signal mixte peut basculer le régime

---

## News + signal Claude

### News sentiment (niveau 2)

- Source : CryptoPanic (crypto) ou Alpha Vantage News (stocks)
- Cache : 30 min
- Champs : `source, sentiment, classification, articleCount, topHeadline`

### Signal Claude (niveau 3)

- `enrichNewsContextWithClaude` : appel API Anthropic sur 1 article top si classification=neutral
- Cache 6 h par URL hash
- Retourne `claudeSignal: { direction, confidence, reason }`

### Kill switch Claude

- `getClaudeNewsKillSwitchWeight` lit les 200 derniers trades feedback **filtrés par `quality`**
- Calcule le win rate des 30 derniers trades high-confidence Claude
- Retourne un poids 0–8 selon win rate :
  - ≥ 55 % → 8 pts max
  - 45–55 % → 4 pts
  - 35–45 % → 2 pts
  - < 35 % → 0
- Cache 1 h mémoire

### AI Context Review

- Appel Claude payant (quota géré par `reserveAiQuota`)
- Activé conditionnellement (decision="Trade propose", score≥78, etc.)
- Retourne `aiModifier.delta ∈ [-5, +5]` appliqué au `safetyScore`

---

## Apprentissage (buckets)

### Flux

1. À la fermeture d'un trade : `captureTradeFeedback` écrit dans `mtp_trade_feedback`
2. `tradeValidationEngine` tag `quality: ok | suspect | invalid` sur `mtp_trades` ET `mtp_trade_feedback`
3. Toutes les lectures analytiques filtrent `or=(quality.eq.ok,quality.is.null)`
4. Agrégation par `bucket_key`
5. `loadLearningContextForScan` charge les stats à chaque scan
6. `applyLearningMalus` retire jusqu'à 8 pts au score si bucket mature (≥ 20 trades) ET expectancy < 0

### Tables Supabase impliquées

- `mtp_trade_feedback` : ligne par trade clos avec MAE/MFE, news_context, bucket_key, quality
- `mtp_trades` : trade clos historique
- `mtp_engine_adjustments` : règles correctives 1-6 activées par `aggregateFeedbackBuckets`

### Risque

- Trades historiques pré-migration 016 ont `quality = NULL` → traités comme `ok` par défaut. Inclut potentiellement des trades buggés (faux stop ASML par ex). Pas de backfill automatique.

---

## Cohérence inter-écrans

| Écran A | Écran B | Risque de divergence | Mitigation actuelle |
|---|---|---|---|
| Carte opportunité | Fiche actif (même symbole) | Score différent si cron a tourné entre les 2 affichages | Aucune. `snapshotId` non fait. |
| Liste opportunités | Mes Trades (position ouverte) | Prix live différent si caches désynchronisés | `market:snapshot:${symbol}` partagé entre les 2 endpoints |
| Fiche détail | Modal "Confirmer le trade" | OK, même payload | — |

---

## Devises et FX

- Helper `getCurrencyForSymbol` (côté worker) — devise de cotation du listing primaire
- Helper front `currencyForSymbol` (côté `assets/app.js`) — miroir
- Conversion EUR ↔ USD : `fxRateUsdToEur` dans `assets/app.js`, avec fallback hardcodé `0.92` si Yahoo plante (**risque documenté**)
- Autres devises (CHF, GBP, SEK, NOK, DKK) : conversion approximative via taux statiques `FX_TO_EUR`

Garde-fou anti-mismatch : si la devise d'un live quote ≠ devise de l'entry d'une position, `trainingCloseTrigger` retourne `null` (skip ce cycle) au lieu de comparer 1367 EUR à 1456 USD comme la même valeur.

---

## Non encore fait

- **Séparation `strategicScore` (stable, bougies clôturées) vs `liveContext` (volatile, prix actuel)** : le score actuel mélange les deux. Conséquence : score qui clignote au refresh, apprentissage faussé. Prévu en vague A.1.
- **`snapshotId` propagé** : aucun identifiant de scan n'est exposé. La fiche détail ne sait pas si elle voit le même snapshot que la carte opp. Prévu en vague B.4.
- **Timestamps complets** : seul `quotedAt` est porté. `scoreCalculatedAt`, `candlesUpdatedAt`, `planGeneratedAt`, `newsUpdatedAt` ne sont pas exposés. Prévu en vague B.5.
- **`quoteQualityEngine`** : aucune validation systématique d'âge max, d'écart inter-providers, de devise explicite. Prévu en vague B.6.
- **`fxEngine` unifié** : pas d'helper unique `convert(amount, from, to, asOf)`. Le code dispersé multiplie par `fxRateUsdToEur()` à plusieurs endroits. Prévu en vague C.7.
- **`originalCurrency` + `convertedCurrency` sur trades/positions** : pas exposés systématiquement. Capital base toujours stocké en USD. Prévu en vague C.8-9.

---

## Limites de fiabilité

- Les durées de cache citées sont prises du code actuel mais peuvent être ajustées par un commit non documenté ici. À recroiser avec `cloudflare-worker/worker.js` si doute.
- Les écrans front décrits sont les routes actuelles documentées dans `assets/app.js`. Toute nouvelle route doit être ajoutée à `ARCHITECTURE.md` et à ce fichier.
