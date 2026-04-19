# SESSION – ManiTradePro
> **Fichier de continuité de session — à lire en PREMIER à chaque nouvelle session IA**

---

## Métadonnées
| Champ | Valeur |
|-------|--------|
| **Dernière mise à jour** | 2026-04-19 (session 6) |
| **IA utilisée** | Claude (claude-sonnet-4-6) |
| **Branche active** | `main` |
| **Repo GitHub** | emmanueldelasse-droid/ManiTradePro |
| **Déployé sur** | GitHub Pages + Cloudflare Worker |
| **Worker URL** | `https://manitradepro.emmanueldelasse.workers.dev` |

---

## Stack technique
- **Type** : PWA — iPhone + web, vanilla JS, zéro dépendances
- **Frontend** : `assets/app.js` (~5700 lignes) + `assets/styles.css`
- **Backend** : `cloudflare-worker/worker.js` — déployé via `wrangler deploy` dans `C:\Users\Emman\Documents\ManiTradePro\cloudflare-worker`
- **APIs marché** : Binance, Twelve Data (4 clés en rotation), Yahoo Finance, CoinGecko, Alpha Vantage, Finnhub, Claude AI
- **Sync cross-device** : Supabase — tables `mtp_positions` + `mtp_trades`
- **Proxy CORS** : Cloudflare Worker (pour Binance iOS Safari)
- **EUR/USD** : Sourcé depuis Yahoo Finance `EURUSD=X`
- **Auth admin** : PIN → session token HMAC-SHA256 24h
- **Graphiques** : Lightweight Charts v4.2 (TradingView, CDN unpkg dans `index.html`)
- **Skill UI/UX** : `.claude/skills/ui-ux-pro-max/` — 67 styles, 96 palettes, 57 font pairings

## Indicateurs du moteur d'analyse (8)
ADX · EMA 50/100 · Donchian 55/20 · RSI · ATR · Momentum · Volume · Volatilité → Score de risque 0–100

## Secrets Cloudflare requis
| Secret | Rôle |
|--------|------|
| `ADMIN_API_TOKEN` | Clé de signature HMAC pour les session tokens |
| `ADMIN_PIN` | Mot de passe PIN saisi dans le modal |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_ANON_KEY` | Clé anon Supabase |
| `CLAUDE_API_KEY` | Clé Claude AI (nom exact dans le worker) |
| `ALPHAVANTAGE_KEY` | Clé Alpha Vantage |
| `TWELVE_KEY_1..4` | 4 clés Twelve Data en rotation |

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
- [x] **Fear & Greed Index** — widget arc SVG dans le dashboard (alternative.me, gratuit)
- [x] **Trending Assets** — strip de pills cliquables dans le dashboard (CoinGecko, gratuit)
- [x] Fiche actif — score risque, plan trade, review IA Claude, chandeliers (LW Charts v4.2)
  - Timeframes 1J/4H/1H pour crypto, 1J seulement pour actions/ETF
- [x] Mode entraînement (paper trading) — capital virtuel, positions ouvertes, historique
- [x] Auth PIN → session token HMAC-SHA256 24h (modal Réglages)
- [x] Sync Supabase cross-device (positions + historique)
- [x] **Fix suppression historique** — `lastWipedAt` dans meta, Supabase ne réimporte plus après "Vider"
- [x] **Export CSV** historique trades — bouton dans Mes Trades, fichier daté avec BOM UTF-8
- [x] **Page Performance** ◈ — nouvel onglet avec :
  - 8 stats (P&L total, win rate, R:R, espérance, gain/perte moyen)
  - Courbe P&L cumulatif SVG (gradient vert/rouge)
  - Meilleur / pire trade
  - Top 5 actifs par P&L absolu
- [x] **Notifications enrichies** — via `serviceWorker.showNotification()` :
  - Direction (▲/▼), score de sûreté, variation 24h dans le corps
  - `requireInteraction: true` sur signaux algo, vibration, tag dedup
- [x] Onglet Mes Trades — wallet strip, class perf strip, positions ouvertes, historique unifié
- [x] Analyse journal IA (F1) — POST `/api/ai/journal-analysis`, claude-sonnet-4-6
- [x] Priorisation portefeuille IA (F2) — POST `/api/ai/portfolio-priority`, claude-haiku-4-5
- [x] Auto-scan opportunités toutes les N min (3/5/10/15, défaut 5 min)
- [x] Position sizing intelligent — 1% risk / stop distance
- [x] Alertes de prix — onglet "Alertes ◉", browser notifications, toast in-app
- [x] Adaptation iPhone complète (safe-area, 100dvh, touch 44px)
- [x] Statut de marché temps réel sur cartes (badge coloré + heures Paris)
- [x] Thème sombre + thème clair
- [x] Skill ui-ux-pro-max installé dans `.claude/skills/`

### Ce qui est cassé / en cours
- [ ] Rapports PDF hebdomadaires (non implémentés)
- [ ] Trending Assets — données CoinGecko présentes mais affichage conditionnel (s'affiche seulement si données chargées)
- [ ] Mode hors-ligne complet (cache SW)

---

## Dernière session (session 6)

**Date** : 2026-04-19
**IA** : Claude (claude-sonnet-4-6) — session `01Ri7NPjeWGz87NGGBTKcCzG`

### Tâches accomplies
1. **Fix suppression historique** — `lastWipedAt` dans meta empêche Supabase de réimporter après "Vider" (5 min de protection)
2. **Fear & Greed Index** — alternative.me API, widget arc SVG coloré dans le dashboard
3. **Trending Assets** — CoinGecko `/search/trending`, strip de pills cliquables
4. **Export CSV** — bouton dans historique Mes Trades, fichier téléchargeable avec BOM
5. **Page Performance** — nouvel onglet ◈, stats globales + courbe SVG + top actifs
6. **Notifications enrichies** — Service Worker `showNotification()`, vibration, dedup par tag
7. **Fix bug Fear & Greed** — `getCachedOrFetch` incompatible avec `Response` → remplacé par `getMemoryCache`/`setMemoryCache` direct
8. **Skill ui-ux-pro-max** — installé dans `.claude/skills/ui-ux-pro-max/`
9. **SESSION.md** — mis à jour

### Fichiers modifiés (session 6)
| Fichier | Changement |
|---------|------------|
| `assets/app.js` | Fix wipe, Fear&Greed widget, Trending strip, export CSV, page Performance, notifs enrichies, onglet nav ◈ |
| `assets/styles.css` | .fg-widget, .fg-arc, .trending-strip, .trending-pill, .perf-* (stats, courbe, extremes, assets) |
| `cloudflare-worker/worker.js` | handleFearGreed + handleTrending — APIs réelles + fix cache mémoire |
| `SESSION.md` | Mise à jour session 6 |
| `.claude/skills/ui-ux-pro-max/` | Skill UI/UX installé |

---

## Prochaine étape prioritaire

> **TODO #1** : Tester sur iPhone — Fear & Greed, Trending, page Performance, Export CSV

> **TODO #2** : Si worker modifié → `wrangler deploy` depuis `C:\Users\Emman\Documents\ManiTradePro\cloudflare-worker`
> Puis `git pull origin main` avant deploy pour avoir les derniers changements

**Fonctionnalités backlog**
- [ ] Rapports PDF hebdomadaires
- [ ] Mode hors-ligne complet (cache SW)
- [ ] Web Push VAPID (notifications app fermée)

---

## Contraintes de déploiement
- Frontend : push sur `main` → GitHub Pages (2-5 min, Ctrl+Shift+R)
- Worker : `wrangler deploy` dans le dossier `cloudflare-worker/` (toujours `git pull origin main` avant)
- ⚠️ Après `wrangler deploy` : vérifier `wrangler secret list` que SUPABASE_URL est présent
- Tout le frontend dans `assets/app.js` — pas de séparation en modules
- Le nom exact de la clé Claude dans le worker est `CLAUDE_API_KEY` (pas `ANTHROPIC_API_KEY`)

---

## Historique des sessions

| Date | IA | Résumé |
|------|----|--------|
| 2026-04-19 | Claude sonnet-4-6 | Création SESSION.md + auth PIN session token (PR #16) |
| 2026-04-19 | Claude sonnet-4-6 | Alertes de prix + adaptation iPhone (PR #24) |
| 2026-04-19 | Claude sonnet-4-6 | Fix trades iPhone : worker mapping + loadTradesState + SW v6.1 |
| 2026-04-19 | Claude sonnet-4-6 | Chandeliers + pos-card + historique algo/manuel + fixes Supabase (PR #28+29) |
| 2026-04-19 | Claude sonnet-4-6 | Refonte Mes Trades + IA journal/priorité + auto-scan + sizing |
| 2026-04-19 | Claude sonnet-4-6 | Fix wipe historique + Fear&Greed + Trending + CSV + Performance + notifs enrichies |
