# PROJECT_RULES — Règles de fonctionnement du projet ManiTradePro

## Explication simple

Ce fichier liste les **règles de fonctionnement non négociables** du projet. C'est la référence opérationnelle utilisée à chaque session pour éviter de répéter les erreurs déjà faites.

Pour les règles **produit** (objectif du bot, priorité capital, conditions argent réel), voir `BOT_OBJECTIVE.md`.
Pour les règles **process** (langue, vocabulaire, workflow git), voir `CLAUDE.md`.
Pour les règles **merge** (checklist obligatoire avant chaque PR), voir `CHECKLIST_MERGE.md`.

Ce fichier-ci porte les règles **techniques structurelles** qui ne rentrent dans aucune des catégories ci-dessus.

---

## Règles d'or — backend (Worker)

### R1. Séparation stricte analytique / live

- **Analytique** : tout ce qui dépend de bougies clôturées, régime macro, learning bucket, configuration détectée. Doit rester stable entre deux clôtures de bougies.
- **Live** : prix, volume, freshness, change24h, regimeBonus (F&G/VIX recalculés en temps réel), newsBonus (cache 3-6 h mais nature volatile).

**Conséquence** :
- Le `strategicAnalysis.score` ne doit JAMAIS dépendre d'une source live.
- Le `liveContext` est l'unique container des valeurs volatiles.
- Le `snapshotId` est PUREMENT analytique. Aucun input live n'entre dans le hash.

### R2. `snapshotId` — règles absolues

- Le `snapshotId` est calculé par `buildSnapshotId({ symbol, timeframe, analysisType, candlesAt, regimeAt, learningAt })`.
- Hash FNV-1a 8 chars hex, déterministe, synchrone (pas `crypto.subtle.digest` async).
- **Interdit d'ajouter au hash** : `change24hPct`, `quote.price`, `quotedAt`, `volume24h`, `freshness`, `spread`, n'importe quel champ qui change avec le prix live.
- **`snapshotId` n'est PAS** : un timestamp live, une cache key, un tradeId, un userId, un identifiant utilisateur.
- **`snapshotId` est** : un identifiant de cohérence analytique uniquement.

### R3. Timestamps analytiques séparés du timestamp live

- Les 4 timestamps analytiques (`strategicCalculatedAt`, `candlesUpdatedAt`, `regimeUpdatedAt`, `learningSnapshotAt`) sont exposés à la racine du payload **et** dans `strategicAnalysis`.
- Le timestamp live (`liveContext.quotedAt`) reste exposé séparément.
- **Interdit de mélanger les deux notions de fraîcheur**. Un timestamp analytique ne doit jamais référencer une source live, et vice-versa.

### R3-bis. `quoteQualityEngine` — validation live, jamais analytique

- `quoteQualityEngine` produit un objet `quoteQuality` qui rejoint **uniquement** `liveContext.quoteQuality`.
- **Interdit** d'injecter `quoteQuality` dans `strategicAnalysis` ou dans `plan.safetyScore` / `plan.decisionScore` / etc.
- **Interdit** de modifier le score stratégique ou le composite à partir de `quoteQuality`.
- `quoteQualityEngine` est synchrone (cohérent avec `calcDetailScore`). Pas d'I/O, pas d'`await` dedans.
- Si une nouvelle source de validation live est ajoutée, elle doit être un champ supplémentaire du `quoteQuality`, pas une modif du moteur de score.

### R3-ter. Safety gate execution — `evaluateExecutionSafety` (vague B.9)

- **Toute action automatique** (auto-open, validation entrée, déclench TP/SL automatique, future exécution broker réel) **DOIT** être précédée d'un check `evaluateExecutionSafety(payload).safe === true`.
- Si `safe === false` ou `quoteQuality` absent (`missing === true`) → l'action est **bloquée**. Le scoring stratégique et la décision UI ne sont PAS modifiés.
- **Interdit** d'utiliser `evaluateExecutionSafety` pour modifier un score, une `decision`, un `trendLabel`, un `confidence`, un `plan.*`. C'est un garde-fou d'exécution, pas un input d'analyse.
- **Interdit** d'élargir la gate à `delayed` ou `marketClosed` seuls — ils sont volontairement informatifs (cf. R3-bis et règles B.6). Seuls `stale`, `currencyMismatch`, `abnormalSpread`, `providerConfidence === "unsafe"`, `no_price`, `eod_snapshot` (vague B.10), `executionSafe === false` (générique) déclenchent un blocage.
- **Vague B.10 — règle R3-ter étendue** : une quote dont `sourceUsed === "snapshot"` ou `freshness === "eod"` (filet ultime EOD veille de `getStoredDailyQuoteFallback`) **DOIT** être non exécutable. `quoteQualityEngine` lui pose `isSnapshot=true`, `executionSafe=false`, `validationStatus="eod_snapshot"`, et `providerConfidenceForSource` retourne `"unsafe"` pour `src === "snapshot"`. Aucune ouverture/fermeture automatique sur snapshot. UI peut afficher (badge `warn` "Dernier prix dispo") mais le bot s'abstient.
- **Vague B.10 — règle ordre d'évaluation au close** : dans `handleTrainingAutoCycle` phase fermeture, `evaluateExecutionSafety(detailPayload)` **DOIT** être exécutée AVANT `updatePositionIntraExcursion`. Une quote unsafe ne doit jamais polluer le tracker MAE/MFE (`position.live.highSinceOpen` / `lowSinceOpen`), car ces valeurs sont persistées en BDD et peuvent provoquer un faux close intraday au cycle suivant.
- **Vague B.10 — règle alignement quote close** : la quote validée par la gate (`detailPayload.liveContext.quoteQuality`) et la quote utilisée pour le trigger (`effectivePrice`) **DOIVENT** provenir de la même résolution. `effectivePrice = detailPayload.price ?? liveQuote.price ?? stalePrice`. Ne JAMAIS valider une quote et exécuter sur une autre.
- **Vague B.10 — événements `auto_*_blocked_unsafe`** : doivent inclure `reasons:[...]` en plus de `code`. `code` reste le premier élément de `reasons[]` pour compat B.9.1 safety-stats.
- Tout nouveau point d'exécution automatique (futur broker, futurs handlers manuels gated, etc.) **doit** appeler `evaluateExecutionSafety` et écrire un événement dans `mtp_training_events` (event_type style `auto_<action>_blocked_unsafe` avec `{symbol, code, human, missing_quote_quality, ...}`).
- Le mode manuel UI (action utilisateur explicite) **n'est PAS** gated par défaut — l'utilisateur reste souverain. Le front affiche déjà l'état via le bloc B.8 "Qualité du prix".

### R4. Prix live unique — `resolveLiveQuote` (vague B.7)

- **Un même actif ne doit jamais afficher deux prix différents entre la liste opportunités et la fiche actif.**
- Tout code qui doit obtenir un prix live destiné à l'affichage ou à une décision trading **DOIT** passer par `resolveLiveQuote(symbol, env, ctx, options)`.
- **Interdit** d'appeler `getYahooQuote`, `getEodhdRealTimeBatchQuotes`, `getTwelveQuote`, `getCryptoQuote`, `resolveUnifiedMarketQuote` directement dans un nouveau handler d'affichage. Réservé au mécanisme interne de `resolveLiveQuote`.
- **Interdit** de stocker un prix live ailleurs que dans :
  - le cache mémoire `market:snapshot:${symbol}` (TTL 2 min)
  - le cache KV `kv:livequote:${symbol}` (TTL effectif 30 s, écriture via `writeLiveQuoteToKv`)
- Le front **NE DOIT PAS** inventer ni recalculer un prix. Il lit le payload, point.
- **Aucun prix périmé ne doit être affiché comme actuel**. Si `quoteQuality.executionSafe === false` (`stale`, `currency_mismatch`, etc.), le payload signale le problème via `validationStatus` et `reasons[]`. Le consommateur a la responsabilité de respecter ce signal.
- Exception **volontaire** : `validateSymbolOnProviders` (validation à l'ajout d'un actif) court-circuite `resolveLiveQuote` pour tester chaque provider individuellement. Pas d'affichage. Documenté dans `KNOWN_ISSUES.md`.

#### ⚠️ Dépendance d'infrastructure critique — binding KV `MTP_CACHE`

La cohérence prix cross-worker de R4 **dépend du binding KV `MTP_CACHE`** côté Cloudflare Worker.
- Si `MTP_CACHE` est **présent** (config normale, `wrangler.toml [[kv_namespaces]]` + dashboard CF) : `kv:livequote:${symbol}` est écrit/lu par toutes les instances → cohérence garantie.
- Si `MTP_CACHE` est **absent** ou mal configuré : `kvGet`/`kvSet` retournent silencieusement `null`/`false`. **Le code ne plante pas, mais le bug cross-worker revient** (deux prix possibles entre opp et fiche). Aucune alerte n'est levée.

**Vérification recommandée** avant toute mise en prod : `wrangler kv:namespace list` et confirmer que `MTP_CACHE` est bindé dans `wrangler.toml`. Un futur chantier (PR séparée) pourra ajouter une alerte si `writeLiveQuoteToKv` échoue de manière répétée.

### R4. Champs legacy préservés (additif uniquement)

- Toute évolution du payload `/api/opportunities` ou `/api/opportunity-detail/:symbol` doit être **additive**.
- **Interdit** de supprimer ou renommer un champ legacy (`score`, `breakdown`, `plan`, `plan.safetyScore`, `plan.exploitabilityScore`, `plan.decisionScore`, `plan.finalScore`, `direction`, `confidence`, `setupType`, etc.).
- Cf. `CHECKLIST_MERGE.md` pour la checklist complète avant merge.

### R5. Paper trading et learning intouchables sans demande explicite

- `buildWorkerPlan`, `computeTradeSafetyScore`, `trainingCloseTrigger`, `tradeValidationEngine`, `loadLearningContextForScan` ne doivent pas être modifiés dans une PR de structure (vague A, B).
- Les vagues C et D peuvent y toucher mais avec demande utilisateur explicite et bug-hunter validé.

### R6. Synchrone côté `calcDetailScore`

- `calcDetailScore` est **synchrone**. Pas d'`await` dedans.
- Donc tout helper appelé par `calcDetailScore` doit être synchrone (`buildSnapshotId` via FNV-1a, pas `crypto.subtle.digest`).
- Les sources analytiques (régime, learning) doivent être pré-fetchées par l'appelant async avant l'appel à `calcDetailScore`.

---

## Règles d'or — frontend (PWA vanilla JS)

### R7. Pas de framework, pas de bundler

- Vanilla JS dans `assets/app.js` (IIFE unique), CSS dans `assets/styles.css`, HTML dans `index.html`.
- Service Worker `sw.js` avec `CACHE_VERSION` bumpé à chaque release UI.
- Pas de `npm install`, pas de transpilation.

### R8. Front lit le payload, ne le recalcule pas

- Le score, le plan, les badges, les decisions viennent du worker.
- Côté front : juste du mapping (`safetyScoreFrom`, `actionabilityScoreFrom`, etc.) + clamping + affichage.
- Aucun recalcul de score, aucune logique métier dans `app.js`.

### R9. Thèmes — scoping CSS strict

- Deux thèmes : dark (default) et light (`.app-shell.theme-light`).
- Toute règle CSS avec un `background` sombre doit être scopée sous `.app-shell:not(.theme-light)`.
- Pas de `!important` (cf. `.claude/agents/bug-hunter.md` classe #1).

---

## Règles d'or — process

### R10. Documentation à jour AVANT merge

- À chaque PR, parcourir `CHECKLIST_MERGE.md`.
- Mettre à jour les fichiers concernés AVANT le merge :
  - `BOT_OBJECTIVE.md` si la nature du produit change
  - `SESSION.md` à chaque session
  - `ARCHITECTURE.md`, `DATA_PIPELINE.md`, `TRADING_LOGIC.md`, `PROVIDERS_MATRIX.md`, `KNOWN_ISSUES.md`, `CHECKLIST_MERGE.md`, `PROJECT_RULES.md` selon l'impact

### R11. Pas de "ça devrait aller"

- Cf. `CLAUDE.md` : "Pas de rustine. Pas de régression frontend/Worker/Supabase."
- Si une chose ne peut pas être testée, le **dire explicitement** dans la PR.
- Si une vérification statique remplace une vérification runtime, le **dire explicitement**.

### R12. Pas de feature flag, pas de code de transition

- Cf. `CLAUDE.md` : on change, on teste, on pousse.
- Pas de variable `USE_NEW_ENGINE = true`. Pas de comparaison A/B intégrée au code.
- Si rollback nécessaire : `git revert`, pas un toggle runtime.

---

### Règle quant — validation setup

Un setup n'est considéré comme `VALIDATED` que si :
- il est testé sur plusieurs années,
- il passe un filtre de robustesse,
- son comportement par régime est connu,
- ses actifs compatibles sont identifiés,
- ses faiblesses sont documentées,
- il est documenté dans `SETUPS_REGISTRY.md`.

Un setup non documenté dans `SETUPS_REGISTRY.md` ne doit pas être traité comme une vérité moteur.

### Règle quant — classification actifs

Un actif n'est considéré comme `ELITE`, `CORE`, `TACTICAL` ou `BLACKLIST` que s'il est documenté dans `ASSET_REGISTRY.md`.

Tant que `asset-quality-engine-v1.mjs` n'existe pas, cette classification reste provisoire.

---

### Règle de gouvernance IA

Le projet utilise une gouvernance IA à double validation :

- Claude = implémentation technique.
- ChatGPT = validation stratégique et quant.

Aucun merge important ne doit être effectué sans :

```text
GO MERGE explicite de ChatGPT
```

Le but de cette gouvernance est :
- éviter les régressions silencieuses,
- éviter les incohérences quant,
- éviter les hacks fragiles,
- éviter l'overfit,
- protéger l'architecture long terme,
- protéger la robustesse du moteur.

Cf. `GPT_ROLE.md` pour le détail du workflow Claude ↔ ChatGPT et les règles anti-hallucination.

---

## Non encore fait

- Pas de CI automatisée sur les règles ci-dessus. Repose sur la vigilance manuelle + bug-hunter.
- Pas de linter custom qui interdirait `quote.change24hPct` dans `buildSnapshotId`. À mettre en place si une régression se produit.
- Pas de template de PR GitHub qui pré-remplit la checklist (`CHECKLIST_MERGE.md` mentionne déjà ce manque).

---

## Limites de fiabilité

- Ces règles sont volontairement strictes pour préserver la séparation analytique / live. Elles peuvent paraître excessives sur des PRs simples — c'est intentionnel : le coût d'un cas-à-part qui contamine le moteur est très supérieur au coût d'une règle un peu rigide.
- Les règles évoluent. Si une règle bloque un cas légitime, **discuter avec l'utilisateur** avant de la contourner. Ne jamais la contourner silencieusement.
