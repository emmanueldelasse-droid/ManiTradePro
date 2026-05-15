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

### Point d'entrée unique — `resolveLiveQuote` (vague B.7, mai 2026)

Toute résolution de prix live destinée à l'affichage ou aux décisions trading passe par **une seule fonction** : `resolveLiveQuote(symbol, env, ctx, options)` dans `cloudflare-worker/worker.js`. Tous les endpoints concernés :
- `/api/opportunities` (Phase 1 batch + Phase 2 fallback unitaire)
- `/api/opportunity-detail/:symbol` (via `buildStableMarketPayload`)
- `/api/market-snapshot/:symbol`
- `/api/quotes/:symbol` et `/api/quotes?symbols=`
- futur : trades ouverts, alertes prix, TP/SL live, broker réel

**Cascade de lecture** (dans `resolveLiveQuote`) :
1. **Cache mémoire local** `market:snapshot:${symbol}` (TTL 2 min non-crypto, 30 s crypto) — intra-worker
2. **Cache KV partagé** `kv:livequote:${symbol}` (TTL effectif 30 s, KV ttl 60 s imposé par Cloudflare) — **cross-worker** ← résout le bug "deux prix différents entre opp et fiche"
3. **Cascade providers** via `resolveUnifiedMarketQuote` (Yahoo, EODHD, Twelve, etc.)

**Filet ultime — snapshot EOD (`getStoredDailyQuoteFallback`)** :

Quand `resolveLiveQuote` échoue (tous providers KO, KV indispo, etc.), `handleOpportunities` Phase 2 tente un dernier filet : `getStoredDailyQuoteFallback(symbol, env)` qui retourne la dernière bougie quotidienne stockée en KV avec `sourceUsed: "snapshot"` et `freshness: "eod"`. Utile en cas de weekend / jour férié / panne provider prolongée.

**Important (vague B.7.1, mai 2026)** : `getStoredDailyQuoteFallback` est strictement un **filet ultime, jamais une source prioritaire**. L'ordre des fallbacks dans Phase 2 est :
1. `quotesMap[symbol]` (Phase 1 batch)
2. cache mémoire `market:snapshot:${symbol}`
3. `resolveLiveQuote` (cascade mémoire / KV / providers live)
4. `getStoredDailyQuoteFallback` (snapshot EOD veille — uniquement si tout le live a échoué)
5. partial/unavailable

Avant B.7.1, l'étape 4 venait avant l'étape 3 → la liste opportunités pouvait servir un prix EOD périmé tandis que la fiche actif (qui appelait `resolveLiveQuote` directement) servait un prix `delayed_15m` plus frais. Bug résolu en inversant l'ordre.

**Écriture** :
- Mémoire locale (via `resolveUnifiedMarketQuote`)
- KV (best-effort, ne bloque pas si KV indispo)
- Phase 1 batch de `/api/opportunities` écrit aussi en KV après chaque résolution pour que la fiche actif sur un autre worker retrouve le même prix

**Format normalisé garanti** : `symbol`, `assetClass`, `currency`, `sourceUsed`, `freshness`, `quotedAt` toujours présents (defaults explicites si le provider les omet).

**Fallback KV indisponible** : `kvGet`/`kvSet` retournent silencieusement `null`/`false` si `env.MTP_CACHE` manquant. La cascade providers prend le relais sans erreur.

**Limite TTL** : Cloudflare KV impose `ttl >= 60 s`. On stocke un `cachedAt` dans la valeur et on invalide côté lecture si `Date.now() - cachedAt > 30 000` ms.

**Coût KV** :
- ~1 read par requête utilisateur (cache mémoire en miss)
- ~1 write par résolution provider (cache KV en miss)
- Phase 1 batch d'un scan opp (~50 actifs) = ~50 writes par scan, cron toutes les 10 min ≈ ~7 200 writes/jour
- Plan paid Cloudflare KV : 1M reads + 1M writes/mois → marge confortable

**Exception (chemin parallèle volontaire)** : `validateSymbolOnProviders` (validation à l'ajout d'un actif via POST `/api/user-assets`) court-circuite `resolveLiveQuote` pour tester chaque provider individuellement. Pas d'affichage, donc pas de problème de cohérence.

### Flux (héritage)

1. Le worker reçoit `GET /api/opportunities` ou `GET /api/opportunity-detail/:symbol`
2. `resolveLiveQuote(symbol, env, ctx)` → cascade mémoire / KV / providers
3. La quote retournée porte : `price, currency, sourceUsed, freshness, quotedAt`
4. Stockée en cache mémoire `market:snapshot:${symbol}` pour 2 min (intra-worker)
5. Stockée en cache KV `kv:livequote:${symbol}` pour 30 s effectif (cross-worker)
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

`strategicAnalysis.score` est **conçu pour être stable** entre deux clôtures de bougies sur les entrées live directes (prix, volume, freshness). Avec la vague B.4 (`snapshotId`), on peut maintenant **détecter** les recalculs (changement de candles, de régime ou de learning) en comparant deux `snapshotId`. La stabilité absolue reste conditionnée au fait que le provider n'ait pas inclus une bougie daily encore ouverte. `liveContext` est la source de vérité unique pour les valeurs volatiles directes.

Plumberie :
- `buildStablePayload` (`cloudflare-worker/worker.js`) propage `strategicAnalysis`, `liveContext`, `snapshotId` et les 4 timestamps analytiques du `scored` au payload de fiche.
- `toOpportunityRow` (`cloudflare-worker/worker.js`) propage tous ces objets/champs dans chaque row de `/api/opportunities`.
- `buildPartialAnalysisPayload` (cas données insuffisantes) renvoie `strategicAnalysis: null`, un `liveContext` minimal (sans `scoreImpact`), un `snapshotId` calculé sur les sources disponibles (typiquement `symbol + regimeUpdatedAt`), et `strategicCalculatedAt = nowIso()`.

### Cohérence analytique via snapshotId (vague B.4, mai 2026)

Chaque payload retourné par `/api/opportunities` et `/api/opportunity-detail/:symbol` porte maintenant un **`snapshotId`** déterministe.

**Définition** : hash FNV-1a 8 chars hex calculé par `buildSnapshotId({ symbol, timeframe, analysisType, candlesAt, regimeAt, learningAt })`. Inputs analytiques uniquement, **aucun input live**.

**Garanties** :
- Deux analyses avec mêmes candles + même régime + même learning ⇒ même `snapshotId`
- Le prix live qui change ne modifie PAS le `snapshotId`
- Une nouvelle bougie daily ⇒ `snapshotId` différent
- Un nouveau régime macro ⇒ `snapshotId` différent
- Un nouveau learning snapshot ⇒ `snapshotId` différent

**Ce qu'il N'EST PAS** : ce n'est pas un timestamp live, ni une cache key, ni un tradeId, ni un userId. C'est un identifiant de cohérence analytique.

**Usages préparés (PRs futures)** :
- Badge UI "recalcul détecté" si `card.snapshotId !== detail.snapshotId`
- Badge "stale" si `strategicCalculatedAt` trop ancien
- Refresh intelligent côté front (ne pas re-fetcher si le snapshot n'a pas bougé)
- Blocage auto-cycle sur incohérence analytique
- Audit learning (corréler les trades ouverts au snapshot d'analyse utilisé)
- Validation broker réel (preuve que le signal n'a pas dérivé entre l'analyse et l'exécution)

### Timestamps analytiques (vague B.4)

À côté du `snapshotId`, 4 timestamps analytiques sont exposés à la racine du payload **et** dans `strategicAnalysis` :

| Champ | Source | Signification |
|---|---|---|
| `strategicCalculatedAt` | `nowIso()` à l'exécution de `calcDetailScore` | Quand l'analyse a tourné |
| `candlesUpdatedAt` | `candles[length-1].time` | Timestamp de la dernière bougie utilisée |
| `regimeUpdatedAt` | `regime.updatedAt` (rempli par `detectMarketRegime`) | Quand le régime macro a été calculé |
| `learningSnapshotAt` | `learningContext.computedAt` (rempli par `loadLearningContextForScan`) | Quand le `learningContext` a été pré-fetché |

Ces timestamps sont strictement analytiques. **Aucun timestamp live** (`quotedAt`, `freshness`) n'est intégré dans ce groupe — le côté live continue d'être exposé séparément dans `liveContext`.

### Quality engine de la quote live (vague B.6, mai 2026)

`liveContext.quoteQuality` — objet produit par `quoteQualityEngine(quote, candles, options)` (synchrone, sans I/O). Diagnostic structuré de la qualité de la quote utilisée pour l'affichage live et les futurs branchements broker réel.

**Structure** :
```
liveContext.quoteQuality = {
  trustScore,            // 0-100, agrégat indicatif
  stale,                 // bool — quote trop vieille en heures de marché
  delayed,               // bool — provider légalement différé
  marketClosed,          // bool — week-end / hors fenêtre / jour férié
  abnormalSpread,        // bool — livePrice trop éloigné de lastClose (en ATR)
  currencyMismatch,      // bool — quote.currency ≠ devise attendue
  providerConfidence,    // "high" | "medium" | "low" | "unsafe"
  executionSafe,         // bool — peut servir à valider entrée / TP/SL
  validationStatus,      // "valid" | "stale" | "delayed" | "market_closed" |
                         //   "unsafe" | "currency_mismatch" | "abnormal_spread"
  reasons,               // string[] — liste explicite des flags actifs
  // metadata debug/audit
  ageSec,                // age en secondes (ou null)
  spreadDeltaAtr,        // écart en multiples d'ATR (ou null)
  expectedCurrency,      // devise attendue (résolue depuis le symbole)
  quoteCurrency          // devise déclarée par la quote
}
```

**Règles de détection** :

| Flag | Règle |
|---|---|
| `stale` | crypto : âge > 120 s ; quote `delayed` : âge > 1800 s ; quote live : âge > 600 s ; OU `freshness === "stale"`. **(B.6.1 — `delayed` calculé AVANT `stale` pour adapter le seuil)** |
| `delayed` | `freshness` contient "delayed" ou "recent" ; OU `sourceUsed` ∈ {alphavantage} (calculé en premier depuis B.6.1) |
| `marketClosed` | crypto → jamais ; forex → fermé week-end UTC ; stock/etf → week-end OU jour férié OU hors fenêtre UTC par devise (USD 13:00-21:30, EUR/CHF/GBP 07:00-16:30) |
| `abnormalSpread` | `|livePrice - lastClose| / ATR > 3` (5 pour crypto) sur 14 bougies |
| `currencyMismatch` | `quote.currency` absent OU ≠ `getCurrencyForSymbol(symbol)` |
| `providerConfidence` | binance / eodhd real-time / yahoo live → high ; eodhd delayed / yahoo non-live / twelve / alpha → medium ; sourceUsed vide → unsafe |
| `executionSafe` | `false` si `no_price` OU `stale` OU `currencyMismatch` OU `abnormalSpread` OU `providerConfidence === "unsafe"` |

**`marketClosed` ET `delayed` n'empêchent PAS `executionSafe`** par eux-mêmes — c'est volontaire : ils contraignent l'usage (pas d'exécution si marché fermé), mais n'invalident pas la quote en tant que telle.

**Ce que `quoteQualityEngine` N'EST PAS** :
- Ne décide pas du scoring stratégique (séparé)
- ~~Ne pilote pas encore le paper trading~~ → **branché dans l'auto-cycle depuis la vague B.9** via `evaluateExecutionSafety` (cf. section ci-dessous)
- ~~Ne bloque pas encore l'auto-cycle (à brancher dans une PR future)~~ → **fait depuis B.9**

### Safety gate execution (vague B.9, mai 2026)

`evaluateExecutionSafety(payload)` — helper synchrone qui consomme `payload.liveContext.quoteQuality` et retourne `{safe, code, human, missing}`. Utilisé par `handleTrainingAutoCycle` pour bloquer toute action automatique sur une quote unsafe.

**Règle de décision** :
```
quoteQuality absent ou non-objet  → safe=false, code="quote_quality_missing", missing=true
quoteQuality.executionSafe===true → safe=true,  code="ok"
currencyMismatch                  → safe=false, code="currency_mismatch"
stale                             → safe=false, code="stale"
abnormalSpread                    → safe=false, code="abnormal_spread"
providerConfidence==="unsafe"     → safe=false, code="provider_unsafe"
reasons.includes("no_price")      → safe=false, code="no_price"
executionSafe===false (fallback)  → safe=false, code="quote_unsafe"
```

`delayed` et `marketClosed` ne déclenchent JAMAIS de blocage par eux-mêmes — c'est conforme à la règle B.6 (informatifs, pas bloquants).

**Points d'application dans `handleTrainingAutoCycle`** :
1. **Phase ouverture** (avant `openTrainingPositionFromRow`) : si `!safe` → skip candidat, log `auto_open_blocked_unsafe`, `log.skipped.push({reason: "quote_unsafe:<code>", human})`
2. **Phase fermeture** (avant `trainingCloseTrigger`) : si `!safe` → skip position pour ce cycle, log `auto_close_blocked_unsafe`. Le tracker MAE/MFE (`position.live.highSinceOpen/lowSinceOpen`) continue d'être mis à jour, donc l'info de breach intraday n'est pas perdue ; le close se rejoue au cycle suivant dès que la quote redevient fiable.

**Périmètre** : aucune autre modif (scoring, RR, providers, learning, strategicAnalysis intacts). Aucun front modifié. Le mode manuel UI (futur ou existant) n'est PAS gated par défaut — l'utilisateur reste souverain.

### Observabilité — route admin `safety-stats` (vague B.9.1, mai 2026)

`GET /api/training/safety-stats` (admin) — agrégateur lecture seule des événements `auto_open_blocked_unsafe` + `auto_close_blocked_unsafe` dans `mtp_training_events`. Pas de nouvelle table, pas de cache complexe, pas de cron supplémentaire.

Query params :
- `windowHours` (défaut 24, max 720) — fenêtre d'agrégation
- `limit` (défaut 20, max 100) — taille de `recentEvents`

Réponse : `{ generatedAt, windowHours, cutoffAt, totals:{openBlocked, closeBlocked}, byCode, topSymbols, recentEvents, truncated }`.

`byCode` pré-rempli à 0 pour les 7 codes connus (`stale`, `currency_mismatch`, `abnormal_spread`, `provider_unsafe`, `no_price`, `quote_unsafe`, `quote_quality_missing`) → réponse déterministe même fenêtre vide. Codes inattendus exposés tels quels (forward-compat).

`truncated: true` si on a atteint le hard cap 2000 rows Supabase → réduire `windowHours` ou paginer côté admin.
- N'est pas une logique de comparaison inter-providers (un seul provider par quote)

**Périmètre** : injecté dans `liveContext.quoteQuality` à 3 endroits :
1. `calcDetailScore` success path
2. `calcDetailScore` early-return (données insuffisantes)
3. `buildPartialAnalysisPayload` (cas quote disponible mais analyse partielle)

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

### Affichage diagnostic prix live (vague B.8, mai 2026)

Le front lit (sans recalculer) `liveContext.quoteQuality` + `sourceUsed` / `freshness` / `quotedAt` pour rendre visible la qualité de la quote :

**Liste opportunités** :
- Une ligne courte sous le prix (`quoteQualitySummaryLine(item)`) : `EODHD · différé 15 min · fiable`, `Snapshot EOD · dernier prix disponible`, `Twelve Data · live · périmé · ne pas utiliser`, etc.
- Un badge dans la zone de tags (`quoteQualityState(item)`) : « Live fiable » / « Différé · fiable » / « Marché fermé » / « Dernier prix dispo » / « Prix périmé » / « Prix non fiable » / « Devise incohérente » / « Écart anormal » / « Prix indisponible ».

**Fiche actif** : carte « Qualité du prix » (`renderQuoteQualityCard`) — Source, Fraîcheur, Heure quote (FR `JJ/MM/AAAA HH:mm`), Qualité (`trustScore`/100), Utilisable (`executionSafe`), Statut (`validationStatus` traduit), chips `reasons[]` si présentes.

**Tons de couleur (priorité décroissante)** :
1. `currencyMismatch` → rouge
2. `stale` → rouge
3. `providerConfidence === "unsafe"` → rouge
4. `abnormalSpread` → rouge
5. `price` absent → rouge
6. `sourceUsed === "snapshot"` ou `freshness === "eod"` → orange (warn) → libellé « Snapshot EOD » ou « Dernier prix dispo », jamais "live"
7. `marketClosed` → neutre/informatif
8. `delayed` → neutre/informatif (NON présenté comme erreur)
9. `executionSafe === true` → vert

**Règle absolue** : le front lit, formatte, n'a jamais de logique métier ni de calcul de score. Toute la matrice de décision reste dans `quoteQualityEngine` côté worker (vague B.6 / B.6.1).

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
