# SESSION – ManiTradePro
> **Fichier de continuité de session — à lire en PREMIER à chaque nouvelle session IA**

---

## Métadonnées
| Champ | Valeur |
|-------|--------|
| **Dernière mise à jour** | 2026-04-19 (session 4) |
| **IA utilisée** | Claude (claude-sonnet-4-6) |
| **Branche active** | `claude/check-system-oNPEA` (mergée via PR #28 + PR #29 → main) |
| **Repo GitHub** | emmanueldelasse-droid/ManiTradePro |
| **Déployé sur** | GitHub Pages + Cloudflare Worker |
| **Worker URL** | `https://manitradepro.emmanueldelasse.workers.dev` |

---

## Stack technique
- **Type** : PWA — iPhone + web, vanilla JS, zéro dépendances
- **Frontend** : `assets/app.js` (~5500 lignes) + `assets/styles.css`
- **APIs marché** : Binance, Twelve Data (4 clés en rotation), Yahoo Finance, CoinGecko, Alpha Vantage, Finnhub, Claude AI
- **Sync cross-device** : Supabase (dont quota Claude AI partagé)
- **Proxy CORS** : Cloudflare Worker `cloudflare-worker/worker.js` (pour Binance iOS Safari)
- **EUR/USD** : Sourcé depuis Yahoo Finance `EURUSD=X`
- **Auth admin** : PIN → session token HMAC-SHA256 24h
- **Graphiques** : Lightweight Charts v4.2 (TradingView, CDN unpkg)

## Indicateurs du moteur d'analyse (8)
ADX · EMA 50/100 · Donchian 55/20 · RSI · ATR · Momentum · Volume · Volatilité
→ Score de risque 0–100

## Clés localStorage
| Clé | Usage |
|-----|-------|
| `mtp_session_v1` | Token de session admin (PIN auth) |
| `mtp_settings_v1` | Paramètres utilisateur |
| `mtp_training_positions_v1` | Positions en mode entraînement |
| `mtp_training_history_v1` | Historique entraînement |
| `mtp_algo_journal_v1` | Journal algo |
| `mtp_budget_tracker_v1` | Suivi budget |
| `mtp_detail_cache_v1` | Cache détails assets |
| `mtp_opportunities_snapshot_v1` | Snapshot opportunités |
| `mtp_training_capital_v1` | Capital entraînement |
| `mtp_price_alerts_v1` | Alertes de prix (actives + historique) |

## Règle absolue
> ❌ **JAMAIS** afficher un prix fictif, périmé ou inventé — toujours un état de chargement si les données ne sont pas disponibles

---

## État actuel du projet

### Ce qui fonctionne
- [x] Dashboard avec carte prioritaire et liste d'opportunités filtrables
- [x] Détail d'un asset avec score de risque, régime de marché, décision trade
- [x] Mode entraînement (paper trading) avec capital virtuel et historique
- [x] Analyse IA via Claude AI (review d'opportunité)
- [x] Worker Cloudflare sécurisé — auth à deux niveaux (front / admin)
- [x] Auth PIN → session token 24h
- [x] Sync Supabase (optionnel, activable dans Réglages)
- [x] Thème sombre premium + thème clair
- [x] Bandeau régime de marché (bull/bear/lateral)
- [x] Alertes de prix (onglet "Alertes ◉", browser notifications, toast in-app)
- [x] Adaptation iPhone complète (safe-area, 100dvh, touch 44px, overflow-x hidden)
- [x] **Graphiques en chandeliers** (Lightweight Charts v4.2)
  - Boutons timeframe 1J/4H/1H (crypto) — 1J uniquement pour actions/ETF
  - Fetch à la volée au changement de timeframe, pas de reload page
  - Responsive via ResizeObserver
- [x] **Nouvelle carte trades ouverts** (pos-card)
  - Symbol + P/L coloré en header
  - Prix entrée → actuel avec flèche directionnelle
  - Stop / Ratio / Objectif en 3 pilules
  - Barre de progression stop→TP avec marqueur live
  - Boutons pleine largeur
- [x] **Historique algo / manuel séparé**
  - `tradeSource(p)` : détecte via `p.source` ou `tradeDecision`
  - Nouveaux trades taguées `source: "algo"` ou `source: "manual"`
  - Bouton "Vider" indépendant par section avec confirmation
- [x] **loadTradesState() réécrit** — compare uniquement les comptages, ignore pendingRemoteSync
- [x] **SW cache v6.1** — force rechargement app.js sur iPhone
- [x] **normalizePositionRecord** — fallbacks snake_case complets (entry_price, stop_loss, take_profit, trade_decision, trend_label, trade_reason) + back-computation entry depuis invested/quantity

### Ce qui est cassé / en cours
- [ ] Graphiques en chandeliers (non implémentés) ← FAIT
- [ ] Journal de trading dédié (partiellement via algo journal)
- [ ] Rapports PDF hebdomadaires (non implémentés)
- [ ] **Entry price perdue sur les 2 trades AAPL/SPY existants** — données corrompues dans Supabase avant les fixes worker (entry_price = null, invested = prix live * qty). Solution : clôturer ces trades et en ouvrir de nouveaux proprement.
- [ ] **Nouvelle UI pas encore visible** — PR #29 mergée mais GitHub Pages en cours de déploiement. Ctrl+Shift+R après déploiement.

---

## Dernière session

**Date** : 2026-04-19 (session 4)
**IA** : Claude (claude-sonnet-4-6)

### Tâches accomplies (session 4)
1. **Graphiques en chandeliers** — Lightweight Charts v4.2, timeframes 1J/4H/1H, fetch à la volée
2. **Refonte carte trades ouverts** — pos-card lisible iPhone, barre progression stop→TP
3. **Séparation historique algo / manuel** — deux sections + boutons vider indépendants
4. **Fix normalizePositionRecord** — snake_case fallbacks + back-computation entry price
5. **Fix snapshot** — trade_decision, trend_label, trade_reason depuis Supabase
6. **PR #28 mergée** (13:22) — mais squash merge n'a pas inclus les commits postérieurs
7. **PR #29 créée et mergée** — 5 commits manquants ajoutés sur main
8. **Diagnostic déploiement** — GitHub Pages retardé car commits après squash merge

### Bugs résolus
- Squash merge PR #28 n'incluait pas les commits poussés après (chandeliers, pos-card, etc.) → PR #29
- Script Lightweight Charts perdu dans le squash merge → restauré directement sur main
- normalizePositionRecord ne lisait pas les champs snake_case de Supabase

### Décisions techniques prises
- Lightweight Charts chargé via CDN unpkg (standalone) dans index.html
- `initCandlestickChart()` appelé via `requestAnimationFrame` après `render()` sur la route `asset-detail`
- Timeframes 4H/1H masqués pour les actifs non-crypto (économie quota Twelve Data)
- `tradeSource()` = `p.source` → fallback sur `tradeDecision` contenant "Trade propose"
- `source: "algo"` / `source: "manual"` tagué à la création du trade
- back-computation entry price = `investedRaw / quantityRaw` (investedRaw en USD)

### Fichiers modifiés (session 4)
| Fichier | Changement |
|---------|------------|
| `assets/app.js` | Chandeliers, pos-card, tradeSource, historique split, normalizePositionRecord snake_case |
| `assets/styles.css` | Styles pos-card, chart-tf-row, chart-tf-btn, chart-loading, pos-* |
| `index.html` | Script Lightweight Charts CDN |
| `sw.js` | CACHE_VERSION v6.1 (session 3) |

---

## Prochaine étape prioritaire

> **TODO #1** : Attendre le déploiement GitHub Pages (PR #29), puis Ctrl+Shift+R pour voir la nouvelle UI

> **TODO #2** : Clôturer les trades AAPL et SPY existants (données corrompues), les rouvrir depuis la fiche actif pour avoir entry price + stop + TP propres

> **TODO #3** : Vider l'historique manuel (bouton "Vider" dans Historique — Manuel) pour nettoyer les anciens trades

**Fonctionnalités planifiées (backlog)**
- [ ] Journal de trading dédié (export CSV/PDF)
- [ ] Rapports PDF hebdomadaires
- [ ] Mode hors-ligne complet (cache SW)

---

## Contraintes de déploiement
- Déploiement frontend via **GitHub Pages** (push sur `main` → build automatique en 2-5 min)
- Déploiement worker via **Wrangler CLI** ou dashboard Cloudflare
- Tout le frontend doit rester dans `assets/app.js` — pas de séparation en modules
- Squash merge = les commits poussés APRÈS la merge ne sont pas inclus → toujours vérifier avant de merger
- GitHub Pages prend 2-5 minutes à déployer — Ctrl+Shift+R + désinstaller SW si rien ne change

---

## Historique des sessions

| Date | IA | Résumé |
|------|----|--------|
| 2026-04-19 | Claude sonnet-4-6 | Création SESSION.md + PR #16 auth PIN session token |
| 2026-04-19 | Claude sonnet-4-6 | Alertes de prix + adaptation iPhone complète (PR #24) |
| 2026-04-19 | Claude sonnet-4-6 | Fix trades invisibles iPhone : worker mapping + loadTradesState + SW v6.1 |
| 2026-04-19 | Claude sonnet-4-6 | Chandeliers + pos-card + historique algo/manuel + fixes Supabase (PR #28 + PR #29) |
