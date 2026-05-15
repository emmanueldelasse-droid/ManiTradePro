# DATA_PIPELINE — Flux de données par écran

> **Référence pour comprendre ce qui s'affiche, d'où ça vient, et ce qui peut diverger.**
> Toute évolution de provider, cache ou TTL doit être reflétée ici **avant** le merge.
> Dernière vérification : 2026-05-15, après PR #158.

---

## Principe général

L'app n'a **qu'une seule règle** : séparer ce qui doit être stable (analyse) de ce qui peut bouger (live).

- **STABLE** : tout ce qui se calcule sur des bougies clôturées (EMA, RSI, ATR, score sûreté). Ne doit pas changer entre deux refresh.
- **LIVE** : le prix actuel, le change 24h, le delta vs stop/TP. Volatile par définition.

Aujourd'hui (mai 2026), cette séparation n'est PAS encore stricte côté worker : le `score` actuel mélange les deux. C'est la vague A.1 en cours (cf. SESSION.md). En attendant, **chaque donnée affichée doit avoir un timestamp et une source visibles**.

---

## Prix live d'une action ou crypto

### Flux

1. Le worker reçoit `GET /api/opportunities` ou `GET /api/opportunity-detail/:symbol`
2. `resolveUnifiedMarketQuote(symbol, env)` ou Phase 1 batch dispatch → routage par devise (cf. PROVIDERS_MATRIX.md)
3. La quote retournée porte les champs : `price, currency, sourceUsed, freshness, quotedAt`
4. Stockée en cache mémoire `market:snapshot:${symbol}` pour 2 min
5. Renvoyée au front via le payload

### Cas par type d'actif

#### Crypto (BTC, ETH, SOL, ...)
- **Source** : Binance `api.binance.com/api/v3/ticker/24hr`
- **Cache** : 30 s mémoire
- **Devise** : USD (USDT)
- **Freshness affichée** : `live`
- **Utilisé pour** : prix affiché, calcul P&L position ouverte, déclenchement stop/TP
- **NON utilisé pour** : score stratégique (basé bougies daily)
- **Risque connu** : si Binance est rate-limité ou tombe, aucun fallback. Symbole sortira en partial.

#### Actions US (AAPL, NVDA, ...)
- **Source primaire** : EODHD `/real-time/AAPL.US` (temps réel sur plan All World Extended)
- **Fallback 1** : Yahoo v8 chart `query1.finance.yahoo.com/v8/finance/chart/AAPL`
- **Fallback 2** : Twelve `/quote`
- **Cache** : 2 min mémoire (`market:snapshot:AAPL`)
- **Devise** : USD
- **Freshness** : `live` (EODHD US RT et Yahoo v8) ou `delayed_15m` (Twelve)
- **Utilisé pour** : prix, P&L, stop/TP
- **NON utilisé pour** : score stratégique
- **Risque connu** : EODHD quota peut être atteint en fin de mois si nombreux scans → bascule sur Yahoo (toujours OK actuellement)

#### Actions Europe (LVMH, RMS, AIR, SAP, ASML, ...)
- **Source primaire** : Yahoo v8 chart (Yahoo donne le temps réel sur Euronext, Xetra, etc.)
- **Fallback 1** : EODHD `/real-time` (différé 15 min sur EU sur plan All World Extended — pas Real-Time Plus)
- **Fallback 2** : Twelve
- **Cache** : 2 min mémoire
- **Devise** : EUR (calculée via `getCurrencyForSymbol`)
- **Freshness** : `live` (Yahoo) ou `delayed_15m` (EODHD/Twelve)
- **Utilisé pour** : prix affiché, P&L position ouverte (si stop/TP en EUR)
- **NON utilisé pour** : score stratégique
- **Risque connu** : Yahoo rate-limit possible si trop d'appels individuels — la Phase 1 du scan utilise un batch v7 pour minimiser ce risque

#### Actions Suisse (NESN, ROG.SW, UBSG.SW)
- Comme actions EU mais **devise CHF**
- Bourse SIX, horaires 09:00–17:30 CET
- EODHD `/real-time` souvent vide hors heures → fallback Yahoo systématique

#### Actions UK (HSBA.L, ULVR.L)
- Comme actions EU mais **devise GBP**
- Bourse LSE, horaires 08:00 GMT → 09:00 Paris (CET), close 16:30 GMT → 17:30 Paris
- Suffixe Yahoo `.L`, suffixe EODHD `.LSE` — traduction automatique dans `normalizeEodhdSymbol`

#### Forex (EURUSD, GBPUSD, ...)
- **Source primaire** : Twelve `/quote` avec symbole `EUR/USD`
- **Fallback** : Yahoo `EURUSD=X`, Alpha Vantage `CURRENCY_EXCHANGE_RATE`
- **Cache** : 60 min mémoire
- **Devise** : devise de cotation (slice 3-6 du symbole)
- **Horaires** : 24h/24 Lun-Ven, ferme dim. 22h UTC, reouvre dim. 22h UTC

#### Commodities (GOLD, SILVER, OIL)
- **Source** : Twelve `/quote` (`XAU/USD`, `BRENT`, ...) ou Yahoo (`GC=F`, `SI=F`, `CL=F`)
- **Cache** : 60 min
- **Horaires** : CME, 23h–22h UTC Lun-Ven avec pause 22-23h

---

## Bougies daily (analyse technique)

### Flux
`getCandlesBySymbol(symbol, "1d", limit, env, ctx)` (worker.js L1812)

1. Crypto → `getCryptoCandlesTf` (Binance `/klines`, cache 5 min)
2. Non-crypto + timeframe daily/weekly + EODHD configuré → `getEodhdCandlesWithKV` (cache KV 12h)
3. Sinon ou si EODHD KO → `getTwelveCandlesWithKV` (cache KV 12h)
4. Sinon ou si Twelve KO sur daily/weekly → fallback Yahoo `getYahooCandles`

### Détails
- **Source primaire** : EODHD `/eod/${symbol}.EXCH` (jusqu'à 1000 bougies, format aligné Twelve/Yahoo)
- **Cache KV** : `candles:eodhd:${symbol}:1d` pendant 12 h (TTL `KV_TTL.candlesDaily`)
- **Devise** : devise locale de la bourse (les bougies EODHD sont dans la devise du listing demandé)
- **Utilisé pour** : EMA, RSI, ATR, Donchian, score stratégique, indicateurs régime (SPY/QQQ/TLT)
- **Risque connu** : bougie du jour pas encore clôturée → certains calculs (distance EMA20) peuvent dériver. Cf. vague A.1 en cours.

### Bougies 4h / 1h
- EODHD ne couvre PAS l'intraday sur le plan All World Extended
- Source primaire : Twelve Data `/time_series` avec `interval=4h` ou `1h`
- Cache KV 2 h (`KV_TTL.candles4h`) ou 30 min (`KV_TTL.candles1h`)

---

## Score stratégique (sûreté + exploitabilité)

### Flux actuel
1. `calcDetailScore(quote, candles, regime, env, regimeIndicators, newsContext, claudeWeight, learningContext)` (worker.js L2499)
2. Calcul 6 composantes pondérées :
   - structure 24 %
   - momentum 20 % (inclut `quote.change24hPct` → LIVE)
   - timing 20 %
   - risk 18 % (inclut `quote.change24hPct` → LIVE)
   - context 10 %
   - dataQuality 8 %
3. Applique modulateurs : `-regimeMalus +regimeBonus +newsBonus -learningMalus`
4. Si `aiContextReview` actif : applique `aiModifier.delta`
5. `safetyScore` (worker.js L1982) recompose : 0.34×decision + 0.24×exploitability + 0.14×entry + 0.14×risk + 0.08×context + 0.06×dataQuality

### Stockage
- Position ouverte : `mtp_positions.score` + `mtp_positions.analysis_snapshot` (JSON complet)
- Trade clos : `mtp_trades.score` + `mtp_trades.analysis_snapshot`
- Feedback bucket : `mtp_trade_feedback.bucket_key` (= `${setup}|${direction}|${regime}|${asset_class}`)

### Affichage front
- Carte opportunités : ring = `safetyScoreFrom(item)` → `plan.safetyScore` brut (PR #153)
- Fiche détail : `plan.safetyScore`, `plan.exploitabilityScore`, `plan.finalScore`
- Tri opportunités : `safetyScore > dossierScore > actionScore` (app.js L2791)

### Risque connu — VAGUE A.1 EN COURS
> Le score actuel mélange composantes stables et live → bouge à chaque refresh, pollue l'apprentissage. La séparation `strategicScore` (stable) vs `liveContext` (volatile) est planifiée mais pas encore livrée. Voir KNOWN_ISSUES.md.

---

## Régime macro

### Flux
1. `kvGet("market:regime", env)` — cache 1 h
2. Si cache vide, calcul via `getCandlesBySymbol("SPY", "1d", 90)`, `QQQ`, `TLT` → `detectMarketRegime` (worker.js)
3. Retourne `{ regime: "RISK_ON" | "RISK_OFF" | "RANGE", reason, spySignal, qqqSignal, tltSignal, updatedAt }`

### Utilisé pour
- `regimeBonus` (±5 pts dans `calcDetailScore`)
- Affichage dans la fiche détail "Régime : Risk-On · SPY et QQQ en tendance haussière"
- Bucket d'apprentissage (`regime_at_open`)

### Risque connu
- Bougies SPY/QQQ/TLT du jour pas clôturées → régime peut osciller en cours de journée
- Pas de seuil de confidence : un signal mixte peut basculer le régime

---

## News + signal Claude

### News sentiment (niveau 2)
- Source : CryptoPanic (crypto) ou Alpha Vantage News (stocks)
- Cache : 30 min (`cache:newsContext:${symbol}`)
- Champs : `source, sentiment, classification, articleCount, topHeadline`

### Signal Claude (niveau 3)
- `enrichNewsContextWithClaude` : appel API Anthropic sur 1 article top si classification=neutral
- Cache 6 h par URL hash (évite de re-payer Claude pour les mêmes articles)
- Retourne `claudeSignal: { direction, confidence, reason }`

### Kill switch Claude
- `getClaudeNewsKillSwitchWeight` (worker.js L7080) lit les 200 derniers trades feedback **filtrés par `quality`** (PR #158)
- Calcule le win rate des 30 derniers trades high-confidence Claude
- Retourne un poids 0–8 selon win rate :
  - ≥ 55 % → 8 pts max
  - 45–55 % → 4 pts
  - 35–45 % → 2 pts
  - < 35 % → 0
- Cache 1 h mémoire

### AI Context Review
- Appel Claude payant (quota géré par `reserveAiQuota`)
- Activé si : decision=`Trade propose` + sources≥1, OR `tradeNow` + sources≥1, OR score≥78, OR (score=`A surveiller` + sources≥2 + articles≥1)
- Retourne `aiModifier.delta ∈ [-5, +5]` appliqué au `safetyScore`

### Risque connu
- Les news Yahoo / Alpha Vantage peuvent être périmées (cache 30 min de leur côté + 30 min de notre côté = retard possible)
- Claude API peut être down ou rate-limité → `aiContextReview` skip silencieusement

---

## Apprentissage (buckets)

### Flux
1. À la fermeture d'un trade : `captureTradeFeedback` (worker.js L4997) écrit dans `mtp_trade_feedback`
2. `tradeValidationEngine` (PR #157) tag `quality: ok | suspect | invalid` sur les rows `mtp_trades` ET `mtp_trade_feedback`
3. Toutes les lectures analytiques filtrent `or=(quality.eq.ok,quality.is.null)` (PR #158)
4. Agrégation par `bucket_key = ${setup}|${direction}|${regime}|${asset_class}`
5. `loadLearningContextForScan` charge les stats à chaque scan
6. `applyLearningMalus` retire jusqu'à 8 pts au score si bucket mature (≥ 20 trades) ET expectancy < 0

### Tables Supabase impliquées
- `mtp_trade_feedback` : ligne par trade clos avec MAE/MFE, news_context, bucket_key, quality
- `mtp_trades` : trade clos historique
- `mtp_engine_adjustments` : règles correctives 1-6 activées par `aggregateFeedbackBuckets`

### Risque connu
- Trades historiques pré-migration 016 ont `quality = NULL` → traités comme `ok` par défaut. Inclut potentiellement des trades buggés (faux stop ASML par ex). Pas de backfill automatique pour ne pas perdre tout l'historique.

---

## Cohérence inter-écrans

| Écran A | Écran B | Risque de divergence | Mitigation actuelle |
|---|---|---|---|
| Carte opportunité | Fiche actif (même symbole) | Score différent si cron a tourné entre les 2 affichages | Aucune. À traiter en vague B.4 (`snapshotId`) |
| Liste opportunités | Mes Trades (position ouverte) | Prix live différent si caches désynchronisés | `market:snapshot:${symbol}` partagé entre les 2 endpoints (PR #135) |
| Fiche détail | Plan de trade dans modal "Confirmer le trade" | OK, même payload | — |

---

## Devises et FX

- Helper `getCurrencyForSymbol(symbol)` (worker.js L1078) — devise de cotation du listing primaire
- Helper front `currencyForSymbol(symbol)` (app.js L863) — miroir
- Conversion EUR ↔ USD : `fxRateUsdToEur` (app.js L854), avec fallback hardcodé `0.92` si jamais Yahoo plante (**RISQUE** — cf. KNOWN_ISSUES.md)
- Autres devises (CHF, GBP, SEK, NOK, DKK) : conversion approximative via taux statiques `FX_TO_EUR` (app.js L887)

Garde-fou anti-mismatch (PR #143) : si la devise d'un live quote ≠ devise de l'entry d'une position, `trainingCloseTrigger` retourne `null` (skip ce cycle) au lieu de comparer 1367 EUR à 1456 USD comme la même valeur.
