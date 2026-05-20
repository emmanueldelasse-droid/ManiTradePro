# SETUPS_REGISTRY — Registre officiel des setups quantitatifs

## Rôle du fichier

Ce fichier est la source officielle des setups validés, testés, abandonnés ou en recherche.

Il sert à :
- éviter de perdre les variantes robustes,
- éviter les régressions silencieuses,
- centraliser les métriques réelles,
- documenter les régimes compatibles,
- documenter les actifs compatibles,
- séparer la recherche quantitative de la mémoire session.

---

# ⚠ Post execution-bias audit status (2026-05-18, FAIT AUTORITÉ)

**Tous les statuts `VALIDATED` antérieurs sont annulés.** Deux audits offline successifs (PR #207 `pullback-lookahead-audit-v1` et PR #208 `setup-execution-bias-audit-v1`) ont montré que le code source des backtests souffrait de biais d'exécution masquant l'absence d'edge pour la majorité des setups.

Les fiches détaillées plus bas (Setup 1 à 4) **restent en archive** pour la traçabilité historique des actifs compatibles et des hypothèses initiales, mais leurs métriques (winrate, expectancy, profit factor) ne doivent plus être utilisées telles quelles. Les sections "Statut" ci-dessous remplacent les anciens "Statut VALIDATED / FAILED".

## Pourquoi les anciens scores ne doivent plus être utilisés

- Le PF Pullback affiché 1.72 tombe à 0.98 (modèle NEXT_OPEN) ou 0.73 (RETOUCH_EMA20). L'edge n'existe pas en exécution réaliste.
- Le PF Breakout agrégé est déjà 0.92 avant correction — le setup n'a pas d'edge agrégé même avec les biais.
- Le PF Mean Reversion tombe de 1.43 à 1.21 — edge marginal, à valider avec friction.
- RS Rotation : PF 1.58 résiste à exécution réaliste (CLEAN), mais 0 cellule ROBUST/STABLE en rolling walk-forward → fragilité temporelle indépendante.
- Volatility Compression : PF 0.78, déjà FAILED.

## Nouvelle classification officielle

| Statut | Signification |
|---|---|
| **VALIDATED_RESEARCH_CORE** | Setup robuste confirmé, edge réel après exécution réaliste, ROBUST/STABLE en rolling, friction OK, concentration sous seuil. _Aucun setup ne remplit ces conditions actuellement._ Synonyme historique : `VALIDATED` (terme déprécié dans ce registre — cf. table de mapping § ci-dessous). |
| **RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED** | Exécution propre, edge backtest, mais robustesse temporelle à confirmer. À tester sous friction + walk-forward conditionnel régime. |
| **CONDITIONAL_RESEARCH_CANDIDATE** | Edge isolé sur un actif unique. Petit n. À surveiller mais ne pas extrapoler à l'univers entier. |
| **EXPERIMENTAL_ONLY / FRICTION_REQUIRED** | Edge marginal sous exécution réaliste, friction obligatoire pour confirmer. Pas pour live. |
| **FRAGILE / CONCENTRATION_EXCESSIVE** | PF brut intéressant mais critère diversification du Freeze v1 (top 5 ticker share < 60 %) violé. Edge observé mais non diversifiable. Non tradable. Pas de promotion possible sans correction concentration + stress tests + audit anti-look-ahead spécifique. |
| **FRAGILE** | PF marginal, ou années positives < 4/5, ou stress test échoue. Pas tradable, peut être candidat à amélioration. |
| **DEAD_AGGREGATED** | Agrégat sans edge (PF < 1) ou edge totalement consommé par les biais. Une variante isolée peut survivre — voir CONDITIONAL_RESEARCH_CANDIDATE. |
| **DEAD** / **DO_NOT_TRADE** | Setup abandonné. Aucune utilisation, aucun trade réel, aucun candidat à l'allocation. |

## Mapping de vocabulaire (truth-sync 2026-05-19)

Le projet utilisait historiquement deux dialectes (`VALIDATED` côté registre, `VALIDATED_RESEARCH_CORE` côté `RESEARCH_FRAMEWORK_FREEZE_V1.md`). Pour éviter toute ambiguïté, ce registre adopte le vocabulaire du Freeze v1 comme source unique. Table de correspondance :

| Ancien vocabulaire (registre)            | Nouveau vocabulaire (Freeze v1, canonique)             | Signifie LIVE_READY ? |
|---|---|---|
| `VALIDATED`                              | `VALIDATED_RESEARCH_CORE`                              | **Non** |
| `RESEARCH_CANDIDATE`                     | `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED`             | Non |
| `CONDITIONAL_RESEARCH_CANDIDATE`         | `CONDITIONAL_RESEARCH_CANDIDATE`                       | Non |
| `EXPERIMENTAL_ONLY`                      | `EXPERIMENTAL_ONLY / FRICTION_REQUIRED`                | Non |
| `FAILED`                                 | `DEAD` ou `DEAD / ABANDONED`                           | Non |
| (nouveau)                                | `FRAGILE / CONCENTRATION_EXCESSIVE`                    | Non |
| (nouveau)                                | `FRAGILE`                                              | Non |
| (nouveau)                                | `INVALID_BACKTEST`                                     | Non |

**Important** : `VALIDATED_RESEARCH_CORE` **n'est pas** équivalent à `LIVE_READY`. Le statut maximal d'un setup côté recherche reste `VALIDATED_RESEARCH_CORE`. Le passage `LIVE_READY` est un statut supplémentaire qui nécessite shadow live, paper live prolongé, slippage réel mesuré, kill-switch, etc. (cf. `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 5). **Aucun setup n'a accès à `LIVE_READY` actuellement.**

## Statuts officiels post-audit

| Setup | Statut officiel | Raison |
|---|---|---|
| `PULLBACK_MOMENTUM` | **DEAD / DO_NOT_TRADE** | INVALID_BACKTEST (PR #207). Look-ahead structurel (entry=ema20 + fenêtres incluant bougie i). PF 1.73 → 0.98 en NEXT_OPEN. |
| `BREAKOUT_EXPANSION` | **DEAD_AGGREGATED / ONLY_GLD_RESEARCH_EXCEPTION** | INVALID_BACKTEST agrégé (PR #208). PF agrégé déjà 0.92 avant correction. Exception : GLD × breakout_h20_vol1.5_stop1_rr2 garde un edge réel (cf. ligne dédiée). |
| `MEAN_REVERSION` | **EXPERIMENTAL_ONLY / FRICTION_REQUIRED** | MEDIUM_RISK (PR #208). PF 1.43 → 1.21 en exécution réaliste. Edge marginal, à valider après friction. |
| `RELATIVE_STRENGTH_ROTATION` | **RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED** | CLEAN au sens exécution (PR #208, inflation ×1.01). MAIS 0 cellule ROBUST/STABLE en rolling walk-forward. Fragilité temporelle à corriger avant tout passage live. |
| `VOLATILITY_COMPRESSION` | **DEAD / ABANDONED** | FAILED (PF 0.78, 0 robust/stable, 0 ALLOW v2). Setup officiellement abandonné. |
| `GLD_BREAKOUT_ISOLATED` (exception) | **CONDITIONAL_RESEARCH_CANDIDATE** | Variante `GLD × breakout_h20_vol1.5_stop1_rr2` (cf. setup-variant-matrix tier STRONG). PF CURRENT 2.38 → NEXT_OPEN 1.80 sur 47 trades. Edge réel mais échantillon faible (n=47). À étudier comme cas isolé, ne PAS extrapoler à d'autres Breakout. |
| `SECTOR_RELATIVE_STRENGTH v1` | **FRAGILE / CONCENTRATION_EXCESSIVE** | PF brut 2.16 (PR #211), 5/5 années positives, MAIS top 5 tickers (APLD, APP, PLTR, NBIS, UPST) = **103 %** du PnL — sans eux, PF tombe à **0.94** (`RESEARCH_FRAMEWORK_FREEZE_V1.md` § 2). Critère Freeze § 4 "top 5 ticker share < 60 %" violé. Aucun audit anti-look-ahead spécifique sur l'agrégation `sectorMomentum`. Aucun walk-forward conditionnel régime. Edge observé mais non diversifiable. **Non tradable.** Détail technique : `docs/setups/SECTOR_RELATIVE_STRENGTH.md`. |
| `TREND_PULLBACK_DYNAMIC_SUPPORT v1` | **FRAGILE** | Améliore l'ancien Pullback (PF 1.045 vs 0.98 du PULLBACK_MOMENTUM) mais reste sous les critères minimum du Freeze § 4 (PF post-friction ≥ 1.3 non atteint). Concept Pullback marginal sous exécution réaliste (cf. `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 2). Pas tradable. |

## Pourquoi RS Rotation reste le seul candidat propre côté exécution

- L'audit PR #208 montre une inflation PF de ×1.01 entre le modèle CURRENT (entry=close[i], exit=close[i+20]) et NEXT_OPEN_BOTH (entry et exit à l'open suivant). C'est négligeable.
- Le ranking inter-symboles est causal (momentum sur lookback days), pas de fenêtres incluant la bougie signal, pas d'usage d'indicateur post-close comme prix d'entrée.
- Le seul biais résiduel est la convention `pnl = pnlPct / 5` (5 % = 1R) qui est une normalisation arbitraire, pas un look-ahead.

**Conclusion** : RS Rotation a un edge backtest qui survit l'exécution réaliste. Le problème restant est la robustesse temporelle (0 ROBUST/STABLE sur 3 splits rolling walk-forward), à traiter dans une PR séparée (walk-forward conditionnel au régime, ou filtre RANGE-only vu que c'est le régime gagnant historiquement).

## Pourquoi GLD breakout reste une exception isolée

- Sur les 10 variantes Breakout × 160 symboles, seule la cellule GLD × breakout_h20_vol1.5_stop1_rr2 atteint tier STRONG dans setup-variant-matrix (PF 2.53, winrate 53 %, 47 trades).
- Après exécution réaliste (NEXT_OPEN), le PF reste à 1.80 — substantiel.
- MAIS 47 trades sur 5 ans = ~9 trades/an. Statistiquement faible. À ne PAS généraliser à d'autres actifs (NVDA, SMCI, COIN ont aussi tier STRONG/OK mais sur 13-25 trades, encore plus fragile statistiquement).
- GLD est aussi un actif particulier (or, macro-defensive) : son comportement breakout est probablement décorrélé de la logique tech/growth des autres setups. C'est un cas d'étude, pas une stratégie à scaler.

## Pourquoi aucun setup ne doit être activé live actuellement

1. **Pullback / Breakout agrégé / Volatility Compression** : DEAD. Pas de débat.
2. **Mean Reversion** : edge marginal (PF 1.21). Aucune cellule ROBUST/STABLE en rolling. Friction non testée mais probablement fatale (PF 1.21 - frais ≈ break-even).
3. **RS Rotation** : edge propre mais fragile temporellement. Avant de trader live, il faut :
   - corriger la robustesse rolling walk-forward (passer de 0 à un nombre significatif de cellules ROBUST/STABLE) ;
   - tester avec `friction-model-v1` ;
   - calibrer la taille de position sur drawdown observé (212 R en RISK_ON sur l'historique) ;
   - définir une politique régime stricte (probablement RANGE-only ou NO_RISK_OFF).
4. **GLD breakout isolé** : potentiel cas d'étude, mais n=47. Pas un setup tradable à l'échelle d'un portefeuille.

**Recommandation** : pas de trades live tant qu'une PR distincte n'a pas (a) corrigé le code Pullback/Breakout pour mesurer l'edge réel post-correction, (b) durci la robustesse rolling pour RS Rotation, et (c) appliqué la friction sur les cellules survivantes. Tant que ces 3 étapes ne sont pas faites, ManiTradePro reste un environnement de recherche, pas un système de trading.

---

# Classification historique (ARCHIVÉE — voir section ci-dessus pour les statuts officiels)

| Statut | Signification |
|---|---|
| VALIDATED | Setup robuste confirmé sur plusieurs tests |
| TESTING | Setup en recherche |
| DEPRECATED | Ancien setup remplacé |
| FAILED | Setup abandonné |

---

# Setup 1 — Pullback Momentum

## Statut
**DEAD / DO_NOT_TRADE** (post-audit, cf. section "Post execution-bias audit status" en tête de fichier).
_Ancien statut : VALIDATED — annulé suite à PR #207 (INVALID_BACKTEST). Métriques historiques ci-dessous conservées pour traçabilité, NE PAS UTILISER pour décision de trading._

## Objectif
Acheter des replis propres dans des tendances fortes.

## ADN du setup
- continuation momentum,
- trend following,
- repli contrôlé,
- tendance propre.

## Variantes principales

### Variante principale

```text
pullback_rsi42_58_chg20_5_stop0.1
```

### Variante secondaire

```text
pullback_rsi42_58_chg20_3_stop0.1
```

## Actifs compatibles observés

### Très compatibles
- NVDA
- AVGO
- PLTR
- SMH
- SOXX
- XLK
- APP
- ASML
- KLAC

### Compatibilité moyenne / à surveiller
- TSLA
- AMD
- SOXL

## Régimes compatibles
- RANGE
- RISK_ON

## Régime à éviter
- RISK_OFF

## Forces
- setup relativement stable,
- bon pour leaders IA,
- bon pour ETF tech/semi,
- robuste sur marchés directionnels.

## Faiblesses
- entrées parfois tardives,
- souffre fortement en bear market,
- peut dégrader le portefeuille si utilisé en RISK_OFF.

---

# Setup 2 — Breakout Expansion

## Statut
**DEAD_AGGREGATED / ONLY_GLD_RESEARCH_EXCEPTION** (post-audit, cf. section "Post execution-bias audit status" en tête de fichier).
_Ancien statut : VALIDATED — annulé suite à PR #208 (INVALID_BACKTEST agrégé). Seule la variante `GLD × breakout_h20_vol1.5_stop1_rr2` est conservée comme CONDITIONAL_RESEARCH_CANDIDATE (n=47, échantillon faible). Métriques historiques conservées pour traçabilité, NE PAS UTILISER pour décision de trading sur l'agrégé._

## Objectif
Capturer les accélérations violentes après cassure.

## ADN du setup
- cassure,
- volume,
- expansion momentum,
- impulsion forte.

## Variantes principales

### Variante principale

```text
breakout_h20_vol13
```

### Variante secondaire

```text
breakout_h10_vol12
```

## Actifs compatibles observés

### Très compatibles
- NVDA
- AVGO
- SMH
- SOL
- BTC
- COIN
- MSTR
- ASML
- KLAC
- XLK

### Compatibilité moyenne / à surveiller
- TSLA
- AMD
- SOXL
- JPM

## Régimes compatibles
- RANGE
- RISK_ON

## Régime à éviter
- RISK_OFF

## Forces
- très rentable sur phases explosives,
- excellent sur IA + crypto momentum,
- bon pour actifs avec forte expansion.

## Faiblesses
- drawdowns élevés,
- mauvais sur cassures tardives,
- forte dépendance au timing,
- nécessite un filtre régime.

---

# Setup 3 — Relative Strength Rotation

## Statut
**RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED** (post-audit, cf. section "Post execution-bias audit status" en tête de fichier).
_Ancien statut : VALIDATED — rétrogradé. L'exécution est propre (audit PR #208 CLEAN, ×1.01 d'inflation), MAIS la robustesse temporelle est insuffisante (0 cellule ROBUST/STABLE en rolling walk-forward 3 splits). Les métriques détaillées ci-dessous restent valides comme référence historique mais ne garantissent pas la performance future tant que la robustesse n'est pas confirmée._

### Mise à jour 2026-05-19 — PR-R1 robustness improvement evidence (statut inchangé)

Le script `tools/backtests/rs-rotation-robustness-v1.mjs` (PR-R1) apporte une **évidence forte d'amélioration de robustesse** pour RS Rotation, sans promotion de statut. Walk-forward STRICT train/test 3 splits, friction systématique, analyse concentration top 5 explicite, drawdown deep-dive.

Résultats sur la baseline gelée `rs_90d_top10_hold20` :

- Baseline NO_RISK_OFF frictionné : **929 trades, PF 1.53, totalR 689.94 R, max DD 226.21 R, longest loss streak 19**.
- Walk-forward 3 splits stricts paramètres gelés : **3/3 splits PASS live (PF test ≥ 1.0)** et **3/3 splits PASS robust (PF test ≥ 1.3)** — S1 test PF 2.05, S2 test PF 1.69, S3 test PF 1.39.
- Concentration : top 5 = **48.66 %** du PnL positif (< 60 % seuil Freeze § 4 critère G). PF sans top 5 = **1.22** (> 1.05 minimum) — edge diversifiable, contraste fort avec SECTOR_RS v1 (103 %).
- Caveat structurel majeur : pire année = **2022 PF 0.14** (59 trades, totalR -92.97 R) — RS Rotation reste insuffisamment résilient en bear / transitions régime.

**Statut officiel inchangé : `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED`.**

Cette PR est présentée comme **strong robustness improvement evidence**, pas comme une proposition de promotion. Le verdict produit par le script est `KEEP_RESEARCH_CANDIDATE` (seuil interne durci : pire année < 0.9 bloque toute promotion `CONDITIONAL_EDGE`).

Promotion `CONDITIONAL_EDGE` subordonnée à l'exécution préalable, par PR séparées (`une PR = un objectif`), des items suivants — au minimum :

1. Stress friction ×2 (PF ≥ 1.1 critère Freeze § 4 I2).
2. Stress friction ×3 (PF ≥ 1.0 souhaité critère Freeze § 4 I3).
3. Analyse transitions régime (bascule RISK_ON → RISK_OFF en cours de hold).
4. Analyse clusters de pertes (les 19 perdantes consécutives sont-elles concentrées en 2022 ou réparties ?).
5. Rolling walk-forward glissant (train 24 mois → test 6 mois, pas de 3 mois).
6. Validation univers alternatif (ETF only, Big Tech only, univers historique reconstruit).
7. Audit survivorship plus propre (intégrer delistés / fusions / faillites si données disponibles).
8. Test réduction hold en bear.
9. Analyse protection crash (mécanisme de sortie dynamique).
10. Analyse volatility filter (VIX, breadth, ou proxy).

Promotion `VALIDATED_RESEARCH_CORE` reste subordonnée aux 10/10 critères Freeze § 4 + audit anti-look-ahead spécifique sur l'agrégation RS Rotation. Promotion `LIVE_READY` reste subordonnée à shadow live + paper live prolongé (Freeze § 5).

RS Rotation devient **le candidat de recherche le plus crédible du repo** à date — mais le statut effectif ne change pas tant que les caveats structurels ne sont pas résolus.

Rapport complet : `tools/backtests/output/rs-rotation-robustness-v1.md` (cf. § 9bis "Why this is NOT yet `CONDITIONAL_EDGE`").

## Objectif
Sélectionner les leaders structurels du marché.

## Description
Le moteur classe les actifs selon leur force relative et conserve les meilleurs leaders pendant une durée fixe.

C'est actuellement le setup le plus important et le plus proche d'un vrai moteur quant.

---

## Variante principale

```text
rs_90d_top10_hold20
```

## Variante secondaire

```text
rs_120d_top10_hold20
```

---

## Résultat principal validé

### NO_RISK_OFF + rs_90d_top10_hold20

| Métrique | Valeur |
|---|---:|
| Trades | 929 |
| Wins | 520 |
| Losses | 409 |
| Winrate | 55.97% |
| Expectancy | 0.89 |
| Profit Factor | 1.69 |
| TotalR | 831.02 |
| Max Drawdown | 212.54 |
| Longest Loss Streak | 19 |

---

## Comparaison importante

### ALL_REGIMES + rs_90d_top10_hold20

| Métrique | Valeur |
|---|---:|
| Trades | 1091 |
| Wins | 593 |
| Losses | 498 |
| Winrate | 54.35% |
| Expectancy | 0.75 |
| Profit Factor | 1.58 |
| TotalR | 822.64 |
| Max Drawdown | 300.62 |
| Longest Loss Streak | 19 |

Conclusion : `NO_RISK_OFF` améliore la qualité globale :
- moins de trades,
- meilleure expectancy,
- meilleur profit factor,
- drawdown fortement réduit,
- totalR quasiment conservé.

---

## Résultats par régime

### RISK_ON

| Métrique | Valeur |
|---|---:|
| Trades | 529 |
| Winrate | 49.91% |
| Expectancy | 0.66 |
| Profit Factor | 1.43 |
| TotalR | 348.40 |
| Max Drawdown | 205.48 |

### RANGE

| Métrique | Valeur |
|---|---:|
| Trades | 400 |
| Winrate | 64.00% |
| Expectancy | 1.21 |
| Profit Factor | 2.23 |
| TotalR | 482.62 |
| Max Drawdown | 65.42 |

### RISK_OFF

| Métrique | Valeur |
|---|---:|
| Trades | 162 |
| Winrate | 45.06% |
| Expectancy | -0.05 |
| Profit Factor | 0.96 |
| TotalR | -8.38 |
| Max Drawdown | 98.15 |

---

## Découverte majeure

L'hypothèse initiale était :

```text
RISK_ON = meilleur environnement
```

Les tests montrent plutôt :

```text
RANGE est souvent meilleur que RISK_ON pour la rotation momentum.
```

Interprétation :
- moins de chaos global,
- leadership plus lisible,
- leaders persistants,
- stock-picking plus efficace,
- moins de rotations violentes.

---

## Actifs les plus compatibles observés

### Elite
- PLTR
- APP
- AVAX
- SOL
- NVDA
- SMCI
- MSTR
- NBIS
- APLD
- AEHR

### ETF / actifs structurels intéressants
- SMH
- SOXX
- XLK
- QQQ
- AVGO
- TSM

## Régimes compatibles
- RANGE
- RISK_ON

## Régime à éviter
- RISK_OFF

## Forces
- setup le plus robuste actuellement,
- excellent pour détecter les leaders IA,
- excellent pour rotation sectorielle,
- compatible avec un univers large,
- adapté au style swing/multi-jours.

## Faiblesses
- dépendance forte au régime,
- souffre dans bear markets,
- nécessite une réduction forte en RISK_OFF.

---

# Setup 4 — Mean Reversion V1

## Statut
**EXPERIMENTAL_ONLY / FRICTION_REQUIRED** (post-audit, cf. section "Post execution-bias audit status" en tête de fichier).
_Ancien statut : FAILED — légèrement réactivé en EXPERIMENTAL_ONLY suite à l'audit PR #208. Le setup MEAN_REVERSION conserve un PF marginal après exécution réaliste (1.43 → 1.21, MEDIUM_RISK). À tester sous friction avant toute décision définitive. Ne pas réintégrer dans le pipeline d'allocation tant que friction non validée._

## Fichier de test

```text
tools/backtests/backtest-meanrev-v1.mjs
```

## Objectif initial
Tester un setup de retour à la moyenne pour compléter les setups momentum.

## Conclusion
Le setup n'est pas compatible avec l'ADN actuel du moteur (conclusion historique). PF marginal mesuré dans audit récent ne change pas cette conclusion globale.

## Problèmes observés
- trop peu de trades,
- expectancy faible,
- faible robustesse,
- mauvais comportement sur leaders momentum,
- pas assez complémentaire pour justifier l'intégration.

## Exception légère
- IWM montrait des signes positifs mais échantillon insuffisant.

## Décision
Ne pas intégrer pour l'instant.
Ne pas supprimer l'idée définitivement, mais ne pas prioriser.

---

# Setup 5 — Volatility Compression

## Statut
**DEAD / ABANDONED** (post-audit, cf. section "Post execution-bias audit status" en tête de fichier).

## Fichier de test
Implémenté dans `tools/backtests/backtest-multi-setup-grid.mjs` (3 variantes : `compression_20_ratio0.65_break20_stop1_rr2`, `compression_20_ratio0.75_break20_stop1_rr2`, `compression_40_ratio0.7_break30_stop1.5_rr2.5`).

## Verdict synthétique
- PF agrégé 0.78 (cf. setup-performance-summary-v1, grade FAILED 4/100).
- 0 cellule ROBUST/STABLE en rolling walk-forward.
- 0 ALLOW v2 dans tradable-universe-v2.
- 3 variantes sur 3 dans `setup-variant-matrix.variantsToAbandon` avec avoidRatio 88-100 %.

## Décision
Setup officiellement abandonné. Ne pas réutiliser, ne pas reproposer dans une PR future sans repenser la logique de base.

---

# Setup 6 — GLD Breakout Isolated (exception)

## Statut
**CONDITIONAL_RESEARCH_CANDIDATE** (post-audit PR #208).

## Description
Exception isolée à la mort agrégée de BREAKOUT_EXPANSION. La cellule unique `GLD × breakout_h20_vol1.5_stop1_rr2` (régime RISK_ON, période 2021-2025) atteint tier STRONG dans `setup-variant-matrix` et conserve un edge réel après exécution réaliste.

## Métriques (audit PR #208)

| Modèle d'exécution | Trades | Winrate | Expectancy (R) | Profit factor | Max DD (R) |
|---|---:|---:|---:|---:|---:|
| CURRENT (code source) | 47 | 53.19 % | 0.617 | 2.38 | 4.0 |
| SIGNAL_CLOSE (= CURRENT) | 47 | 53.19 % | 0.617 | 2.38 | 4.0 |
| NEXT_OPEN | 47 | 38.30 % | 0.340 | 1.80 | 5.0 |
| NO_SIGNAL_CANDLE_LOW_STOP | ~47 | ~53 % | ~0.6 | ~2.3 | ~4 |
| NEXT_OPEN_NO_SIGNAL_CANDLE_STOP | ~47 | ~38 % | ~0.34 | ~1.8 | ~5 |

→ Edge survit à exécution réaliste (PF 1.80 en NEXT_OPEN), reste substantiel.

## Forces
- GLD est un actif macro-defensive (or physique via ETF), comportement décorrélé du tech/growth.
- Setup breakout sur un actif à faible drift = peu de fausses cassures.
- Robust et stable en rolling walk-forward (ROBUST sur le runtime actuel, cf. tradable-universe-v2).

## Faiblesses critiques
- **Échantillon faible** : 47 trades sur 5 ans = ~9 trades/an. Statistiquement fragile.
- **Single-symbol edge** : ne PAS extrapoler à d'autres actifs (NVDA, SMCI, COIN ont tier STRONG/OK dans setup-variant-matrix mais sur 13-25 trades, encore plus fragile).
- **Pas représentatif** du setup Breakout agrégé qui est DEAD.

## Recommandations
- Conserver comme cas d'étude isolé.
- Si test live envisagé : taille de position minimale, monitoring serré, période d'observation d'un an minimum avant scale.
- Ne PAS justifier un setup Breakout générique à partir de cette seule cellule.
- Friction (`friction-model-v1`) à appliquer pour mesurer le PF post-coûts.

---

# Setup 7 — Sector Relative Strength v1

## Statut
**FRAGILE / CONCENTRATION_EXCESSIVE** (truth-sync 2026-05-19).
_Ancien statut historique proposé : `VALIDATED_RESEARCH_CORE` dans `docs/setups/SECTOR_RELATIVE_STRENGTH.md` § 10. Dégradé pour mise en cohérence avec `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 2 et § 4 (critère top 5 ticker share < 60 % violé)._

## Fichier source
- Fiche technique détaillée : `docs/setups/SECTOR_RELATIVE_STRENGTH.md`
- Script de découverte : `tools/backtests/new-setup-discovery-lab-v1.mjs` (PR #211)

## Description courte
Rotation à deux niveaux : (1) momentum agrégé des secteurs, (2) top assets dans le top secteur. Paramètres gelés v1 : `lookback=90, topSectors=1, topAssetsPerSector=5, horizon=60, rebalance=10, regime=NO_RISK_OFF, execution=NEXT_OPEN, exit=FIXED_HOLD`.

## Métriques brutes (référence PR #211)
- Trades sur 5 ans : 445
- Winrate : 54.61 %
- PF post-friction : 2.16
- Total R : 1 023.63 R
- Max DD : 192.98 R
- 5/5 années positives (PF 2022 = 1.08)

## Pourquoi le statut reste `FRAGILE / CONCENTRATION_EXCESSIVE`
- Top 5 tickers (APLD, APP, PLTR, NBIS, UPST) = **103 %** du PnL.
- Sans ces top 5, PF tombe à **0.94** → edge non diversifiable.
- Critère Freeze § 4 "top 5 ticker share < 60 %" violé.
- Aucun audit anti-look-ahead spécifique sur l'agrégation `sectorMomentum` (le mécanisme RS Rotation simple est CLEAN PR #208, mais l'agrégation sectorielle n'a pas été auditée formellement).
- Aucun walk-forward conditionnel par régime exécuté.
- Aucun stress test friction ×2 / ×3 exécuté.
- Pas de paper shadow, pas de sizing dynamique, pas de portfolio management multi-setup.

## Conditions pour réviser le statut
- Audit anti-look-ahead spécifique sur l'agrégation sectorielle (méthodologie PR #207 / PR #208).
- Walk-forward 3 splits stricts avec ≥ 2/3 PASS.
- Stress test "sans top 5" → PF ≥ 1.0.
- Stress test "sans secteur dominant" → PF ≥ 1.0.
- Stress test friction ×2 → PF ≥ 1.1.
- Décision politique sur la diversification (pondération secteurs ? topSectors ≥ 2 ? plafonnement single-ticker ?).

## Interdictions explicites
- Pas d'activation paper automatique.
- Pas d'activation live.
- Pas de promotion `VALIDATED_RESEARCH_CORE` tant que la concentration n'est pas corrigée.
- Pas d'extrapolation à d'autres univers (le résultat dépend de l'univers v2 actuel et de la période 2021-2025).

---

# Setup 8 — Trend Pullback Dynamic Support v1

## Statut
**FRAGILE** (truth-sync 2026-05-19).

## Description courte
Variante du Pullback Momentum tentant de corriger le look-ahead structurel via entry sur support dynamique. Cf. `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 2.

## Métriques (référence Freeze v1)
- PF 1.045 (vs 0.98 pour PULLBACK_MOMENTUM corrigé en NEXT_OPEN strict).
- Sous le seuil minimum Freeze § 4 (`PF post-friction ≥ 1.3`).

## Pourquoi le statut reste `FRAGILE`
- Concept Pullback marginal sous exécution réaliste.
- L'amélioration vs PULLBACK_MOMENTUM est marginale (+0.065 PF).
- Pas de walk-forward 3 splits exécuté.
- Pas de stress friction ×2 / ×3 exécuté.

## Conditions pour réviser le statut
- Hypothèse économique nouvelle documentée (cf. `SETUP_VALIDATION_CHECKLIST.md` section A).
- Walk-forward 3 splits ≥ 2/3 PASS.
- Friction ×2 PF ≥ 1.1.

## Interdictions explicites
- Pas d'activation paper automatique.
- Pas d'activation live.
- Pas d'extension du paramétrage sans hypothèse documentée (interdiction Freeze § 6.1 "1000 variantes sans hypothèse").

---

# Règle de validation future

Un setup ne peut être marqué `VALIDATED` que si **toutes** les conditions suivantes sont remplies :
- il a été testé sur plusieurs années,
- il a un nombre de trades suffisant (recommandation : ≥ 100 trades sur 5 ans, ≥ 50 par symbole pour qualifier "Très compatible"),
- son comportement par régime est connu,
- ses actifs compatibles sont identifiés,
- ses faiblesses sont documentées,
- il améliore le moteur global ou apporte une complémentarité claire,
- **(nouveau post-2026-05-18) l'edge survit à un audit anti-look-ahead avec inflation PF < ×1.05 vs un modèle d'exécution réaliste (NEXT_OPEN)**,
- **(nouveau) il a au moins un nombre significatif de cellules ROBUST/STABLE en rolling walk-forward 3 splits**,
- **(nouveau) son edge survit à l'application de `friction-model-v1`** (PF post-friction ≥ 1.2).

---

# Conclusion stratégique globale

ManiTradePro évolue vers :

```text
un moteur de sélection de leaders momentum structurels
avec allocation adaptative selon le régime marché.
```

**Mise à jour 2026-05-19** (truth-sync vocabulaire aligné sur `RESEARCH_FRAMEWORK_FREEZE_V1.md`) :

- **0 setup `VALIDATED_RESEARCH_CORE`**.
- **0 setup `LIVE_READY`**.
- 1 `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED` : RS Rotation simple — sous réserve de robustesse temporelle améliorée + friction validée.
- 1 `CONDITIONAL_RESEARCH_CANDIDATE` : GLD breakout isolé — single-symbol, n=47.
- 1 `EXPERIMENTAL_ONLY / FRICTION_REQUIRED` : Mean Reversion — friction à valider.
- 2 `FRAGILE` :
  - SECTOR_RELATIVE_STRENGTH v1 — `FRAGILE / CONCENTRATION_EXCESSIVE` (top 5 = 103 % du PnL).
  - TREND_PULLBACK_DYNAMIC_SUPPORT v1 — `FRAGILE` (PF 1.045 sous seuil minimum).
- 3 `DEAD` : Pullback Momentum (`DEAD / DO_NOT_TRADE`), Breakout agrégé (`DEAD_AGGREGATED`), Volatility Compression (`DEAD / ABANDONED`).

Conséquence : **aucun setup ne peut être activé live actuellement**. ManiTradePro reste un environnement de recherche jusqu'à ce que **(a)** au moins un setup atteigne `VALIDATED_RESEARCH_CORE` selon les 10 critères du Freeze v1 § 4, **(b)** puis franchisse le shadow live + paper live prolongé pour atteindre `LIVE_READY` (Freeze v1 § 5).
