# ARCHITECTURE — État réel du projet

## Explication simple

Ce fichier décrit **comment l'application est organisée** : front, worker, base de données, caches, déploiement. C'est la carte du projet pour comprendre où le code vit et comment les pièces s'emboîtent.

---

## Vue d'ensemble

ManiTradePro est une PWA vanilla JS (front) + Cloudflare Worker (back) + Supabase (base Postgres). Pas de framework, pas de bundler. Tout est servi en clair depuis GitHub Pages.

```
┌────────────┐    HTTPS     ┌──────────────────────┐    PostgREST    ┌────────────┐
│ iPhone /   │─────────────►│ Cloudflare Worker    │────────────────►│ Supabase   │
│ Mac PWA    │   /api/*     │ ~9800 lignes JS      │                 │ Postgres   │
│ (GH Pages) │              │ + KV namespace       │                 │            │
└────────────┘              └──────────────────────┘                 └────────────┘
                                       │
                            ┌──────────┼──────────┐
                            ▼          ▼          ▼
                       ┌─────────┐┌─────────┐┌─────────┐
                       │ Binance ││ EODHD   ││ Yahoo   │
                       │ (crypto)││ (eod+rt)││ (live)  │
                       └─────────┘└─────────┘└─────────┘
                                       │
                            ┌──────────┼──────────┐
                            ▼          ▼          ▼
                       ┌─────────┐┌─────────┐┌─────────┐
                       │ Twelve  ││ Alpha V ││ Claude  │
                       │ (filet) ││ (forex) ││ (IA)    │
                       └─────────┘└─────────┘└─────────┘
```

---

## Tailles de fichiers actuelles

Mesurées le 2026-05-15 après PR #159 (`wc -l` sur la branche `claude/resume-manitradepro-MeZLc`) :

| Fichier | Lignes |
|---|---|
| `assets/app.js` | ~8 200 |
| `assets/styles.css` | ~1 830 |
| `cloudflare-worker/worker.js` | ~9 800 |
| `index.html` | 25 |
| `sw.js` | ~145 |

> Ces chiffres bougent à chaque PR. À recroiser avec `wc -l` si doute.

---

## Frontend — `assets/app.js`

Tout dans une **seule IIFE**. Pas de modules. State global `state = { ... }`. Render unique `render()` qui réécrit `app.innerHTML` à chaque fois (préservation du scroll côté `.main-content`).

### Routes principales (`state.route`)

| Route | Vue | Description |
|---|---|---|
| `dashboard` | Accueil | Synthèse jour : régime macro, top opps, alertes news |
| `opportunities` | Opportunités | Scan des actifs avec score + plan de trade |
| `asset-detail` | Fiche actif | Bougies + analyse + plan + IA + news |
| `portfolio` | Trades | Positions ouvertes + historique |
| `settings` | Réglages | Compte, alertes, paramètres bot, actifs personnalisés, à propos |

### Logique paper trading

- `state.trades.positions` (en mémoire) ← lu depuis `/api/trades/state`
- `state.trades.history` ← idem
- Ouverture manuelle : modal "Confirmer le trade" → POST `/api/trades/open`
- Auto-ouverture : déléguée au cron worker `handleTrainingAutoCycle`

### Logique synchronisation

- Polling 30 s sur dashboard / opp / detail / settings / portfolio
- Re-fetch immédiat sur `visibilitychange` quand l'onglet revient au premier plan
- localStorage : persistance offline (`mtp_trades_positions`, `mtp_trades_history`, `mtp_opportunities_snapshot_v1`)
- Service Worker `sw.js` : network-first pour `/api/*`, cache-first pour assets (cache version bumpée à chaque release UI)

### Affichage prix

- `priceDisplay(value, currency)` (dans `assets/app.js`) : affiche EUR primaire + USD en parenthèses (mode `EUR_PLUS_USD`)
- `currencyForSymbol(symbol)` miroir du worker pour les positions sans devise stockée
- Helper `quoteSourceLine(item)` : affiche "Données Yahoo (temps réel) · mis à jour il y a 30 s"
- Helpers vague B.8 (lecture seule de `liveContext.quoteQuality` produit par le worker) :
  - `quoteQualityFor(item)` → renvoie `item.liveContext.quoteQuality` ou null
  - `quoteQualityState(item)` → `{label, tone}` pour le badge compact ("Live fiable", "Différé · fiable", "Marché fermé", "Dernier prix dispo", "Prix périmé", "Prix non fiable", "Devise incohérente")
  - `quoteQualitySummaryLine(item)` → ligne courte sous le prix ("EODHD · différé 15 min · fiable", "Snapshot EOD · dernier prix disponible")
  - `quoteSourceShortLabel(src)`, `freshnessChipLabel(f)`, `formatQuotedAtFr(iso)`, `validationStatusLabel`, `reasonLabel` → traductions FR
  - `renderQuoteQualityCard(d)` → bloc « Qualité du prix » sur la fiche actif (Source / Fraîcheur / Heure quote / Qualité / Utilisable / Statut + chips reasons + footnote)

---

## Backend — `cloudflare-worker/worker.js`

Monolithique, un seul `fetch(request, env)` exporté. Toutes les routes sont des `if (url.pathname === "/api/...")` dans le handler.

### Routes API publiques (GET)

| Route | Handler | Description |
|---|---|---|
| `/api/opportunities` | `handleOpportunities` | Scan complet du panel |
| `/api/opportunity-detail/:symbol` | `handleOpportunityDetail` | Fiche actif avec bougies + analyse + AI |
| `/api/quotes` | `handleQuotes` | Quotes batch (admin) |
| `/api/quotes/:symbol` | `handleQuotes` | Quote unitaire |
| `/api/candles/:symbol` | `handleCandles` | Bougies (timeframe en query) |
| `/api/market-snapshot/:symbol` | `handleMarketSnapshot` | Quote rapide cache |
| `/api/regime-indicators` | `handleRegimeIndicators` | Fear & Greed / VIX |
| `/api/fear-greed` | `handleFearGreed` | F&G crypto |
| `/api/economic-calendar` | `handleEconomicCalendar` | Events macro |
| `/api/news-window` | `handleNewsWindow` | Garde-fou news ±30 min |
| `/api/news` | `handleNews` | Liste news consolidée |
| `/api/engine/adjustments` | `handleEngineAdjustments` | Règles correctives actives |
| `/api/engine/drift-detect` | `handleDriftDetect` | Détection dérive moteur |
| `/api/engine/observe-shadows` | `handleObserveShadows` | Shadow rules en cours |

### Routes training (admin)

| Route | Handler |
|---|---|
| `/api/training/account` | Capital, settings, équité |
| `/api/training/positions` | Positions ouvertes + historique |
| `/api/training/auto-cycle` | Trigger cron manuel |
| `/api/training/settings` | POST mise à jour des paramètres bot |
| `/api/training/feedback` | Liste feedback (lecture) |
| `/api/training/safety-stats` | (B.9.1) Agrégation lecture seule des blocages safety gate (params : `windowHours`, `limit`) |
| `/api/trades/wipe` | Effacement total (positions, trades, feedback, events) |

### Routes admin

| Route | Handler |
|---|---|
| `/api/admin/eodhd-probe/:symbol` | Diagnostic EODHD |
| `/api/admin/backfill-pnl` | Recalcul P&L historique |
| `/api/admin/backtest-*` | Backtest sur historique EODHD |

### Cron (scheduled)

`handleTrainingAutoCycle(env)` lancé toutes les ~10 min :
1. Lecture `mtp_training_settings`
2. **Phase fermeture** : pour chaque position ouverte, fetch quote, `trainingCloseTrigger` → close si stop/TP/invalidation/time_exit
3. **Phase ouverture** : si `auto_open_enabled`, lecture du dernier scan opp via `buildOpportunityRowsForTraining`, filtre via `isTrainingCandidateAllowed` (inclut le check jours fériés), ouvre via `openTrainingPositionFromRow`

---

## Modules logiques actuels (dans le monolithe)

Les "modules cibles" décrits dans le brief de refonte (`/market/`, `/trading/`, `/learning/`, `/shared/`) **ne sont pas encore extraits**. Voici la cartographie réelle des clusters logiques au sein de `cloudflare-worker/worker.js`.

### Cluster « Market data »

- `getCryptoQuote`, `getCryptoCandles`, `getCryptoCandlesTf` — Binance
- `getTwelveQuote`, `getTwelveBatchQuotes`, `getTwelveCandlesWithKV` — Twelve
- `getYahooBatchQuotes`, `getYahooQuote`, `getYahooQuoteFromChart`, `getYahooCandles` — Yahoo
- `getAlphaQuote` — Alpha Vantage
- `getEodhdRealTimeBatchQuotes`, `getEodhdCandles`, `getEodhdCandlesWithKV` — EODHD
- `resolveLiveQuote` — **point d'entrée officiel unique** pour toute résolution de prix live (vague B.7). Cascade : cache mémoire → cache KV partagé (`kv:livequote:${symbol}`, TTL effectif 30 s) → providers. Garantit cohérence cross-worker.
- `resolveUnifiedMarketQuote` — dispatcher provider (appelé en interne par `resolveLiveQuote`)
- `normalizeLiveQuote`, `readLiveQuoteFromKv`, `writeLiveQuoteToKv` — helpers B.7
- `getCandlesBySymbol` — dispatcher candles
- `getStoredDailyQuoteFallback` — snapshot fallback
- `getCurrencyForSymbol` + `MARKET_HOLIDAYS` + `isMarketHoliday`

### Cluster « Scoring + Plan »

- `calcDetailScore` — composite score 0-100 + retourne aussi `strategicAnalysis` (stable, sans live) et `liveContext` (volatil) depuis vague A.1, + `snapshotId` et 4 timestamps analytiques depuis vague B.4
- `fnv1a32`, `buildSnapshotId` — helpers vague B.4 pour l'identifiant de cohérence analytique
- `quoteQualityEngine`, `isMarketLikelyClosed`, `quoteAgeSeconds`, `providerConfidenceForSource` — helpers vague B.6 pour la validation live (synchrones, sans I/O). Injecté dans `liveContext.quoteQuality`. N'altèrent PAS `strategicAnalysis`.
- `safetyScoreFrom`, `actionabilityScoreFrom`, `dossierScoreFrom`, `decisionScoreFrom`
- `buildWorkerPlan` — construit `plan.entry/stop/takeProfit/rr/setupType/etc.` (consomme le composite, inchangé)
- `buildStablePayload`, `buildPartialAnalysisPayload`, `toOpportunityRow` — assembly du payload, propagent `strategicAnalysis`, `liveContext`, `snapshotId` et les 4 timestamps analytiques

### Cluster « Training / paper trading »

- `getTrainingSettings`, `getTrainingDefaults`, `normalizeTrainingSettingsRow`
- `isTrainingCandidateAllowed` — filtre d'ouverture
- `handleTrainingAutoCycle` — cron orchestrateur
- `trainingCloseTrigger` — détection stop/TP/invalidation/time_exit avec intra-bornes
- `updatePositionIntraExcursion`, `persistPositionIntraExcursion`
- `openTrainingPositionFromRow`, `buildTrainingPositionRowFromSignal`
- `closeTrainingPosition`, `buildClosedTradeRowFromPosition`
- `tradeValidationEngine` — qualité du trade clos

### Cluster « Learning + correction »

- `captureTradeFeedback` — écrit `mtp_trade_feedback`
- `computeLearningStats`, `loadLearningContextForScan` — stats par bucket
- `aggregateFeedbackBuckets` — règles 1-6 correctives
- `observeShadowAdjustments` — shadow rules
- `getClaudeNewsKillSwitchWeight` — pondère Claude
- `computeMarketRegimeStats` — stats régime hebdo

---

## Supabase — Tables et rôles

### `mtp_positions`
Positions ouvertes en paper trading.

| Colonne | Type | Note |
|---|---|---|
| `id` | text (PK) | `${symbol}:${botMode}:${timestamp}` |
| `symbol`, `name`, `mode`, `status`, `side` | text | mode = training / exploration / core |
| `asset_class`, `currency` | text | `currency` ajouté en migration 015 |
| `entry_price`, `stop_loss`, `take_profit`, `invested`, `quantity` | numeric | |
| `score`, `trend_label`, `trade_decision`, `trade_reason` | mixed | snapshot du moment d'ouverture |
| `horizon`, `source_used` | text | |
| `opened_at`, `updated_at` | timestamptz | |
| `analysis_snapshot` | jsonb | regime, news, plan complet |
| `execution` | jsonb | openedAt, entryPrice, quantity, invested |
| `live` | jsonb | lastPrice, updatedAt, highSinceOpen, lowSinceOpen |

### `mtp_trades`
Trades clos (historique).

Mêmes colonnes que `mtp_positions` + :

| Colonne | Type | Migration |
|---|---|---|
| `exit_price`, `pnl`, `pnl_pct`, `closed_at`, `duration_days` | mixed | base |
| `closed_execution` | jsonb | base |
| `intraday_detected`, `intraday_source`, `intraday_high`, `intraday_low`, `execution_assumption` | mixed | 014 |
| `quality`, `quality_flags` | text + text[] | 016 |

### `mtp_trade_feedback`
Ligne par trade clos avec données d'apprentissage.

| Colonne | Type | Note |
|---|---|---|
| `trade_id` (PK) | text | FK logique vers `mtp_trades.id` |
| `symbol`, `asset_class`, `setup_type`, `direction` | text | |
| `regime_at_open`, `regime_at_close` | text | |
| `exit_reason`, `intraday_detected`, `intraday_source`, `intraday_high`, `intraday_low`, `execution_assumption` | mixed | |
| `opened_at`, `closed_at`, `holding_minutes` | mixed | |
| `entry_price`, `exit_price`, `stop_loss`, `take_profit`, `pnl`, `pnl_pct` | numeric | |
| `mae_pct`, `mfe_pct`, `stop_distance_pct`, `tp_distance_pct`, `mae_vs_stop_ratio`, `mfe_vs_tp_ratio` | numeric | excursion intra-trade |
| `bucket_key` | text | `${setup}|${direction}|${regime}|${asset_class}` |
| `news_context_open`, `news_context_close` | jsonb | sentiment + Claude signal |
| `quality`, `quality_flags` | text + text[] | migration 016 |

### `mtp_training_settings`
Singleton (1 row) avec tous les paramètres du bot.

- `auto_open_enabled`, `auto_close_enabled`, `is_enabled`
- `capital_base`, `risk_per_trade_pct`, `allocation_per_trade_pct`
- `max_open_positions`, `max_positions_per_symbol`, `max_holding_hours`
- `min_actionability_score`, `min_dossier_score`
- `max_daily_loss_pct`, `max_weekly_loss_pct`, `max_consecutive_losses`
- `allow_long`, `allow_short`, `mean_reversion_enabled`
- `allowed_setups` (array)
- `require_structural_setup`, `post_stop_cooldown_hours`
- `learning_enabled`, `bot_mode`, `mode`

### `mtp_training_events`
Log événementiel (cycle_completed, trade_opened, trade_closed, close_skipped_no_price, settings_updated).

### `mtp_user_assets`
Actifs personnalisés ajoutés par l'utilisateur (50 max).

### `mtp_engine_adjustments`
Règles correctives 1-6 actives (raise_min_score, disable_bucket, reduce_size, etc.).

### `mtp_weekly_reports`
Rapports hebdo Claude (lundi 8h CEST).

### `mtp_bot_stats_snapshot`
Snapshot quotidien lisible par Claude — stats globales pour aider à l'analyse. *(Déclaré dans SESSION.md d'origine, à vérifier dans le code si besoin de confirmer le contenu exact.)*

---

## Caches actifs

### Cache mémoire worker (volatile, par isolate Cloudflare)

| Clé | TTL | Stocke |
|---|---|---|
| `market:snapshot:${symbol}` | 2 min | Quote non-crypto résolue |
| `quote:twelve:${symbol}` | 2 min | Quote brute Twelve |
| `quote:binance:${symbol}` | 30 s | Quote brute Binance |
| `quote:alpha:${symbol}` | 60 min | Quote brute Alpha Vantage |
| `mem:candles:eodhd:${tdSymbol}:${tf}:${limit}` | 12 h | Candles EODHD pré-KV |
| `route:opportunities:data` | 5 min | Snapshot complet du scan |
| `route:detail:data:${symbol}` | 3 min | Fiche détail composite |
| `route:news:v8-signal-layer-full:data` | 15 min | News panel agrégé |
| `news:claudeKillSwitch` | 1 h | Poids Claude (basé win rate) |
| `regime:indicators` | 5 min | Fear & Greed / VIX |

### Cache KV Cloudflare (persistant cross-invocations)

| Clé | TTL | Stocke |
|---|---|---|
| `market:regime` | 1 h | Régime macro |
| `candles:eodhd:${symbol}:1d` | 12 h | Bougies daily EODHD |
| `candles:twelve:${symbol}:${tf}` | 12 h (1d) / 2 h (4h) / 30 min (1h) | Bougies Twelve |
| `opportunities:snapshot` | 5 min | Mirror du scan opp pour reprise rapide |
| `news:${kind}:${symbol}` | 30 min | News raw |

### Cache front (localStorage + state mémoire)

- `STORAGE_KEYS.opportunitiesSnapshot` : dernier scan offline-safe
- `TRADE_STORAGE.positions / .history` : positions + historique persistés
- `state.opportunities`, `state.detail`, `state.trades` : mémoire RAM rechargée depuis localStorage au boot
- Service Worker cache : version `manitradepro-v8.0` au moment de la dernière release UI

---

## Sécurité et auth

- PIN admin → HMAC SHA-256 → token session 24 h
- Token stocké en localStorage `mtp_session_v1`
- Vérification côté worker via `requireAdminAccess`
- Secrets Cloudflare : `ADMIN_API_TOKEN`, `ADMIN_PIN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `EODHD_API_KEY`, `TWELVE_API_KEYS`, `ALPHAVANTAGE_API_KEY`, `FINNHUB_API_KEY`, `CRYPTOPANIC_API_KEY`, `CLAUDE_API_KEY`

---

## Stratégie de déploiement

- Push sur `main` → GitHub Pages déploie le front en 2-5 min
- Push sur `main` touchant `cloudflare-worker/**` → GitHub Action `deploy-worker.yml` lance `wrangler deploy` en 30-60 s
- Pas de `wrangler` manuel requis en routine (fallback documenté dans `CLAUDE.md`)

---

## Non encore fait

- ~~**Séparation `strategicScore` (stable) vs `liveContext` (volatile)** : le score actuel mélange les deux dans `calcDetailScore`. Prévu en vague A.1 de la refonte.~~ ✅ **Livré vague A.1 (mai 2026)** : `strategicAnalysis` et `liveContext` exposés en plus du composite legacy. Adaptation front à venir dans une PR séparée.
- ~~**`snapshotId` propagé** : aucune cohérence garantie entre la carte opp et la fiche détail si le cron tourne entre deux affichages. Prévu en vague B.4.~~ ✅ **Livré vague B.4 (mai 2026)** : `snapshotId` (hash FNV-1a déterministe sur sources analytiques) propagé dans tous les payloads + 4 timestamps analytiques. Adaptation front (badge "recalcul détecté") à venir dans une PR séparée.
- ~~**Timestamps complets** : seul `quotedAt` est porté. `scoreCalculatedAt`, `candlesUpdatedAt`, `planGeneratedAt`, `newsUpdatedAt` manquants. Prévu en vague B.5.~~ ✅ **Partiellement livré vague B.4** : `strategicCalculatedAt`, `candlesUpdatedAt`, `regimeUpdatedAt`, `learningSnapshotAt` ajoutés. Reste à ajouter : `planGeneratedAt`, `newsUpdatedAt` (vague B.5).
- ~~**`quoteQualityEngine`** : pas d'engine systématique de validation d'âge / écart / devise. Prévu en vague B.6.~~ ✅ **Livré vague B.6 (mai 2026)** : moteur synchrone produisant `liveContext.quoteQuality` (6 détections + trustScore + validationStatus + reasons). Périmètre strict : aucune modif scoring/plan/learning. Branchement broker réel et UI badges à venir.
- **`fxEngine` unifié** : pas d'helper `convert(amount, from, to, asOf)`. Conversions dispersées. Prévu en vague C.7.
- **Multi-devises strict** : `capital_base` reste stocké en USD ; `originalCurrency` / `convertedCurrency` non systématiques. Prévu en vague C.8-9.
- **Modularisation worker** : `/market/`, `/trading/`, `/learning/`, `/shared/` non extraits du monolithe `cloudflare-worker/worker.js`. Prévu en vague D.10.
- **Modularisation front** : pas de couche `/services/`. Helpers et views mélangés dans l'IIFE de `assets/app.js`. Prévu en vague D.11.
- **Préparation broker réel** : aucun `slippage-engine`, aucun adapter broker. Hors périmètre actuel.
- **Tests automatiques** : aucune CI ne valide worker ou front. On compte sur l'agent bug-hunter + tests manuels utilisateur.

---

## Limites de fiabilité

- Les chiffres de lignes ci-dessus sont la mesure du jour. À recroiser avec `wc -l` à chaque session importante.
- La liste des routes API est tirée du code actuel mais peut être incomplète si des routes admin ont été ajoutées sans documentation. À grepper `url.pathname ===` ou `url.pathname.startsWith` dans `cloudflare-worker/worker.js` pour confirmation exhaustive.
- Les schemas Supabase listés sont les colonnes connues via les migrations 001-016. Toute colonne ajoutée hors migration documentée n'est pas dans ce fichier.
