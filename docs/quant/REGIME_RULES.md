# REGIME_RULES.md — Market Regimes V1 officiels ManiTradePro

> **Statut** : OFFICIAL — figé par PR CLEAN-2 `docs(regime): canonise market regimes V1 + factor into shared lib` (2026-05-19). Source canonique unique des régimes marché projet.
>
> **Subordination** :
> - `BOT_OBJECTIVE.md` — constitution produit (autorité dure).
> - `docs/project/TRADING_PHILOSOPHY.md` § 2 — architecture cible 5 couches (le Context Engine consomme ces régimes en couche 2.1).
> - `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md` § 3.5 — walk-forward sur 3 splits régimes.
>
> **Implémentation technique canonique** : `tools/quant/lib/regime-rules-v1.mjs`. Source unique consommée par les scripts de backtest projet actifs. Aucune duplication inline tolérée dans les **futurs** scripts (cf. § 9 *Règle d'évolution*).

---

## 1. Philosophie officielle

> **Le régime marché n'est PAS une prédiction. Le régime marché est une description structurelle de l'environnement actuel.**

Cette distinction est centrale :

- **Une prédiction** dit où le marché va aller. ManiTradePro ne fait **pas** de prédiction.
- **Une description structurelle** dit dans quel état est le marché **maintenant**, sur la base d'observations causales (close > EMA200, volatilité réalisée, etc.).

**Objectif du régime** : autoriser ou interdire certains comportements setups. Pas plus.

**Conséquence** :
- Un setup peut être autorisé en RISK_ON et interdit en RISK_OFF.
- Un setup peut être conditionné à RANGE (cas mean reversion).
- HIGH_VOL peut désactiver tous les setups directionnels.

Le **Context Engine** (couche 2.1 architecture cible TRADING_PHILOSOPHY § 2, à venir en PR-CTX-2) consommera ces régimes pour décider quels setups ont le droit d'être actifs.

---

## 2. Limitations volontaires

Brief créateur 2026-05-19 § *RÉGIMES OFFICIELS V1* — **interdictions structurelles** :

- ❌ **Pas de 15 sous-régimes** opaques (RISK_ON_BULL_BREAKOUT, RISK_OFF_PANIC, etc.). 4 états suffisent.
- ❌ **Pas d'IA / machine learning** pour la classification. Logique déterministe seulement.
- ❌ **Pas de score opaque** ("confidence 73 %"). Bool simples sur des indicateurs causaux.
- ❌ **Pas de probabilité pseudo-scientifique**.
- ❌ **Pas d'heuristiques incompréhensibles**. Tout doit être lisible et explicable humainement.
- ❌ **Pas d'auto-learning** ou de calibration dynamique post-déploiement.

**Justification** :
- Un système de régime opaque devient impossible à débugger.
- Un système de régime adaptatif crée du data leakage silencieux.
- 15 sous-régimes diluent le sample statistique de chaque régime au point de rendre les conclusions non significatives.

---

## 3. Les 4 régimes officiels V1

### 3.1 Vue d'ensemble

| Régime | Définition courte | Status |
|---|---|---|
| `RISK_ON` | SPY ET QQQ ET SMH > leur EMA200 | base state |
| `RANGE` | au moins un indice ne respecte ni RISK_ON ni RISK_OFF (cas mixte) | base state |
| `RISK_OFF` | SPY ET QQQ ET SMH < leur EMA200 | base state |
| `HIGH_VOL` | realized vol SPY 20j > 25 % annualisée | **priority override** |

### 3.2 RISK_ON

**Définition** : `close(SPY) > EMA200(SPY)` ET `close(QQQ) > EMA200(QQQ)` ET `close(SMH) > EMA200(SMH)`.

**Logique économique** : les 3 indices structurels US (S&P 500 large, Nasdaq tech, semi-conducteurs leader) sont au-dessus de leur EMA200. Le marché est dans une tendance haussière confirmée à moyen terme.

**Comportement marché attendu** :
- Drift positif sur les leaders momentum.
- Rotation sectorielle active.
- Reprise rapide des replis (les pullbacks ne durent pas).
- Volatilité globalement contenue (sauf événements externes).

**Structure typique** : higher highs, higher lows sur les 3 indices. Breadth supérieure à 50 %.

**Volatilité typique** : 12-18 % annualisée sur SPY (rvol 20j). Si > 25 %, HIGH_VOL override.

**Breadth / momentum attendu** : > 50 % des constituants des indices > EMA50. Momentum 90j positif sur les leaders sectoriels (semi, tech, AI, software).

**Comportement setups attendu** :
- Setups momentum / trend (RS Rotation, Pullback) **favorables**.
- Setups contrarian (Mean Reversion strict) **défavorables**.
- Setups breakout après compression **modérément favorables**.

**Risques** :
- Late-cycle euphorie (concentration top 5 type SECTOR_RS v1).
- Pullbacks profonds qui transitionnent en RISK_OFF mid-hold.

**Faux positifs possibles** :
- Bull trap proche du sommet (les 3 indices passent > EMA200 brièvement avant retournement).

**Limitations** :
- N'inclut pas la qualité de la tendance (slope EMA200).
- N'inclut pas la breadth.

### 3.3 RANGE

**Définition** : ni RISK_ON ni RISK_OFF. Au moins un indice est de l'autre côté de son EMA200 par rapport aux autres.

**Logique économique** : marché mixte / sans consensus. Au moins un secteur structurel diverge des autres. Souvent une zone de transition.

**Comportement marché attendu** :
- Pas de tendance directionnelle claire au niveau indices.
- Rotation sectorielle possible mais désordonnée.
- Sweeps haut-bas-haut sans suivi.
- Réactions outsized aux news.

**Structure typique** : oscillation entre support et résistance moyen-terme. Indices proches de leur EMA200 (souvent < 5 % d'écart).

**Volatilité typique** : 15-25 % annualisée sur SPY. Si > 25 %, HIGH_VOL override.

**Breadth / momentum attendu** : autour de 50 % des constituants > EMA50. Momentum 90j mitigé selon secteurs.

**Comportement setups attendu** :
- Setups mean reversion sur ETF larges **potentiellement favorables** (cf. R3A diagnostic).
- Setups momentum / trend **moins favorables** (faux signaux fréquents).
- RS Rotation **performe historiquement bien** en RANGE (PF 2.04 en Phase 1 hardening — finding confirmé).

**Risques** :
- Faux signaux directionnels.
- Stops déclenchés sur le bruit.
- Concentration accidentelle sur les rares actifs en tendance dans un marché plat.

**Faux positifs possibles** :
- Régime mal classifié si un seul des 3 indices est juste au-dessus ou en dessous de son EMA200 (effet de seuil binaire).

**Limitations** :
- Aucune mesure de la "force" du RANGE (un RANGE étroit n'est pas un RANGE large).
- Pas de sous-classification volontaire (anti-sous-régime opaque).

### 3.4 RISK_OFF

**Définition** : `close(SPY) < EMA200(SPY)` ET `close(QQQ) < EMA200(QQQ)` ET `close(SMH) < EMA200(SMH)`.

**Logique économique** : les 3 indices structurels sont sous leur EMA200. Bear market structurel à moyen terme.

**Comportement marché attendu** :
- Drift négatif sur la majorité des constituants.
- Rotation défensive (utilities, staples, gold, bonds).
- Rebonds violents mais limités (bear market rallies).
- Volatilité élevée (souvent > 25 %, donc HIGH_VOL override fréquent).

**Structure typique** : lower lows, lower highs sur les 3 indices. Breadth < 30 %.

**Volatilité typique** : 22-40 % annualisée sur SPY. Souvent HIGH_VOL override.

**Breadth / momentum attendu** : < 30 % des constituants > EMA50. Momentum 90j négatif quasi-universel.

**Comportement setups attendu** :
- **Aucun setup long ne devrait être autorisé par défaut**.
- Setups defensive rotation **plausibles** (or, bonds, utilities) — pas implémentés actuellement.
- Setups short side **plausibles** — pas implémentés (projet long-only).
- RS Rotation : **désactivation explicite** (PF 2022 catastrophe = 0.146 confirmé en Phase 1 hardening).

**Risques** :
- Catch-falling-knife (acheter trop tôt un fond).
- Faux rebonds bear market.

**Faux positifs possibles** :
- Sortie temporaire d'un RISK_OFF si l'un des 3 indices remonte brièvement > EMA200.

**Limitations** :
- N'inclut pas la profondeur du drawdown.
- Pas de distinction "correctif" (-10 à -20 %) vs "crash" (-30 % et plus).

### 3.5 HIGH_VOL — priority override

**Définition** : volatilité réalisée annualisée SPY 20j > **25 %**.

```
rvol_20d_annualised = stddev(log_returns_20d_SPY) × √252
HIGH_VOL = rvol_20d_annualised > 0.25
```

**Important — priority override** : si HIGH_VOL est actif, **il domine** les 3 régimes de base. Un jour peut être structurellement RISK_ON par les indices mais classé HIGH_VOL à cause d'une volatilité élevée — dans ce cas, le régime opérationnel **est HIGH_VOL**.

Cette règle est :
- **simple** (un seul seuil, une seule métrique) ;
- **explicite** (override déclaré dans `tools/quant/lib/regime-rules-v1.mjs` § `classifyFourStateRegimeV1`) ;
- **non ambiguë** (logique booléenne stricte, pas de pondération).

**Logique économique** : volatilité réalisée > 25 % annualisée signale un marché stressé. Comportements normaux inversés :
- Corrélations augmentent (tout bouge ensemble).
- Setups discriminants perdent leur edge.
- Gaps overnight explosent (friction réelle devient > modèle V1).

**Comportement marché attendu** :
- Sweeps violents et corrélés.
- Disparition temporaire du leadership sectoriel.
- Réactions de panique ou d'euphorie sur news.

**Volatilité typique** : > 25 % annualisée par définition. Peut atteindre 40-60 % en crash type COVID 2020 / février 2018 / octobre 2022.

**Comportement setups attendu** :
- **Tous les setups directionnels** devraient être désactivés ou drastiquement réduits.
- Hardening Phase 1 RS Rotation : 10 trades en HIGH_VOL avec PF 5.64 — sample faible mais PF élevé. Interprétation prudente : laissez le Context Engine décider, ne pas extrapoler n=10.

**Risques** :
- Modèle friction V1 sous-estimé (gaps, spreads explosent).
- Stops déclenchés très loin de l'attendu.
- Faux signaux multipliés ×3-5.

**Faux positifs possibles** :
- Un seul jour de volatilité extrême peut basculer 20j de classification (moyenne glissante inclut ce pic pendant 20 jours).

**Limitations** :
- Seuil 25 % calibré sur l'histoire 2021-2025. Évolution structurelle = PR documentaire dédiée § 9.
- N'inclut pas la **direction** du choc (sell-off vs short squeeze tous deux HIGH_VOL).
- Pas de modulation par classe d'actif.

### 3.6 Distribution observée 2021-2025

D'après `tools/backtests/output/rs-rotation-hardening-v1.json` (PR-RS-HARDENING Phase 1) :

| Régime | Jours | % du total |
|---|---:|---:|
| RISK_ON | 566 | 53.6 % |
| RANGE | 243 | 23.0 % |
| RISK_OFF | 111 | 10.5 % |
| HIGH_VOL | 135 | 12.8 % |
| **Total couverts** | **1055** | 100 % |

Sur 1255 jours bourse 2021-01-04 → 2025-12-31, 1055 sont classifiés (200 jours initiaux exclus pour EMA200 warmup).

---

## 4. Implémentation technique

### 4.1 Module canonique

**Source unique** : `tools/quant/lib/regime-rules-v1.mjs`.

API exportée :

```javascript
// Constantes (modification = PR documentaire dédiée).
export const REGIME_V1_EMA_PERIOD = 200;
export const REGIME_V1_HIGH_VOL_RVOL_THRESHOLD = 0.25;
export const REGIME_V1_HIGH_VOL_RVOL_WINDOW_DAYS = 20;

// Métadonnées pour reporting.
export const REGIME_V1_METADATA = Object.freeze({ ... });

// Classification 3-état.
export function classifyMarketRegimeV1({ spyAboveEma200, qqqAboveEma200, smhAboveEma200 });

// HIGH_VOL override.
export function isHighVolOverride({ realizedVolAnnualised, threshold });

// Classification 4-état (HIGH_VOL prioritaire).
export function classifyFourStateRegimeV1({ ... });

// Validation / normalisation.
export function normalizeRegimeState(regime);
```

### 4.2 Contrat d'API

- **Déterministe** : mêmes entrées → mêmes sorties. Aucun random. Aucun état. Aucun effet de bord.
- **Pure functions** : pas de mutation, pas de paramètres implicites.
- **Validation d'entrée** : booléens stricts, `rvol ≥ 0` et fini. Sinon `return null`.

### 4.3 Scripts consommateurs canoniques (au 2026-05-19)

- `tools/backtests/rs-rotation-robustness-v1.mjs` ✓ migré CLEAN-2.
- `tools/backtests/rs-rotation-robustness-lab-v1.mjs` ✓ migré CLEAN-2.
- `tools/backtests/rs-rotation-hardening-v1.mjs` ✓ migré CLEAN-2 (seul script utilisant HIGH_VOL).

Validation byte-à-byte : 3/3 outputs identiques avant/après migration sur dataset constant (cf. § 8).

---

## 5. Dette technique CLEAN-2b — scripts historiques non migrés

8 scripts utilisent une définition inline **identique** à la canonique mais ne sont **pas migrés** dans CLEAN-2. Raison : ils ancrent des résultats historiques (PR #207, #208, #210, #211). Migration nécessiterait validation byte-à-byte sur dataset historique reproductible, hors scope CLEAN-2.

| Script | PR ancre | Statut |
|---|---|---|
| `tools/backtests/market-regime-v1.mjs` | n/a (prototype) | Migration possible CLEAN-2b |
| `tools/backtests/backtest-pullback-yearly-walkforward.mjs` | PR #207 | Migration risquée — ancrage historique |
| `tools/backtests/backtest-multi-setup-grid.mjs` | PR #208 | Migration risquée — ancrage historique |
| `tools/backtests/backtest-relative-strength-rotation-regime-v1.mjs` | PR #208/#210 | Migration possible CLEAN-2b |
| `tools/backtests/new-setup-discovery-lab-v1.mjs` | PR #211 | Migration possible CLEAN-2b |
| `tools/backtests/sector-rs-destruction-tests-v1.mjs` | n/a | Migration possible CLEAN-2b |
| `tools/backtests/sector-rs-concentration-control-v1.mjs` | n/a | Migration possible CLEAN-2b |
| `tools/backtests/trend-pullback-dynamic-support-v1.mjs` | n/a | Migration possible CLEAN-2b |

**Décision** : conservent leur définition inline jusqu'à PR CLEAN-2b dédiée avec validation byte-à-byte stricte. Risque de drift nul tant que la formule inline reste identique à la canonique — vérifié à date.

**Note méthodologique** : la définition de RANGE strict de `meanrev-etf-range-v1.mjs` (SPY ±5 % EMA200 + pente < 0.5 %/20j + NOT RISK_OFF) **n'est pas** la classification standard 3-état. C'est une **sous-classification** dédiée à V1 Mean Reversion. Reste inline dans le script Mean Reversion. Pas intégrée à `regime-rules-v1.mjs` pour préserver la simplicité de l'API canonique.

---

## 6. Interdictions

### 6.1 Sur la définition

- ❌ Ajouter un 5e régime sans PR documentaire + validation ChatGPT + audit régression.
- ❌ Modifier les seuils (`EMA200`, `25 %`, `20j`) pour faire passer un setup. Anti-overfit `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 6.2.
- ❌ Ajouter une logique floue (probabilité, score, IA) à la classification.
- ❌ Faire dépendre la classification du temps (régime dépendant de l'année, du mois). Pas de data leakage temporel.
- ❌ Modifier le caractère "priority override" de HIGH_VOL.

### 6.2 Sur l'usage

- ❌ Re-implémenter la classification inline dans un nouveau script. Import obligatoire depuis `regime-rules-v1.mjs`.
- ❌ Bypass la lib pour "aller plus vite". Régression à corriger.
- ❌ Modifier les constantes locales au lieu de modifier le module canonique.

---

## 7. Articulation avec autres documents

```
BOT_OBJECTIVE.md (constitution produit)
   ↓
TRADING_PHILOSOPHY.md § 2 (architecture cible 5 couches)
   ↓
REGIME_RULES.md (CE FICHIER — source canonique régimes)
   ↓
tools/quant/lib/regime-rules-v1.mjs (source technique)
   ↓
Consommateurs : scripts backtests (3 migrés, 8 dette CLEAN-2b)
   ↓
PR-CTX-2 Context Engine V1 (futur) — consomme régimes pour décider quels setups sont autorisés
```

**Cohérence avec UNIVERSE_CORE_V1** : l'univers définit **qui est éligible**. Le régime définit **quand** ces actifs sont autorisés à recevoir un signal setup. Les deux se composent dans le Context Engine futur.

**Cohérence avec FRICTION_MODEL** : friction V1 est constante par régime. Évolution V2 pourrait ajouter dépendance régime (×1.5 en HIGH_VOL) — à codifier dans `FRICTION_MODEL.md` § 7.3 prévu.

**Cohérence avec SETUPS_REGISTRY** : chaque setup référencera ses régimes compatibles (`allowedRegimes`, `blockedRegimes`) — formalisation en PR-CTX-3 (Setup authorization matrix, futur).

---

## 8. Vérification anti-régression (preuve de canonisation)

Validation effectuée lors de PR CLEAN-2 :

**Procédure** :
1. Sauvegarder outputs après migration sur dataset actuel.
2. `git checkout HEAD -- 3 scripts` (revert temporaire).
3. Re-runner pre-migration sur même dataset.
4. Sauvegarder outputs pre-migration.
5. Restorer scripts migrés + re-runner.
6. Comparer WITH vs WITHOUT byte-à-byte (hors `generatedAt`).

**Résultats** :
- ✓ `rs-rotation-robustness-lab-v1.json` : IDENTIQUE byte-à-byte.
- ✓ `rs-rotation-robustness-v1.json` : IDENTIQUE byte-à-byte.
- ✓ `rs-rotation-hardening-v1.json` : IDENTIQUE byte-à-byte.

**Conclusion** : migration **purement structurelle**. Aucun drift quantitatif. Aucun PF modifié. Aucun verdict changé.

---

## 9. Règle d'évolution

### 9.1 Modification d'un seuil ou régime

Modification des constantes `REGIME_V1_EMA_PERIOD`, `REGIME_V1_HIGH_VOL_RVOL_THRESHOLD`, `REGIME_V1_HIGH_VOL_RVOL_WINDOW_DAYS` **doit** :

1. PR documentaire dédiée + justification économique.
2. Audit régression : re-run tous consommateurs (canoniques + dette CLEAN-2b si migrés).
3. Documentation impact sur verdicts setups existants.
4. Validation ChatGPT explicite + créateur.
5. Créer `regime-rules-v2.mjs` plutôt que modifier V1 (reproductibilité historique).

### 9.2 Ajout d'un régime

Idem § 9.1 + :
6. Justification que les 4 états actuels sont insuffisants.
7. Démonstration que le nouveau régime n'est pas un sous-cas opaque.
8. Sample > 30 jours/an minimum.

### 9.3 Ajout d'un consommateur

Tout nouveau script qui calcule un régime **doit** :
1. Importer depuis `tools/quant/lib/regime-rules-v1.mjs`.
2. Ne pas re-implémenter inline.
3. Ajouter son nom à § 4.3 (PR documentaire courte).

### 9.4 Migration d'un script historique (CLEAN-2b)

Tout script de § 5 migrable avec :
1. Validation byte-à-byte sur dataset historique correspondant.
2. Mention explicite "strictement structurelle" dans commit.
3. Mise à jour § 4.3 (déplacement de § 5 vers § 4.3).

---

## 10. Sources

- `BOT_OBJECTIVE.md` — constitution produit.
- `docs/project/TRADING_PHILOSOPHY.md` § 2 — architecture cible.
- `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md` § 3.5.
- `docs/quant/FRICTION_MODEL.md` — cohérence cross-canonisation.
- `tools/quant/lib/regime-rules-v1.mjs` — implémentation technique canonique.
- `tools/backtests/output/rs-rotation-hardening-v1.json` — distribution régime observée 2021-2025 (§ 3.6).
- Brief créateur 2026-05-19 « MISSION — CLEAN-2 — CANONISATION OFFICIELLE DES MARKET REGIMES V1 ».

---

> **Conclusion-mémo** : 4 régimes officiels v1 (RISK_ON, RANGE, RISK_OFF, HIGH_VOL avec priority override). Source documentaire unique = ce fichier. Source technique unique = `tools/quant/lib/regime-rules-v1.mjs`. 3 scripts migrés en pure factorisation, outputs identiques byte-à-byte. 8 scripts historiques en dette technique CLEAN-2b. Le régime est une description structurelle, pas une prédiction. Logique déterministe, lisible, explicable. Pas d'IA. Pas de 15 sous-régimes.
