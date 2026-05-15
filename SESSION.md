# SESSION – ManiTradePro
> **Fichier de continuité de session — à lire en PREMIER à chaque nouvelle session IA.**

## Explication simple

Ce fichier est la **mémoire vivante du projet** : il résume l'état actuel, ce qui vient d'être fait, ce qui est en cours, et ce qu'il faut faire ensuite. À lire avant toute modification pour ne pas casser un travail existant ou redécouvrir un problème déjà connu.

---

> ⚠️ **RÈGLE IMPÉRATIVE — DOCUMENTATION PERMANENTE (mai 2026)**
>
> À CHAQUE merge, mettre à jour AVANT le merge :
> - `BOT_OBJECTIVE.md` — **constitution officielle du projet** (objectif réel + 10 règles absolues). À lire en premier de toute session.
> - `SESSION.md` (ce fichier) — état du projet
> - `ARCHITECTURE.md` — code après merge
> - `DATA_PIPELINE.md` — flux de données
> - `TRADING_LOGIC.md` — logique de décision
> - `PROVIDERS_MATRIX.md` — routage providers
> - `KNOWN_ISSUES.md` — bugs et dette
> - `CHECKLIST_MERGE.md` — checklist obligatoire à valider avant chaque merge
>
> Un merge n'est PAS considéré terminé tant que ces fichiers ne sont pas à jour.
> Cf. directive utilisateur du 15/05 — la documentation est désormais une partie critique du projet.

---

## Métadonnées
| Champ | Valeur |
|-------|--------|
| **Dernière mise à jour** | 2026-05-15 (passe de fiabilisation documentaire) |
| **IA utilisée** | Claude (claude-opus-4-7) |
| **Branche active** | `claude/resume-manitradepro-MeZLc` |
| **Repo GitHub** | emmanueldelasse-droid/ManiTradePro |
| **Déployé sur** | GitHub Pages + Cloudflare Worker (auto-deploy GitHub Actions) |
| **Worker URL** | `https://manitradepro.emmanueldelasse.workers.dev` |

---

## Stack technique
- **Type** : PWA — iPhone + web, vanilla JS, zéro dépendances
- **Frontend** : `assets/app.js` (~8 200 lignes) + `assets/styles.css` (~1 830 lignes) + `index.html` + `sw.js`
- **Backend** : `cloudflare-worker/worker.js` (~9 800 lignes) — déploiement auto via GitHub Action `deploy-worker.yml` (fallback `wrangler deploy` manuel possible)
- **APIs marché** : Binance, EODHD, Twelve Data (4 clés en rotation), Yahoo Finance, CoinGecko, Alpha Vantage, Finnhub, Claude AI
- **Sync cross-device** : Supabase — tables `mtp_positions`, `mtp_trades`, `mtp_trade_feedback`, etc.
- **Proxy CORS** : Cloudflare Worker (pour Binance iOS Safari)
- **EUR/USD** : Sourcé depuis Yahoo Finance `EURUSD=X` (fallback hardcodé `0.92` à supprimer, cf. `KNOWN_ISSUES.md` #2)
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

## Session 2026-05-15 (fin) — Vague B.6.1 : correctif stale ≠ delayed

Mini-PR corrective pour résoudre un faux positif identifié en runtime sur les quotes EODHD `delayed_15m`. Le brief B.6 disait : *"Le système doit distinguer stale ET delayed. Ce n'est PAS la même chose."* — mais l'implémentation initiale appliquait le même seuil `600 s` aux deux cas, marquant systématiquement les quotes delayed comme `stale: true`.

### Cause observée

Test runtime sur NESN.SW / ASML.AS / AAPL :
- `freshness: "delayed_15m"`, `quotedAt` ~21 min, `ageSec: 1255`
- Code initial : `if (ageSec > 600) stale = true` → marquait stale alors que c'est normal pour une quote différée de 15 min

### Fix livré (5 lignes)

Dans `quoteQualityEngine` (`cloudflare-worker/worker.js`) :
1. **Ordre inversé** : `delayed` calculé AVANT `stale` (au lieu d'après)
2. **Seuil `maxAge` adapté** :
   - crypto : `120 s` (inchangé)
   - **delayed : `1800 s`** (30 min — tolère 15 min légal + 15 min de marge)
   - live : `600 s` (inchangé)

```js
const maxAge = cls === "crypto" ? 120 : delayed ? 1800 : 600;
```

### Tests (72/72 PASS)

- ✅ TEST B.6.1 — quote `delayed_15m` à 21 min : `stale=false` (était `true` avant fix)
- ✅ TEST B.6.1 — `delayed=true` maintenu
- ✅ TEST B.6.1 — `validationStatus="delayed"` (pas `"stale"`)
- ✅ TEST B.6.1 sanity — quote `delayed` à 40 min : `stale=true` (seuil 1800 dépassé)
- ✅ Tous les 12 tests obligatoires B.6 toujours PASS
- ✅ TEST 1 (quote fraîche live) toujours `executionSafe=true`
- ✅ TEST 2 (quote live à 20 min) toujours `stale=true` (seuil 600 inchangé pour live)

### Périmètre strict respecté

- Aucune autre logique modifiée (autres flags, autres seuils, autres champs)
- Aucun champ legacy supprimé/renommé
- Aucun impact `strategicAnalysis`, `score`, `plan`, paper trading, learning, RR, providers
- Zéro modification front
- Aucune migration SQL

### Impact attendu en runtime

Les 3 quotes testées (NESN.SW, ASML.AS, AAPL via Alpha delayed) passeront de :
- AVANT : `stale=true`, `executionSafe=false`, `validationStatus="stale"`, `trustScore=25`
- APRÈS : `stale=false`, `executionSafe=true`, `validationStatus="delayed"`, `trustScore ≈ 60`

Cela ouvre les quotes delayed comme exploitables pour validation entrée — exactement le comportement spécifié dans le brief B.6.

### Limites restantes

- Les heures de marché synchrones approximatives (cf. limite B.6 inchangée)
- La comparaison inter-providers reste à implémenter
- Pas encore branché à l'auto-cycle ni au broker réel (volontaire)

---

## Session 2026-05-15 (suite) — Vague B.6 livrée : quoteQualityEngine

Validation live structurée des quotes pour préparer le branchement broker réel et les futurs blocages auto-trade. Périmètre STRICT : aucun changement de scoring, paper trading, learning, RR ou seuils.

### Apport

Nouveau moteur synchrone `quoteQualityEngine(quote, candles, options)` qui produit un objet `quoteQuality` injecté dans `liveContext` (jamais dans `strategicAnalysis`).

`quoteQuality` contient :
- `trustScore` (0-100) — agrégat indicatif
- 6 flags booléens : `stale`, `delayed`, `marketClosed`, `abnormalSpread`, `currencyMismatch`
- `providerConfidence` : `"high" | "medium" | "low" | "unsafe"`
- `executionSafe` (bool) — peut servir à valider entrée / TP/SL
- `validationStatus` : 1ère raison disqualifiante par ordre de gravité
- `reasons[]` : liste explicite des flags actifs
- metadata debug : `ageSec`, `spreadDeltaAtr`, `expectedCurrency`, `quoteCurrency`

### Règles de détection

| Flag | Règle |
|---|---|
| `stale` | crypto > 120 s, autre marché ouvert > 600 s, OU `freshness === "stale"` |
| `delayed` | `freshness` contient "delayed"/"recent", OU `sourceUsed` = alphavantage |
| `marketClosed` | crypto jamais ; forex week-end UTC ; stock/etf week-end OU jour férié OU hors fenêtre UTC par devise |
| `abnormalSpread` | `|livePrice - lastClose| / ATR > 3` (5 pour crypto), sur 14 bougies |
| `currencyMismatch` | quote.currency absent OU ≠ `getCurrencyForSymbol(symbol)` |
| `providerConfidence` | table par `sourceUsed` (binance/eodhd-rt/yahoo-live → high) |
| `executionSafe` | false si no_price, stale, currencyMismatch, abnormalSpread, ou provider unsafe |

`marketClosed` et `delayed` n'invalident PAS `executionSafe` par eux-mêmes — volontaire.

### Plomberie additive

- `quoteQualityEngine` + 3 helpers (`isMarketLikelyClosed`, `quoteAgeSeconds`, `providerConfidenceForSource`)
- `liveContext.quoteQuality` injecté à 3 endroits : `calcDetailScore` success path, early-return, `buildPartialAnalysisPayload`
- Aucun champ legacy touché

### Tests obligatoires (12/12 PASS)

- ✅ TEST 1 : quote fraîche marché ouvert → executionSafe=true
- ✅ TEST 2 : quote stale → stale=true, executionSafe=false, validationStatus=stale
- ✅ TEST 3 : samedi → marketClosed=true, stale=false (marché fermé ≠ stale)
- ✅ TEST 4 : delayed_15m → delayed=true
- ✅ TEST 5 : spread 25 ATR → abnormalSpread=true, executionSafe=false
- ✅ TEST 6 : NESN.SW résolu en USD → currencyMismatch=true, validationStatus=currency_mismatch
- ✅ TEST 7 : zéro impact strategic score (vérifié statiquement)
- ✅ TEST 8 : zéro régression paper trading (`buildWorkerPlan` continue de lire `base?.score`, `computeTradeSafetyScore` intact)
- ✅ TEST 9 : 21 champs legacy + B.4 préservés dans le return de `calcDetailScore`
- ✅ TEST 10 : front intact (aucun fichier `assets/`, `index.html`, `sw.js` modifié)
- ✅ TEST 11 : `quoteQualityEngine` ne dépend pas de `snapshotId` ni de `strategicScoreValue`
- ✅ TEST 12 : `handleOpportunities` et `handleOpportunityDetail` signatures inchangées

**Validation statique** : `/tmp/check_b6.js` — **68/68 checks PASS** (présence, propagation, simulation runtime du moteur sur les 6 cas + bonus trustScore).

### Limites restantes

- Heures de marché synchrones approximatives (fenêtres UTC larges pour tolérer DST). Peut donner un faux positif `marketClosed` à la marge — documenté dans `KNOWN_ISSUES.md` #6.
- Pas de comparaison inter-providers (un seul provider par quote). À ajouter si on déclenche un faux signal.
- `executionSafe` n'est pas encore branché à l'auto-cycle ni au futur broker réel — c'est volontaire, à brancher dans des PRs séparées.

### Futurs chantiers débloqués

- Badge UI "quote stale" / "marché fermé" / "spread anormal" basé sur `validationStatus` (PR front séparée)
- Blocage auto-cycle si `executionSafe === false` (PR métier séparée)
- Validation broker réel via `quoteQuality.executionSafe` à l'ordre
- Audit learning : corréler chaque trade ouvert à son `quoteQuality` au moment de l'ouverture
- Détection de provider qui dérive (en comparant `quoteQuality` entre providers concurrents)

---

## Session 2026-05-15 (suite) — Vague B.4 livrée : snapshotId + timestamps analytiques

Infrastructure logique pour la cohérence analytique. Permet de comparer deux payloads et détecter si l'analyse stratégique vient du même snapshot ou si elle a été recalculée.

### Apport

`calcDetailScore` retourne désormais 5 nouveaux champs analytiques en plus du payload existant :
- **`snapshotId`** — hash FNV-1a 8 chars hex déterministe sur `symbol | timeframe | analysisType | candlesAt | regimeAt | learningAt`. Strictement analytique : aucun input live n'entre dans le hash.
- **`strategicCalculatedAt`** — ISO du moment où `calcDetailScore` s'est exécuté
- **`candlesUpdatedAt`** — timestamp de la dernière bougie utilisée
- **`regimeUpdatedAt`** — `regime.updatedAt` (déjà rempli par `detectMarketRegime`)
- **`learningSnapshotAt`** — nouveau champ `computedAt` ajouté à `loadLearningContextForScan`

Tous exposés à la racine du payload **ET** dans `strategicAnalysis` pour traçabilité complète.

### Plomberie additive

- `fnv1a32(str)` + `buildSnapshotId({...})` — helpers synchrones (Math.imul, 32-bit, déterministe, sans dépendance crypto async)
- `loadLearningContextForScan` retourne maintenant `{ enabled, statsByBucket, computedAt }` (additif)
- `calcDetailScore` calcule les 4 timestamps et le `snapshotId` au début de la fonction, expose dans `strategicAnalysis` et dans le return final + early-return
- `buildStablePayload` propage les 5 champs
- `toOpportunityRow` propage les 5 champs
- `buildPartialAnalysisPayload` calcule un `snapshotId` minimal (sur `symbol + regimeUpdatedAt`) et expose `strategicCalculatedAt: nowIso()`
- 2 call sites de `calcDetailScore` injectent `quote.symbol = clean/symbol` si absent — fiabilise le hash (certains providers omettent ce champ)

### Garanties par construction

- TEST 1 ✅ — mêmes candles + même régime + même learning ⇒ même `snapshotId`
- TEST 2 ✅ — prix live différent uniquement ⇒ `snapshotId` identique (le hash n'intègre AUCUNE source live)
- TEST 3 ✅ — nouvelle bougie daily ⇒ `snapshotId` différent
- TEST 4 ✅ — changement learning snapshot ⇒ `snapshotId` différent
- TEST 5 ✅ — changement régime ⇒ `snapshotId` différent
- TEST 6 ✅ — aucun champ legacy supprimé/renommé
- TEST 7 ✅ — paper trading inchangé (`buildWorkerPlan`, `computeTradeSafetyScore`, `plan.safetyScore`)
- TEST 8 ✅ — zéro modification front (`assets/`, `index.html`, `sw.js`)
- TEST 9 ✅ — `handleOpportunities` et `handleOpportunityDetail` signatures inchangées
- TEST 10 ✅ — `buildSnapshotId` ne fuit aucun token live (`change24hPct`, `quote.price`, `quotedAt`, `volume24h`, `freshness`, `spread`)

### Validation statique

`/tmp/check_b4.js` — **72/72 checks PASS** (présence, propagation, simulation runtime du hash sur les 5 cas + bonus symboles différents).

### Limites restantes

- `analysis_snapshot` (Supabase JSON) recevra automatiquement le `snapshotId` quand de nouveaux trades seront ouverts, mais les trades historiques restent sans cette donnée.
- Le `snapshotId` ne capture PAS encore : `planGeneratedAt`, `newsUpdatedAt`, `regimeIndicators` (F&G/VIX). Ces sources contextuelles évoluent indépendamment. À traiter en vague B.5 si besoin.
- Aucune logique côté front ne consomme encore le `snapshotId` — c'est volontaire (cette PR est backend uniquement). Badge "recalcul détecté", refresh intelligent, blocage auto-cycle incohérent sont des PRs séparées.

### Futurs chantiers débloqués

- Badge UI "recalcul détecté" si `card.snapshotId !== detail.snapshotId`
- Badge "analyse de X minutes" basé sur `strategicCalculatedAt`
- Refresh intelligent côté front (ne pas re-render si même `snapshotId`)
- Blocage auto-cycle sur incohérence analytique
- Audit learning (corréler chaque trade ouvert à son `snapshotId` d'analyse)
- Validation broker réel (preuve que le signal n'a pas dérivé entre analyse et exécution)

---

## Session 2026-05-15 — Vague A.1 livrée : séparation strategicAnalysis / liveContext

Le chantier le plus sensible de la refonte : isoler le **score stratégique stable** (basé uniquement sur bougies clôturées + modulateurs stables) du **contexte live volatile** (prix, volume, freshness, F&G/VIX, news).

### Apport

`calcDetailScore` (`cloudflare-worker/worker.js`) retourne désormais **deux nouveaux objets** à côté du payload composite legacy :

- **`strategicAnalysis`** = score recalculé sans `change24hPct`, sans `volume24h`, sans `regimeBonus`, sans `newsBonus`, avec `dataQuality` neutralisé à 80. Applique uniquement `regimeMalus` (stable par batch) et `learningMalus` (bucket histoire). **Conçu pour être stable** entre deux clôtures de bougies sur les entrées live directes — pas une garantie absolue tant que `regimeMalus`, `learningMalus`, le cache régime KV (1 h) ou la dernière bougie daily peuvent évoluer indépendamment. `snapshotId` (vague B.4) sera nécessaire pour fermer ces angles.
- **`liveContext`** = container pour `change24hPct`, `volume24h`, `freshness`, `quotedAt`, `price`, `regimeBonus`, `newsBonus` + un `scoreImpact: { strategicScore, compositeScore, delta }` pour mesurer l'écart.

Plomberie additive (zéro champ supprimé/renommé) :
- `calcDetailScore` (worker.js, ~ligne 2499) — calcul + retour des deux objets
- `buildStablePayload` — propage dans le payload de fiche
- `toOpportunityRow` — propage dans chaque row de `/api/opportunities`
- `buildPartialAnalysisPayload` — renvoie `strategicAnalysis: null` + `liveContext` minimal pour le cas données insuffisantes

### Ce qui ne change PAS

- `score`, `breakdown`, `plan`, `plan.safetyScore`, `plan.exploitabilityScore`, `plan.decisionScore`, `plan.finalScore` — **inchangés**
- `buildWorkerPlan` et `computeTradeSafetyScore` — inchangés (continuent à consommer le composite)
- Paper trading, TP/SL, PnL, fermeture — inchangés
- Apprentissage et filtres qualité — inchangés
- `assets/app.js`, `styles.css`, `index.html`, `sw.js` — **zéro modification front** dans cette PR

### Tests

- ✅ Syntaxe JS valide (`node --check`)
- ✅ 5 patches présents (vérification regex)
- ✅ Validation logique : `strategicMomentum = clamp(momentum - liveMomentumDelta)` → toute variation de `change24hPct` est mathématiquement annulée par construction
- ⏳ Tests live à faire après déploiement Worker : `curl /api/opportunity-detail/NESN.SW` deux fois à 30 s d'écart → `strategicAnalysis.score` doit être identique, `liveContext.change24hPct` peut bouger
- ⏳ Vérifier que `plan.safetyScore` reste cohérent avec avant sur 3 symboles
- ✅ `bug-hunter` lancé en parallèle sur les 6 classes UI : zéro hit

### Doc mise à jour

- `KNOWN_ISSUES.md` #1 marqué résolu, ajouté au tableau "Issues résolues récemment"
- `TRADING_LOGIC.md` : nouvelles sections `strategicAnalysis.score` et `liveContext`
- `DATA_PIPELINE.md` : nouvelle section "Séparation strategicAnalysis / liveContext (vague A.1)" avec structure du payload
- `ARCHITECTURE.md` : ligne `calcDetailScore` mise à jour, "Non encore fait" marque la séparation comme livrée

### Reste à faire (PR séparée)

- Adaptation front : afficher `strategicAnalysis.score` à côté du composite, badge "Impact live" basé sur `liveContext.scoreImpact.delta`
- Décider si on bascule `plan.safetyScore` sur le strategic (ce qui figerait la décision auto-cycle entre deux bougies) — discussion à avoir avec l'utilisateur

---

## Session 2026-05-15 (fin) — BOT_OBJECTIVE.md, constitution officielle du projet

L'utilisateur a demandé la création d'un fichier permanent **`BOT_OBJECTIVE.md`** qui devient la **constitution officielle** du projet : objectif réel du bot, priorité absolue (préserver le capital), 10 règles absolues, rôle de l'IA, conditions de passage en argent réel.

### Apport

- Nouveau fichier `BOT_OBJECTIVE.md` (11 sections numérotées en français simple, sans jargon)
- Ajouté en tête de la liste **documentation permanente** dans `CLAUDE.md` et dans le bandeau ⚠️ de ce fichier
- À lire en premier de toute session IA avant toute modification

Aucun changement de code, aucune migration. PR additive uniquement.

---

## Session 2026-05-15 — Refonte vague A (PRs #156 → #158) + Documentation permanente

Suite de la session du 14/05. L'utilisateur a demandé une refonte architecture
rigoureuse en plusieurs vagues (A fondations, B cohérence, C multi-devises,
D modularisation) puis a établi en cours de session le principe de
**documentation permanente** : 5 fichiers de référence à maintenir à chaque merge.

### Refonte livrée — Vague A

| PR | Vague | Apport |
|---|---|---|
| #156 | A.3 | Calendrier jours fériés par devise (USD, EUR, CHF, GBP) pour 2026-2027. Worker bloque l'ouverture auto sur jour férié. Front affiche "Ferie · Bourse fermée aujourd'hui". |
| #157 | A.2 | `tradeValidationEngine` qui tag chaque trade clos `quality: ok / suspect / invalid` selon 5 règles (invalid_price, extreme_move, stale_quote, partial_data, instant_close). Migration SQL 016 : colonnes `quality` + `quality_flags` sur `mtp_trades` ET `mtp_trade_feedback`. `computeLearningStats` filtre maintenant `or=(quality.eq.ok,quality.is.null)`. |
| #158 | A.2 bis | 4 filtres learning restants : `aggregateFeedbackBuckets`, `observeShadowAdjustments`, `getClaudeNewsKillSwitchWeight`, `computeMarketRegimeStats`. Toute la chaîne d'apprentissage est maintenant strictement filtrée par qualité. |

### Documentation permanente créée

5 nouveaux fichiers à la racine (sans extension de chemin = à côté de SESSION.md) :

| Fichier | Rôle |
|---|---|
| **ARCHITECTURE.md** | État réel du code après merge : structure front, worker, Supabase, caches |
| **DATA_PIPELINE.md** | Flux de données par écran : où ça vient, cache, TTL, devise, usages |
| **TRADING_LOGIC.md** | Scoring, setups, règles d'ouverture/fermeture, apprentissage |
| **PROVIDERS_MATRIX.md** | Matrice de routage des fournisseurs (crypto, US, EU, UK, CH, forex, commodity) |
| **KNOWN_ISSUES.md** | Bugs, incohérences, dette technique, risques |

À chaque merge, mise à jour obligatoire des fichiers concernés.

### Reste de la refonte (planifié, non commencé)

| Vague | PR | Contenu | Risque |
|---|---|---|---|
| A.1 | À venir | Séparation `strategicScore` (stable, bougies clôturées) vs `liveContext` (volatile) | **ÉLEVÉ** — touche le moteur de scoring |
| B.4 | À venir | `snapshotId` propagé partout (cohérence opp/fiche) | Faible (additif) |
| B.5 | À venir | Timestamps complets (`scoreCalculatedAt`, `candlesUpdatedAt`, `planGeneratedAt`) | Faible |
| B.6 | À venir | `quoteQualityEngine` (âge max 120s, écart inter-providers, devise explicite) | Moyen |
| C.7-9 | À venir | `fxEngine` unifié, `originalCurrency` / `convertedCurrency` partout | Élevé (touche P&L) |
| D.10-11 | À venir | Modularisation worker (`/market/`, `/trading/`, `/learning/`, `/shared/`) + front (`/services/`) | Très élevé |

### Décisions importantes prises pendant la session

1. **Capital base** reste USD pour l'instant — bascule EUR repoussée à vague C
2. **Score stratégique fixe** : confirmé que le score affiché à l'ouverture doit être stable
3. **Trades historiques** : `quality=NULL` traités comme `ok` → pas de backfill rétroactif (préserve l'historique)
4. **Branche** : tout sur `claude/resume-manitradepro-MeZLc`
5. **Auto-merge** : maintenu pour les PRs additives validées par bug-hunter (cf. CLAUDE.md). Mais demande explicite de l'utilisateur pour les changements architecturaux (vague A.1 et au-delà)

### Risques actifs (extrait — cf. KNOWN_ISSUES.md pour la liste complète)

- 🟠 #1 Score volatile (`calcDetailScore` mélange live + bougies) → vague A.1
- 🟠 #2 `fxRateUsdToEur` fallback hardcodé 0.92 → vague C
- 🟠 #3 `capital_base` USD vs affichage EUR → vague C
- 🟡 #4 Pas de `snapshotId` (carte vs fiche) → vague B.4
- 🟡 #5 Timestamps incomplets → vague B.5
- 🟡 #6 `quoteQualityEngine` absent → vague B.6

---

## Session 2026-05-14 (suite) — PRs #131 → #147

Longue session sur deux gros chantiers : **fiabiliser les sources de prix**
(NVDA affiché à 3 prix différents, ASML fermé par faux stop) et **fixer les
ennuis UX** (page qui remonte toute seule, scroll qui freeze).

### Sources de prix — architecture finale

| Donnée | Provider primaire | Pourquoi |
|---|---|---|
| Bougies daily/weekly | **EODHD** `/eod` (US + EU + UK + Suisse) | Plan All World Extended payé, historique long et propre |
| Quote temps réel — actions US (`.US`) | **EODHD** `/real-time` | Temps réel sur ce plan |
| Quote temps réel — actions EU/UK/CH | **Yahoo v8 chart** | Temps réel gratuit, EODHD différé 15 min sur EU |
| Quote crypto | **Binance** | Seule source temps réel gratuite |
| Filet ultime | Twelve | Différé 15 min, badge "différé 15 min" affiché |

Conventions de suffixe traduites automatiquement dans `normalizeEodhdSymbol` :
- Yahoo `.DE` → EODHD `.XETRA`
- Yahoo `.L` → EODHD `.LSE`

Filet EOD ajouté dans `validateSymbolOnProviders` : si `/real-time` renvoie
vide (cas SIX Suisse hors heures pour ROG.SW), on accepte le symbole tant que
`getEodhdCandles` retourne au moins une bougie daily.

### Bug devise mixée (anti faux stop)

Cas réel ASML : position ouverte 1531.44 $US Nasdaq, fermée par stop "intraday_low_breach"
avec `intraday_low=1367` venant de Twelve (1367 EUR sur ASML.AS Amsterdam, pas
Nasdaq USD). Le tracker a comparé 1367 EUR à 1456 USD comme s'ils étaient
identiques → faux stop, position fermée -36 € à tort alors qu'elle était à +11 %.

Fix triple :
1. `buildTrainingPositionRowFromSignal` stocke maintenant `currency` à l'ouverture.
2. Cron close-check : `updatePositionIntraExcursion` n'est appelé QUE si la devise
   du live correspond à celle de l'entry — sinon le cycle est skip.
3. `trainingCloseTrigger` : garde-fou en tête qui retourne `null` si les devises
   diffèrent. Compatible legacy : skip si l'un des deux tags est vide.
4. `buildClosedTradeRowFromPosition` propage `currency` vers `mtp_trades`.

Migration SQL `015_positions_currency.sql` : ajoute la colonne `currency` sur
`mtp_positions` et `mtp_trades` avec backfill (EUR pour Paris/Xetra/Amsterdam,
CHF pour SIX, USD pour le reste).

### UX — bot params dans Réglages + bouton "Tout effacer"

- La carte "Paramètres du bot" passe de l'onglet **Trades** à l'onglet **Réglages** :
  l'auto-refresh des opportunités refermait l'accordéon en permanence quand
  elle était dans Trades. Sur Réglages, plus de re-render automatique.
- Bouton **"Tout effacer définitivement"** dans la carte. Un clic :
  désactive l'auto-ouverture → wipe trades + positions + feedbacks + events +
  journal moteur → réactive l'auto-ouverture si elle l'était (dans `finally`
  pour gérer le cas où le wipe rate). Plus besoin de désactiver à la main.
- 3 corrections d'audit appliquées : `wasAutoOpen === true` (safe quand
  `state.bot.account` null), restauration dans `finally`, cleanup `algoJournal`.
- Dedup à la PR #147 : la version Trades de la carte existait encore en
  parallèle de la version Settings. La version Trades a été retirée.

### UX — scroll préservé entre re-renders

L'app remontait en haut toutes les 30 s + freeze de scroll. Trois fixes en
cascade (sans ironie) :
1. PR #140 : sauvegarde `window.scrollY` avant re-render → ne marche pas car
   le scroll est sur `.main-content`, pas sur `window`.
2. PR #141 : corrigé pour utiliser `.main-content.scrollTop`.
3. PR #142 : suppression du `render()` inconditionnel dans le `setInterval`
   d'auto-refresh — `loadOpportunities`/`loadDetail` rappellent déjà `render()`
   à la fin du fetch, le render externe créait juste un re-render inutile qui
   freezait le scroll.

### EU/UK stocks ajoutables via /api/user-assets

11 actions ajoutées par script F12 dans la watchlist utilisateur :

| Bourse | Tickers |
|---|---|
| Paris | OR.PA, BNP.PA, STMPA.PA |
| Xetra | BMW.DE, BAS.DE |
| Amsterdam | PHIA.AS |
| SIX Suisse | ROG.SW, UBSG.SW |
| Londres | HSBA.L, ULVR.L |
| Nasdaq US | RACE (Ferrari) |

Cas spéciaux : EODHD n'a pas Ferrari sur Milan (`RACE.MI` vide), il faut
passer par `RACE` (NYSE). Idem STMicro : `STM.MI` vide, passer par `STMPA.PA`
(Paris) ou `STM` (NYSE).

### PRs de cette session

| PR | Apport |
|---|---|
| #131 | Route `/api/admin/eodhd-probe/:symbol` déplacée POST → GET |
| #132 | Currency-aware price display (EU stocks affichés en EUR) |
| #133 | Propagation du champ `currency` dans la chaîne payload (`buildStable` etc.) |
| #134 | Tous les `priceDisplay` callers passent `currency` |
| #135 | Live prices everywhere (Yahoo primary, TTL courts, refresh 1 min) |
| #136 | Badge source + ancienneté ("Données Yahoo · mis à jour il y a 30 s") |
| #137 | Single source par asset class (revert plus tard) |
| #138 | Opp scan via Yahoo batch (v8 individual = 429) |
| #139 | EODHD différé en filet pour EU stocks quand Yahoo 429 |
| #140 | 1ère tentative fix scroll (window.scrollY — faux) |
| #141 | Vrai fix scroll sur `.main-content` |
| #142 | Suppression `render()` redondant dans interval 30 s |
| #143 | Currency guard (anti faux stop) + bot params dans Settings + wipe button |
| #144 | EODHD en premier dans `validateSymbolOnProviders` |
| #145 | Traduit `.DE → .XETRA` et `.L → .LSE` pour EODHD |
| #146 | Filet EOD dans validation (ROG.SW hors heures SIX) |
| #147 | Dedup carte Paramètres du bot (Trades en double) |

### Migration SQL 015 à appliquer

```sql
alter table public.mtp_positions add column if not exists currency text;
alter table public.mtp_trades add column if not exists currency text;
update public.mtp_positions set currency = 'EUR' where currency is null and symbol in ('LVMH','RMS','AIR','TTE','SAP','SIE');
update public.mtp_positions set currency = 'CHF' where currency is null and symbol = 'NESN';
update public.mtp_positions set currency = 'USD' where currency is null;
update public.mtp_trades set currency = 'EUR' where currency is null and symbol in ('LVMH','RMS','AIR','TTE','SAP','SIE');
update public.mtp_trades set currency = 'CHF' where currency is null and symbol = 'NESN';
update public.mtp_trades set currency = 'USD' where currency is null;
```

### Points encore à creuser

- **Refonte UI/UX** : l'utilisateur a demandé un audit visuel complet via le
  skill `ui-ux-pro-max`. À faire en début de session suivante.
- **Plan EODHD Real-Time Plus** : si l'utilisateur veut du vrai temps réel sur
  les EU (et plus dépendre de Yahoo qui rate-limite), c'est l'add-on payant à
  envisager.

---

## PR #10 — EODHD + stop/TP intraday + setup obligatoire + cooldown (2026-05-14)

Livraison de 4 évolutions structurelles vers un bot paper plus réaliste, sans
toucher au passage en réel.

### Ce qui a été ajouté

**1. EODHD comme source principale historique daily non-crypto**
- `eodhdConfigured(env)`, `normalizeEodhdSymbol(symbol)`, `getEodhdCandles(...)`,
  `getEodhdCandlesWithKV(...)` — nouveau provider greffé dans `worker.js`
  avant la section EURUSD.
- Mapping symbole : US stocks/ETF → `.US`, Euronext Paris → `.PA`, XETRA →
  `.XETRA`, SIX → `.SW`, ASML → `.AS`. Crypto/forex/commodity retournent `null`
  → caller fallback Twelve.
- `getCandlesBySymbol` (dispatcher) essaie EODHD en premier pour daily/weekly
  non-crypto si `EODHD_API_KEY` est présent. Si la clé est absente ou EODHD
  échoue, fallback transparent vers Twelve Data, puis Yahoo. Aucun crash, aucun
  prix inventé.
- Binance reste seul maître pour crypto (1m/1h/4h/1d). Twelve reste maître pour
  intraday non-crypto. Yahoo reste le filet final.

**2. Stop/TP intraday détectés en paper trading**
- `trainingCloseTrigger` utilise désormais `position.live.highSinceOpen` /
  `lowSinceOpen` (déjà tracés par PR #5) pour vérifier si stop ou TP a été
  touché entre deux cycles.
- Règles strictes :
  - Long : stop touché si `low ≤ stopLoss`, TP touché si `high ≥ takeProfit`.
  - Short : stop touché si `high ≥ stopLoss`, TP touché si `low ≤ takeProfit`.
  - Cas ambigu (stop ET TP touchés dans la même fenêtre intra) → on considère
    le stop d'abord (hypothèse prudente, défavorable au bot).
    `exit_reason = "ambiguous_intraday_stop_first"`.
- Si l'intra-tracker n'a pas encore de borne (clôture pendant le tout premier
  cycle), fallback sur le compare scalaire historique.
- Persistance dans `mtp_trade_feedback` : `intraday_detected`, `intraday_source`,
  `intraday_high`, `intraday_low`, `execution_assumption`. Snapshot intraday
  également dans `analysis_snapshot.intraday`.

**3. Setup structurel obligatoire (toggle)**
- Nouveau flag `require_structural_setup` (default `true`) dans
  `mtp_training_settings`.
- `isTrainingCandidateAllowed` bloque l'ouverture si le setup retourné par
  `buildPlanFromConfiguration` n'est pas dans la liste `{pullback, breakout,
  continuation, pullback_short, breakdown, continuation_short, mean_reversion}`.
- Toggle dans Réglages → Bot → Édition, recommandé activé. Repasser à `false`
  pour reprendre la collecte data brute si besoin.

**4. Cooldown post-stop**
- Nouveau champ `post_stop_cooldown_hours` (default 24, plage 0-720, 0 = OFF)
  dans `mtp_training_settings`.
- Nouveau helper `lookupRecentStopsForSymbol(env, hours)` — lit
  `mtp_trades.closed_at >= cutoff & exit_reason ∈ {stop_loss,
  ambiguous_intraday_stop_first}` et retourne un Set de symboles "interdits".
- Pré-fetch une fois par cycle dans `handleTrainingAutoCycle`, passé à
  `isTrainingCandidateAllowed`. 0 surcoût par candidat.
- Le cooldown ne ferme jamais une position déjà ouverte — il bloque
  uniquement les nouvelles entrées auto.
- Event `cooldown_active` loggué dans `mtp_training_events` pour traçabilité.

### Nettoyage de routine
- Doublon `getYahooCandles` supprimé dans `cloudflare-worker/worker.js`
  (deux définitions se chevauchaient — code mort retiré).

### Migration SQL requise (avant `wrangler deploy`)
`cloudflare-worker/migrations/013_setup_required_and_cooldown.sql` :
```sql
alter table public.mtp_training_settings
  add column if not exists require_structural_setup boolean not null default true;
alter table public.mtp_training_settings
  add column if not exists post_stop_cooldown_hours integer not null default 24
  check (post_stop_cooldown_hours >= 0 and post_stop_cooldown_hours <= 720);
```
Sans cette migration, le worker fonctionne quand même : les valeurs par
défaut `getTrainingDefaults` s'appliquent en mémoire mais ne persistent pas.

### Variable d'env Cloudflare à créer
- **`EODHD_API_KEY`** : à pousser via `wrangler secret put EODHD_API_KEY`.
  Si absente, EODHD est ignoré silencieusement et Twelve/Yahoo prennent le
  relais — l'app ne crashe pas.

### Tests à faire après déploiement
1. Le worker démarre (`wrangler tail` clean).
2. `/api/training/settings` retourne les deux nouveaux champs.
3. Réglages → Bot → Édition affiche le toggle "Setup obligatoire" et le
   champ "Cooldown post-stop (h)".
4. Sauvegarder un draft persiste correctement les nouveaux champs en Supabase.
5. Forcer un cycle (`POST /api/training/auto-cycle`) — sur Mac/Win avec
   `EODHD_API_KEY` set, vérifier dans les logs qu'EODHD est appelé pour
   un actif US (ex. AAPL) et que `sourceUsed` du front affiche EODHD.
6. Après le premier stop sur un symbole, vérifier que `cooldown_active`
   apparaît dans `mtp_training_events` lors du cycle suivant et que ce
   symbole est filtré des candidats.
7. Vérifier qu'une position long touche son stop intraday : le close se
   déclenche dès que `low ≤ stopLoss` (et pas seulement au close daily).

### Ce qui reste pour PR #11 (différée, à demander explicitement)
- Backtest EODHD multi-année + frictions + walk-forward.
- Audit complet des helpers Twelve doublonnés (la rotation 4 clés peut être
  simplifiée mais c'est risqué — séparer dans une PR dédiée).
- Badge "intraday stop" sur la ligne d'historique trade (purement cosmétique).

---

## Snapshot bot-stats lisible par Claude (2026-05-12 — PR #105)

PR #103 avait ouvert `/api/public/bot-stats` sans auth pour qu'une session
Claude puisse répondre à "où en est le bot ?" sans PIN. Au premier essai :
**403 Forbidden** depuis le WebFetch sandbox — Cloudflare (Browser Integrity
Check sur workers.dev) bloque les fetchs non-navigateur **avant** le worker.
Confirmé en testant `/health` qui n'a aucune auth côté code : même 403.
Pas un bug du worker, pas un problème de config — limitation gratuite de
workers.dev sur laquelle on n'a pas la main.

### Solution livrée
Workflow `.github/workflows/snapshot-bot-stats.yml` (cron `*/30 * * * *` +
`workflow_dispatch`). Un runner GitHub Actions Ubuntu fetch l'endpoint
(que Cloudflare laisse passer), `jq '.data // empty'` pour drop l'`asOf`
qui changerait à chaque run, commit-only-if-changed sur la branche dédiée
**`bot-stats-data`** (créée orpheline de main, ne pollue pas l'historique).

### Comment Claude consomme
```
mcp__github__get_file_contents(
  owner="emmanueldelasse-droid", repo="manitradepro",
  path="data/bot-stats.json", ref="bot-stats-data"
)
```
Fichier mis à jour ~30 min de lag max, contient `configured`, `settings`
(mode, learningEnabled, allowLong/Short, maxOpenPositions, capitalBase,
seuils), `stats` global, `stats7d`, `stats30d`, `lastClosedAt`.

### Validation post-merge requise
1. Onglet *Actions* → **Snapshot bot stats** → **Run workflow** une fois
   pour amorcer (sinon attendre que le cron fire dans les 30 min).
2. Vérifier qu'un commit apparaît sur `bot-stats-data` avec
   `data/bot-stats.json`.
3. Lors de la prochaine session Claude : tester la lecture via MCP.

---

## Système adaptatif — PR C (2026-05-01)

Boucle adaptative branchée. Le bot pénalise désormais automatiquement les
combinaisons à historique perdant et mature (≥ 20 trades par bucket).
**Désactivé par défaut** — il faut cocher "Apprentissage actif" dans
Réglages → Bot → Édition pour l'enclencher.

### Ce qui change
1. **Helper `computeLearningMalus(stats)`** dans le worker. Asymétrique :
   - Bucket non mature → malus = 0
   - Espérance ≥ 0 → malus = 0
   - Espérance < 0 → malus 2 à 8 points proportionnel à |espérance|
   - **Jamais de bonus** pour un bucket gagnant (anti-surapprentissage).
2. **Pré-fetch `loadLearningContextForScan(env)`** au début de
   `handleOpportunities` et `buildOpportunityRowsForTraining`. Calculé une
   seule fois par cycle, partagé sur tous les symboles → 0 coût supplémentaire
   par opportunité.
3. **Injection dans `calcDetailScore`** via un nouveau paramètre optionnel
   `learningContext`. La formule devient :
   `score = raw - regimeMalus + regimeBonus + newsBonus - learningMalus`
   Renvoie aussi `learningMalus` et `learningReason` dans l'objet de sortie
   pour traçabilité.
4. **Toggle "Apprentissage actif"** (champ `learning_enabled` dans
   `mtp_training_settings`, default `false`) dans Réglages → Bot → Édition.
   Coupe immédiate possible si une stat se retourne contre nous.
5. **3 micro-UX page Apprentissage** :
   - Libellés compteurs : "Gagnantes (matures)" / "Perdantes (matures)"
     pour clarifier qu'on ne compte que les buckets ≥ 20 trades.
   - Bandeau d'info quand toutes les lignes sont "unknown" (anciens trades
     pré-PR A).
   - Lignes "unknown" masquées par défaut, avec toggle pour les afficher.

### Migration SQL Supabase requise
À exécuter dans le dashboard SQL :

```sql
alter table public.mtp_training_settings
  add column if not exists learning_enabled boolean not null default false;
```

Voir aussi `cloudflare-worker/migrations/012_learning_enabled.sql`.

Sans la migration, le toggle marche dans l'UI mais le worker retombe
toujours sur false (comportement neutre identique à avant PR C).

### Garde-fous
- **Default opt-in** : `learning_enabled = false` par défaut. Aucune
  modification de comportement tant que tu n'actives pas explicitement.
- **Min 20 trades par bucket** avant qu'un malus soit appliqué.
- **Cap à 8 points** sur le malus, même pour des buckets très négatifs.
- **Toggle de désactivation** dans les Réglages : 1 clic pour tout couper.
- **Cache 5 min** sur `computeLearningStats` : si un bucket bascule, ça met
  jusqu'à 5 min pour se propager (acceptable).

---

## Système adaptatif — PR B (2026-05-01)

Module d'apprentissage en lecture seule. **Aucune décision moteur n'est encore
modifiée** — c'est PR C qui branchera le câble. PR B sert à voir ce que le
bot a appris.

### Ce qui change
1. **Endpoint worker `GET /api/learning/stats`** (auth admin) qui agrège
   `mtp_trade_feedback` par bucket `setup × direction × régime × classe d'actif`
   et calcule pour chaque bucket : `winrate`, `gainAvg`, `lossAvg`,
   **`expectancy = winrate × gainAvg − (1 − winrate) × |lossAvg|`**, durée
   moyenne, et un drapeau `mature` (≥ 20 trades).
2. **Cache mémoire 5 min** côté worker (pas de table dérivée — calcul à la
   volée). Si la perf devient un souci au-delà de 50k trades, on ajoutera
   une table cache.
3. **Filtre par mode** : `?mode=all|exploration|core|training`. Joint
   `mtp_trades.mode` via `trade_id` pour catégoriser chaque feedback.
4. **Sous-onglet "Apprentissage"** dans Bot (à côté de État / Performance /
   Santé). Tableau des combinaisons triées par maturité puis par espérance,
   avec badges "actif" / "en collecte". Filtres par mode bot.

### Décisions de design (à modifier en PR C si besoin)
- **Maturité = 20 trades par bucket** (et non par mode global). Un bucket
  comme `pullback × RISK_ON × crypto` mûrit indépendamment de
  `breakdown × RANGE × stock`. Plus lent à activer mais plus juste.
- **Lecture seule volontairement** : la page n'a aucun bouton qui modifie
  le moteur. Si on voit un bucket "perdant", on l'observe — on ne le
  bloque pas encore. Le blocage automatique vient en PR C avec un toggle
  global "Apprentissage actif : oui / non" pour pouvoir tout couper en
  2 secondes si une stat se retourne contre nous.

### Migration SQL Supabase
Aucune migration spécifique à PR B — la table `mtp_trade_feedback` existe
déjà depuis la migration 006. Si la migration 011 (`bot_mode`) de PR A
n'a pas encore été exécutée, le filtre mode dans la page Apprentissage
catégorisera tous les trades comme `training` (rétrocompat).

---

## Système adaptatif — PR A (2026-05-01)

Première brique du système d'apprentissage par feedback réel. **Aucune logique
de décision n'est modifiée** — on prépare seulement la donnée.

### Ce qui change
1. **Deux modes du bot** au lieu d'un seul `training` :
   - **Exploration** (défaut) : seuils relâchés, plus de trades, capital réduit
     → le bot apprend.
   - **Core** : seuils stricts → seulement les meilleurs setups passent.
2. **Sélecteur dans Réglages → Bot → Édition** : 2 boutons "Exploration" /
   "Core" (badge dans la vue lecture seule). Le mode courant est inscrit
   dans chaque trade ouvert (`mtp_positions.mode` + `mtp_trades.mode` +
   `analysis_snapshot.entryMode`).
3. **Capture du régime à l'ouverture** : `analysis_snapshot.regimeAtOpen`
   (RISK_ON / RANGE / RISK_OFF) est désormais figé au moment d'ouvrir le
   trade, plus recalculé au close. Indispensable pour PR B (calcul de
   l'espérance par bucket setup × régime).
4. **Scores détaillés persistés** dans le snapshot : `decisionScore`,
   `safetyScore`, `exploitabilityScore`, `regimeBonus`, `regimeBonusReason`
   — tous étaient calculés mais perdus.

### Rétrocompatibilité
- Les requêtes Supabase qui filtraient `mode=eq.training` filtrent
  maintenant `mode=in.(training,exploration,core)` → les anciens trades
  restent visibles dans l'UI et les stats.
- Le front affiche le badge "Exploration" / "Core" via un fallback chain
  qui regarde successivement `analysisSnapshot.entryMode`, `execution.entryMode`
  et enfin `position.mode`.

### Migration SQL Supabase requise
La table `mtp_training_settings` doit accepter une colonne `bot_mode`. À
exécuter dans le dashboard SQL Supabase :

```sql
ALTER TABLE mtp_training_settings
  ADD COLUMN IF NOT EXISTS bot_mode TEXT NOT NULL DEFAULT 'exploration'
  CHECK (bot_mode IN ('exploration', 'core'));
```

Sans cette migration, le worker continue de fonctionner mais le toggle de
mode ne sera pas persisté côté serveur — il faudra le reposer à chaque
redémarrage. Tant qu'on n'utilise pas activement "core", l'app marche
quand même (default = exploration).

### Ce qui ne change pas (volontairement)
- Le moteur de décision (`calcDetailScore`) **n'utilise pas encore** les
  données collectées. C'est PR C.
- Aucune page "Apprentissage" n'est exposée. C'est PR B.

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

## Backtest historique — 2026-04-28 (premier run de validation)

Run id `run_20260428_1457_4tvm` — **23 symboles · 2841 trades · 5-8 ans**.
Lancé via `tools/backtest-run.js` puis snippet d'extension. 17 symboles
manquants à compléter en batch séparé (rate limit Twelve Data ~5/min effectif
en plan gratuit).

### Verdict global
- **Win rate : 37,8 %** (vs 31 % breakeven théorique pour RR 2,2)
- **EV pondéré : +0,414 % / trade**
- **17/23 symboles en EV positive**, 6 en négative

L'edge passe de +0,308 % (10 symboles) à +0,414 % (23 symboles) — la
stat se renforce avec l'échantillon, pas l'inverse.

### Lecture par bucket
**Stars (>+1 %/trade)** : ADA (+2,40), MATIC (+2,14), DOT (+2,13). Le moteur
pullback/breakout marche très bien sur les altcoins volatils en cycles
tendanciels nets.

**Solides (+0,3 à 1 %)** : AAPL, ETH, AVAX, BNB, NVDA, LINK, TSLA.

**Modestes (+0 à 0,3 %)** : META, GS, GOOGL, AMZN, SPY, JPM.

**Négatifs** : V (-0,62 %), XRP (-0,42 %), SOL (-0,22 %), BAC, MSFT, MA, BTC.

### Paradoxe MA / MSFT (à creuser en PR #2)
WR élevé (43 % MA, 41 % MSFT) — bien au-dessus du 31 % breakeven théorique
— mais EV négative. Ça veut dire que les pertes pèsent plus lourd que
les gains, contrairement au RR cible 2,2. Causes possibles :
- TP atteint partiellement avant retour
- Stops élargis par gaps overnight
- Slippage exit asymétrique

À investiguer dans la PR #2 (analytics par bucket + walk-forward).

### Limites du résultat
- ❌ **Pas de modélisation des frottements réels** : frais (~0,1 %), spread
  (~0,05 %), slippage stop (~5-10 % du stop). Si on retranche 0,2-0,3 % par
  trade, les symboles "modestes" passent en EV ≤ 0.
- ❌ **Pas de walk-forward** — risque de curve-fitting implicite. Sans
  validation hors-échantillon (train 2020-2023 / valide 2024 / test 2025),
  on ne peut pas dire que l'edge tient hors-historique.
- ❌ **MATIC (591 candles, 26 trades)** : période plus courte que les
  autres crypto (lancement plus tardif sur Binance). Stat moins fiable.

### Comparaison avec le paper récent
| | Paper (39 trades) | Backtest (2841 trades) |
|---|---|---|
| Win rate | 7,7 % | 37,8 % |
| EV / trade | -2,7 % | +0,414 % |
| TP touchés | 0 | ~1074 |

Le paper négatif récent est **statistiquement plausible** comme bruit
défavorable sur un échantillon de 39 trades, sans signature de défaut
moteur. Les 4 bugs structurels qu'on vient de corriger (PR #90) vont
rapprocher la donnée paper de la donnée backtest sur les prochains trades.

### Outil
`tools/backtest-run.js` — snippet console qui orchestre init/symbols/finalize/
summary. Limite : sleep 8s entre actions ne suffit pas, le rate limit
Twelve Data effectif est ~5/min. À porter à 20s dans une prochaine PR
si on relance les 17 symboles manquants.

### Prochaines étapes
- **C : Modéliser les frottements** sur les 2841 trades existants (post-
  traitement, pas de nouveau backtest). Donne l'EV "réaliste" en 1h de
  calcul.
- **B : Lancer PR #2 — walk-forward + analytics par bucket**. Split
  train/valide/test, agrégation par `setup × direction × régime ×
  asset_class`. C'est ça qui donne la vraie réponse hors-échantillon.
- **A : Compléter les 17 symboles manquants** (UNH, JNJ, LLY, PFE, KO, PG,
  WMT, COST, CAT, BA, XOM, CVX, QQQ, IWM, XLK, XLF, GLD) avec sleep 20s
  entre actions. Probablement pas de surprise majeure.

Ordre proposé : C → B → A.

### Implémentation C + B (2026-04-28)

**C : friction modeling**
- `GET /api/admin/backtest-symbol-summary?runId=X&frictionPct=0.2` — ajout
  param query optionnel qui retire `frictionPct` de chaque trade brut.
  Renvoie `avg_pnl_pct_net` + `win_rate_net` en plus des bruts. Valeur
  typique : 0.15 (frais 0.05% × 2 + spread 0.05%) à 0.30 (avec slippage
  stop). Rétro-compatible si non fourni.
- Même param ajouté aux 2 endpoints B ci-dessous.

**B : walk-forward + bucket analytics (partiel)**
- `GET /api/admin/backtest-bucket-stats?runId=X[&frictionPct=0.2]` —
  agrège par bucket `setup_type × direction × asset_class`. Identifie
  quels patterns marchent. Régime non couvert (à ajouter avec calcul
  SPY/QQQ/TLT à la date — sous-PR séparée).
- `GET /api/admin/backtest-walkforward?runId=X[&frictionPct=0.2]` —
  split temporel : train (≤2023), valide (2024), test (≥2025). Si
  l'edge est uniforme entre les 3 fenêtres → robuste. Sinon curve-
  fitting ou drift de marché.

**Restant pour PR #2 complet** :
- Calcul `regime_at_open` historique (SPY/QQQ/TLT à la date) pour les
  trades existants (script de backfill).
- UI admin pour visualiser les résultats.

**A : à faire dans une session future** — relancer le snippet
`tools/backtest-run.js` avec les 17 symboles restants et sleep 20s.

### Résultats C+B sur le run 2026-04-28 — verdict

**Friction sensitivity** sur 2841 trades, 23 symboles :
| Friction | EV net | WR net |
|----------|--------|--------|
| 0 % | +0,414 % | 37,8 % |
| 0,15 % | **+0,264 %** | 37,7 % |
| 0,30 % | **+0,114 %** | 37,1 % |
| 0,50 % | -0,086 % | (n/a) |

Tipping point entre 0,30 et 0,50 %. À friction réaliste swing daily
(0,15-0,30 %), edge **positif mais mince**.

**Bucket stats — 8/12 rentables, 4/12 toxiques** :
- **🟢 Stars** : pullback long crypto (+1,99 % net, 157 trades, ⭐),
  pullback_short crypto (+1,37 %, 199), continuation_short crypto
  (+0,59 %, 479), continuation long stock (+0,46 %, 644).
- **🔴 Toxiques (à désactiver)** : continuation_short stock (-0,93 %,
  390), continuation long crypto (-0,32 %, 391), pullback_short stock
  (-0,26 %, 195), continuation_short etf (-0,89 %, 20).

**Walk-forward — verdict critique** :
| Phase | Période | Trades | EV brut | EV net (0,15 %) |
|-------|---------|--------|---------|-----------------|
| train | ≤ 2023 | 1862 | +0,48 % | +0,33 % |
| valide | 2024 | 406 | **-0,23 %** | **-0,38 %** ⚠️ |
| test | ≥ 2025 | 573 | **+0,65 %** | **+0,50 %** ✅ |

**Lecture** :
- ✅ **Pas de curve-fitting classique** — le test 2025 est plus positif
  que le train. Si c'était sur-ajusté au passé, on aurait l'inverse.
- ⚠️ **2024 année négative** (-0,38 % × 406 trades). Pas une dégradation
  structurelle du moteur — juste une année où le pattern n'a pas payé.
  Probablement régime range/choppy hostile aux setups breakout.
- 🎯 **Test 2025 très positif** (+0,50 % net) — validation hors-train
  solide.

### Conclusions pour la stratégie

1. **Le filtrage par bucket est le levier majeur**. Désactiver les 4
   toxiques relèverait l'EV globale de +0,26 % à probablement +0,5-0,8 %
   net (à mesurer après implémentation).
2. **Pas de passage en réel maintenant** : 2024 prouve que des années
   peuvent être négatives. Avant le réel, il faut (a) filtrer les
   buckets, (b) valider en paper que les fixes (PR #90) rapprochent
   paper de backtest sur les prochaines semaines.
3. **continuation long crypto négatif** : à creuser — entrées trop
   tardives sur extensions parabolic ?
4. **Shorts crypto rentables** mais via les bears 2018/2022. La matrice
   actuelle qui les bloque en RISK_ON reste correcte — pas de
   contradiction.

### Décision : prochaines étapes prioritaires
**A → B (séquence à venir)** :
- **A : Filtrer les 4 buckets toxiques** dans `isTrainingCandidateAllowed`.
  Levier statistiquement validé, ~30 min de code, déploiement immédiat.
- **B : Continuer le paper 1-2 semaines** avec les fixes PR #90 + #91 +
  filtrage. Puis re-dump pour valider la convergence.

Items en attente (sous-PRs futures) :
- Backfill `regime_at_open` historique (calcul SPY/QQQ/TLT à la date) —
  permettra l'analyse par bucket × régime.
- Investigation pourquoi 2024 négatif (corrélation VIX/régime).
- UI admin pour visualiser.
- Compléter les 17 symboles backtest manquants (sleep 20s).

---

## Review bot trades — 2026-04-28 (4 bugs structurels)

Audit complet du dataset Supabase via `tools/post-mortem.js` (snippet console
qui appelle `/api/trades/state` et produit un rapport markdown). **39 trades
clos** dans le dump (vs 21 le 2026-04-23 — 18 nouveaux trades en 5 jours).

### Stats actualisées (39 trades exploitables)
- Win rate : **3/39 = 7,7 %** — **dégradation forte** vs 4/20 = 20 % au 2026-04-26
- PnL cumulé : **-1036 USD paper** (presque doublé en 5 jours)
- EV : **-26,56 USD/trade**
- 0 TP touché en 39 trades (24 stops, 11 manual/time, 4 BE, **0 TP**)
- 39 longs / 0 shorts (PR #82 activée le 25/04 — pas un bug, cf. #4 ci-dessous)
- Stop_dist médiane 5,12 % · TP médiane 10,21 % · RR cible médian 2,2

### 4 bugs structurels identifiés

#### Bug #1 — Doublons de positions (race condition cycles concurrents)
**Symptôme** : META × 2, MSFT × 2, AAPL × 2 à 30 min d'écart avec PnL strictement
identiques (-40,96 / -42,29 / -34,43). L'ID embarque `Date.now()` donc
`Prefer: resolution=merge-duplicates` ne dédupe rien. Deux cycles cron qui se
chevauchent voient `openRows` vide et insèrent chacun.

**Fix** (commit `<TBD>`) : `openTrainingPositionFromRow` (worker.js:4014)
fait maintenant un GET sur Supabase avant l'INSERT (`status=eq.open & symbol=eq.X
& side=eq.Y`) et skip si déjà ouvert. Élimine la race sans changer la logique
métier.

**Note** : ne couvre pas les **re-entries successives** (bot ouvre META, stop
touché, ré-ouvre 30 min plus tard sur le même plan persistant) — qui restent
techniquement légitimes mais probablement néfastes. Question ouverte : faut-il
un cooldown post-stop sur le même symbole ? Décision repoussée à plus de data.

#### Bug #2 — `duration_days = 0` sur 32/39 trades
**Symptôme** : la colonne `duration_days` était lue à la sortie mais jamais
peuplée à la fermeture (worker.js:3737 `buildClosedTradeRowFromPosition`).

**Fix** (commit `5f527a7`) : calcul `(closed_at - opened_at) / 86400000` en
jours décimaux (précision 6 chiffres pour holdings < 1 minute).

#### Bug #3 — `setupType = "unknown"` sur 26/39 trades (67 %)
**Cause racine** : ce n'est pas un bug d'enregistrement — le moteur **ouvre
réellement des trades sans setup structurel détecté**. `tradeReady` à
worker.js:2287 ne dépend que des scores (decisionScore ≥ 74, actionability ≥ 72,
safety ≥ 68), pas de `plan.setupType`. Conséquence : 67 % des trades sont pris
"score-only" — sans niveau d'invalidation propre, sans niveau cible propre,
sur un % fixe ~5 %.

**Fix partiel** (commit `5f527a7`) : `setupType: plan?.setupType ||
"no_structural_setup"` (au lieu de `null`) pour distinguer ces trades dans
Supabase et les comparer en stats vs les trades avec setup réel.

**Décision en suspens** : 3 options — (1) strict, rejeter ces candidats dans
`isTrainingCandidateAllowed` (coupe 67 % du flux) ; (2) souple, laisser passer
et stat sur ≥ 20 trades par groupe avant décision ; (3) investiguer si
`detectConfiguration` (worker.js:1645) a un bug et **devrait** détecter des
patterns mais ne le fait pas. **Choix actuel : option 2** — pas de blocage,
on collecte la donnée d'abord.

**Important** : sur les 13 trades avec `setupType="continuation"`, la perf est
**aussi mauvaise**. Ce n'est donc pas LA cause des pertes — une cause possible.

#### Bug #4 — 0 short malgré PR #82 — **PAS UN BUG**
**Verdict après investigation** : la matrice `validateConfiguration`
(worker.js:1760-1793) bloque les setups short en RISK_ON sauf
PULLBACK_SHORT sur crypto. 38/39 trades ont `regime="tendance haussiere"`,
donc le marché est en phase RISK_ON depuis l'activation. La PR #82 a corrigé
l'asymétrie de **bonus de scoring** (-4 → +4) mais n'a pas changé la matrice
de régime — et c'est **correct** : on ne shorte pas en haut d'un cycle
haussier.

**Pas de fix code**. Les shorts apparaîtront naturellement quand le marché
passera en RISK_OFF. Si on veut explorer les shorts en RISK_ON pour de la
data, il faudrait modifier la matrice — mais c'est une **décision stratégique**,
pas une correction de bug.

### Outil : `tools/post-mortem.js`
Snippet console à coller dans la fenêtre du navigateur (login PIN requis) qui
fetch `/api/trades/state` et produit un rapport markdown : stats agrégées,
distribution `exit_reason` inférée, classement des pertes par cause probable,
tableau détaillé trade par trade. Réutilisable à chaque session pour suivre
l'évolution. Limite connue : `analysis_snapshot` ne persiste pas
`atrAtEntry` — proxy "stop dans le bruit" en seuil absolu par classe d'actif.

### Pattern dominant des pertes (confirmé sur 24 stops)
Sur les 24 stops touchés, `pnl_pct` est **strictement égal à
-stop_dist_pct** (META 5,12 % → -5,12 %, MSFT 5,29 % → -5,29 %, BTC 5,73 %
→ -5,73 %). **Aucun trade ne fait BE intermédiaire avant stop**, aucun ne
touche TP. Signature : entrée tardive sur un mouvement épuisé, retracement
direct au stop sans pull-back favorable. Cohérent avec le constat "trade
hors setup" (#3) : sans pattern technique pour timer l'entrée, on rentre
au pire moment.

### Prochaines étapes (post-fix)
1. **Attendre la propagation Cloudflare** (`.github/workflows/deploy-worker.yml`,
   30-60 s après merge).
2. **Re-dump des trades dans 5-7 jours** pour valider les fixes :
   - `duration_days` populé sur les nouveaux trades
   - `setupType` distingue clairement `"continuation"` / `"no_structural_setup"`
   - Pas de nouveaux doublons à 30 min d'écart
3. **Décision sur l'option du bug #3** une fois ≥ 20 trades par groupe.
4. **Cooldown post-stop** : à investiguer si on confirme que les "doublons" sont
   en fait des re-entries successives.

---

## Diagnostic performance bot — 2026-04-23

### Contexte
Audit des 21 trades clôturés en Supabase (du 2026-04-08 au 2026-04-23). **Paper trading uniquement — aucun capital réel**. L'objectif est d'**apprendre**, pas de protéger du capital. Donc l'auto-cycle **reste actif**, on collecte pour analyser.

### Mise à jour 2026-04-26 (post-backfill)
Après exécution de l'endpoint `/api/admin/backfill-pnl` (PR #81 + #83), les 3 trades cassés sont chiffrés correctement :
- AMD #18 : **+20,58 USD** (+4,64 %) — était 0
- AMD #20 : **+23,28 USD** (+5,29 %) — était 0
- ETH #19 : **-70,11 USD** (-3,11 %) — était 0

**Stats actualisées (20 trades exploitables, 100 % long)** :
- Win rate : **4/20 = 20 %** (au lieu de 2/17 = 11,8 % avec 3 cassés exclus)
- Net additionnel : -26,25 USD ajouté à la perte cumulée (+43,86 wins - 70,11 loss)
- Lecture : le bot reste structurellement perdant (20 % WR avec RR 2.2 demande ~31 % pour breakeven), mais moins catastrophique que l'estimation originale. Le bug `pnl=0` cachait des wins réels.
- Les shorts viennent d'être activés (PR #82, 2026-04-25) — encore 0 short pris, surveillance sous 24-48h.

### Résultats bruts (21 trades, 100% long) [état initial avant backfill]
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
3. ✅ **Aucun `pnl=0` cassé** dans le dataset — **rempli le 2026-04-26** (PR #80 + #81 + #83 + endpoint backfill exécuté). `/health` pnlIntegrity.brokenPnlCount = 0.
4. **Au moins 5 post-mortem formalisés** avec cause identifiée → ça prouve qu'on sait lire les pertes, pas juste les subir.
5. **Frictions shorts modélisées** dans le calcul paper (cf. todo dédiée plus bas) — sinon les EV des shorts paper sont trompeuses vs réel.

Tant que les 5 conditions ne sont pas réunies : **100 % paper**, on apprend.

### Activation des shorts (2026-04-25)

**Décision** : shorts activés en paper. Asymétrie corrigée dans `worker.js:2016` (`raw -= 4` → `raw += 4`) — un short avec structure ≤ 40 + momentum ≤ 40 reçoit désormais le même bonus +4 qu'un long avec structure ≥ 60 + momentum ≥ 60. Les seuils de direction (`structure >= 56 / <= 44`, `momentum >= 54 / <= 46`) étaient déjà symétriques autour de 50, pas un bug.

**Pourquoi maintenant** : 0 short sur 21 trades empêche d'évaluer la stratégie en marché baissier. Doubler la matière d'apprentissage est plus utile que protéger un dataset 100 % long déjà perdant.

### TODO — Modéliser les frictions shorts AVANT passage en réel

Les shorts paper actuels sont calculés comme un long inversé (`(entry - exit) * quantity`). Sur réel les coûts sont différents et asymétriques. **Sans modélisation, l'EV des shorts paper sur-estime la perf réelle.** À implémenter avant que le critère #5 ci-dessus soit considéré rempli :

1. **Funding rate / borrow fee overnight** : sur crypto perpétuels (~0.01-0.10 % par 8h variable) et actions (frais d'emprunt 0.5-30 %/an selon dispo). Soustraire du PnL au prorata de la durée de holding.
2. **Cap d'asymétrie du gain** : un short ne peut pas faire plus de +100 % (l'actif tombe à zéro). En paper actuel, un take_profit fixe en % peut donner mécaniquement plus que possible — capper.
3. **Borrow availability** : certaines actions ne sont pas shortable. À terme, un check côté broker simulé (skip le trade si pas de borrow). Pour le paper actuel, lister une whitelist statique des shortables liquides.
4. **Leverage crypto perp** : si le bot passera en réel via futures, ajouter une simulation de liquidation à -X % selon le levier. Pour démarrer, levier 1 (équivalent spot) → pas de liquidation.
5. **Short squeeze** : pas de modélisation possible (événement queue). Mais documenter dans chaque post-mortem de short si le pattern détecté correspond à un squeeze typique (gap haussier > 5 %, volume > 3×).

Cette todo est verrouillée comme **bloquante** pour le passage en réel — le critère #5 ci-dessus en dépend.

### Backtest historique (en cours — démarré 2026-04-26)

**But** : analyser 5-8 ans de marché, apprendre quelle stratégie marche dans quel régime, alimenter la mémoire contextuelle fine. Pas un simple go/no-go — un vrai moteur d'apprentissage par contexte (Phase 3 de la roadmap).

**Périmètre validé avec l'utilisateur** :
- **Crypto** : 10 symboles top cap (BTC, ETH, SOL, BNB, XRP, ADA, AVAX, LINK, MATIC, DOT) sur 2020-2025 (5 ans).
- **Actions** : 30 symboles diversifiés sectoriellement (7 tech mega caps, 5 finance, 4 santé, 4 conso, 4 industriels, 6 ETF) sur 2018-2025 (8 ans).
- Volume : ~80 000 bougies 1D, ~12 MB en cache KV (largement sous le quota free tier 1 GB).
- Buckets : `setup × direction × régime × asset_class` (~140 buckets théoriques).
- **Méthodologie anti curve-fitting** : walk-forward strict (train 2020-2023 / valide 2024 / teste 2025), N ≥ 30 par bucket pour validation, sinon mode exploration en live.

**Découpage 3 PRs** :
1. **Backtest #1** — récupération + cache KV bougies + replay engine + table `mtp_backtest_trades` + endpoint admin POST `/api/admin/backtest-run` (chunking par symbole pour respecter la limite CPU 50ms Cloudflare Workers).
2. **Backtest #2** — agrégation par buckets + walk-forward + UI admin.
3. **Backtest #3** — câblage au bot live (skip toxique, taille réduite non-validé, taille pleine validé, logging exploitation vs exploration).

**Décisions verrouillées** :
- Pas de modification des règles après lecture des résultats du backtest dans la même session — c'est un go/no-go statistique, pas un terrain d'optimisation. Sinon = curve-fitting.
- Buckets sous N=30 → marqués « insuffisant », le bot fait de l'exploration prudente dessus en live (taille réduite). On accepte la zone d'incertitude.

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
- ~~Nettoyage CSS `.ai-card` — classe non émise par aucun template~~ ✅ fait (branche `claude/implement-todo-item-udOhw`)

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
