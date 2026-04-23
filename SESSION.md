# SESSION – ManiTradePro
> **Fichier de continuité de session — à lire en PREMIER à chaque nouvelle session IA**

> ⚠️ **RÈGLE IMPÉRATIVE** : Mettre à jour ce fichier **après chaque évolution**, pas en fin de session.
> Chaque commit = une mise à jour SESSION.md. Ne pas attendre la "fin" pour documenter.

---

## Métadonnées
| Champ | Valeur |
|-------|--------|
| **Dernière mise à jour** | 2026-04-23 (iPhone compactification fiche actif — post Phase 2) |
| **IA utilisée** | Claude (claude-opus-4-7) |
| **Branche active** | `claude/iphone-compact-asset-detail` |
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

## Diagnostic performance bot — 2026-04-23

### Contexte
Audit des 21 trades clôturés en Supabase (du 2026-04-08 au 2026-04-23). **Paper trading uniquement — aucun capital réel**. L'objectif est d'**apprendre**, pas de protéger du capital. Donc l'auto-cycle **reste actif**, on collecte pour analyser.

### Résultats bruts (21 trades, 100% long)
- **Win rate** : 2/17 = **11,8 %** (3 trades cassés pnl=0 exclus, 1 BE)
- **Net cumulé** : ~-510 USD paper
- **Avg win** : +1,96 USD · **Avg loss** : -34,24 USD
- **Expected value** : -30 USD/trade
- **Breakeven théorique** avec RR 2.2 = ~31 % win rate → très loin du compte

### Patterns identifiés
1. **Stops touchés quasi-systématiquement avant TP** : 15 pertes toutes entre -1 % et -6 %, pile sur la distance du stop (3-5 %). **Aucun trade n'est allé au TP**. Les 2 wins sont minuscules (+0,11 % et +0,15 %) avec durée identique de 121 min → probable time exit ou move-to-BE, pas une sortie en target.
2. **Zéro short pris** : 17 tendances haussières + 3 neutres, 0 baissières. L'asymétrie codée dans `calcDetailScore` (worker.js:2015-2016, malus -4 shorts vs bonus +4 longs + seuils 44/46 vs 56/54 dans `calcDetailScore:1991-1993`) se confirme : le bot est 100 % long-biased. Soit voulu, soit biais à symétriser.
3. **Bug `pnl=0` sur 3 trades cassés** (14 % du dataset) : AMD #18, ETH #19, AMD #20 — `exit_price ≠ entry_price` mais `pnl=0` et `rr_ratio=0` ou `null`. Le flow de close n'a pas calculé le PnL. **Chaque close cassé = data d'apprentissage perdue**, donc c'est prioritaire.
4. **Duplicatas probables** : AAPL @271.29 × 2 identiques, META @668.84 × 2 identiques. Double-sync Supabase ou re-enregistrements.

### Philosophie (validée avec l'utilisateur)

**Principe directeur** : on prend les trades qu'on croit être de bonnes opportunités. Si ça marche, confirmation. Si ça rate, on fait un **post-mortem pour comprendre où on s'est trompé** — pas une correction réflexe des seuils. C'est de la deliberate practice, pas une chasse au win rate.

**Implications** :
- Le win rate à court terme n'est **pas** la métrique principale. La qualité du diagnostic post-perte l'est.
- Pas de filtrage préventif pour "améliorer les stats". On trade ce qui passe les critères actuels, on apprend de chaque résultat.
- Chaque perte = une leçon à formaliser (pourquoi le setup était mauvais, quel indicateur a menti, quel contexte a été mal lu).
- Les ajustements de seuils viennent **après** plusieurs post-mortem qui pointent la même cause, pas au premier échec.

### Ordre d'attaque

1. **Fix `pnl=0` sur closes** — prioritaire car chaque trade cassé = une leçon perdue. Sans PnL exploitable, pas de post-mortem possible. Investiguer `closeTrainingTrade` (app.js:2414), `trainingCloseTrigger` (worker.js:3651), `handleTradesSync` (worker.js:4239). Vérifier que `pnl` et `rr_ratio` sont calculés et persistés pour TOUS les closes, manuels et auto.
2. **Mécanisme de post-mortem par trade** — pour chaque trade clôturé, pouvoir reconstituer le contexte d'entrée : indicateurs d'époque, régime, news, setup détecté, distance stop en ATR, position dans la structure prix. `analysis_snapshot` existe déjà dans Supabase — vérifier qu'il capture bien tout ce qu'il faut pour une autopsie lisible 2 semaines plus tard.
3. **Analyse des 21 trades existants** — appliquer le post-mortem rétrospectivement : pour chaque perte, identifier où on s'est trompé (entrée trop tard, stop mal placé, régime mal lu, news ignorée, etc.). Classer les causes. C'est ça qui fait émerger les ajustements pertinents, pas des stats brutes.
4. **Laisser tourner** en paper, accumuler des post-mortem. Pas de changement de seuil tant qu'une même cause n'apparaît pas sur ≥ 5 trades.
5. **Un seul ajustement à la fois** basé sur un pattern de post-mortem récurrent. Mesurer avant/après.
6. **Décision shorts** : à trancher — biais long assumé (pause en RISK_OFF) ou symétrie `calcDetailScore` (worker.js:2015-2016 + 1991-1993).

### À NE PAS faire
- ❌ Stopper l'auto-cycle « pour protéger le capital » — paper trading, aucun capital réel, on perdrait la matière première de l'apprentissage.
- ❌ Resserrer les seuils pour « améliorer les stats » sans post-mortem qui pointe une cause précise.
- ❌ Refonte moteur — il détecte des trades, c'est la base. Le travail est sur la finesse des setups et la lecture des pertes, pas l'architecture.
- ❌ Considérer une perte comme un échec — c'est un cas d'étude. Seul un trade dont on ne comprend pas la perte est un vrai échec.

### Critère de passage en argent réel

**Règle impérative** : rester en paper trading tant que le bot n'a pas un résultat positif mesurable. On passe en réel **uniquement** quand :

1. **Expected value > 0** sur **au moins 50 trades** clôturés (échantillon minimum pour une stat fiable).
2. **PnL cumulé paper net positif** sur la même fenêtre.
3. **Aucun `pnl=0` cassé** dans le dataset (fix terminé et propre).
4. **Au moins 5 post-mortem formalisés** avec cause identifiée → ça prouve qu'on sait lire les pertes, pas juste les subir.

Tant que les 4 conditions ne sont pas réunies : **100 % paper**, on apprend.

**Passage en réel progressif** (pas un switch brutal) :
- Étape A : taille de position réduite (20-30 % de ce que calculerait l'engine en paper), pendant 20 trades réels.
- Étape B : si Étape A confirme le comportement paper, taille normale.
- Retour en paper **immédiat** si drawdown réel > 10 % du capital alloué.

Ce critère est verrouillé ici pour que les prochaines sessions Claude ne poussent pas à un passage prématuré, et que l'utilisateur lui-même puisse s'y référer quand l'impatience se fait sentir.

### Architecture cible post-passage en réel (deux pistes en parallèle)

Quand les 4 conditions ci-dessus sont réunies et qu'on passe en réel, le bot **ne devient pas** un auto-trader monolithique qui décide seul avec du vrai argent. Il se scinde en **deux pistes indépendantes** qui tournent en permanence :

#### Piste 1 — « Learning bot » (paper, permanent)
- Continue à tourner en paper trading **indéfiniment**, même après le go-live réel.
- Explore, teste de nouveaux setups, valide de nouveaux patterns sans risque.
- Source permanente de post-mortem et d'ajustements de règles.
- L'auto-cycle existant devient ce learning bot.
- Métriques trackées : EV, win rate, expected value par setup, par régime, par asset class.

#### Piste 2 — « Real proposer » (human-in-the-loop)
- **Ne prend pas de trades automatiquement** en réel.
- Quand une opportunité passe les critères validés par la piste 1 (pattern confirmé statistiquement sur ≥ N trades paper), elle est proposée à l'utilisateur via notification.
- L'utilisateur **confirme ou rejette** manuellement avant exécution (pas d'exécution sans validation).
- Taille de position calibrée selon le stade (20-30 % puis normal, cf. transition progressive).
- Retour immédiat en "paper-only" si drawdown > 10 %.

#### Pourquoi deux pistes séparées
- Les règles évoluent. Le learning bot valide les nouvelles avant qu'elles touchent du réel.
- Le human-in-the-loop sur le réel force une double vérification (engine + utilisateur) — chaque passage en réel est un choix conscient.
- On garde une trace claire : ce qui est "en expérimentation" (piste 1) vs "production" (piste 2).
- Si la piste 2 sous-performe vs la piste 1, on sait que c'est la validation humaine qui coince (pas le moteur) — et inversement.

#### Conséquence pour le code
- Ne pas coder un simple switch `mode: "paper" | "real"`. Coder deux flux distincts :
  - `training_auto_cycle` (existe déjà, devient la piste 1)
  - `real_proposal_flow` (à créer, envoie notification + attend confirmation utilisateur)
- Les deux partagent le même moteur de scoring, mais leurs **critères d'activation** sont différents : la piste 1 prend tout ce qui passe les seuils ; la piste 2 ne propose que ce qui est sur un pattern validé par stats paper.
- Stockage Supabase séparé : `mtp_trades` (training) + `mtp_real_trades` (production). Analytics séparées.

Cette architecture est un **objectif long terme**, à ne pas développer avant que les 4 conditions de passage en réel soient remplies. Mais elle est notée ici pour que tout développement intermédiaire reste **compatible** avec cette séparation (ex : ne pas verrouiller une architecture mono-flux qui empêcherait de scinder plus tard).

### Clés d'accès au dataset
- **Endpoint auth admin** : `GET /api/trades/state` avec `Authorization: Bearer <session_token>` (token dans `localStorage["mtp_session_v1"].token` après login PIN).
- **Snippet console pour dumper** :
```javascript
const token = JSON.parse(localStorage.getItem("mtp_session_v1"))?.token;
fetch("https://manitradepro.emmanueldelasse.workers.dev/api/trades/state", { headers: { "Authorization": "Bearer " + token } })
  .then(r => r.json()).then(d => window.__MTP_DUMP = d.data);
```
- **localStorage peut être vide** même avec des trades actifs : `loadTradesState` (app.js:637) charge depuis Supabase sans persister en local si remote > local. Toujours passer par le worker pour la vérité.

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

### Les 5 règles du bot

#### Règle #1 — Apprendre ET se corriger à chaque trade clos

> **Apprendre sans se corriger = accumuler des stats inutiles.** Chaque enseignement doit déclencher **automatiquement une modification du moteur**, sans intervention humaine. Deux temps indissociables : observer, puis agir. **Toute correction passe par un shadow mode avant activation.**

**A. Observer — capturer ce qui s'est passé**
- Table `mtp_trade_feedback` : `trade_id`, `exit_reason` ∈ {SL, TP, manual, timeout}, `mae_pct` (max drawdown intra-trade, en % de l'entrée), `mfe_pct` (max profit intra-trade), `holding_minutes`, `regime_at_close`, `news_context_at_open`, `news_context_at_close`.
- Le MAE/MFE est essentiel : il dit si le stop était trop serré ou le TP trop gourmand, même sur un trade perdant.
- Persistance Supabase + snapshot du contexte au moment de la sortie (prix, régime, opportunités concurrentes).

**B. Corriger — le bot modifie son propre moteur**

Pour chaque signal statistique significatif, une correction concrète est appliquée **sans intervention humaine** :

| Signal observé | Correction automatique |
|---|---|
| Bucket (setup × direction × régime) avec expectancy négative sur **30+ trades** | Relever `min_dossier_score` de +5 pour ce bucket |
| Même bucket toujours négatif après **50+ trades** | Désactiver le bucket (plus d'entrées) |
| MAE moyen > 70% de la distance du stop sur un setup | Élargir le stop de +0.5×ATR pour ce setup (stop trop serré) |
| MFE moyen > 1.5× la distance du TP atteint | Allonger le TP ou basculer en trailing stop pour ce setup |
| 3 pertes consécutives | Réduire la taille de position à 50% jusqu'à un gain |
| 3 gains confirmés avec expectancy positive | Taille normale, ou +20% si confiance élevée |
| **Cycle hebdomadaire sur 500+ trades** (pas 200+, surajustement sinon) | Retrain des poids des 6 composantes du score via régression logistique. Les poids 24/20/20/18/10/8 deviennent dynamiques. |

**C. Shadow mode — filet de sécurité obligatoire (NON optionnel)**

Toute nouvelle correction passe par un **mode fantôme pendant 20 trades** avant activation :
- Le bot simule l'effet de la correction sans l'appliquer vraiment
- Si les résultats confirment l'amélioration → activation réelle
- Sinon → rollback, la correction est jetée

Table `mtp_engine_adjustments` (date, type, signal_déclencheur, ancienne_valeur, nouvelle_valeur, status: `shadow` / `active` / `rollback`) pour auditer et rollback si besoin.

**D. Décroissance temporelle des enseignements**

Les stats vieillissent. Pondération exponentielle pour que le bot s'adapte aux changements de régime :
- Trades des 30 derniers jours : poids 1.0
- Trades de 31-90 jours : poids 0.5
- Trades de 91-365 jours : poids 0.2
- Trades > 1 an : poids 0.1

Feature codée tôt mais s'active d'elle-même quand il y a assez d'historique (~6-12 mois).

**E. Drift detection — alerte quand une stratégie décroche**

Comparaison glissante 30 derniers trades vs moyenne historique par setup × direction :

| Chute du win rate | Action |
|---|---|
| 10-15% | Notification info, aucune action auto |
| 15-25% | Relève `min_dossier_score` du setup (plus sélectif) |
| > 25% | Désactivation temporaire + 20 trades de validation en shadow avant réactivation |

**F. Rapport hebdo généré par Claude (lundis matin)**

Claude Sonnet résume automatiquement la semaine passée en français : trades gagnants/perdants, patterns détectés, corrections auto appliquées, recommandations. Coût ~$2/mois. Outil pédagogique + audit des ajustements.

**Garde-fous**
- Aucune correction sur < 30 trades dans un bucket (seuil anti-bruit).
- Shadow mode obligatoire pour tout nouvel ajustement.
- Retrain régression uniquement à partir de 500+ trades (vs 200+ initialement proposé, surajustement sinon).
- Tout ajustement audité dans `mtp_engine_adjustments` avec rollback possible.

**Principe fondateur** : à qualité de feedback égale, le bot qui se corrige battra toujours le bot qui observe seulement. Ne jamais livrer l'observation sans la correction qui va avec.

#### Règle #2 — Savoir choisir long ou short
Aujourd'hui le moteur détecte `direction: "short"` mais `buildPlanFromConfiguration` retourne toujours `side: "long"`. À faire :
- **Symétriser les 4 setups** : PULLBACK short (rebond EMA20 en downtrend), BREAKDOWN short (cassure support 20j), CONTINUATION short (trend down propre), MEAN_REVERSION déjà bi-directionnel.
- **Filtre régime via Fear & Greed + VIX** (déjà affichés en widget, jamais utilisés dans le scoring) :
  - Crypto : FG < 25 → bonus +5 aux shorts, malus -5 aux longs. FG > 75 → l'inverse.
  - Actions : VIX > 25 → bonus +5 aux shorts, malus -5 aux longs. VIX < 12 → prudence longs (complacence).
  - Zone neutre → inchangé.
- **Arbitrage long/short** sur même actif : prendre le plus gros RR, pas le plus gros score.
- Activer `allow_short: true` en production (flag existe dans `mtp_training_settings`, jamais testée en réel).
- **Exécution réelle du short** : jamais avant 1 an de stabilité en paper. Binance spot ne permet pas le short → Margin ×2 max ou Futures plus tard, **uniquement après stabilité prouvée** (Règle #1 + backtest validés).

#### Règle #3 — Valider sur l'historique avant le réel (backtest)
3 mois de data = juger un joueur sur 3 matchs. Insuffisant.
- **Cache KV** des bougies 1D par symbole (clé `candles:SYMBOL:1D:v1`, coût négligeable).
- **Périodes retenues** : **crypto 2020-2025** (5 ans, bull+bear complets), **actions 2015-2025** (10 ans, plus stable). Avant 2020 crypto = marché trop différent, non pertinent.
- **Backtest engine** dans le Worker : `backtest(symbol, from, to, rules)` qui replay bougie par bougie, retourne win rate / expectancy / max DD / Sharpe.
- **Parallélisation** : les Workers Cloudflare gèrent 50 fetch simultanés → 50 backtests en 2–5 s.
- **Walk-forward obligatoire** : entraîne sur 2020-2023, valide sur 2024, produis sur 2025. Jamais ajuster les règles pour coller au passé (curve-fitting = la mort du bot).
- **Pré-remplit la mémoire contextuelle fine** (Règle #1 étendue en Phase 3+) : les trades simulés du backtest alimentent les buckets (setup × direction × régime) pour démarrer avec du volume.

#### Règle #4 — Être autonome du frontend
Le bot actuel ne tourne que si le frontend est ouvert. Inacceptable pour de l'autonomie.
- **Scheduled Worker Cloudflare** : handler `handleScheduledTraining(env)` déclenché par cron.
- **Fréquence définitive** :
  - Crypto en heures actives UTC (6h-22h) : **15 min**
  - Crypto la nuit UTC (22h-6h) : **1 h**
  - Actions en heures de bourse US (13h30-22h CEST lun-ven) : **15 min**
  - Actions hors-bourse / weekend : **skip** (rien à scanner)
  - Total : ~100 cycles/jour, ~800 requêtes Worker/jour (< 1% du free tier 100k/jour).
- Idempotence via `lastCycleAt` dans Supabase pour éviter les doublons.
- Le scan + auto-open + auto-close + vérif SL/TP doit pouvoir tourner même app fermée.

#### Règle #5 — Intégrer le contexte fondamental (news & événements)

> **Un bot qui ne regarde que les prix est aveugle à la moitié du signal.** Les marchés bougent aussi (souvent brutalement) à cause d'annonces : Fed, CPI, earnings, hacks crypto, régulation. Ignorer ça = se faire exploser par un événement que tout le monde a vu sauf le bot.

**A. Les sources — tout en gratuit via multi-provider**

| Type | Pour qui | Sources gratuites | Rafraîchissement |
|---|---|---|---|
| Calendrier économique (Fed, BCE, NFP, CPI, PMI) | Tous actifs | Forex Factory RSS | 1×/jour |
| Earnings calendar | Actions/ETF | Finnhub free + Twelve Data (déjà dispos) | 1×/jour |
| News crypto | Crypto | CryptoPanic Free (200/j) + Binance Announcements RSS + CoinDesk RSS + CoinTelegraph RSS + Messari Free (1000/j) | 15 min |
| News macro/sectorielles | Tous actifs | Alpha Vantage News (sentiment déjà taggé) + NewsAPI Free (100/j) | 1 h |

**Pourquoi tout gratuit** : le volume de 96 req/jour sur CryptoPanic tient en free tier. La redondance (4 sources crypto RSS) remplace la Pro. Coverage ≥ CryptoPanic Pro $25/mois.

**B. 3 niveaux d'utilisation dans le moteur**

1. **Garde-fou (hard block)** [Phase 1] : aucune nouvelle entrée dans la fenêtre **[-30 min ; +30 min]** autour d'un événement calendrier high-impact (FOMC, NFP, CPI, ECB meeting, earnings sur l'actif concerné). Ces moments = volatilité imprévisible = risque ruine. **Positions ouvertes** : stop resserré automatiquement à -0.3% sous le prix courant 10 min avant l'event (option B validée).

2. **Modulateur de score (soft boost/malus)** [Phase 2], **cap ±10 points max sur le score final** :
   - News positive vérifiée sur un secteur → +5 au score des actions/ETF de ce secteur pour 24 h
   - News négative crypto (hack, régulation hostile, delisting majeur) → -10 à tous les cryptos pour 48 h
   - Earnings surprise positive → +5 à l'action pour 5 jours de trading
   - Régime macro (taux en hausse) → malus -3 sur actions growth, bonus +3 sur value
   - **Utiliser les sentiments gratuits taggés en priorité** (Alpha Vantage + CryptoPanic + Finnhub + Messari). Claude intervient uniquement sur les cas ambigus (~20% des news).

3. **Signal directionnel via Claude (niveau 3)** [Phase 2 fin, prudent] : pour une news majeure non classifiable par les sources gratuites, Claude Haiku classe en {`long-positif`, `short-negatif`, `bruit-ignore`} avec confiance. Pondération haute = ±8 points, moyenne = ±4, faible = 0 (ignorée). **Jamais décideur seul** — toujours 3ème vote après technique + modulateur.

   **Kill switch anti-hallucination** (mesure glissante sur 30 derniers trades à signal haute confiance Claude) :
   
   | Win rate observé | Action automatique | Notif |
   |---|---|---|
   | ≥ 55% | Poids maintenu à ±8 pts | Aucune |
   | 45-55% | Dégradé à ±4 pts | Info |
   | 35-45% | Dégradé à ±2 pts | Warn |
   | < 35% | **Désactivation complète (mode silent)** | Critique + rapport Claude du pourquoi |
   
   **Reset** : automatique après 60 jours de désactivation (réactivation en mode test ±2 pts pour 20 trades). Ou manuel depuis Réglages.

**C. Auto-watchlist (ajout/retrait intelligent)** [Phase 2]

Le bot **chasse les pépites** tout seul et **retire les actifs dormants**.

**Auto-ajout** si tous les critères réunis :
- Absent de la watchlist actuelle
- Apparait 3+ fois en trending sur 7 jours (CoinGecko) OU mentionné 10+ fois en news verified/48h avec sentiment positif
- Market cap top 200 (crypto) ou volume daily > seuil (actions)
- Data provider disponible (Binance pour crypto, Twelve Data pour actions)
- Liquidité top 200 sur les 30 derniers jours (anti-wash trading)

**Auto-retrait** si :
- Dans la watchlist **ET pas dans les 35-40 core protégés**
- Aucun signal généré depuis 90 jours (dormant)
- Volume 24h chute de -70% vs moyenne 90j

**Garde-fous** :
- Max 20 auto-adds / mois
- Core (35-40) toujours protégés, jamais auto-retirés
- Épinglage manuel possible (jusqu'à 10 actifs "pinnés" insupprimables)
- Override manuel à tout moment via Réglages
- Historique visible : onglet "Watchlist dynamique" avec raisons des ajouts/retraits

**D. Bouclage avec la Règle #1 (apprentissage)**

- Chaque `analysisSnapshot` à l'ouverture stocke `newsContext: { top3, regime, pendingEvents24h, sentiment_aggregated }`.
- À la clôture, la Règle #1 agrège : "trades avec news positive ont gagné X% vs Y% sans". Si delta significatif sur 50+ trades → le poids du modulateur news s'auto-ajuste à la hausse (ou baisse si peu d'impact réel).
- Alerte temps réel : si une news majeure apparaît pendant qu'une position est ouverte, notification push + proposition de clôture (ou clôture auto si delta défavorable > 3%).

**Garde-fous globaux**
- **Qualité des sources** : uniquement Reuters, Bloomberg, SEC, Fed, BCE, sites officiels exchanges crypto (Binance Labs, Coinbase announcements), ou news taguées "verified" par CryptoPanic. Ignorer Twitter/X, blogs anonymes, chaînes Telegram.
- **Fuseau horaire** : Fed = NY (EST/EDT), BCE = Francfort (CET/CEST), Tokyo/Sydney pour opens asiatiques. Normalisation UTC en base, affichage heure Paris côté UI.
- **"Déjà pricé"** : une bonne news peut faire baisser le marché si elle était attendue. Le modulateur ne doit jamais être directionnel à 100% — toujours combiné avec le signal technique du moteur V2.
- **Dégradation gracieuse** : si un quota API est atteint, continuer avec la dernière photo cachée plutôt que de crasher.

### Paramètres pratiques validés (session 9)

| Paramètre | Valeur retenue | Justification |
|---|---|---|
| **Périmètre actifs** | 45-60 max : 35-40 core protégés + 15-20 auto-ajouts | Qualité > quantité. Ratio signal/bruit optimal. Limites CPU Worker. |
| **Core Actions EU** | LVMH, ASML, TTE, SAP, NESN, **RMS.PA (Hermès)** | Hermès explicitement demandé par l'utilisateur |
| **Fréquence cron** | 15 min en heures actives / 1 h nuit crypto / skip actions off-hours | Sweet spot swing trading. Tout en free tier Cloudflare. |
| **Stack API** | **Fiable-v3 tout gratuit sauf Claude** : Twelve Data 4 clés + Finnhub fallback #1 + Alpha Vantage + CoinGecko + CryptoPanic Free + Messari Free + Binance + Forex Factory RSS + CoinDesk/CoinTelegraph RSS + NewsAPI Free | Redondance multi-provider = fiabilité. Yahoo abandonné (fragile). Claude optimisé Haiku/Sonnet = ~$3-5/mois. |
| **Trading style** | **Swing trading uniquement** (pas de day-trading) | Cron 15 min + max_holding 240h + 95% des bots retail day-tradent perdants. Pas besoin de Twelve Data Pro. |
| **Budget total** | ~$3-5/mois (consommation Claude réelle uniquement) | Multi-provider gratuit robuste. Cap à < 1% du capital sous gestion. |
| **Broker Phase 4** | Binance crypto spot **long-only** | Actions paper-only indéfiniment (pas d'API broker FR exploitable). Short réel jamais avant 1 an de stabilité. |

### Feuille de route recommandée (dans l'ordre)

| Phase | Durée | Contenu | Pourquoi en premier |
|-------|-------|---------|---------------------|
| **1. Autonomie + short + garde-fou news + shadow/drift** | 3–4 sem | 4 PRs : cron Worker, symétrisation long/short + F&G/VIX, news garde-fou niveau 1 + stop resserré pré-event, shadow mode + drift detection + table `mtp_engine_adjustments` | Sans cron autonome et sans short, le bot est structurellement incomplet. Le garde-fou news est en phase 1 car une FOMC mal timée peut ruiner la suite. Shadow + drift sont prêts pour Phase 2. |
| **2. Apprentissage + correction + news avancé + auto-watchlist + rapport hebdo** | 4–5 sem | Table `mtp_trade_feedback` + MAE/MFE, agrégation par bucket, corrections automatiques (7 règles), news modulateur cap ±10 pts, Claude directionnel niveau 3 + kill switch gradué, auto-watchlist, rapport Claude hebdo lundi, décroissance temporelle | Observer ne suffit pas : sans corrections auto, le bot répète ses erreurs. Le modulateur news ajoute la dimension fondamentale. Auto-watchlist chasse les pépites. |
| **3. Backtest & validation** | 3–4 sem | Cache KV 5 ans (crypto 2020-2025 / actions 2015-2025), moteur backtest + walk-forward, UI onglet Backtest, retrain hebdo des poids (500+ trades), pré-remplir mémoire contextuelle fine | Permet de valider les évolutions sans risquer du vrai argent. Déverrouille la mémoire contextuelle pour Phase 3+. |
| **4. Exécution réelle** | Plus tard | Binance spot **long-only** petit capital, actions paper+notif manuelle (exécution utilisateur sur PEA), short réel différé | Ne surtout pas court-circuiter les phases 1-3. |
| **5+. Long terme** | Roadmap | Mémoire contextuelle fine avancée, auto-découverte de patterns (reportée — risque surajustement), éventuel Interactive Brokers pour actions réelles | À ouvrir seulement après 1 an de bot stable. |

### Phase 1 — Découpage détaillé en 4 PRs

Chaque PR est indépendante, mergeable seule, validée 3-5 jours en paper avant la suivante.

#### PR #1 — Cron Cloudflare autonome — ✅ LIVRÉE session 9 (branche `claude/phase1-pr1-cron-autonome`)
- [x] Handler `scheduled` déjà présent dans `worker.js:4618` → `handleScheduledCycle` (réécrit)
- [x] `wrangler.toml` : 1 seul cron `*/15 * * * *` 24/7 (remplace les 3 crons précédents)
- [x] Smart scheduling dans `handleScheduledCycle` : throttle nuit crypto (22h-6h UTC = 1 cycle/h sur minute 0), mode `crypto+actions` en heures de bourse US, `crypto-only` sinon
- [x] Idempotence via `last_cycle_at` : skip si dernier cycle < 10 min (anti-chevauchement de crons)
- [x] Events Supabase : `scheduled_cycle_start` / `scheduled_cycle_end` / `scheduled_cycle_skipped` avec mode + summary {closed, opened, skipped, errors, duration_ms}
- [x] Migration SQL `003_training_settings_last_cycle.sql` : colonnes `last_cycle_at` (timestamptz), `last_cycle_mode` (varchar), `last_cycle_summary` (jsonb)
- [x] `normalizeTrainingSettingsRow` étendu pour préserver ces 3 champs en round-trip
- [x] Endpoint `POST /api/training/auto-cycle` volontairement HORS idempotence (force manuel UI)
- [x] UI : pilule `.bot-cycle-sub` dans la carte bot avec "Dernier cycle il y a X min · mode", variantes visuelles fresh/stale/cold selon ancienneté
- [x] Label "Actif — cycles 15 min" (au lieu de "30 min")
- **Déploiement requis côté utilisateur** :
  1. Exécuter `cloudflare-worker/migrations/003_training_settings_last_cycle.sql` dans Supabase SQL Editor
  2. `wrangler deploy` depuis la machine utilisateur (les secrets sont préservés)
  3. Vérifier `wrangler secret list` post-deploy
- **Validation paper** : 48 h sans ouvrir l'app, events `scheduled_cycle_*` toutes les 15 min en heures actives dans Supabase, pilule UI met à jour au retour sur l'app.

#### PR #2 — Symétrisation long/short + Fear & Greed/VIX filtre — ✅ LIVRÉE session 9 (branche `claude/phase1-pr2-long-short-regime`)
- [x] `detectConfiguration` : 3 configurations miroir short ajoutées (PULLBACK_SHORT, BREAKDOWN, CONTINUATION_SHORT) avec conditions inversées ema20<ema50, RSI calibré, chg5/chg20 symétriques. Nouveaux niveaux calculés : `swingLow20`, `swingHigh10`, `high5j`.
- [x] `validateConfiguration` : matrix étendue aux 3 shorts, régimes inversés (valides en RISK_OFF). Exception crypto maintenue.
- [x] `buildPlanFromConfiguration` : branches short avec calculs stop/TP miroirs, cohérence direction-dépendante (`entry>sl, tp>entry` pour long, inverse pour short), RR minimum 1.6 identique, `side` dynamique (plus de `"long"` hard-codé).
- [x] `allowed_setups` défaut étendu aux 7 setups (3 long + 3 short + mean_reversion) côté worker ET côté UI Réglages Bot. Toggles individuels visibles.
- [x] `calcDetailScore` : 5e param `regimeIndicators`, modulateur ±5 pts selon :
  - Crypto : F&G ≤ 25 → short +5/long -5 ; F&G ≥ 75 → long +5/short -5
  - Actions : VIX > 25 → short +5/long -5 ; VIX < 12 → long -3 seulement
  - Traçabilité via `regimeBonus` + `regimeBonusReason` dans le breakdown
- [x] `configBonus` étendu aux 3 setups short (mêmes poids que miroirs long).
- [x] Nouveau helper `fetchRegimeIndicators(env)` : F&G via alternative.me + VIX via Yahoo `^VIX`, cache mémoire 5 min, best-effort.
- [x] Nouvel endpoint `/api/regime-indicators` pour exposition frontend.
- [x] Callers de `calcDetailScore` : pré-fetch des indicators avant appel (une fois avant la boucle pour le scan opportunités → 0 coût supplémentaire).
- [x] `setupTypeLabel` (UI) étendu avec libellés explicites : "pullback short", "breakdown", "continuation short".
- [x] UI Opportunités : nouveau groupe de chips filtre direction (tous / ▲ long / ▼ short), état `state.opportunityDirection`, filtre dans `applyFilter()`, handler `data-direction-filter`.
- **Déploiement requis côté utilisateur** :
  1. `wrangler deploy` depuis la machine Windows
  2. Vérifier `wrangler secret list` post-deploy
  3. Pas de migration SQL (aucune modification de schéma)
- **Validation paper 48h** : vérifier dans Supabase `mtp_positions` la présence de lignes `side = "short"` après que le bot a tourné. Tester le filtre UI "▼ short" sur la page Opportunités. Vérifier `regime_indicators` accessible via `/api/regime-indicators`.

#### PR #3 — News garde-fou niveau 1 — ✅ LIVRÉE session 9 (branche `claude/phase1-pr3-news-safeguard`)
- [x] Migration SQL 004 : tables `mtp_economic_calendar` et `mtp_earnings_calendar` avec RLS + policies ouvertes (cohérent avec `mtp_user_assets`). Index partiel sur `impact = 'high'`.
- [x] Fetch Forex Factory RSS via `fetchEconomicCalendar(env)` — URL `https://nfs.faireconomy.media/ff_calendar_thisweek.xml`, gratuit illimité, pas de clé. Cache mémoire 6h + persist Supabase avec upsert sur `event_uid` stable (country|title|YYYY-MM-DD, pas l'heure → support des reschedulings FF).
- [x] Parsing XML via regex simples (CDATA + plaintext). Conversion Eastern Time → UTC avec DST approximative (mars-nov EDT UTC-4, autrement EST UTC-5). Précision ±1h tolérée par la fenêtre ±30 min.
- [x] Helper `fetchHighImpactEventsInWindow(env, windowMs)` : lit Supabase avec cache mémoire 2 min, fallback direct FF si Supabase down.
- [x] Helper `getNewsWindowForCycle(env)` : retourne `{blocked, reason, event, minutesUntil}` avec l'event le plus proche.
- [x] Intégration dans `isTrainingCandidateAllowed` : 5e param `newsWindow`, rejet immédiat si blocked. Pré-fetch UNE FOIS dans `handleTrainingAutoCycle` avant la boucle (0 coût sur appels suivants grâce au cache).
- [x] Event `news_window_block` loggé dans `mtp_training_events` avec reason + event details + minutes_until pour traçabilité.
- [x] Nouveaux endpoints : `GET /api/economic-calendar` (semaine complète) + `GET /api/news-window` (état actuel).
- [x] UI widget `renderNewsWindowWidget` dans le dashboard, à côté du Fear & Greed. États visuels : `.clear` (vert — fenêtre libre) / `.blocked` (rouge — entrées bloquées). Intégration dans `loadDashboard` via Promise.all.
- [x] CSS `.news-window-widget` utilise uniquement `var(--bg-elevated)`, `var(--border-subtle)`, `var(--profit)`, `var(--loss)` → 100% compatible light/dark theme.
- **Reporté à un commit ultérieur** : resserrement auto du stop à -0.3% 10 min avant event (option B). Garde-fou niveau 1 MVP priorise le blocage pur des entrées. Les positions ouvertes sont visibles via le widget "Entrées bloquées" pour action manuelle.
- **Reporté à Phase 2** : fetch Finnhub earnings calendar (la table `mtp_earnings_calendar` existe en anticipation).
- **Déploiement requis côté utilisateur** :
  1. Exécuter `cloudflare-worker/migrations/004_news_calendar.sql` dans Supabase SQL Editor
  2. `wrangler deploy` depuis la machine Windows
- **Validation paper** : tester `GET /api/economic-calendar` → retourne la semaine. Tester `GET /api/news-window` → `blocked: false` en temps normal. Lors d'une prochaine FOMC/NFP, vérifier widget dashboard `🔒 Entrées bloquées` + events `news_window_block` dans `mtp_training_events`.

#### PR #4 — Shadow mode + drift detection + table ajustements — ✅ LIVRÉE session 9 (branche `claude/phase1-pr4-shadow-drift`)
- [x] Migration SQL 005 : table `mtp_engine_adjustments` avec colonnes `adjustment_type`, `bucket_key`, `signal_trigger` jsonb, `old_value`/`new_value` jsonb, `status` (shadow|active|rollback), `shadow_trades_observed`, `shadow_result_better`, `activated_at`, `rollback_at`, `rollback_reason`, `severity`, `notes`. RLS + policies ouvertes + 3 index (status+type, created_at desc, bucket_key partiel).
- [x] Helpers CRUD : `createEngineAdjustment()` (status "shadow" par défaut), `updateEngineAdjustmentStatus()` (shadow→active ou →rollback avec timestamps auto), `listEngineAdjustments()` pour l'UI.
- [x] `computeBucketStats(env)` : agrège les 1000 derniers trades clos par bucket (setup × direction), calcule win rate historique ET récent 30.
- [x] `detectDriftAlerts(env)` : compare historique vs récent, seuils graduées :
  - Drop 10-15% → `severity: light`
  - Drop 15-25% → `severity: moderate`
  - Drop > 25%  → `severity: severe`
  Minimum 20 trades historiques + 10 récents. Déduplication (skip si alerte shadow existe déjà avec même severity). Persiste comme `adjustment_type: drift_alert`.
- [x] Drift detection déclenchée automatiquement 1×/jour à 2h UTC depuis `handleScheduledCycle`. Event `drift_detected` loggé dans `mtp_training_events` avec top 5 alertes.
- [x] 3 nouveaux endpoints :
  - `GET /api/engine/adjustments?status=...&limit=...` : liste tous les ajustements
  - `GET /api/engine/drift-detect` (admin) : force un run manuel
  - `GET /api/engine/bucket-stats` : stats par bucket pour debug
- [x] UI : nouvel onglet **"Santé bot"** accessible via menu Plus (sous le Bot). Route `/health`.
  - 4 cards stats : alertes drift actives, ajustements en observation, actifs, annulés
  - Liste des alertes drift actives avec severity colorée (rouge/orange/jaune)
  - Historique des ajustements (30 derniers) avec type + bucket + notes + date
  - Performance par bucket : win rate historique vs récent, delta coloré (rouge si < -15pts, orange < -5pts, vert sinon)
- [x] CSS `.health-*` : 100% compatible light/dark via var() uniquement.
- [x] Loader `loadHealth()` appelé au navigate + accessible via PTR sur l'onglet.
- **Scope volontairement exclu** : aucune correction automatique branchée à ce stade. Les 7 règles de correction (Règle #1) restent en shadow uniquement — elles seront opérationnalisées en Phase 2 avec `activateEngineAdjustment` après observation de 20 trades.
- **Déploiement requis côté utilisateur** :
  1. Exécuter `cloudflare-worker/migrations/005_engine_adjustments.sql` dans Supabase SQL Editor
  2. `wrangler deploy` depuis la machine Windows
- **Validation paper** : naviguer dans l'app → Plus → Santé bot → page rendue sans crash même sans données. Tester `GET /api/engine/drift-detect` (nécessite token admin) → retourne `{detected, alerts}`. Après quelques trades clos, `GET /api/engine/bucket-stats` retourne les buckets agrégés.

**Total Phase 1** : ~12 jours ouvrés (~3 semaines calendaires avec validations paper intercalées). **4 PRs mergées : #55, #56, #57, #58.**

### Phase 2 — Découpage en 5 PRs (session 10, en cours)

Chaque PR indépendante, mergeable seule. Objectif global : opérationnaliser la Règle #1 (apprendre ET se corriger), la Règle #5 niveau 2+3 (news modulateur + Claude directionnel), et l'auto-watchlist.

#### PR #5 — Observation : `mtp_trade_feedback` + MAE/MFE à la clôture — ✅ LIVRÉE & DÉPLOYÉE (PR #59, commit post-session-10)
- [x] **Migration 006** : table `mtp_trade_feedback` avec trade_id unique, bucket_key 4-dim (`setup|direction|regime|asset_class`), mae_pct / mfe_pct, mae_vs_stop_ratio / mfe_vs_tp_ratio, stop_distance_pct / tp_distance_pct, holding_minutes, exit_reason, regime_at_open / regime_at_close, news_context_open / news_context_close (réservés PR #7+), RLS permissif, 4 index.
- [x] **Tracking intra-trade** dans `handleTrainingAutoCycle` close phase :
  - `updatePositionIntraExcursion(position, livePrice)` met à jour `live.highSinceOpen` / `live.lowSinceOpen` en mémoire (baseline = entry pour ne jamais sous-estimer).
  - `persistPositionIntraExcursion()` PATCH Supabase uniquement quand une borne bouge (~1k PATCH/j max, très sous le free tier).
- [x] **Capture feedback à la clôture** :
  - `captureTradeFeedback(env, closedRow, position, closeType)` calcule MAE/MFE directionnels, ratios vs stop/TP, holding_minutes, bucket_key.
  - Upsert idempotent sur trade_id (`on_conflict=trade_id`).
  - Fallback MAE/MFE quand l'intra-tracking est absent (clôture entre deux cycles ou trade pré-PR #5) : borne opposée = exit.
  - Appelée depuis `closeTrainingPosition` (auto-close) ET depuis `handleTradesSync` via `listExistingFeedbackIds` pour les clôtures manuelles UI → sync, sans double-capture.
- [x] `closeTrainingPosition` propage `live.highSinceOpen`/`lowSinceOpen` sur le closed row pour que `computeTradeExcursion` retrouve les bornes intra-trade après DELETE de la position.
- [x] **Endpoint** : `GET /api/training/feedback?limit&bucket_key&symbol` (admin).
- [x] **UI historique** : badges MAE/MFE + exit_reason sur chaque ligne de `renderHistoryRow`. Palette :
  - `fb-exit` : SL / TP / Délai / Invalidé / Manuel (neutre)
  - `fb-mae` : rouge `fb-warn` si mae_vs_stop_ratio ≥ 0.7 (stop trop serré)
  - `fb-mfe` : vert `fb-info` si mfe_vs_tp_ratio ≥ 1.2 (TP trop court)
- [x] `loadTradeFeedback()` best-effort au `loadTradesState`, stocké en map dans `state.tradeFeedback`.
- [x] CSS `.fb-badge` utilise exclusivement `var(--...)` → 100% compatible light/dark.
- [x] `sw.js` CACHE_VERSION bumpé v7.0 → v7.1.
- **Scope volontairement exclu** : pas de correction automatique (réservée PR #6), pas de news_context capturé (réservé PR #7).
- **Déploiement requis côté utilisateur** :
  1. Exécuter `cloudflare-worker/migrations/006_trade_feedback.sql` dans Supabase SQL Editor
  2. `wrangler deploy` depuis la machine Windows
- **Validation paper** : après qu'un trade se ferme (auto ou manuel), `GET /api/training/feedback?limit=10` doit retourner une ligne avec bucket_key + MAE/MFE. Sur l'onglet Mes Trades, la ligne historique affiche les badges. Vérifier dans Supabase que `mtp_positions.live.highSinceOpen` / `lowSinceOpen` s'incrémentent cycle après cycle.

#### PR #6 — Corrections automatiques (6 règles) + activation shadow→active — ✅ EN COURS (branche `claude/phase2-pr6-auto-corrections`)

Opérationnalisation de la Règle #1 (apprendre ET se corriger). Sans migration SQL (la table `mtp_engine_adjustments` de PR #4 suffit).

**Détection quotidienne 2h UTC** (branchée dans `handleScheduledCycle` à côté du drift detect) :
- `aggregateFeedbackBuckets(env)` : agrège `mtp_trade_feedback` par bucket 4-dim → expectancy, MAE/MFE moyens, ratios.
- `computeGlobalStreaks(env)` : pertes/gains consécutifs sur 10 derniers trades.
- `detectCorrectionSignals()` : dédup contre shadow/active existants pour `(type, bucket_key)`.
- `runCorrectionDetection(env)` : orchestre, log event `corrections_detected`.

**6 règles couvertes** (Règle 7 retrain logistique reportée — nécessite 500+ trades) :
- **R1** `raise_min_score` (bucket, expectancy < 0 sur 30+ trades) → +5 aux seuils `min_dossier_score` + `min_actionability_score` du bucket.
- **R2** `disable_bucket` (bucket, toujours négatif sur 50+ trades ET winRate < 45%) → reject complet du bucket.
- **R3** `widen_stop` (setup, MAE moyen > 70% stop distance) → shadow only (non appliqué au `buildPlanFromConfiguration` dans PR #6 — réservé PR follow-up pour limiter le blast radius).
- **R4** `extend_tp` (setup, MFE moyen > 1.5× TP distance) → shadow only (idem R3).
- **R5** `reduce_size` (global, 3 pertes consécutives) → `sizeMultiplier = 0.5` dans `chooseTrainingExecution`.
- **R6** `restore_size` (global, 3 gains consécutifs post-activation R5) → rollback auto du `reduce_size` actif avec `rollback_reason` explicite.

**Observer quotidien 2h UTC** (`observeShadowAdjustments`) :
- Compte les trades clos depuis `created_at` dans le scope (bucket / setup / global).
- `reduce_size` s'active dès le 1er passage (seuil déjà confirmé à la création).
- Les autres attendent 20 trades puis décident :
  - R1/R2 : active si expectancy reste < 0 sur 20 trades, rollback sinon.
  - R3 : active si avg MAE/stop ratio reste > 0.7, rollback sinon.
  - R4 : active si avg MFE/TP ratio reste > 1.5, rollback sinon.
- Invalide le cache `resolveActiveAdjustments` si activation/rollback → prochain cycle voit le changement.

**Intégration moteur** (cycle d'ouverture `handleTrainingAutoCycle`) :
- `resolveActiveAdjustments(env)` cache mémoire 2 min → `{ disabledBuckets: Set, minScoreBoosts: Map, sizeMultiplier, widenStopSetups, extendTpSetups }`.
- `isTrainingCandidateAllowed(row, ..., activeAdjustments)` : reject si bucket désactivé, boost des seuils pour buckets R1.
- `chooseTrainingExecution(payload, settings, cash, activeAdjustments)` : `allocatedCash *= sizeMultiplier` (applique R5).
- `openTrainingPositionFromRow` forward le paramètre.

**Endpoints admin** :
- `GET /api/engine/corrections-detect` → force un passage (retourne signaux détectés + créés).
- `GET /api/engine/observe-shadows` → force un passage de l'observer.
- `GET /api/engine/active-adjustments` → dump compact (disabled buckets, boosts, sizeMultiplier, proposals).

**UI Santé bot enrichie** :
- Nouvelle carte « Règles actives qui impactent le moteur » — résume disabled + raises + reduce + proposals de façon lisible.
- Badge `X/20` sur les ajustements en shadow (ou `X/1` pour `reduce_size`).
- `typeLabel` étendu aux 6 nouvelles règles.
- `rollback_reason` affichée explicitement sur les lignes rollback.
- CSS `.health-adj-progress` + `.health-active-line` 100% `var(--...)`.

**Déploiement requis côté utilisateur** :
1. `wrangler deploy` (auto via GitHub Actions dès merge).
2. Aucune migration SQL (`mtp_engine_adjustments` existe déjà depuis migration 005).

**Validation paper** :
- Laisser tourner 3-5 jours.
- Vérifier que `GET /api/engine/corrections-detect` retourne des signaux (pas forcément créer tant que < 30 trades par bucket).
- Après ~20 trades clos par bucket, quelques shadows devraient s'activer OU rollback.
- Onglet Santé bot : badges `X/20` progressent visiblement, carte « Règles actives » se remplit ou reste vide.

**Scope volontairement exclu** :
- R3/R4 : détectés + observés + status=active possible, MAIS **non appliqués** à la construction du plan dans cette PR (touchent `buildPlanFromConfiguration`, plus risqué). Les proposals sont historisées pour analyse et report à une PR follow-up.
- R7 : retrain régression logistique des poids — reporté tant que < 500 trades accumulés.
- Décroissance temporelle (PR #9) : toutes les agrégations pondèrent chaque trade à 1.0 pour le moment.

#### PR #7 — News modulateur ±10 pts + Claude directionnel niveau 3 + kill switch gradué — ✅ EN COURS (branche `claude/phase2-pr7-news-modulator`)

Implémente la **Règle #5 niveaux 2 et 3** (Phase 1 avait livré le niveau 1 hard block). Aucune migration SQL (les colonnes `news_context_open`/`close` existent depuis migration 006).

**Sources de sentiment gratuites**
- ~~CryptoPanic Free~~ : le Free tier a été supprimé en 2026 (avant ce projet : 200 req/j, gratuit ; depuis : Growth $50/semaine minimum). Le helper `fetchCryptoPanicSentiment` reste présent pour rétro-compatibilité si `CRYPTOPANIC_KEY` est un jour configuré, mais n'est jamais actif par défaut.
- **Alpha Vantage News Sentiment** (stocks/ETF **et crypto** via préfixe `CRYPTO:BTC`) : score ∈ [-1..1] pondéré par relevance, **cache 6 h**. Source unique pour tous les asset classes supportés. Clé `ALPHAVANTAGE_KEY` déjà configurée.
- `resolveSymbolNewsContext(env, symbol, assetClass)` : priorité CryptoPanic si clé présente (future-proof), sinon fallback AV en crypto mode. Retourne null sur forex/commodity.
- `fetchCryptoPanicSentiment` capture en plus des `ambiguousArticles` (votes nuls mais important) pour alimenter Claude niveau 3.
- `fetchAlphaVantageNewsSentiment` idem si relevance > 0.5 et score absolu < 0.15.

**Niveau 2 — modulateur sentiment** (cap ±5 pts via sources gratuites)
- `applyNewsModulator(newsContext, direction, claudeMaxWeight)` dans `calcDetailScore` (6e param `newsContext`, 7e param `claudeMaxWeight`).
- Sentiment × 5 = source bonus, inversé pour short.
- Minimum 3 articles requis.

**Niveau 3 — Claude Haiku sur ambiguous** (±claudeMaxWeight pts dégradé par kill switch)
- `classifyNewsArticleWithClaude(env, article)` prompt 120 tokens, cache 6 h par hash FNV-1a d'URL.
- Classe en `{long-positif, short-negatif, bruit-ignore}` + confidence `{high, medium, low}`.
- `enrichNewsContextWithClaude` appelée UNIQUEMENT si classification neutre ET articles ambigus → un seul article/symbole/cycle pour contenir le budget (~cents/mois).
- Aligné direction = bonus, opposé = malus, bruit-ignore = 0.
- Tiers : high = poids max, medium = moitié, low = 0.

**Kill switch gradué** (anti-hallucination)
- `getClaudeNewsKillSwitchWeight(env)` lit `mtp_trade_feedback`, filtre `news_context_open.claudeSignal.confidence = 'high'`, calcule win rate sur 30 plus récents.
- Tiers : ≥55% → ±8 | 45-55% → ±4 | 35-45% → ±2 | <35% → 0 silent.
- Cache 1 h. Sous 10 trades high-confidence : défaut ±8 (observation).
- Reset 60 j + réactivation ±2 test × 20 trades : documenté mais pas automatisé.

**Cap global ±10 pts** sur le score final via `applyNewsModulator`.

**Persistance**
- `buildTrainingAnalysisSnapshotFromPayload` copie `newsContext + newsBonus + newsBonusReason` dans `analysis_snapshot`.
- `captureTradeFeedback` persiste `snapshot.newsContext` en `news_context_open` + re-fetch resolver au close pour `news_context_close` (cache déjà chaud).
- `buildStablePayload` propage `newsContext + newsBonus + regimeBonus + reasons` au top-level payload.

**UI fiche actif**
- `renderModulatorChips(d)` : chips pour régime bonus (PR #2), news bonus (PR #7), news context neutre avec topHeadline, Claude signal bordure dashed.
- Intégré dans la carte breakdown après la grille des 6 métriques.
- Palette : positive (var(--profit)), negative (var(--loss)), neutral, mod-claude dashed.
- 100% `var(--...)` + rgba tints sémantiques → light/dark OK.

**Endpoint admin**
- `GET /api/engine/news-context?symbol=X&asset_class=Y` → dump complet : context + claudeSignal + tier kill switch.

**Variables d'env nouvelles**
- ~~`CRYPTOPANIC_KEY`~~ : Free tier supprimé — pas configuré, le code tombe gracieusement en AV.
- `CLAUDE_MODEL_HAIKU` (optionnel) : défaut `claude-haiku-4-5-20251001`.

**Déploiement requis côté utilisateur**
1. Aucune nouvelle clé à créer (AV déjà configuré).
2. `wrangler deploy` (auto via GitHub Actions dès merge).
3. Aucune migration SQL.

**Validation paper** : 3-5 jours. Vérifier :
- `GET /api/engine/news-context?symbol=BTCUSDT&asset_class=crypto` retourne un context avec sentiment + articleCount.
- Sur la fiche actif d'un crypto/action liquide, chips modulator apparaissent si sentiment ≠ 0.
- Dans `mtp_trade_feedback`, nouvelles lignes contiennent `news_context_open` populé au lieu de null.

**Scope volontairement exclu**
- Messari / CoinDesk / Binance Announcements RSS (déjà listés dans SESSION.md Règle #5) : reportés en follow-up.
- Auto-reset 60 j du kill switch silent : documenté, non branché.
- Modulator news côté opportunities list (liste des opps) : seul `handleOpportunityDetail` et `buildOpportunityRowsForTraining` bénéficient actuellement du fetch news (caller 1 + caller 2 inline). La liste générale `/api/opportunities` passe aussi par `calcDetailScore` donc reçoit bien le modulator.

#### PR #8 — Auto-watchlist (ajout/retrait intelligent) — ✅ EN COURS (branche `claude/phase2-pr8-auto-watchlist`)

Implémente la **Règle #5 C** : le bot ajoute automatiquement les cryptos trending sur 7 jours (CoinGecko) et retire les actifs dormants depuis 90 jours, sauf core + pinned. Max 20 adds/mois, 10 pins max.

**Migration 007** (obligatoire côté utilisateur avant merge)
- Extensions `mtp_user_assets` : `source` (user|auto|core), `is_pinned`, `auto_added_at`, `auto_reason` (jsonb), `last_signal_at`, `dormant_flag`.
- Nouvelle table `mtp_watchlist_history` : action (auto_add|auto_remove|manual_pin|manual_unpin|manual_add|manual_remove), symbol, reason jsonb, triggered_by. RLS permissif + 3 index.

**Helpers backend**
- `recordTrendingSnapshot(env)` : fetch CoinGecko top 15 trending, persist en KV `watchlist:trending_history` avec date YYYY-MM-DD, rolling 7j.
- `countTrendingMentions(env)` : map symbol → count sur 7j depuis KV.
- `computeLastActivityPerSymbol(env)` : agrège 2000 derniers signals + 2000 derniers trades pour dernier `last_activity_ms` par symbole (détecteur dormance).
- `countAutoAddsThisMonth(env)` : query mtp_watchlist_history pour rate limit 20/mois.

**runWatchlistScan(env)**
- **AUTO-ADD** : candidats trending ≥ 3 fois sur 7j ET absents de la watchlist (format Binance `${ticker}USDT`). Trie par count desc, limité au quota restant. Upsert avec `source='auto'` + `auto_reason`.
- **AUTO-REMOVE** : parcourt la watchlist, skip core + pinned + user ; ne retire QUE les rows `source='auto'` sans activité > 90j. DELETE + history avec reason `{dormant_days, last_activity}`.
- Event `watchlist_scan` loggé dans `mtp_training_events`.

**Pin / unpin**
- `pinUserAsset(env, symbol)` : PATCH is_pinned=true, respecte cap 10. Logge `manual_pin`.
- `unpinUserAsset(env, symbol)` : PATCH is_pinned=false. Logge `manual_unpin`.

**Endpoints admin**
- `POST /api/user-assets/pin` body `{ symbol, pin: bool }` → toggle pin.
- `POST /api/watchlist/scan` : force un scan manuel.
- `GET /api/watchlist/history?limit=N` : 50 derniers events par défaut.

**Intégration moteur**
- Tick quotidien **3h UTC** dans `handleScheduledCycle`, décalé du 2h UTC (drift + corrections PR #4/#6) pour éviter contention des scheduled tasks.
- `handleUserAssetsList` étendu pour renvoyer source + is_pinned + auto_added_at + auto_reason + last_signal_at + dormant_flag.

**UI Réglages → Actifs surveillés**
- Badges `.ua-badge` : `ua-auto` (vert teinté, tooltip count trending), `ua-core` (neutre), `ua-pinned` (vert profit).
- Nouveau bouton pin (SVG épingle rempli quand épinglé) à côté du toggle enabled + delete.
- Bordure carte renforcée en profit si pinned.
- Listener `data-pin-user-asset` appelle `togglePinUserAsset()`.
- CSS 100% `var(--...)` + rgba profit sémantiques → light/dark OK.

**Garde-fous**
- maxAutoAddsPerMonth: 20 (Règle #5 C).
- maxPinned: 10.
- Core jamais retiré auto (`source='core'`).
- User jamais retiré auto (seul `source='auto'` éligible).
- Pinned jamais retiré.
- Rate limit : skip auto-add si quota mois épuisé.

**Scope volontairement exclu**
- News verified mention counter (10+ mentions/48h) : reporté, nécessite agrégation news robuste.
- Volume drop -70% detector : reporté, nécessite historique volume 90j stocké.
- Liquidity top 200 check : reporté, nécessite endpoint Binance volumes.
- Onglet dédié « Watchlist dynamique » : l'historique est accessible via l'endpoint admin, intégration UI à faire en follow-up si besoin.
- Core symbols tagués `source='core'` en base : à faire manuellement (UPDATE mtp_user_assets SET source='core' WHERE symbol IN (liste des 35 de LIGHT_SYMBOLS)). Non bloquant : par défaut les rows sont `source='user'` et restent donc protégés de l'auto-remove.

**Déploiement requis côté utilisateur**
1. Exécuter `cloudflare-worker/migrations/007_auto_watchlist.sql` dans Supabase SQL Editor.
2. `wrangler deploy` (auto via GitHub Actions dès merge).

**Validation paper**
- Laisser tourner ≥ 7 jours pour remplir l'historique trending.
- Après 7j, `GET /api/watchlist/history` doit montrer des `auto_add` si des cryptos trending persistantes émergent.
- Après 90 j d'inactivité sur un symbole `source='auto'`, `auto_remove` apparaît.
- Onglet **Réglages → Actifs surveillés** : badges `auto` sur les ajouts bot, bouton épingle opérationnel.

#### PR #9 — Rapport Claude hebdo + décroissance temporelle — ✅ EN COURS (branche `claude/phase2-pr9-weekly-report`)

**Migration 008** `mtp_weekly_reports` : week_start/week_end, report_markdown, stats_snapshot jsonb, trades_analyzed, corrections_applied, claude_model + tokens_input/output + generation_duration_ms, status (generated|archived|failed) + error_message. UNIQUE(week_start) → dedup automatique.

**Décroissance temporelle** (Règle #1 D de l'objectif final)
- `computeTemporalWeight(closedAt)` : 0-30j → 1.0, 31-90j → 0.5, 91-365j → 0.2, > 1 an → 0.1.
- `aggregateFeedbackBuckets` étendu : ajoute `totalWeight`, `weightedWins`, `weightedSumPnl`, `weightedSumPnlPct` par bucket. Expose `weightedWinRate`, `weightedExpectancy`, `weightedAvgPnlPct`.
- `detectCorrectionSignals` (PR #6) priorise `weightedExpectancy` quand disponible → les détecteurs de correction (R1, R2) se basent sur les trades récents, s'adaptant aux régimes de marché.

**Rapport hebdo Claude Sonnet** (Règle #1 F)
- `getPreviousWeekRange(ref)` : calcule lundi→dimanche écoulé en UTC.
- `collectWeeklyReportStats(env, weekStart, weekEnd)` agrège :
  * `feedback` de la semaine (mtp_trade_feedback sur intervalle)
  * wins/losses/winRate/totalPnl/avgWin/avgLoss/expectancy/rrEffective
  * top 3 gains + top 3 pertes (symbol + setup + direction)
  * leaderboard buckets (top 5 par pnl + bottom 3 négatifs)
  * ajustements activés/rolled back dans la semaine
- `generateWeeklyReport(env, {refDate, force})` : prompt Claude Sonnet structuré 5 sections markdown (Synthèse / Chiffres clés / Patterns / Corrections / Recommandations), max_tokens 800, temperature 0.4.
- Semaine sans trade → persist quand même un rapport "Aucun trade clos".
- Erreur Claude → persist `status='failed'` + `error_message` pour audit.
- Coût estimé ~$0.03-0.05/rapport → **< $0.25/mois**.

**Tick scheduled**
- **Lundi 6h UTC** (= 7h CET hiver, 8h CEST été) dans `handleScheduledCycle`.
- Dedup via unique(week_start) : re-run même lundi = skip.

**Endpoints admin**
- `POST /api/reports/weekly/generate` body `{force?, week_end?}` : génération manuelle. `week_end` permet de rattraper une semaine passée.
- `GET /api/reports/weekly?limit=N` : liste les rapports récents.

**UI onglet Rapports** (menu Plus, icône document)
- `state.reports = { list, loading, error, openId, generating }`.
- `loadReports()` + `generateReportNow()` (bouton « Forcer génération semaine dernière »).
- `renderReports()` : liste de `.report-card` avec header (titre + meta winrate/pnl/corr + chevron) + body dépliable au clic.
- `renderMarkdown(md)` helper minimaliste (headings h2/h3/h4, gras, italique, bullets → `<ul>`). **XSS-safe** : `safeText(md)` appelé EN PREMIER pour échapper, puis regex transforme uniquement les patterns markdown connus.
- 3 listeners : `data-generate-report`, `data-reload-reports`, `data-report-toggle`.
- Footer de chaque rapport : modèle Claude + tokens + durée ms (audit).

**CSS `.report-*`**
- 100% `var(--...)` + `var(--accent, var(--profit))` fallback.
- `.report-card.is-open` : bordure accent. `.report-head` min-height 56px (touch cible large).
- `.report-markdown` styles h2/h3/h4/ul/li/p/strong lisibles.

**Déploiement requis côté utilisateur**
1. Migration 008 auto-appliquée via workflow CI (PR #65) dès merge.
2. `wrangler deploy` auto via GitHub Actions.
3. Aucune nouvelle clé : utilise `CLAUDE_API_KEY` + `CLAUDE_MODEL_SONNET` (optionnel, défaut `claude-sonnet-4-6`).

**Validation paper**
- Lundi matin suivant : onglet **Plus → Rapports hebdo** → liste non vide avec rapport auto-généré.
- Alternative rattrapage : bouton « Forcer génération semaine dernière » → génère immédiatement.
- Vérifier coût Claude dans `mtp_training_events` event `weekly_report_generated` (payload contient `tokens_out`).

**Phase 2 TERMINÉE** ✅ : 5 PRs livrées (#59 #62 #63 #64 + cette PR). Toutes les 5 règles de l'objectif final sont maintenant opérationnelles (autonomie cron PR #1, long/short + F&G/VIX PR #2, news garde-fou PR #3, shadow/drift PR #4, feedback MAE/MFE PR #5, corrections auto PR #6, news modulateur + Claude niveau 3 PR #7, auto-watchlist PR #8, rapport hebdo + décroissance PR #9).

### Règle de garde — ne pas ajouter de feature qui n'avance pas ces 5 règles
Si on se retrouve à développer quelque chose qui ne sert ni l'autonomie, ni l'apprentissage+correction, ni la validation, ni l'exécution long/short, ni l'intégration du contexte fondamental → le reporter. L'app a déjà trop de features d'assistant ; il en faut moins mais qui servent le bot.

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
| 2026-04-22 | Claude sonnet-4-6 | Phase 1 livrée (4 PRs mergées : cron autonome, long/short + F&G/VIX, news garde-fou, shadow/drift) |
| 2026-04-23 | Claude opus-4-7 | Phase 2 PR #5 : `mtp_trade_feedback` + MAE/MFE intra-trade + badges historique |
| 2026-04-23 | Claude opus-4-7 | Hotfix deploy : doublon `handleEconomicCalendar` (PR #60) + workflow `apiToken` (PR #61) |
| 2026-04-23 | Claude opus-4-7 | Phase 2 PR #6 : détection 6 règles corrections + shadow→active/rollback + apply moteur + UI Santé bot |
| 2026-04-23 | Claude opus-4-7 | Phase 2 PR #7 : news modulateur ±10 pts (CryptoPanic + Alpha Vantage) + Claude Haiku niveau 3 + kill switch gradué |
| 2026-04-23 | Claude opus-4-7 | Phase 2 PR #8 : auto-watchlist trending CoinGecko + dormancy detector + pin/unpin + UI Réglages |
| 2026-04-23 | Claude opus-4-7 | CI : auto-apply Supabase migrations via Management API |
| 2026-04-23 | Claude opus-4-7 | Phase 2 PR #9 : rapport Claude Sonnet hebdo + décroissance temporelle + UI onglet Rapports — **FIN PHASE 2** |
| 2026-04-23 | Claude opus-4-7 | iPhone compactification fiche actif : breakdown 6 rangées denses + masquage news vide + media query < 430px |
