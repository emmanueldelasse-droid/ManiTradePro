# SESSION – ManiTradePro
> **Fichier de continuité de session — à lire en PREMIER à chaque nouvelle session IA**

---

## Métadonnées
| Champ | Valeur |
|-------|--------|
| **Dernière mise à jour** | 2026-04-19 |
| **IA utilisée** | Claude (claude-sonnet-4-6) |
| **Branche active** | main |
| **Repo GitHub** | emmanueldelasse-droid/ManiTradePro |
| **Déployé sur** | GitHub Pages + Cloudflare Worker |

---

## Stack technique
- **Type** : PWA — iPhone + web, vanilla JS, zéro dépendances
- **Bundle** : `assets/app.js` (~4 700 lignes) + `cloudflare-worker/worker.js` (~4 100 lignes)
- **APIs** : Binance, Twelve Data (4 clés en rotation), Yahoo Finance, CoinGecko, Alpha Vantage, Finnhub, Claude AI (Anthropic)
- **Sync cross-device** : Supabase (dont quota Claude AI partagé)
- **Proxy CORS** : Cloudflare Worker (pour Binance sur iOS Safari)
- **EUR/USD** : Sourcé depuis Yahoo Finance `EURUSD=X` (PAS Binance EURUSDT — erreur systématique de 32% corrigée)
- **Auth admin** : PIN simple → token signé HMAC-SHA256 (24h), stocké dans localStorage `mtp_session_v1`

## Indicateurs du moteur d'analyse (8)
ADX · EMA 50/100 · Donchian 55/20 · RSI · ATR · Momentum · Volume · Volatilité
→ Score de risque 0–100

## Règle absolue
> ❌ **JAMAIS** afficher un prix fictif, périmé ou inventé — toujours un état de chargement si les données ne sont pas disponibles

---

## État actuel du projet

### Ce qui fonctionne
- [x] Moteur d'analyse avec 8 indicateurs → score de risque 0–100
- [x] Scanner d'opportunités en temps réel
- [x] Mode entraînement (paper trading) avec blocage par niveau de risque
- [x] Affichage des trades d'exploration dans l'UI d'entraînement
- [x] Auth admin par PIN → token HMAC-SHA256 signé 24h (PR #16, mergé)
- [x] Interface Réglages : statut de session + bouton connexion/déconnexion
- [x] Proxy CORS Cloudflare Worker avec rate limiting et cache KV
- [x] Labels de sécurité dans la vue détail d'un actif
- [x] Seuils de watchlist calibrés (actions/ETFs plus souples que crypto)
- [x] Service Worker pour fonctionnement offline partiel

### Ce qui est cassé / en cours
- [ ] Alertes de prix — non implémentées
- [ ] Graphiques en chandeliers — non implémentés
- [ ] Journal de trading — non implémenté
- [ ] Rapports PDF hebdomadaires — non implémentés

---

## Dernière session

**Date** : 2026-04-19
**IA** : Claude (claude-sonnet-4-6)

### Tâches accomplies
- Création du guide de continuité de session (SESSION.md system)
- Merge PR #16 : Auth automatique par PIN — plus besoin de coller un token manuellement
  - Worker : `createSessionToken` / `verifySessionToken` via HMAC-SHA256 (`crypto.subtle`)
  - Worker : endpoint `POST /api/session` → valide `ADMIN_PIN`, retourne token 24h
  - Worker : `requestHasAdminAccess` / `requireFrontAccess` / `requireAdminAccess` passés en async
  - Frontend : état de session persisté dans localStorage (`mtp_session_v1`)
  - Frontend : modal PIN dans Réglages — login unique, renouvellement auto
  - Frontend : `workerAdminHeaders()` préfère le token de session sur le token legacy
  - CSS : styles `modal-overlay`, `pin-modal`, `btn-primary/secondary`
- Mise à jour complète du SESSION.md avec l'état réel du projet

### Bugs résolus
- Token admin à coller manuellement → remplacé par PIN simple + session signée

### Décisions techniques prises
- `ADMIN_PIN` (mot de passe simple) dans les secrets Cloudflare
- `ADMIN_API_TOKEN` reste la clé de signature HMAC — ne change pas
- Sessions de 24h stockées côté client uniquement (pas de KV)
- Pas de module séparé — tout reste dans `app.js` et `worker.js`

### Fichiers modifiés
| Fichier | Changement |
|---------|------------|
| `cloudflare-worker/worker.js` | +createSessionToken, +verifySessionToken, +POST /api/session, auth functions async |
| `assets/app.js` | +modal PIN, +workerAdminHeaders(), +affichage statut session dans Réglages |
| `assets/styles.css` | +modal-overlay, +pin-modal, +btn-primary/secondary |

---

## Prochaine étape prioritaire

> **TODO #1** : Implémenter les alertes de prix (price alerts)
> Notification push ou in-app quand un actif franchit un seuil défini par l'utilisateur.
> Techniquement : stocker les alertes dans KV Cloudflare, cron job du worker vérifie toutes les 30 min.

**Fonctionnalités planifiées (backlog)**
- [ ] Alertes de prix (priorité haute)
- [ ] Graphiques en chandeliers
- [ ] Journal de trading
- [ ] Rapports PDF hebdomadaires

---

## Contraintes de déploiement
- Déploiement via **GitHub web UI uniquement** (pas de Git en local sur PC bureau)
- Réseau corporate bloque les API externes
- Tout doit rester dans `assets/app.js` — pas de séparation en modules
- Worker déployé via Cloudflare Dashboard ou Wrangler en CLI (pas via UI GitHub)
- Cron jobs worker : toutes les 30 min + toutes les 2h pendant les heures de trading

---

## Historique des sessions

| Date | IA | Résumé |
|------|----|--------|
| 2026-04-19 | Claude sonnet-4-6 | PR #16 mergé : auth PIN → token HMAC-SHA256. SESSION.md initialisé avec état complet du projet. |
