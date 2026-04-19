# SESSION – ManiTradePro
> **Fichier de continuité de session — à lire en PREMIER à chaque nouvelle session IA**

---

## Métadonnées
| Champ | Valeur |
|-------|--------|
| **Dernière mise à jour** | 2026-04-19 |
| **IA utilisée** | Claude (claude-sonnet-4-6) |
| **Branche active** | `claude/check-system-oNPEA` (PR #24 ouverte → main) |
| **Repo GitHub** | emmanueldelasse-droid/ManiTradePro |
| **Déployé sur** | GitHub Pages + Cloudflare Worker |
| **Worker URL** | `https://manitradepro.emmanueldelasse.workers.dev` |

---

## Stack technique
- **Type** : PWA — iPhone + web, vanilla JS, zéro dépendances
- **Frontend** : `assets/app.js` (~5100 lignes) + `assets/styles.css`
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
- [x] **Auth PIN → session token 24h** (PR #16)
- [x] Sync Supabase (optionnel, activable dans Réglages)
- [x] Thème sombre premium + thème clair
- [x] Bandeau régime de marché (bull/bear/lateral)
- [x] Seuils watchlist calibrés par type d'asset (crypto vs actions/ETF)
- [x] Labels sécurité sur les cartes d'assets
- [x] Statut marché temps réel (ouvert/fermé/heures) sur cartes et détail
- [x] Bouton sync manuel portfolio → Supabase
- [x] **Alertes de prix** (PR #24 en cours de merge)
  - Onglet "Alertes ◉" dans la nav du bas
  - Bouton "+ Alerte prix" sur chaque fiche d'actif
  - Modal : condition au-dessus/en-dessous + prix cible
  - Vérification automatique à chaque refresh
  - Notification navigateur (Web Notifications API) + toast in-app
  - Historique des alertes déclenchées
- [x] **Adaptation iPhone complète** (PR #24 en cours de merge)
  - `apple-mobile-web-app-capable` + `status-bar-style: black-translucent`
  - `-webkit-tap-highlight-color: transparent`
  - `100dvh` + `-webkit-fill-available` (corrige bug iOS barre d'adresse)
  - `font-size: 16px` sur tous les inputs (empêche zoom iOS)
  - `-webkit-appearance: none` sur tous les inputs
  - `min-height: 44px` sur boutons, inputs, nav items (Apple HIG)
  - `overflow-x: hidden` partout (corrige débordement horizontal)
  - Padding bas dynamique `calc(bottomnav + safe-bottom + 20px)`
  - `-webkit-overflow-scrolling: touch` + `overscroll-behavior: contain`
  - Safe-area insets top/left/right/bottom
  - Breakpoints iPhone SE/mini (≤390px) et paysage (hauteur ≤500px)

### Ce qui est cassé / en cours
- [ ] Graphiques en chandeliers (non implémentés)
- [ ] Journal de trading dédié (partiellement via algo journal)
- [ ] Rapports PDF hebdomadaires (non implémentés)
- [ ] Erreur Supabase `decision column` — colonne manquante dans le schéma DB (à corriger côté Supabase)

---

## Dernière session

**Date** : 2026-04-19
**IA** : Claude (claude-sonnet-4-6)

### Tâches accomplies
1. **Alertes de prix** — système complet
   - Storage `mtp_price_alerts_v1`, fonctions load/save/add/remove/check/notify
   - Onglet "Alertes" dans bottom nav, page dédiée, modal d'ajout depuis fiche actif
   - `checkPriceAlerts()` hookée dans `setOpportunities()`
   - Browser Notification API + toast in-app
2. **Adaptation iPhone complète**
   - index.html : meta tags iOS PWA
   - styles.css : 100dvh, tap-highlight, safe-area, touch targets 44px, overflow-x:hidden
   - Correction overflow horizontal (texte qui débordait à droite sur tous les écrans)
   - `remoteStatusText()` : erreurs JSON tronquées/masquées proprement
   - Sous-titre "Mes trades" raccourci

### Bugs résolus
- Contenu débordant horizontalement sur iPhone (overflow-x manquant)
- Erreur Supabase JSON brute affichée en plein écran
- Zoom automatique iOS au focus sur les champs de saisie
- Flash gris au toucher des boutons/items
- Barre d'adresse Safari qui cassait la hauteur 100vh

### Décisions techniques prises
- `overflow-x: hidden` sur `.app-shell`, `.main-content`, `.screen` pour bloquer le scroll horizontal
- `word-break: break-word` + `overflow-wrap: anywhere` sur tous les conteneurs de texte
- `setting-row > div { flex:1; min-width:0 }` pour que le texte se contracte sans pousser le toggle hors écran
- Bottom nav à 68px (au lieu de 64) pour meilleure accessibilité

### Fichiers modifiés
| Fichier | Changement |
|---------|------------|
| `assets/app.js` | +350 lignes — alertes de prix, subtitle raccourci, erreur tronquée |
| `assets/styles.css` | +110 lignes — adaptation iPhone complète, overflow fixes |
| `index.html` | +4 lignes — meta tags iOS |

---

## Prochaine étape prioritaire

> **TODO #1** : Merger la PR #24 sur GitHub (`claude/check-system-oNPEA` → `main`)

> **TODO #2** : Corriger l'erreur Supabase `PGRST204 — 'decision' column of 'mtp_trades' in the schema` — ajouter la colonne `decision` dans le schéma Supabase

**Fonctionnalités planifiées (backlog)**
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
| 2026-04-19 | Claude sonnet-4-6 | Alertes de prix + adaptation iPhone complète (PR #24) |
