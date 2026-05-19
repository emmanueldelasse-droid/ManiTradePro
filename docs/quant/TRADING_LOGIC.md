# TRADING_LOGIC — Logique quant / scoring / setups / régimes

> **Source canonique** pour la **logique quantitative** du moteur de décision : scores, setups, régimes, modulateurs, apprentissage adaptatif.
>
> Contenu issu de l'ancien `TRADING_LOGIC.md` racine (split documentaire — PR `claude/split-trading-logic`). Aucun changement de fond métier.
>
> La logique moteur / exécution / paper trading / safety gate / sizing / ouverture / fermeture / garde-fou devise vit dans `docs/project/TRADING_ENGINE.md`.

Voir aussi :
- `docs/quant/SETUPS_REGISTRY.md` — registre officiel des setups validés / testés / abandonnés.
- `docs/quant/ASSET_REGISTRY.md` — classification provisoire des actifs compatibles avec les setups.
- `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md` — gel méthodologique recherche quant.
- `docs/research/SETUP_VALIDATION_CHECKLIST.md` — checklist obligatoire avant tout nouveau setup.
- `docs/research/ANTI_LOOKAHEAD_RULES.md` — règles anti-lookahead.
- `docs/research/DATASET_GOVERNANCE.md` — gouvernance des datasets offline.
- `docs/project/TRADING_ENGINE.md` — logique moteur / exécution / safety / sizing.

## Explication simple

Ce fichier explique **comment le bot évalue un setup et calcule ses scores** : quel signal est tradable, comment les bougies daily, la structure technique, le régime macro et l'apprentissage passé sont combinés en une décision quantitative.

---

## Vue d'ensemble (couches quantitatives)

Le moteur de décision combine quatre couches. Les deux premières sont **quant** (couvertes dans ce fichier), les deux dernières sont **engine** (couvertes dans `docs/project/TRADING_ENGINE.md`) :

1. **Analyse technique** sur bougies daily → score 0–100 *(quant — ici)*
2. **Modulateurs contextuels** : régime macro, news, IA, apprentissage *(quant — ici)*
3. **Décision** : Trade proposé / À surveiller / Pas de trade *(orchestration — cf. `TRADING_ENGINE.md`)*
4. **Exécution paper** : sizing, stop, take profit, suivi intra-trade *(engine — cf. `TRADING_ENGINE.md`)*

---

## Scores

### `safetyScore` (0–100)

Score principal de **sûreté du setup**. Le plus visible côté UX (ring, badges).

Calculé par `computeTradeSafetyScore` dans `cloudflare-worker/worker.js`. Composition (à recroiser dans le code si modifié) :

```
safety = 0.34 × decisionScore
       + 0.24 × exploitabilityScore
       + 0.14 × entryQualityScore
       + 0.14 × riskQualityScore
       + 0.08 × contextQualityScore
       + 0.06 × dataQualityScore
       + bonus setup détecté
       + bonus hardFilters passés
```

**Rôle** : choisir QUOI trader. Plus c'est haut, plus l'engine considère que le setup est propre.

**Affichage** :
- Ring opportunités (carte)
- "Score de sûreté X/100" sur la fiche détail
- Tri du panel opp

**Volatilité** : moyenne. Stable sur les composantes bougies daily, mais inclut `dataQualityScore` qui dépend de `quote.freshness`. Bouge peu entre deux refresh sauf si le provider change ou le régime bascule.

### `decisionScore` (0–100)

Score directionnel : combine structure trend + momentum + timing.

Calcul base (dans `calcDetailScore`) :

```
base = 0.24 × structure
     + 0.20 × momentum  ← inclut quote.change24hPct (LIVE)
     + 0.20 × timing
     + 0.18 × risk      ← inclut quote.change24hPct (LIVE)
     + 0.10 × context
     + 0.08 × dataQuality
```

Puis appliqué : `- regimeMalus + regimeBonus + newsBonus - learningMalus`.

**Rôle** : valider le sens (long/short) du trade.

**Volatilité** : haute. Le `momentum` et le `risk` intègrent `quote.change24hPct` → bouge avec le prix live. **Pour la version stable, lire `strategicAnalysis.score`** (cf. ci-dessous).

### `strategicAnalysis.score` (0–100, **stable**)

Vague A.1 (mai 2026) — exposé par `calcDetailScore` à côté du `score` legacy.

Recalculé en retirant **toutes** les contributions live :
- `momentum` strategic = momentum composite − contribution `change24hPct`
- `risk` strategic = risk composite + contribution `change24hPct` − contribution `volume24h`
- `context` strategic = context composite − contribution `volume24h`
- `participation` strategic = participation composite − contribution `change24hPct` − bascule baseline `volume24h`
- `dataQuality` strategic = constante 80 (les bougies clôturées sont reliables par définition)
- **PAS** de `regimeBonus` (F&G/VIX recalculés en live toutes les 5 min)
- **PAS** de `newsBonus` (cache 3-6 h mais la news en elle-même est volatile)
- **OUI** `regimeMalus` (validité config ↔ régime, stable par batch)
- **OUI** `learningMalus` (bucket histoire, stable)

**Rôle** : score conçu pour rester stable entre deux clôtures de bougies sur les entrées live directes (prix, volume, freshness). Utilisé pour l'analyse stratégique, le diagnostic de régression, et l'affichage front "score stable" (à venir). Ne pilote PAS encore le paper trading (le `plan.safetyScore` continue d'utiliser le score composite).

**Limites de stabilité** (pas une garantie absolue) :
- `regimeMalus` peut changer si le régime macro est rafraîchi (cache KV 1 h)
- `learningMalus` peut changer si un nouveau trade clos publie ses stats dans le bucket
- `detectConfiguration` reçoit `quote` mais ne lit aucun champ live (paramètre dead, vérifié) — donc stable
- La dernière bougie daily peut être encore ouverte selon le provider et le fuseau
- `snapshotId` n'est pas encore propagé (vague B.4) → deux requêtes successives peuvent voir des candles différentes

Cf. `docs/project/DATA_PIPELINE.md` pour la structure du payload et `docs/project/TRADING_ENGINE.md` pour `snapshotId` / `liveContext` / `quoteQuality`.

### `exploitabilityScore` (0–100)

Score d'**actionnabilité** : valide que le setup est tradable maintenant (RR, distance entrée, horaires).

Composantes :
- Ratio risque/récompense (entry → TP vs entry → stop)
- Heures de marché ouvertes
- Slippage estimé acceptable
- Structure technique cohérente (RSI pas trop extrême, ADX assez fort)

**Rôle** : si haut, le trade est `Trade propose`. Si bas, `À surveiller` ou `Pas de trade`.

**Volatilité** : faible. Basé sur structure bougies, peu impacté par le prix live.

### `dossierScore` / `finalScore` (0–100)

Score composite final affiché parfois sur la fiche.

- `finalScore = clamp(safetyScore + aiModifier.delta, 0, 100)` si `aiContextReview` actif
- Sinon `dossierScore ≈ safetyScore`

### `officialScore` (legacy)

Champ legacy qui valait `safetyScore + regimeBonus + newsBonus` (composite). Depuis la PR #153, le front lit **`safetyScore` brut** en priorité, pour éviter la divergence carte / fiche.

`officialScore` reste écrit côté worker pour compatibilité, mais ne pilote plus aucun affichage critique.

---

## Setups détectés

Détection dans `detectConfiguration` (côté worker), à partir des bougies daily.

| Setup | Direction | Description | Conditions principales |
|---|---|---|---|
| `pullback` | long | Tendance haussière, repli sain vers EMA20/50, RSI sort d'une zone basse | EMA50 > EMA100, prix ≤ EMA20 + ATR, RSI 35–50 remontant |
| `pullback_short` | short | Symétrique en baissier | EMA50 < EMA100, prix ≥ EMA20 - ATR, RSI 50–65 descendant |
| `breakout` | long | Cassure de résistance majeure (Donchian high) | Close > Donchian55_high, volume > moyenne, ATR pas en compression |
| `breakdown` | short | Cassure de support | Close < Donchian55_low, volume > moyenne |
| `continuation` | long | Suivi de tendance forte | ADX > 25, prix > EMA20 et EMA50, momentum positif |
| `continuation_short` | short | Idem en baissier | |
| `mean_reversion` | long ou short | Excès statistique (RSI < 25 ou > 75 sur range) | Optionnel, désactivable via `mean_reversion_enabled` |
| `aucun` | — | Aucun setup clair détecté | Score peut être affiché mais `tradeNow = false` |

Le bot applique `require_structural_setup` : si `true` (par défaut), aucune position n'est ouverte sans setup explicite — filtre les trades "score-only" qui historiquement perdaient.

---

## Recherche quantitative externe

Les setups officiellement validés sont désormais centralisés dans :

```text
docs/quant/SETUPS_REGISTRY.md
```

Ce fichier est la source officielle des variantes validées, des métriques de robustesse et des compatibilités régime/actifs.

La classification provisoire des actifs est centralisée dans :

```text
docs/quant/ASSET_REGISTRY.md
```

Important :
- `docs/quant/TRADING_LOGIC.md` explique la logique quant du moteur.
- `docs/project/TRADING_ENGINE.md` explique la logique moteur / exécution / safety / sizing.
- `docs/quant/SETUPS_REGISTRY.md` conserve la mémoire quantitative des setups.
- `docs/quant/ASSET_REGISTRY.md` conserve la mémoire des actifs compatibles.

---

## Modulateurs contextuels (scoring)

### Régime macro (`regimeBonus`)

- Calculé via SPY/QQQ/TLT bougies daily
- Valeurs : `RISK_ON | RISK_OFF | RANGE`
- Bonus ±5 pts selon alignement avec direction du trade

### News bonus (`newsBonus`)

- ±10 pts max
- Niveau 2 : sentiment des sources (CryptoPanic / Alpha Vantage)
- Niveau 3 : signal Claude `direction + confidence`, pondéré par `claudeKillSwitchWeight`

### AI modifier (`aiModifier`)

- ±5 pts max
- Activé conditionnellement (cf. `docs/project/DATA_PIPELINE.md`)
- Peut imposer un veto si Claude détecte forte contradiction

> Cooldown post-stop : règle d'exécution / risk plutôt que de scoring. Documentée dans `docs/project/TRADING_ENGINE.md` § *Risk limits*.

---

## Apprentissage adaptatif

### Buckets

Groupement par `${setup}|${direction}|${regime}|${asset_class}` (ex. `pullback|long|RISK_ON|stock`).

Stats agrégées : `win_rate, avg_pnl_pct, expectancy, sample_size`.

### Filtre qualité

**Toutes les lectures analytiques** filtrent maintenant `or=(quality.eq.ok,quality.is.null)` :

- `computeLearningStats` (alimentation buckets)
- `aggregateFeedbackBuckets` (règles correctives 1-6)
- `observeShadowAdjustments` (shadow rules)
- `getClaudeNewsKillSwitchWeight`
- `computeMarketRegimeStats`

Trades `suspect` / `invalid` sont **exclus**. Trades historiques `quality = NULL` (avant migration 016) sont **inclus** comme `ok` par défaut.

### Malus appliqué

`applyLearningMalus` retire jusqu'à 8 pts au score si :
- Bucket mature : `sample_size >= 20`
- Expectancy négative : `expectancy < 0`
- Malus = `clamp(2, 8, round(|expectancy| × 4))`

### Règles correctives 1-6 (`aggregateFeedbackBuckets`)

| Règle | Déclencheur | Action |
|---|---|---|
| 1 | bucket WR < 30 % sur 20+ trades | `raise_min_score` (+5 pts seuil) |
| 2 | bucket WR < 20 % sur 30+ trades | `disable_bucket` (refus total) |
| 3 | bucket MAE moyen > 1.5× stop dist | shadow only |
| 4 | bucket MFE moyen > 1.5× tp dist | shadow only (extend_tp) |
| 5 | 3 pertes consécutives globales | `reduce_size` (-50 %) |
| 6 | 3 gains consécutifs après rule 5 | rollback rule 5 |
| 7 | (réservée, non implémentée) | `retrain_weights` |

---

## Non encore fait (quant)

- **`strategicScore` stable** (séparé du `liveContext`) : livré en vague A.1, mais ne pilote pas encore le paper trading (cf. `docs/project/TRADING_ENGINE.md` pour le branchement futur).
- **Walk-forward conditionnel régime** sur les setups non encore `LIVE_READY` (cf. `docs/quant/SETUPS_REGISTRY.md`).
- **Décision politique sourcing PEAD** (dataset earnings).

Les items « non encore fait » côté exécution / safety / broker réel sont documentés dans `docs/project/TRADING_ENGINE.md`.

---

## Limites de fiabilité (quant)

- Les pondérations exactes (0.34, 0.24, etc.) sont prises du code au moment de la documentation. À recroiser avec `computeTradeSafetyScore` et `calcDetailScore` si ces nombres changent.
- Les seuils des règles 1-6 (WR < 30 %, sample_size >= 20) sont prises de `aggregateFeedbackBuckets`. À revérifier si ajustement.

Les limites côté exécution (règle prudente "stop d'abord en cas d'ambiguïté intra", etc.) sont documentées dans `docs/project/TRADING_ENGINE.md`.
