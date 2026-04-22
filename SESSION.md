# SESSION – ManiTradePro
> **Fichier de continuité de session — à lire en PREMIER à chaque nouvelle session IA**

> ⚠️ **RÈGLE IMPÉRATIVE** : Mettre à jour ce fichier **après chaque évolution**, pas en fin de session.
> Chaque commit = une mise à jour SESSION.md. Ne pas attendre la "fin" pour documenter.

---

## Métadonnées
| Champ | Valeur |
|-------|--------|
| **Dernière mise à jour** | 2026-04-22 (audit bot + règles objectif final) |
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
- [x] **SVG icons** — icônes Unicode remplacées par SVG inline (sidebar + bottom nav)
- [x] **Touch targets 44px** — `.chart-tf-btn`, `.alert-remove-btn`, `.chip` corrigés
- [x] **Focus-visible** — styles `:focus-visible` sur tous les éléments interactifs
- [x] **prefers-reduced-motion** — media query respectée (animations désactivées)
- [x] **Fix light theme bottom nav** — sélecteur `.bottom-nav-item` → `.bnav-item` corrigé
- [x] **Fix bouton "Ouvrir la fiche"** — `data-open-detail` n'avait aucun event listener
- [x] **Fix trending pills** — même cause que ci-dessus, maintenant fonctionnels
- [x] **Fix grille métriques dashboard** — `display:grid` manquant sur `.dashboard-signal-metrics`
- [x] **Audit complet** — 31 attributs `data-*` vérifiés, 2 listeners morts identifiés (non bloquants)

### Ce qui est cassé / en cours
- [ ] Rapports PDF hebdomadaires (non implémentés)
- [ ] Trending Assets — données CoinGecko présentes mais affichage conditionnel (s'affiche seulement si données chargées)
- [ ] Mode hors-ligne complet (cache SW)

---

## Dernière session (session 8)

**Date** : 2026-04-21
**IA** : Claude (claude-opus-4-7) — branche `claude/next-task-Tirv5`

### Tâches accomplies
1. **Audit complet des attributs `data-*`** — recensement de tous les sélecteurs dans `bindEvents()` vs templates émetteurs.
2. **Fix bouton Rafraîchir opportunités** — template émettait `data-refresh="opps"` mais le listener cherchait `data-refresh="opportunities"` (mismatch). Aligné sur `"opportunities"`. Le bouton était non fonctionnel.
3. **Nettoyage sélecteur mort `.ai-card[data-symbol]`** — classe `.ai-card` inexistante dans les templates JS (seulement dans le CSS). Sélecteur simplifié à `.opp-row[data-symbol]` seul.
4. **Vérification TODO #1 session 7** — `data-add-trade` et `data-setting-input` n'existent pas (déjà nettoyés ou nom erroné). TODO clos.
5. **Audit iPhone exhaustif** — 20 problèmes identifiés, classés P0/P1/P2 avec effort estimé. Plan de refonte en 3 sprints intégré dans "Prochaine étape prioritaire".
6. **Sprint 1 iPhone livré (P0.1 → P0.4)** — 4 commits :
   - `0bd0c34` scroll lock + modal scroll + backdrop tap close
   - `8802c1e` clavier virtuel via visualViewport + scrollIntoView
   - `0023410` back-swipe iOS via history API (pushState drill-down, replaceState tabs, popstate listener)
   - `381e218` pull-to-refresh dashboard/opportunités/portfolio/alerts avec haptique
7. **Sprint 2 iPhone livré (P1.5, P1.6, P1.7, P1.10)** :
   - `6131bf7` bottom-nav 5 items + menu Plus
   - `e1d1d8d` sticky filter bar opportunités + scroll horizontal chips
   - `35fa4ec` chart plein écran avec back-swipe iOS
   - `020015c` audit overflow 320-390px (regime-banner, grids mobile, ellipsis bnav)
8. **Auto-update SW (`176524d`)** — assets en network-first, `updateViaCache:"none"`, controllerchange reload auto, check update 5 min + visibilitychange.
9. **Agent Claude Code bug-hunter (`4a82219`)** — 6 classes de bugs UI récurrentes documentées.
10. **CLAUDE.md (`8935ec9`)** — règle workflow git permanente.
11. **Actifs personnalisables livrés (`de28c91`, PR #46)** — user peut ajouter ses propres symboles (crypto, actions, ETF, forex, matière première) au scan via Réglages → "Actifs surveillés". Table Supabase `mtp_user_assets`, limite 50 customs, validation provider à l'ajout, 35 core protégés. Migration SQL dans `cloudflare-worker/migrations/001_mtp_user_assets.sql`.
12. **Fix pull-to-refresh iPhone PWA (PR #47)** — le geste ne fonctionnait plus. Diagnostic par l'agent bug-hunter : deux causes cumulées.
    - `1fb88f6` : l'indicateur `.ptr-indicator` (position:fixed) était clippé car rendu dans `.app-shell` qui a `overflow:hidden + isolation:isolate`. Sur iOS Safari, ces propriétés sur un ancêtre créent un containing block qui clippe même les fixed descendants. → Injection une seule fois dans `#app` via `insertAdjacentHTML`. Corrigé aussi `touchstart` qui était `passive:true` (iOS ignorait alors le `preventDefault` du touchmove).
    - `10dbbec` : avec `overscroll-behavior-y:contain` sur `.main-content`, iOS marque les `touchmove` comme non-cancelable AVANT la phase bubble sur document. Les 3 listeners (touchstart/touchmove/touchend) passent en `{capture:true, passive:false}` pour précéder le scroll engine.
13. **Hook proactif bug-hunter (`f8fcb17`, PR #47)** — `.claude/settings.json` avec `PostToolUse` qui se déclenche uniquement sur `Edit|Write` de `assets/app.js`, `assets/styles.css` ou `cloudflare-worker/worker.js`. Injecte un system-reminder qui pousse Claude à lancer `bug-hunter` en arrière-plan après chaque édition dans les 3 fichiers monolithiques. Silencieux sur les autres fichiers. Activation session actuelle via `/hooks` menu ; sessions futures : auto.
14. **SESSION.md** — plan de refonte iPhone + Sprints 1/2/3 cochés + actifs custom + PTR fix + hook documentés.

## Boucle de chasse aux bugs automatique

**Principe.** Chaque édition dans les 3 fichiers monolithiques (`assets/app.js`, `assets/styles.css`, `cloudflare-worker/worker.js`) déclenche automatiquement l'agent `bug-hunter` en arrière-plan. Il scanne les 6 classes de bugs UI récurrentes documentées dans `.claude/agents/bug-hunter.md` et corrige ce qu'il trouve.

**Comment ça marche :**
- **Hook PostToolUse** dans `.claude/settings.json` filtre les Edit/Write par regex sur file_path.
- **Match** → émet un `hookSpecificOutput.additionalContext` qui nudge Claude à lancer `Agent(subagent_type="bug-hunter", run_in_background=true)`.
- **No match** (ex. SESSION.md, CLAUDE.md, migration SQL) → silencieux.
- L'agent rapporte son diagnostic + fix appliqué quand il termine.

**Déjà utilisé avec succès** : diagnostic + fix du PTR iPhone en 4 min (voir commits `1fb88f6` + `10dbbec` dans l'historique session 8).

**Limite honnête** : "en permanence" = à chaque édition dans une session Claude Code active, pas 24/7. Un deploy en prod sans Claude Code ne déclenche rien.

---

## Fichiers modifiés (session 8)
| Fichier | Changement |
|---------|------------|
| `assets/app.js` | Fix `data-refresh` + suppression `.ai-card` + `navigate()` avec history API + popstate + `visualViewport` + pull-to-refresh + focusin scrollIntoView + backdrop modal close + toggle `html.has-modal` |
| `assets/styles.css` | `.ptr-indicator` (spinner + anim), `.modal-overlay` utilise `--vv-height`/`--vv-offset-top`, `.modal-box` max-height respectant safe-area + scroll interne, `html.has-modal` scroll lock |
| `SESSION.md` | Session 8 + Sprint 1 livré, checkboxes P0 cochées |

---

## Session précédente (session 7)

**Date** : 2026-04-20
**IA** : Claude (claude-sonnet-4-6) — session `016LshGrx2qNfVfgyR5r6DsK`

### Tâches accomplies
1. **SVG icons** — icônes Unicode (⌂◎◉◫◈◦) → SVG inline Lucide dans sidebar + bottom nav
2. **Fix light theme bottom nav** — sélecteur `.bottom-nav-item` inexistant → `.bnav-item`
3. **Touch targets 44px** — `.chart-tf-btn` (32→44px), `.alert-remove-btn`, `.chip`
4. **Accessibilité** — `:focus-visible`, `prefers-reduced-motion`, `line-height:1.6`, `scroll-behavior:smooth`
5. **Modal iPhone** — `padding` avec `safe-area-inset` pour notch/Dynamic Island
6. **Fix `data-open-detail`** — event listener manquant → bouton "Ouvrir la fiche" + trending pills non fonctionnels
7. **Fix `.dashboard-signal-metrics`** — `display:grid` manquant → KPI restaient en colonne
8. **Audit complet** — 31 attributs `data-*` vérifiés sur toute l'app, 2 listeners morts identifiés (non bloquants)
9. **Nettoyage PRs** — PR #39 mergée, PR #35/#21/#17/#2 fermées (conflits irréparables)
10. **SESSION.md** — règle de mise à jour continue ajoutée

### Fichiers modifiés (session 7)
| Fichier | Changement |
|---------|------------|
| `assets/app.js` | SVG icons dans navItems, event listener `data-open-detail` |
| `assets/styles.css` | Touch targets, focus-visible, prefers-reduced-motion, display:grid metrics, light theme fix |
| `SESSION.md` | Mise à jour session 7 + règle mise à jour continue |

---

## Session précédente (session 6)

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

## Prochaine étape prioritaire — Refonte iPhone (Phase 2)

Audit iPhone complet réalisé session 8. Plan de refonte en 3 sprints, un commit par item, validation device à chaque écran.

### Sprint 1 — Fondations iPhone (P0) — ✅ LIVRÉ session 8
- [x] **P0.1** Clavier virtuel iOS — CSS vars `--vv-height`/`--vv-offset-top` via `visualViewport.resize` + `scrollIntoView` sur focus dans modals.
- [x] **P0.2** Back-swipe iOS — `history.pushState` (asset-detail) / `replaceState` (tabs) + `popstate` listener. Ferme aussi les modals ouverts.
- [x] **P0.3** Pull-to-refresh sur dashboard/opportunités/portfolio/alerts — indicateur `.ptr-indicator` animé via `--ptr-pull`, seuil 60 px, vibration 10 ms.
- [x] **P0.4** Body scroll lock (`html.has-modal`) + scroll interne `.modal-box` (max-height respectant safe-area) + tap backdrop ferme modal Alerte/PIN.

### Sprint 2 — Navigation & contenu (P1) — ✅ LIVRÉ session 8 (sauf P1.8 déféré)
- [x] **P1.5** Bottom-nav 5 items — 4 principaux + bouton "Plus" ouvrant menu flottant avec Performance + Réglages. Sidebar desktop inchangée.
- [x] **P1.7** Sticky filter bar opportunités — position:sticky top:0 avec backdrop blur, chips en scroll horizontal au lieu de wrap.
- [x] **P1.6** Chart plein écran — bouton ⛶ ouvre overlay plein écran avec × et back-swipe iOS pour fermer. initCandlestickChart utilise clientHeight dynamique.
- [x] **P1.10** Audit overflow 320-390 px — fix regime-banner (même bug que plan-card), grids 4→2 cols sous 520px, ellipsis sur labels bottom-nav.
- [~] **P1.9** Bouton retour fiche actif — géré par P0.2 back-swipe iOS. Bouton `← Retour` existant reste en place en fallback.
- [ ] **P1.8** Swipe actions positions/alertes — **DÉFÉRÉ** (polish, 3-4h de JS tactile complexe, faible valeur vs autres items livrés).

### Sprint 3 — Polish natif iPhone (P2) — ✅ LIVRÉ session 8
- [x] **P2.11** Haptique `navigator.vibrate` sur navigation (5 ms), toggles (8), P2R (10), suppr alerte (15), clôture 50% / confirm trade ([15,*,15]), clôture trade ([20,40,20]), clear historique ([30,60,30]).
- [x] **P2.12** Transitions écrans via View Transitions API (Safari 18+ / Chrome 111+). `transitionalRender()` wrappe `render()` dans `document.startViewTransition`. Fallback = render direct. CSS ::view-transition root 220 ms easing iOS, désactivé en reduced-motion.
- [x] **P2.13** Auto-thème `prefers-color-scheme` — toggle "Suivre le thème système" dans Réglages. `effectiveLightTheme()` lit matchMedia si autoTheme actif. Re-render sur changement système. Le toggle light est disabled quand auto est on.
- [x] **P2.14** `transform:scale(.97)` + transition .08s sur `.btn:active`, `.chip:active`, `.bnav-item:active`, `.nav-item:active`, `.chart-tf-btn:active`, `.trending-pill:active`, `.more-menu-item:active`, `.opp-row:active`, `.alert-row:active`, `.trade-card-row:active`, `.dashboard-feature-card.is-clickable:active`.
- [x] **P2.15** `<meta theme-color>` dynamique via `applyThemeMode` — `#0a0e1a` en dark, `#f4f7fb` en light, suit aussi l'auto-thème.
- [x] **P2.16** `inputmode="decimal"` sur alerte prix, `inputmode="numeric" pattern="[0-9]*"` sur PIN.
- [x] **P2.17** `-webkit-user-select:none` + `user-select:none` sur `.btn`, `.chip`, `.nav-item`, `.bnav-item`, `.chart-tf-btn`, `.trending-pill`, `.more-menu-item`, `.section-title`.
- [x] **P2.18** Bannière "Ajouter à l'écran d'accueil" iOS — détection UA iPhone + !standalone + !dismissed. Bouton ✕ persiste via `mtp_a2hs_dismissed_v1`. Masquée >860px.
- [x] **P2.20** Audit fonts — bump `.ai-stat-lbl` 0.68→0.72 rem. Kicker labels uppercase restent à 0.65-0.68 (style iOS section header standard). `.bnav-item 0.55rem` documenté intentionnel (fit iPhone SE).

### Backlog (pas dans les sprints)
- [ ] **P2.19** Offline complet — cache SW (déjà dans le backlog historique, P2 mais lourd)
- [ ] Rapports PDF hebdomadaires
- [ ] Web Push VAPID (notifications app fermée)
- [ ] Actifs personnalisables (priorité #1 produit selon section "manques")

### Vérifs device physique (à faire par l'utilisateur)
- Tap status-bar = scroll-to-top ?
- `.modal-overlay` bien positionné avec notch / Dynamic Island ?
- `safe-area-inset-top` non utilisé dans les écrans — vérifier que le header ne passe pas sous la barre d'état
- Focus sur `pin-input` et `alert-target-price` remonte-t-il la vue ?

### Contraintes de déploiement
- Frontend : push sur `main` → GitHub Pages (2-5 min, Ctrl+Shift+R)
- Worker : `wrangler deploy` dans `cloudflare-worker/` (`git pull origin main` avant)

### TODOs non iPhone (conservés)
- Nettoyage CSS `.ai-card` (lignes 135, 162, 239, 449, 450, 1230) — classe non émise par aucun template

**Fonctionnalités backlog**
- [ ] Rapports PDF hebdomadaires
- [ ] Mode hors-ligne complet (cache SW)
- [ ] Web Push VAPID (notifications app fermée)

---

## Analyse des manques — ce qui fait défaut au bot

### Critique — le bot ne peut pas vraiment trader
1. **Pas d'exécution réelle** — tout est manuel. Propose des trades mais ne peut pas en ouvrir sur Binance/broker. C'est un assistant de décision, pas un bot autonome.
2. **Pas de gestion automatique des stops** — si le prix touche le stop loss en pleine nuit, aucune action, aucune alerte automatique.

### Important — qualité des signaux
3. **Liste d'actifs fixe** ⭐ *priorité #1* — 35 actifs codés en dur dans le worker. Impossible d'ajouter un actif personnalisé (ex: BNB, SOL, une action spécifique).
4. **Pas de backtesting** — impossible de valider la stratégie sur données historiques.
5. **Multi-timeframe non fusionné** — signaux crypto sur 1J/4H/1H mais le score final ne fusionne pas vraiment les 3 timeframes.

### Pratique — suivi des trades
6. **Pas de notes sur les trades** — impossible d'annoter pourquoi on a pris une entrée/sortie. Essentiel pour progresser.
7. **Alerte "signal disparu"** — notifié quand un signal apparaît mais pas quand il s'annule.

### Infrastructure
8. **Web Push VAPID** — notifications quand l'app est fermée (nécessite VAPID key pair + Supabase pour stocker les subscriptions)
9. **Rapports PDF hebdomadaires**

---

## Objectif final — Bot de trading autonome long/short

> **Règle permanente — direction produit.** ManiTradePro doit évoluer vers un bot **autonome** qui prend des positions **long et short**, apprend de chaque trade clos, et valide ses règles sur de la donnée historique. Toute nouvelle feature doit être évaluée contre cet objectif : est-ce qu'elle rapproche l'app de cet état cible ?

### Analogie pour cadrer les décisions
- **Aujourd'hui** : l'app est un **prof** qui regarde le marché et propose des trades. L'utilisateur décide et exécute.
- **Demain** : l'app doit devenir un **élève** qui joue seul, revoit ses matchs, corrige ses erreurs, et sait attaquer à la hausse comme à la baisse.

### Les 4 règles du bot

#### Règle #1 — Apprendre de chaque trade clos
Chaque clôture doit produire **une donnée exploitable**, pas juste un P/L. À implémenter :
- Table `mtp_trade_feedback` : `trade_id`, `exit_reason` ∈ {SL, TP, manual, timeout}, `mae_pct` (max drawdown intra-trade), `mfe_pct` (max profit intra-trade).
- Le MAE/MFE est essentiel : il dit si le stop était trop serré ou le TP trop gourmand.
- Agrégation toutes les 10–20 clôtures : `win_rate × expectancy` par bucket `setup × direction × régime`. Si un bucket a une expectancy négative sur 30+ trades, on relève son seuil ou on le désactive.
- Retrain hebdo des poids des 6 composantes du score via régression logistique (outcome binaire win/loss sur l'historique cumulé).
- **Seuil anti-bruit** : minimum 30 trades par bucket avant tout ajustement. Jamais ajuster sur 3 ou 5 trades — c'est du hasard.

#### Règle #2 — Savoir choisir long ou short
Aujourd'hui le moteur détecte `direction: "short"` mais `buildPlanFromConfiguration` retourne toujours `side: "long"`. À faire :
- **Symétriser les 4 setups** : PULLBACK short (rebond EMA20 en downtrend), BREAKDOWN short (cassure support 20j), CONTINUATION short (trend down propre), MEAN_REVERSION déjà bi-directionnel.
- **Filtre régime via Fear & Greed** (déjà affiché en widget, jamais utilisé dans le scoring) :
  - FG < 25 ou VIX > 25 → bonus +5 aux shorts, malus -5 aux longs
  - FG > 75 → l'inverse
  - Zone neutre → inchangé
- **Arbitrage long/short** sur même actif : prendre le plus gros RR, pas le plus gros score.
- Activer `allow_short: true` en production (flag existe dans `mtp_training_settings`, jamais testée en réel).

#### Règle #3 — Valider sur l'historique avant le réel (backtest)
3 mois de data = juger un joueur sur 3 matchs. Insuffisant.
- **Cache KV** des bougies 1D sur 5 ans par symbole (clé `candles:SYMBOL:1D:v1`, ~10 Mo pour 100 symboles, coût négligeable).
- **Backtest engine** dans le Worker : `backtest(symbol, from, to, rules)` qui replay bougie par bougie, retourne win rate / expectancy / max DD / Sharpe.
- **Parallélisation** : les Workers Cloudflare gèrent 50 fetch simultanés → 50 backtests en 2–5 s.
- **Walk-forward obligatoire** : entraîne sur 2020–2023, valide sur 2024, produis sur 2025. Jamais ajuster les règles pour coller au passé (curve-fitting = la mort du bot).

#### Règle #4 — Être autonome du frontend
Le bot actuel ne tourne que si le frontend est ouvert. Inacceptable pour de l'autonomie.
- **Scheduled Worker Cloudflare** : handler `handleScheduledTraining(env)` déclenché par cron (30 min en heures de trading, 2h hors-marché).
- Idempotence via `lastCycleAt` dans Supabase.
- Le scan + auto-open + auto-close + vérif SL/TP doit pouvoir tourner même app fermée.

### Feuille de route recommandée (dans l'ordre)

| Phase | Durée | Contenu | Pourquoi en premier |
|-------|-------|---------|---------------------|
| **1. Autonomie + short** | 2–3 sem | Cron Worker, symétriser les 4 setups, injecter Fear & Greed, activer `allow_short` en prod | Sans cron autonome et sans short, le bot est structurellement incomplet. Les autres phases ont besoin de volume de trades dans les 2 sens pour avoir quelque chose à apprendre. |
| **2. Apprentissage** | 3–4 sem | Table `mtp_trade_feedback` + MAE/MFE, agrégation par bucket, auto-ajustement seuils, dashboard patterns gagnants/perdants | Sans feedback-loop, le bot ne s'améliore pas. C'est ce qui différencie un vrai bot d'un script. |
| **3. Backtest & validation** | 3–4 sem | Cache KV 5 ans, moteur backtest + walk-forward, UI onglet Backtest, retrain hebdo des poids | Permet de valider les évolutions sans risquer du vrai argent. |
| **4. Exécution réelle** | Plus tard | Lecture broker (Binance API read-only), puis ordres avec limites strictes | Ne surtout pas court-circuiter les phases 1-3. |

### Règle de garde — ne pas ajouter de feature qui n'avance pas ces 4 règles
Si on se retrouve à développer quelque chose qui ne sert ni l'autonomie, ni l'apprentissage, ni la validation, ni l'exécution long/short → le reporter. L'app a déjà trop de features d'assistant ; il en faut moins mais qui servent le bot.

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
| 2026-04-20 | Claude sonnet-4-6 | UI/UX iPhone/web — SVG icons, touch targets, a11y, fix data-open-detail, fix grid metrics |
| 2026-04-21 | Claude opus-4-7 | Audit data-* — fix bouton Rafraîchir opportunités, nettoyage sélecteur mort `.ai-card` |
