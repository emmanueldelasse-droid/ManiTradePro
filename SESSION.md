# SESSION – ManiTradePro
> **Fichier de continuité de session — à lire en PREMIER à chaque nouvelle session IA**

---

## Métadonnées
| Champ | Valeur |
|-------|--------|
| **Dernière mise à jour** | 2026-04-19 (session 5) |
| **IA utilisée** | Claude (claude-sonnet-4-6) |
| **Branche active** | `main` |
| **Repo GitHub** | emmanueldelasse-droid/ManiTradePro |
| **Déployé sur** | GitHub Pages + Cloudflare Worker |
| **Worker URL** | `https://manitradepro.emmanueldelasse.workers.dev` |

---

## Stack technique
- **Type** : PWA — iPhone + web, vanilla JS, zéro dépendances
- **Frontend** : `assets/app.js` (~5430 lignes) + `assets/styles.css`
- **Backend** : `cloudflare-worker/worker.js` — déployé via `wrangler deploy` dans `C:\Users\Emman\Documents\ManiTradePro\cloudflare-worker`
- **APIs marché** : Binance, Twelve Data (4 clés en rotation), Yahoo Finance, CoinGecko, Alpha Vantage, Finnhub, Claude AI
- **Sync cross-device** : Supabase — tables `mtp_positions` + `mtp_trades`
- **Proxy CORS** : Cloudflare Worker (pour Binance iOS Safari)
- **EUR/USD** : Sourcé depuis Yahoo Finance `EURUSD=X`
- **Auth admin** : PIN → session token HMAC-SHA256 24h
- **Graphiques** : Lightweight Charts v4.2 (TradingView, CDN unpkg dans `index.html`)

## Indicateurs du moteur d'analyse (8)
ADX · EMA 50/100 · Donchian 55/20 · RSI · ATR · Momentum · Volume · Volatilité → Score de risque 0–100

## Secrets Cloudflare requis
| Secret | Rôle |
|--------|------|
| `ADMIN_API_TOKEN` | Clé de signature HMAC pour les session tokens |
| `ADMIN_PIN` | Mot de passe PIN saisi dans le modal |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Clé anon Supabase |
| `ANTHROPIC_API_KEY` | Clé Claude AI |
| `TWELVE_DATA_KEY_1..4` | 4 clés Twelve Data en rotation |

⚠️ `wrangler deploy` efface les vars dashboard — toujours utiliser `wrangler secret put` et vérifier avec `wrangler secret list` après chaque deploy.

## Clés localStorage
| Clé | Usage |
|-----|-------|
| `mtp_session_v1` | Token de session admin (PIN auth) |
| `mtp_settings_v1` | Paramètres utilisateur |
| `mtp_training_positions_v1` | Positions entraînement |
| `mtp_training_history_v1` | Historique entraînement |
| `mtp_algo_journal_v1` | Journal algo |
| `mtp_budget_tracker_v1` | Suivi budget API |
| `mtp_detail_cache_v1` | Cache détails assets |
| `mtp_opportunities_snapshot_v1` | Snapshot opportunités |
| `mtp_training_capital_v1` | Capital entraînement |
| `mtp_price_alerts_v1` | Alertes de prix actives + historique |

## Règle absolue
> ❌ **JAMAIS** afficher un prix fictif, périmé ou inventé — toujours un état de chargement si les données ne sont pas disponibles

---

## État actuel du projet

### Ce qui fonctionne
- [x] Dashboard — carte prioritaire, opportunités filtrables, bandeau régime de marché
- [x] Fiche actif — score risque, plan trade, review IA Claude, chandeliers (LW Charts v4.2)
  - Timeframes 1J/4H/1H pour crypto, 1J seulement pour actions/ETF
- [x] Mode entraînement (paper trading) — capital virtuel, positions ouvertes, historique
- [x] Auth PIN → session token HMAC-SHA256 24h (modal Réglages)
- [x] Sync Supabase cross-device (positions + historique)
- [x] **Onglet Mes Trades refondu** (session 5)
  - Wallet strip compact (5 stats en grille)
  - Class perf strip : P/L séparé Crypto (orange) vs Actions/ETF (bleu) avec badge marché ouvert/fermé
  - Badge marché ouvert/fermé uniquement sur Actions/ETF (pas sur Crypto)
  - Positions ouvertes : pos-card avec barre progression stop→TP
  - Historique unifié dans 1 carte — boutons "Vider" algo / manuel / tout
  - IA Outils en bas : Analyse journal (F1) + Priorisation portefeuille (F2)
- [x] **Analyse journal IA** (session 5) — POST `/api/ai/journal-analysis`
  - claude-sonnet-4-6, analyse biais/patterns/forces/recommandations
  - Sections séparées Crypto vs Actions dans le rendu
- [x] **Priorisation portefeuille IA** (session 5) — POST `/api/ai/portfolio-priority`
  - claude-haiku-4-5, ranking opportunités selon portefeuille ouvert + capital dispo
- [x] **Auto-scan opportunités** (session 5) — toutes les N min (3/5/10/15, défaut 5 min)
  - `isStockMarketOpen()` : intervalle allongé à 15 min si marchés fermés
  - Alertes signaux : notif push + toast pour nouveaux "Trade proposé"
  - Réglages : `autoScanIntervalMin` + `algoSignalNotifs`
- [x] **Position sizing intelligent** (session 5) — 1% risk / stop distance
  - Crypto : quantité décimale (ex: 0.024 BTC)
  - Actions : arrondi au lot entier
- [x] Alertes de prix — onglet "Alertes ◉", browser notifications, toast in-app
- [x] Adaptation iPhone complète (safe-area, 100dvh, touch 44px)
- [x] Statut de marché temps réel sur cartes (badge coloré + heures Paris)
- [x] Thème sombre + thème clair

### Ce qui est cassé / en cours
- [ ] Rapports PDF hebdomadaires (non implémentés)
- [ ] Fear & Greed Index (désactivé, retourne placeholder)
- [ ] Trending Assets (désactivé, retourne placeholder)

---

## Dernière session (session 5)

**Date** : 2026-04-19
**IA** : Claude (claude-sonnet-4-6) — session `01PxdzfigUq43fSNwVwDKFKV`

### Tâches accomplies
1. **Refonte onglet Mes Trades** — wallet strip, class perf strip, suppression cartes redondantes
2. **Séparation crypto/actions** — stats P/L séparés, `trainingStatsByClass()`, badge marché
3. **Position sizing 1% risk** — calcul sur distance stop, remplacement heuristique prix
4. **Analyse journal IA (F1)** — `/api/ai/journal-analysis`, claude-sonnet-4-6
5. **Priorisation portefeuille IA (F2)** — `/api/ai/portfolio-priority`, claude-haiku-4-5
6. **Auto-scan + alertes signaux** — setInterval cadencé, `checkSignalAlerts()`, notifs push
7. **Fix light theme** — dashboard-signal-shell gris corrigé

### Fichiers modifiés (session 5)
| Fichier | Changement |
|---------|------------|
| `assets/app.js` | Refonte Mes Trades, stats par classe, sizing, IA journal/priorité, auto-scan, alertes |
| `assets/styles.css` | wallet-strip, class-perf-strip, ai-insight-card, ai-priority-row, btn-danger-soft, light theme fix |
| `cloudflare-worker/worker.js` | POST /api/ai/journal-analysis, POST /api/ai/portfolio-priority, prompt IA séparé crypto/actions |

---

## Prochaine étape prioritaire

> **TODO #1** : Tester sur iPhone — auto-scan, alertes signaux, analyse journal IA

> **TODO #2** : Si worker modifié → `wrangler deploy` depuis `C:\Users\Emman\Documents\ManiTradePro\cloudflare-worker`

**Fonctionnalités backlog**
- [ ] Rapports PDF hebdomadaires
- [ ] Export CSV historique trades
- [ ] Mode hors-ligne complet (cache SW)

---

## Contraintes de déploiement
- Frontend : push sur `main` → GitHub Pages (2-5 min, Ctrl+Shift+R)
- Worker : `wrangler deploy` dans le dossier `cloudflare-worker/`
- ⚠️ Après `wrangler deploy` : vérifier `wrangler secret list` que SUPABASE_URL est présent
- Tout le frontend dans `assets/app.js` — pas de séparation en modules
- Squash merge = commits poussés APRÈS ne sont pas inclus → vérifier avant de merger

---

## Historique des sessions

| Date | IA | Résumé |
|------|----|--------|
| 2026-04-19 | Claude sonnet-4-6 | Création SESSION.md + auth PIN session token (PR #16) |
| 2026-04-19 | Claude sonnet-4-6 | Alertes de prix + adaptation iPhone (PR #24) |
| 2026-04-19 | Claude sonnet-4-6 | Fix trades iPhone : worker mapping + loadTradesState + SW v6.1 |
| 2026-04-19 | Claude sonnet-4-6 | Chandeliers + pos-card + historique algo/manuel + fixes Supabase (PR #28+29) |
| 2026-04-19 | Claude sonnet-4-6 | Refonte Mes Trades + IA journal/priorité + auto-scan + sizing (non documenté) |
