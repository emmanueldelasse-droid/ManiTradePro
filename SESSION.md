# SESSION – ManiTradePro
> **Fichier de continuité de session — à lire en PREMIER à chaque nouvelle session IA**

---

## Métadonnées
| Champ | Valeur |
|-------|--------|
| **Dernière mise à jour** | 2026-04-19 |
| **IA utilisée** | Claude (claude-sonnet-4-6) |
| **Branche active** | claude/confident-pasteur-5tWej → main |
| **Repo GitHub** | emmanueldelasse-droid/ManiTradePro |
| **Déployé sur** | GitHub Pages + Cloudflare Worker |
| **Worker URL** | `https://manitradepro.emmanueldelasse.workers.dev` |

---

## Stack technique
- **Type** : PWA — iPhone + web, vanilla JS, zéro dépendances
- **Frontend** : `assets/app.js` (~4700 lignes) + `assets/styles.css`
- **APIs marché** : Binance, Twelve Data (4 clés en rotation), Yahoo Finance, CoinGecko, Alpha Vantage, Finnhub, Claude AI
- **Sync cross-device** : Supabase (dont quota Claude AI partagé)
- **Proxy CORS** : Cloudflare Worker `cloudflare-worker/worker.js` (pour Binance iOS Safari)
- **EUR/USD** : Sourcé depuis Yahoo Finance `EURUSD=X` (PAS Binance EURUSDT — erreur systématique de 32% corrigée)
- **Auth admin** : PIN → session token HMAC-SHA256 24h (depuis PR #16)

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
- [x] **Auth PIN → session token 24h** (PR #16 mergée le 2026-04-19)
  - POST `/api/session` → valide ADMIN_PIN, retourne token signé HMAC-SHA256
  - Token stocké dans `mtp_session_v1`, envoyé en header `X-Session-Token`
  - Modal PIN accessible depuis Réglages (une seule fois, auto-renouvellement)
  - Bouton connect/disconnect dans Réglages
- [x] Sync Supabase (optionnel, activable dans Réglages)
- [x] **Bouton "Synchroniser" dans "Mes trades"** (PR #20 mergée le 2026-04-19)
  - Force le push des trades locaux vers Supabase
  - Résout le bug des trades invisibles sur iPhone
  - Feedback visuel "Sync..." pendant l'opération
- [x] **Statut de marché en temps réel** sur les cartes et fiches (PR #18 + #20)
  - Badge ouvert/fermé/pré-marché sur cartes opportunités, fiches actif, trades ouverts
- [x] Thème sombre premium
- [x] Bandeau régime de marché (bull/bear/lateral)
- [x] Seuils watchlist calibrés par type d'asset (crypto vs actions/ETF)
- [x] Labels sécurité sur les cartes d'assets

### Ce qui est cassé / en cours
- [ ] Alertes de prix (non implémentées)
- [ ] Graphiques en chandeliers (non implémentés)
- [ ] Journal de trading dédié (partiellement via algo journal)
- [ ] Rapports PDF hebdomadaires (non implémentés)

---

## Dernière session

**Date** : 2026-04-19
**IA** : Claude (claude-sonnet-4-6)

### Tâches accomplies
- Mise en place du système de continuité SESSION.md
- **PR #18** : Statut de marché en temps réel (ouvert/fermé/pré-marché/post-marché) sur les cartes opportunités, fiches actif et trades ouverts
- **PR #20** : Bouton "Synchroniser" dans "Mes trades" pour forcer le push vers Supabase (résout trades invisibles sur iPhone) + market hours sur les trades

### Bugs résolus
- Trades invisibles sur iPhone → résolu via bouton Synchroniser (force sync Supabase)

### Décisions techniques prises
- `ADMIN_PIN` = mot de passe simple dans les secrets Cloudflare
- `ADMIN_API_TOKEN` reste la clé de signature HMAC (ne pas confondre les deux)
- Session token valable 24h, stocké en localStorage
- Le sync Supabase est déclenché manuellement depuis "Mes trades" (pas de sync automatique silencieux)

### Fichiers modifiés
| Fichier | Changement |
|---------|------------|
| `assets/app.js` | PR #18 : badges marché temps réel sur cartes/fiches/trades |
| `assets/app.js` | PR #20 : +11 lignes — bouton Synchroniser + event listener async |

---

## Prochaine étape prioritaire

> **TODO #1** : Implémenter les **alertes de prix** — notification push (PWA) ou alerte in-app quand un asset dépasse un seuil configuré par l'utilisateur

**Fonctionnalités planifiées (backlog)**
- [ ] Alertes de prix (priorité 1)
- [ ] Graphiques en chandeliers
- [ ] Journal de trading dédié (export CSV/PDF)
- [ ] Rapports PDF hebdomadaires
- [ ] Mode hors-ligne complet (cache SW)

---

## Contraintes de déploiement
- Déploiement frontend via **GitHub web UI** ou push git (pas de CLI local sur PC bureau)
- Déploiement worker via **Wrangler CLI** ou dashboard Cloudflare
- Réseau corporate peut bloquer les API externes (tester depuis mobile)
- Tout le frontend doit rester dans `assets/app.js` — pas de séparation en modules
- `wrangler.toml` dans `cloudflare-worker/` configure le worker

---

## Historique des sessions

| Date | IA | Résumé |
|------|----|--------|
| 2026-04-19 | Claude sonnet-4-6 | Création SESSION.md + PR #16 auth PIN session token |
| 2026-04-19 | Claude sonnet-4-6 | PR #18 statut marché temps réel + PR #20 bouton Synchroniser |
