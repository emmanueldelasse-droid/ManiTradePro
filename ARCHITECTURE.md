# ARCHITECTURE — État réel du projet

> **Représente le code APRÈS MERGE.** Mise à jour obligatoire à chaque PR architecture.
> Dernière vérification : 2026-05-15, après PR #158.

---

## Vue d'ensemble

ManiTradePro est une PWA vanilla JS (front) + Cloudflare Worker (back) + Supabase (DB). Pas de framework, pas de bundler. Tout est servi en clair depuis GitHub Pages.

```
┌────────────┐    HTTPS     ┌──────────────────────┐    PostgREST    ┌────────────┐
│ iPhone /   │─────────────►│ Cloudflare Worker    │────────────────►│ Supabase   │
│ Mac PWA    │   /api/*     │ ~9000 lignes JS      │                 │ Postgres   │
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

## Frontend — `assets/app.js` (~8000 lignes)

Tout dans une **seule IIFE**. Pas de modules. State global `state = { ... }`. Render unique `render()` qui rewrite `app.innerHTML` à chaque fois (préservation du scroll via PR #141).

### Routes principales (state.route)
| Route | Vue | Description |
|---|---|---|
| `dashboard` | Accueil | Synthèse jour : régime macro, top opps, alertes news |
| `opportunities` | Opportunités | Scan des 35+ actifs avec score + plan de trade |
| `asset-detail` | Fiche actif | Bougies + analyse + plan + IA + news |
| `portfolio` | Trades | Positions ouvertes + historique + bot paramètres |
| `settings` | Réglages | Compte, alertes, paramètres bot (déplacé ici depuis Trades en PR #143), actifs personnalisés, à propos |

### Logique paper trading
- `state.trades.positions` (en mémoire) ← lu depuis `/api/trades/state`
- `state.trades.history` ← idem
- Ouverture manuelle : modal "Confirmer le trade" → POST `/api/trades/open` (entry/stop/TP saisis ou calculés)
- Auto-ouverture : déléguée au cron worker `handleTrainingAutoCycle`

### Logique synchronisation
- Polling 30 s sur dashboard / opp / detail / settings / portfolio
- Re-fetch immédiat sur `visibilitychange` quand l'onglet revient au premier plan (PR #135)
- localStorage : persistance offline (`mtp_trades_positions`, `mtp_trades_history`, `mtp_opportunities_snapshot_v1`)
- Service Worker `sw.js` : network-first pour `/api/*`, cache-first pour assets (cache version bumped à chaque release UI)

### Affichage prix
- `priceDisplay(value, currency)` (app.js L908) : affiche EUR primaire + USD en parenthèses (mode `EUR_PLUS_USD`)
- `currencyForSymbol(symbol)` miroir du worker pour les positions sans devise stockée
- Helper `quoteSourceLine(item)` (app.js L965) : affiche "Données Yahoo (temps réel) · mis à jour il y a 30 s"

---

## Backend — `cloudflare-worker/worker.js` (~9000 lignes)

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
| `/api/training/wipe` (redirigé vers `/api/trades/wipe`) | Effacement total |

### Routes admin
| Route | Handler |
|---|---|
| `/api/admin/eodhd-probe/:symbol` | Diagnostic EODHD |
| `/api/admin/backfill-pnl` | Recalcul P&L historique |
| `/api/admin/backtest-*` | Backtest sur historique EODHD |

### Cron (scheduled)
`handleTrainingAutoCycle(env)` lancé toutes les ~10 min :
1. Lecture `mtp_training_settings`
2. Phase fermeture : pour chaque position ouverte, fetch quote, `trainingCloseTrigger` → close si stop/TP/invalidation/time_exit
3. Phase ouverture : si `auto_open_enabled`, lecture du dernier scan opp via `buildOpportunityRowsForTraining`, filtre via `isTrainingCandidateAllowed` (inclut maintenant le check jours fériés, PR #156), ouvre via `openTrainingPositionFromRow`

---

## Modules logiques actuels (dans le monolithe)

Les "modules cibles" décrits dans le brief de refonte ne sont pas encore extraits. Voici la cartographie réelle.

### Cluster « Market data »
- `getCryptoQuote`, `getCryptoCandles`, `getCryptoCandlesTf` (~L1200) — Binance
- `getTwelveQuote`, `getTwelveBatchQuotes`, `getTwelveCandlesWithKV` (~L1250-1500) — Twelve
- `getYahooBatchQuotes`, `getYahooQuote`, `getYahooQuoteFromChart`, `getYahooCandles` (~L850-1000) — Yahoo
- `getAlphaQuote` (~L1490) — Alpha Vantage
- `getEodhdRealTimeBatchQuotes`, `getEodhdCandles`, `getEodhdCandlesWithKV` (~L1100-1200) — EODHD
- `resolveUnifiedMarketQuote` (~L1603) — dispatcher quote
- `getCandlesBySymbol` (~L1812) — dispatcher candles
- `getStoredDailyQuoteFallback` (~L1730) — snapshot fallback
- `getCurrencyForSymbol` (~L1078) + `MARKET_HOLIDAYS` + `isMarketHoliday` (~L1100-1163)

### Cluster « Scoring + Plan »
- `calcDetailScore` (~L2499) — composite score 0-100
- `safetyScoreFrom`, `actionabilityScoreFrom`, `dossierScoreFrom`, `decisionScoreFrom` (~L2790-2900)
- `buildWorkerPlan` (~L2200) — construit `plan.entry/stop/takeProfit/rr/setupType/etc.`
- `buildStablePayload`, `buildPartialAnalysisPayload`, `toOpportunityRow` (~L2947-3110) — assembly du payload

### Cluster « Training / paper trading »
- `getTrainingSettings`, `getTrainingDefaults`, `normalizeTrainingSettingsRow` (~L3550-3700)
- `isTrainingCandidateAllowed` (~L3707) — filtre d'ouverture (statut, news, setup, cooldown, jours fériés)
- `handleTrainingAutoCycle` (~L3851) — cron orchestrateur
- `trainingCloseTrigger` (~L4615) — détection stop/TP/invalidation/time_exit avec intra-bornes
- `updatePositionIntraExcursion`, `persistPositionIntraExcursion` (~L4685)
- `openTrainingPositionFromRow`, `buildTrainingPositionRowFromSignal` (~L4654-5060)
- `closeTrainingPosition`, `buildClosedTradeRowFromPosition` (~L4789-4892)
- `tradeValidationEngine` (~L4843) — qualité du trade clos (PR #157)

### Cluster « Learning + correction »
- `captureTradeFeedback` (~L4997) — écrit `mtp_trade_feedback`
- `computeLearningStats`, `loadLearningContextForScan` (~L5232) — stats par bucket
- `aggregateFeedbackBuckets` (~L7157) — règles 1-6 correctives
- `observeShadowAdjustments` (~L7405) — shadow rules
- `getClaudeNewsKillSwitchWeight` (~L7080) — pondère Claude
- `computeMarketRegimeStats` (~L7590) — stats régime hebdo

---

## Supabase — Tables et rôles

### `mtp_positions`
Positions ouvertes en paper trading.

| Colonne | Type | Note |
|---|---|---|
| `id` | text (PK) | `${symbol}:${botMode}:${timestamp}` |
| `symbol`, `name`, `mode`, `status`, `side` | text | mode = training/exploration/core |
| `asset_class`, `currency` | text | currency ajouté en migration 015 |
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
| Colonne | Type | Note |
|---|---|---|
| `exit_price`, `pnl`, `pnl_pct`, `closed_at`, `duration_days` | mixed | |
| `closed_execution` | jsonb | exitPrice, closedAt, closeType |
| `intraday_detected`, `intraday_source`, `intraday_high`, `intraday_low`, `execution_assumption` | mixed | migration 014 |
| `quality`, `quality_flags` | text + text[] | migration 016, PR #157 |

### `mtp_trade_feedback`
Ligne par trade clos avec données d'apprentissage.

| Colonne | Type | Note |
|---|---|---|
| `trade_id` (PK) | text | FK logique vers mtp_trades.id |
| `symbol`, `asset_class`, `setup_type`, `direction` | text | |
| `regime_at_open`, `regime_at_close` | text | |
| `exit_reason`, `intraday_detected`, `intraday_source`, `intraday_high`, `intraday_low`, `execution_assumption` | mixed | |
| `opened_at`, `closed_at`, `holding_minutes` | mixed | |
| `entry_price`, `exit_price`, `stop_loss`, `take_profit`, `pnl`, `pnl_pct` | numeric | |
| `mae_pct`, `mfe_pct`, `stop_distance_pct`, `tp_distance_pct`, `mae_vs_stop_ratio`, `mfe_vs_tp_ratio` | numeric | excursion intra-trade |
| `bucket_key` | text | `${setup}|${direction}|${regime}|${asset_class}` |
| `news_context_open`, `news_context_close` | jsonb | sentiment + Claude signal |
| `quality`, `quality_flags` | text + text[] | migration 016, PR #157 |

### `mtp_training_settings`
Singleton (1 row) avec tous les paramètres du bot.
- `auto_open_enabled`, `auto_close_enabled`, `is_enabled`
- `capital_base`, `risk_per_trade_pct`, `allocation_per_trade_pct`
- `max_open_positions`, `max_positions_per_symbol`, `max_holding_hours`
- `min_actionability_score`, `min_dossier_score`
- `max_daily_loss_pct`, `max_weekly_loss_pct`, `max_consecutive_losses`
- `allow_long`, `allow_short`, `mean_reversion_enabled`
- `allowed_setups` (array)
- `require_structural_setup` (PR #10), `post_stop_cooldown_hours` (PR #10)
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
Snapshot quotidien lisible par Claude (PR #105) — stats globales pour aider à l'analyse.

---

## Caches actifs

### Cache mémoire worker (volatile, par isolate)

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
- Service Worker cache : version `manitradepro-v8.0` (PR #137-#142)

---

## Sécurité et auth

- PIN admin → HMAC SHA-256 → token session 24h
- Token stocké en localStorage `mtp_session_v1`
- Vérification côté worker via `requireAdminAccess` (cookies signés HMAC)
- Secrets Cloudflare : `ADMIN_API_TOKEN`, `ADMIN_PIN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `EODHD_API_KEY`, `TWELVE_API_KEYS`, `ALPHAVANTAGE_API_KEY`, `FINNHUB_API_KEY`, `CRYPTOPANIC_API_KEY`, `CLAUDE_API_KEY`

---

## Stratégie de déploiement

- Push sur `main` → GitHub Pages déploie le front en 2-5 min
- Push sur `main` touchant `cloudflare-worker/**` → GitHub Action `deploy-worker.yml` lance `wrangler deploy` en 30-60 s
- Pas de manuel `wrangler` requis en routine (fallback documenté dans CLAUDE.md)

---

## Refonte en cours (vague A — fondations)

Cf. SESSION.md pour l'état actuel des PRs. La vague A est en cours, vague B-D non commencées :

- ✅ A.3 Jours fériés (PR #156)
- ✅ A.2 tradeValidationEngine (PR #157)
- ✅ A.2 bis 4 filtres learning (PR #158)
- 🔲 A.1 Séparation `strategicScore` vs `liveContext` (à venir)
- 🔲 B Cohérence (snapshotId, timestamps, quoteQualityEngine)
- 🔲 C Multi-devises rigoureux (fxEngine unifié)
- 🔲 D Modularisation worker + front
