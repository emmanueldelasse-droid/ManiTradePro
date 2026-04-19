# SESSION – ManiTradePro
> **Fichier de continuité de session — à lire en PREMIER à chaque nouvelle session IA**

---

## Métadonnées
| Champ | Valeur |
|-------|--------|
| **Dernière mise à jour** | 2026-04-19 |
| **IA utilisée** | Claude (claude-sonnet-4-6) |
| **Branche active** | main (PR #20 en attente de merge) |
| **Repo GitHub** | emmanueldelasse-droid/ManiTradePro |
| **Déployé sur** | GitHub Pages + Cloudflare Worker |
| **Worker URL** | `https://manitradepro.emmanueldelasse.workers.dev` |

---

## Stack technique
- **Type** : PWA — iPhone + web, vanilla JS, zéro dépendances
- **Frontend** : `assets/app.js` (~4800 lignes) + `assets/styles.css`
- **Backend** : `cloudflare-worker/worker.js` (~4100 lignes), déployé via `wrangler deploy`
- **APIs marché** : Binance, Twelve Data (4 clés en rotation), Yahoo Finance, CoinGecko, Alpha Vantage, Finnhub, Claude AI
- **Sync cross-device** : Supabase — tables `mtp_positions` + `mtp_trades`
- **Proxy CORS** : Cloudflare Worker (pour Binance iOS Safari)
- **EUR/USD** : Sourcé depuis Yahoo Finance `EURUSD=X` (PAS Binance EURUSDT — erreur systématique de 32% corrigée)
- **Auth admin** : PIN → session token HMAC-SHA256 24h (depuis PR #16)

## Indicateurs du moteur d'analyse (8)
ADX · EMA 50/100 · Donchian 55/20 · RSI · ATR · Momentum · Volume · Volatilité
→ Score de risque 0–100

## Secrets Cloudflare requis
| Secret | Rôle |
|--------|------|
| `ADMIN_API_TOKEN` | Clé de signature HMAC pour les session tokens |
| `ADMIN_PIN` | Mot de passe simple saisi dans le modal PIN |
| `SUPABASE_URL` | URL du projet Supabase (ex: `https://xxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Clé anon Supabase |
| `ANTHROPIC_API_KEY` | Clé Claude AI pour les reviews de trades |
| `TWELVE_DATA_KEY_1..4` | 4 clés Twelve Data en rotation |

⚠️ `wrangler deploy` efface les vars dashboard non présentes dans `wrangler.toml` — toujours utiliser `wrangler secret put` pour les secrets sensibles, pas les vars dashboard.

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
- [x] Worker Cloudflare sécurisé — auth PIN → session token HMAC-SHA256 24h
  - POST `/api/session` → valide `ADMIN_PIN`, retourne token signé avec `ADMIN_API_TOKEN`
  - Token stocké dans `mtp_session_v1`, envoyé en header `Authorization: Bearer`
  - Modal PIN dans Réglages (saisie unique, renouvellement automatique)
- [x] Sync Supabase cross-device (positions + historique)
- [x] Thème sombre premium + thème clair
- [x] Bandeau régime de marché (bull/bear/lateral)
- [x] **Statut de marché en temps réel** sur cartes opportunités, fiches actif, trades ouverts (PR #20)
  - Badge coloré : vert=ouvert, orange=pré-marché/après-bourse, rouge=fermé
  - Heures affichées en heure de Paris (DST automatique via `Intl`)
  - Crypto 24/7, Forex Lun–Ven, CME Globex matières premières, NYSE/NASDAQ actions/ETF
- [x] Bouton "Synchroniser" manuel dans Mes trades (PR #20)

### Ce qui est cassé / en cours
- [ ] PR #20 en attente de merge (statut marché + fix sync + bouton sync)
- [ ] Alertes de prix (non implémentées)
- [ ] Rapports PDF hebdomadaires (non implémentés)
- [ ] Fear & Greed Index (désactivé, retourne placeholder)
- [ ] Trending Assets (désactivé, retourne placeholder)

---

## Dernière session

**Date** : 2026-04-19
**IA** : Claude (claude-sonnet-4-6)

### Tâches accomplies
1. **Auth PIN session token** (PR #16, mergée)
   - Worker : `createSessionToken` / `verifySessionToken` via `crypto.subtle`
   - Worker : `POST /api/session`, auth async sur toutes les routes protégées
   - Frontend : modal PIN, session localStorage, statut dans Réglages
2. **Déploiement Worker** via `wrangler deploy` depuis `C:\Users\Emman\Documents\ManiTradePro\cloudflare-worker`
3. **Statut de marché temps réel** sur les 3 surfaces (PR #20, en attente)
   - `getMarketStatus()`, `inferAssetClass()`, `renderMarketBadge()`
   - Intégré dans `renderOppRow`, `renderDetail`, `renderPositionRow`
4. **Fix sync Supabase automatique** (PR #20, en attente)
   - Bug : `localHasFewerOpenPositions` vérifiait `local < remote` au lieu de `local > remote`
   - Fix : ajout `localHasMoreOpenPositions` + `remoteIsEmpty` dans `preferLocal`
5. **Bouton "Synchroniser"** manuel dans Mes trades (PR #20)

### Bugs résolus
- Worker auth : token collé manuellement → remplacé par login PIN one-shot
- Sync Supabase : trades locaux non envoyés quand Supabase était vide (condition inversée)
- `wrangler deploy` avait effacé `SUPABASE_URL` → re-ajouté via `wrangler secret put SUPABASE_URL`

### Décisions techniques prises
- `ADMIN_PIN` = mot de passe court dans Cloudflare secrets (distinct de `ADMIN_API_TOKEN`)
- `ADMIN_API_TOKEN` = clé de signature HMAC uniquement (ne jamais l'exposer)
- `wrangler deploy` ne touche pas aux secrets, mais écrase les vars dashboard → toujours utiliser `wrangler secret put`

### Fichiers modifiés (cette session)
| Fichier | Changement |
|---------|------------|
| `assets/app.js` | Modal PIN, session state, statut marché, fix sync, bouton sync |
| `assets/styles.css` | Styles modal PIN, badge marché |
| `cloudflare-worker/worker.js` | Session token HMAC, POST /api/session, auth async |

---

## Prochaine étape prioritaire

> **TODO #1** : Merger la **PR #20** puis vérifier que les trades s'affichent sur iPhone

> **TODO #2** : Implémenter les **alertes de prix** — notification push (PWA) ou alerte in-app quand un asset dépasse un seuil configuré

**Fonctionnalités planifiées (backlog)**
- [ ] Alertes de prix (priorité 1)
- [ ] Rapports PDF hebdomadaires
- [ ] Fear & Greed Index (réactiver)
- [ ] Journal de trading dédié (export CSV)
- [ ] Mode hors-ligne complet

---

## Contraintes de déploiement
- Déploiement frontend : push git → GitHub Pages (branche `main`)
- Déploiement worker : `cd C:\Users\Emman\Documents\ManiTradePro\cloudflare-worker` puis `wrangler deploy`
- ⚠️ Après chaque `wrangler deploy`, vérifier que `SUPABASE_URL` est toujours présent (`wrangler secret list`)
- Tout le frontend doit rester dans `assets/app.js` — pas de séparation en modules

---

## Historique des sessions

| Date | IA | Résumé |
|------|----|--------|
| 2026-04-19 | Claude sonnet-4-6 | Auth PIN session token + statut marché temps réel + fix sync Supabase |
| 2026-04-19 | Claude sonnet-4-6 | Création SESSION.md + PR #16 auth PIN |
