# Setup Performance Summary v1 — ManiTradePro

> Généré le 2026-05-18T13:26:35.881Z par `tools/backtests/setup-performance-summary-v1.mjs`.

**⚠ Synthèse offline uniquement.** Aucun ordre, aucun broker, aucun endpoint live. À lire comme un instantané de recherche, pas une recommandation de trading.

## 1. Résumé global

- Setups comparés : 5
- Meilleur setup : **PULLBACK_MOMENTUM**
- Pire setup : **VOLATILITY_COMPRESSION**
- Plus robuste (rolling, robust+stable absolus) : **PULLBACK_MOMENTUM**
- Plus de cellules OVERFIT (en absolu) : **PULLBACK_MOMENTUM**
- Setup le plus overfit (en ratio, > 0) : **PULLBACK_MOMENTUM**

Sources utilisées :

- `tools/backtests/results-multi-setup-grid.json` (multiSetupGrid)
- `tools/backtests/results-relative-strength-rotation-regime-v1.json` (rsRotation)
- `tools/backtests/output/rolling-walkforward-validator.json` (rolling)
- `tools/backtests/output/tradable-universe.json` (tuV1)
- `tools/backtests/output/tradable-universe-v2.json` (tuV2)
- `tools/backtests/output/allocation-plan-v3.json` (allocV3)
- `tools/backtests/output/setup-variant-matrix.json` (setupVariantMatrix)
- `tools/backtests/output/variant-regime-matrix.json` (variantRegimeMatrix)

## 2. Classement des setups

| Rang | Setup | Grade | Score | Trades | Winrate | PF agrégé | Expectancy | Robust+Stable | ALLOW v2 | Survivants v3 |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | PULLBACK_MOMENTUM | **B** | 63/100 | 20 683 | 27.97 % | 1.72 | 0.42 | 31/6520 | 24 | 0 |
| 2 | RELATIVE_STRENGTH_ROTATION | **B** | 48/100 | 5 025 | 53.97 % | 1.54 | 0.73 | 0/420 | 0 | 0 |
| 3 | MEAN_REVERSION | **D** | 23/100 | 4 613 | 41.12 % | 1.41 | 0.15 | 0/988 | 0 | 0 |
| 4 | BREAKOUT_EXPANSION | **D** | 17/100 | 9 428 | 20.93 % | 0.91 | -0.04 | 3/1266 | 2 | 0 |
| 5 | VOLATILITY_COMPRESSION | **FAILED** | 4/100 | 1 265 | 20.87 % | 0.78 | -0.11 | 0/315 | 0 | 0 |

## 3. Détail setup par setup

### PULLBACK_MOMENTUM — grade **B** (63/100)

Statistiques de trading agrégées (toutes variantes confondues) :

| Métrique | Valeur |
|---|---:|
| Total trades | 20 683 |
| Wins | 5 785 |
| Losses | 11 840 |
| Timeouts (breakeven approx.) | 3 058 |
| Winrate | 27.97 % |
| Expectancy moyenne (pondérée trades) | 0.420 |
| Profit factor agrégé (pondéré trades) | 1.724 |
| Max drawdown observé (max sur variantes) | 93.31 |
| Plus longue série de pertes | 25 |

Rolling walk-forward (3 splits) :

| Verdict | Cellules |
|---|---:|
| ROBUST | 16 |
| STABLE | 15 |
| FRAGILE | 2313 |
| OVERFIT | 51 |
| INSUFFICIENT_DATA | 4125 |
| Total évalué | 6520 |

Tradable universe :

| Décision | v1 | v2 |
|---|---:|---:|
| ALLOW | 328 | 24 |
| REDUCE / WATCH | 9 | 287 |
| EXPERIMENTAL | 146 | 16 |
| BLOCK | 7091 | 7247 |

- Survivants dans le plan d'allocation v3 actuel : **0**

Top variantes (extrait de `setup-variant-matrix.topBySetup`) :

| Symbole | Variante | Tier | Score | PF | Winrate | Expectancy | Trades |
|---|---|---|---:|---:|---:|---:|---:|
| ACLS | `rsi42_58_chg20_0_stop0.5` | STRONG | 100 | 5.78 | 68.42 % | 1.20 | 57 |
| CRWD | `rsi42_58_chg20_5_stop0.5` | STRONG | 100 | 5.67 | 60.00 % | 1.28 | 60 |
| CRWD | `rsi42_58_chg20_3_stop0.5` | STRONG | 100 | 5.96 | 60.61 % | 1.32 | 66 |
| PANW | `rsi42_58_chg20_5_stop0.5` | STRONG | 100 | 3.60 | 60.00 % | 1.16 | 50 |
| PANW | `rsi42_58_chg20_3_stop0.5` | STRONG | 100 | 4.36 | 63.38 % | 1.20 | 71 |

Top régimes (où ce setup tient mieux en rolling) :

| Régime | Cellules | ROBUST | STABLE | FRAGILE | OVERFIT | Ratio bon |
|---|---:|---:|---:|---:|---:|---:|
| RISK_OFF | 1607 | 0 | 0 | 14 | 0 | 0.00 % |
| RANGE | 2397 | 0 | 0 | 778 | 5 | 0.00 % |
| RISK_ON | 2516 | 16 | 15 | 1521 | 46 | 1.23 % |

Régimes dangereux :

| Régime | Cellules | ROBUST | STABLE | FRAGILE | OVERFIT | Ratio bon |
|---|---:|---:|---:|---:|---:|---:|
| RISK_ON | 2516 | 16 | 15 | 1521 | 46 | 1.23 % |
| RANGE | 2397 | 0 | 0 | 778 | 5 | 0.00 % |
| RISK_OFF | 1607 | 0 | 0 | 14 | 0 | 0.00 % |

Décomposition du score :

| Composante | Détail | Points |
|---|---|---:|
| Profit factor agrégé | PF = 1.72 | 22/25 |
| Expectancy | E = 0.420 | 7/15 |
| Robustesse rolling | (31/6520 = 0.48 %) | 4/20 |
| Stabilité temporelle | fragilité = 98.68 % | 1/10 |
| Survie ALLOW v2 | 24 cellules | 15/15 |
| Force top variantes | 344 STRONG, 560 OK | 15/15 |
| Pénalité OVERFIT | 51/6520 = 0.78 % | -1/-10 |
| **Total** | | **63/100 → grade B** |

### RELATIVE_STRENGTH_ROTATION — grade **B** (48/100)

Statistiques de trading agrégées (toutes variantes confondues) :

| Métrique | Valeur |
|---|---:|
| Total trades | 5 025 |
| Wins | 2 712 |
| Losses | 2 312 |
| Timeouts (breakeven approx.) | 0 |
| Winrate | 53.97 % |
| Expectancy moyenne (pondérée trades) | 0.733 |
| Profit factor agrégé (pondéré trades) | 1.540 |
| Max drawdown observé (max sur variantes) | 300.62 |
| Plus longue série de pertes | 25 |

Rolling walk-forward (3 splits) :

| Verdict | Cellules |
|---|---:|
| ROBUST | 0 |
| STABLE | 0 |
| FRAGILE | 59 |
| OVERFIT | 1 |
| INSUFFICIENT_DATA | 360 |
| Total évalué | 420 |

Tradable universe :

| Décision | v1 | v2 |
|---|---:|---:|
| ALLOW | 7 | 0 |
| REDUCE / WATCH | 0 | 7 |
| EXPERIMENTAL | 29 | 0 |
| BLOCK | 384 | 413 |

- Survivants dans le plan d'allocation v3 actuel : **0**

Top variantes (extrait de `setup-variant-matrix.topBySetup`) :

| Symbole | Variante | Tier | Score | PF | Winrate | Expectancy | Trades |
|---|---|---|---:|---:|---:|---:|---:|
| APP | `rs_90d_top10_hold20` | STRONG | 100 | 5.81 | 62.65 % | 2.30 | 83 |
| APP | `rs_120d_top10_hold20` | STRONG | 100 | 7.60 | 67.82 % | 2.43 | 87 |
| PLTR | `rs_120d_top10_hold20` | STRONG | 100 | 7.80 | 78.57 % | 2.49 | 70 |
| PLTR | `rs_90d_top10_hold20` | STRONG | 100 | 7.53 | 76.92 % | 2.45 | 65 |
| SMCI | `rs_90d_top10_hold20` | STRONG | 100 | 2.33 | 60.66 % | 1.35 | 61 |

Top régimes (où ce setup tient mieux en rolling) :

| Régime | Cellules | ROBUST | STABLE | FRAGILE | OVERFIT | Ratio bon |
|---|---:|---:|---:|---:|---:|---:|
| RANGE | 162 | 0 | 0 | 18 | 0 | 0.00 % |
| RISK_OFF | 105 | 0 | 0 | 0 | 0 | 0.00 % |
| RISK_ON | 153 | 0 | 0 | 41 | 1 | 0.00 % |

Régimes dangereux :

| Régime | Cellules | ROBUST | STABLE | FRAGILE | OVERFIT | Ratio bon |
|---|---:|---:|---:|---:|---:|---:|
| RISK_ON | 153 | 0 | 0 | 41 | 1 | 0.00 % |
| RANGE | 162 | 0 | 0 | 18 | 0 | 0.00 % |
| RISK_OFF | 105 | 0 | 0 | 0 | 0 | 0.00 % |

Décomposition du score :

| Composante | Détail | Points |
|---|---|---:|
| Profit factor agrégé | PF = 1.54 | 22/25 |
| Expectancy | E = 0.733 | 11/15 |
| Robustesse rolling | (0/420 = 0.00 %) | 0/20 |
| Stabilité temporelle | fragilité = 100.00 % | 1/10 |
| Survie ALLOW v2 | 0 cellules | 0/15 |
| Force top variantes | 42 STRONG, 52 OK | 15/15 |
| Pénalité OVERFIT | 1/420 = 0.24 % | -1/-10 |
| **Total** | | **48/100 → grade B** |

Notes / limites :
- Trades agrégés sur tous les regimeModes (ALL_REGIMES, NO_RISK_OFF, RISK_ON_ONLY) — léger overcounting structurel.
- Bonne performance backtest, mais 0 cellule ROBUST/STABLE en rolling walk-forward — l'edge n'a pas tenu sur les splits temporels. Risque structurel de fragilité.

### MEAN_REVERSION — grade **D** (23/100)

Statistiques de trading agrégées (toutes variantes confondues) :

| Métrique | Valeur |
|---|---:|
| Total trades | 4 613 |
| Wins | 1 897 |
| Losses | 1 664 |
| Timeouts (breakeven approx.) | 1 052 |
| Winrate | 41.12 % |
| Expectancy moyenne (pondérée trades) | 0.148 |
| Profit factor agrégé (pondéré trades) | 1.410 |
| Max drawdown observé (max sur variantes) | 25.20 |
| Plus longue série de pertes | 14 |

Rolling walk-forward (3 splits) :

| Verdict | Cellules |
|---|---:|
| ROBUST | 0 |
| STABLE | 0 |
| FRAGILE | 126 |
| OVERFIT | 1 |
| INSUFFICIENT_DATA | 861 |
| Total évalué | 988 |

Tradable universe :

| Décision | v1 | v2 |
|---|---:|---:|
| ALLOW | 0 | 0 |
| REDUCE / WATCH | 0 | 0 |
| EXPERIMENTAL | 2 | 0 |
| BLOCK | 986 | 988 |

- Survivants dans le plan d'allocation v3 actuel : **0**

Top variantes (extrait de `setup-variant-matrix.topBySetup`) :

| Symbole | Variante | Tier | Score | PF | Winrate | Expectancy | Trades |
|---|---|---|---:|---:|---:|---:|---:|
| AKAM | `meanrev_rsi35_dist4_stop1_rr1.2` | STRONG | 80 | 2.09 | 60.00 % | 0.55 | 30 |
| ACLS | `meanrev_rsi35_dist4_stop1_rr1.2` | OK | 77 | 3.44 | 66.67 % | 0.56 | 21 |
| GTLB | `meanrev_rsi35_dist4_stop1_rr1.2` | OK | 77 | 5.02 | 66.67 % | 0.67 | 15 |
| TENB | `meanrev_rsi35_dist4_stop1_rr1.2` | OK | 77 | 2.88 | 73.33 % | 0.61 | 15 |
| JPM | `meanrev_rsi35_dist4_stop1_rr1.2` | OK | 73 | 2.40 | 80.00 % | 0.76 | 10 |

Variantes à éviter (extrait de `setup-variant-matrix.variantsToAbandon`) :

| Variante | Cellules | Avoid ratio | Trades |
|---|---:|---:|---:|
| `meanrev_rsi30_dist7_stop1.5_rr1.5` | 137 | 91.97 % | 888 |
| `meanrev_rsi30_dist5_stop1_rr1.2` | 141 | 89.36 % | 986 |

Top régimes (où ce setup tient mieux en rolling) :

| Régime | Cellules | ROBUST | STABLE | FRAGILE | OVERFIT | Ratio bon |
|---|---:|---:|---:|---:|---:|---:|
| RANGE | 291 | 0 | 0 | 55 | 0 | 0.00 % |
| RISK_OFF | 375 | 0 | 0 | 10 | 0 | 0.00 % |
| RISK_ON | 322 | 0 | 0 | 61 | 1 | 0.00 % |

Régimes dangereux :

| Régime | Cellules | ROBUST | STABLE | FRAGILE | OVERFIT | Ratio bon |
|---|---:|---:|---:|---:|---:|---:|
| RISK_ON | 322 | 0 | 0 | 61 | 1 | 0.00 % |
| RANGE | 291 | 0 | 0 | 55 | 0 | 0.00 % |
| RISK_OFF | 375 | 0 | 0 | 10 | 0 | 0.00 % |

Décomposition du score :

| Composante | Détail | Points |
|---|---|---:|
| Profit factor agrégé | PF = 1.41 | 14/25 |
| Expectancy | E = 0.148 | 3/15 |
| Robustesse rolling | (0/988 = 0.00 %) | 0/20 |
| Stabilité temporelle | fragilité = 100.00 % | 1/10 |
| Survie ALLOW v2 | 0 cellules | 0/15 |
| Force top variantes | 1 STRONG, 30 OK | 6/15 |
| Pénalité OVERFIT | 1/988 = 0.10 % | -1/-10 |
| **Total** | | **23/100 → grade D** |

Notes / limites :
- Grade agrégé D, MAIS 1 variante(s) individuelle(s) STRONG existent (top : AKAM (STRONG, PF 2.09); ACLS (OK, PF 3.44); GTLB (OK, PF 5.02)). L'agrégé est tiré vers le bas par le très grand nombre de variantes AVOID/WEAK sur d'autres actifs. Pour le tradable réel, regarder les variantes isolées plutôt que l'agrégé.

### BREAKOUT_EXPANSION — grade **D** (17/100)

Statistiques de trading agrégées (toutes variantes confondues) :

| Métrique | Valeur |
|---|---:|
| Total trades | 9 428 |
| Wins | 1 973 |
| Losses | 4 593 |
| Timeouts (breakeven approx.) | 2 862 |
| Winrate | 20.93 % |
| Expectancy moyenne (pondérée trades) | -0.038 |
| Profit factor agrégé (pondéré trades) | 0.909 |
| Max drawdown observé (max sur variantes) | 388.00 |
| Plus longue série de pertes | 14 |

Rolling walk-forward (3 splits) :

| Verdict | Cellules |
|---|---:|
| ROBUST | 1 |
| STABLE | 2 |
| FRAGILE | 379 |
| OVERFIT | 2 |
| INSUFFICIENT_DATA | 882 |
| Total évalué | 1266 |

Tradable universe :

| Décision | v1 | v2 |
|---|---:|---:|
| ALLOW | 11 | 2 |
| REDUCE / WATCH | 1 | 6 |
| EXPERIMENTAL | 3 | 4 |
| BLOCK | 1251 | 1254 |

- Survivants dans le plan d'allocation v3 actuel : **0**

Top variantes (extrait de `setup-variant-matrix.topBySetup`) :

| Symbole | Variante | Tier | Score | PF | Winrate | Expectancy | Trades |
|---|---|---|---:|---:|---:|---:|---:|
| GLD | `breakout_h20_vol1.5_stop1_rr2` | STRONG | 75 | 2.53 | 53.19 % | 0.62 | 47 |
| SMCI | `breakout_h20_vol1.5_stop1_rr2` | STRONG | 75 | 3.64 | 52.00 % | 0.68 | 25 |
| CLOU | `breakout_h20_vol1.2_stop1_rr2` | OK | 72 | 3.94 | 58.82 % | 0.82 | 17 |
| NVDA | `breakout_h20_vol1.5_stop1_rr2` | OK | 68 | 5.13 | 53.85 % | 0.62 | 13 |
| AMD | `breakout_h20_vol1.5_stop1_rr2` | OK | 67 | 4.10 | 47.37 % | 0.68 | 19 |

Variantes à éviter (extrait de `setup-variant-matrix.variantsToAbandon`) :

| Variante | Cellules | Avoid ratio | Trades |
|---|---:|---:|---:|
| `breakout_h50_vol1.5_stop1.5_rr2.5` | 155 | 88.39 % | 1571 |
| `breakout_h50_vol1.2_stop1.5_rr2.5` | 158 | 85.44 % | 2686 |

Top régimes (où ce setup tient mieux en rolling) :

| Régime | Cellules | ROBUST | STABLE | FRAGILE | OVERFIT | Ratio bon |
|---|---:|---:|---:|---:|---:|---:|
| RISK_ON | 624 | 1 | 2 | 331 | 2 | 0.48 % |
| RANGE | 524 | 0 | 0 | 44 | 0 | 0.00 % |
| RISK_OFF | 118 | 0 | 0 | 4 | 0 | 0.00 % |

Régimes dangereux :

| Régime | Cellules | ROBUST | STABLE | FRAGILE | OVERFIT | Ratio bon |
|---|---:|---:|---:|---:|---:|---:|
| RANGE | 524 | 0 | 0 | 44 | 0 | 0.00 % |
| RISK_OFF | 118 | 0 | 0 | 4 | 0 | 0.00 % |
| RISK_ON | 624 | 1 | 2 | 331 | 2 | 0.48 % |

Décomposition du score :

| Composante | Détail | Points |
|---|---|---:|
| Profit factor agrégé | PF = 0.91 | 2/25 |
| Expectancy | E = -0.038 | 0/15 |
| Robustesse rolling | (3/1266 = 0.24 %) | 4/20 |
| Stabilité temporelle | fragilité = 99.21 % | 1/10 |
| Survie ALLOW v2 | 2 cellules | 5/15 |
| Force top variantes | 2 STRONG, 29 OK | 6/15 |
| Pénalité OVERFIT | 2/1266 = 0.16 % | -1/-10 |
| **Total** | | **17/100 → grade D** |

Notes / limites :
- Grade agrégé D, MAIS 2 variante(s) individuelle(s) STRONG existent (top : GLD (STRONG, PF 2.53); SMCI (STRONG, PF 3.64); CLOU (OK, PF 3.94)). L'agrégé est tiré vers le bas par le très grand nombre de variantes AVOID/WEAK sur d'autres actifs. Pour le tradable réel, regarder les variantes isolées plutôt que l'agrégé.

### VOLATILITY_COMPRESSION — grade **FAILED** (4/100)

Statistiques de trading agrégées (toutes variantes confondues) :

| Métrique | Valeur |
|---|---:|
| Total trades | 1 265 |
| Wins | 264 |
| Losses | 679 |
| Timeouts (breakeven approx.) | 322 |
| Winrate | 20.87 % |
| Expectancy moyenne (pondérée trades) | -0.108 |
| Profit factor agrégé (pondéré trades) | 0.781 |
| Max drawdown observé (max sur variantes) | 119.50 |
| Plus longue série de pertes | 14 |

Rolling walk-forward (3 splits) :

| Verdict | Cellules |
|---|---:|
| ROBUST | 0 |
| STABLE | 0 |
| FRAGILE | 9 |
| OVERFIT | 0 |
| INSUFFICIENT_DATA | 306 |
| Total évalué | 315 |

Tradable universe :

| Décision | v1 | v2 |
|---|---:|---:|
| ALLOW | 0 | 0 |
| REDUCE / WATCH | 0 | 0 |
| EXPERIMENTAL | 2 | 0 |
| BLOCK | 313 | 315 |

- Survivants dans le plan d'allocation v3 actuel : **0**

Top variantes (extrait de `setup-variant-matrix.topBySetup`) :

| Symbole | Variante | Tier | Score | PF | Winrate | Expectancy | Trades |
|---|---|---|---:|---:|---:|---:|---:|
| JPM | `compression_20_ratio0.75_break20_stop1_rr2` | OK | 82 | 2.00 | 66.67 % | 1.05 | 18 |
| ORCL | `compression_20_ratio0.75_break20_stop1_rr2` | OK | 78 | 6.82 | 78.57 % | 1.36 | 14 |
| BNB | `compression_20_ratio0.75_break20_stop1_rr2` | OK | 75 | 4.40 | 62.50 % | 0.94 | 16 |
| MSFT | `compression_20_ratio0.75_break20_stop1_rr2` | OK | 66 | 3.91 | 54.55 % | 0.73 | 11 |
| TSM | `compression_20_ratio0.75_break20_stop1_rr2` | OK | 66 | 2.25 | 50.00 % | 0.50 | 10 |

Variantes à éviter (extrait de `setup-variant-matrix.variantsToAbandon`) :

| Variante | Cellules | Avoid ratio | Trades |
|---|---:|---:|---:|
| `compression_40_ratio0.7_break30_stop1.5_rr2.5` | 69 | 100.00 % | 306 |
| `compression_20_ratio0.65_break20_stop1_rr2` | 71 | 87.32 % | 269 |
| `compression_20_ratio0.75_break20_stop1_rr2` | 117 | 85.47 % | 690 |

Top régimes (où ce setup tient mieux en rolling) :

| Régime | Cellules | ROBUST | STABLE | FRAGILE | OVERFIT | Ratio bon |
|---|---:|---:|---:|---:|---:|---:|
| RISK_ON | 238 | 0 | 0 | 8 | 0 | 0.00 % |
| RANGE | 67 | 0 | 0 | 1 | 0 | 0.00 % |
| RISK_OFF | 10 | 0 | 0 | 0 | 0 | 0.00 % |

Régimes dangereux :

| Régime | Cellules | ROBUST | STABLE | FRAGILE | OVERFIT | Ratio bon |
|---|---:|---:|---:|---:|---:|---:|
| RISK_ON | 238 | 0 | 0 | 8 | 0 | 0.00 % |
| RANGE | 67 | 0 | 0 | 1 | 0 | 0.00 % |
| RISK_OFF | 10 | 0 | 0 | 0 | 0 | 0.00 % |

Décomposition du score :

| Composante | Détail | Points |
|---|---|---:|
| Profit factor agrégé | PF = 0.78 | 0/25 |
| Expectancy | E = -0.108 | 0/15 |
| Robustesse rolling | (0/315 = 0.00 %) | 0/20 |
| Stabilité temporelle | fragilité = 100.00 % | 1/10 |
| Survie ALLOW v2 | 0 cellules | 0/15 |
| Force top variantes | 0 STRONG, 5 OK | 3/15 |
| Pénalité OVERFIT | 0/315 = 0.00 % | 0/-10 |
| **Total** | | **4/100 → grade FAILED** |

## 4. Pourquoi certains setups survivent mieux

Les setups les mieux notés combinent **plusieurs caractéristiques** :
- Profit factor agrégé ≥ 1.5 (les gains compensent largement les pertes).
- Présence de cellules ROBUST ou STABLE dans le rolling walk-forward (le setup tient à travers plusieurs périodes).
- Survie significative dans `tradable-universe-v2` (le filtre rolling ne les a pas tous éliminés).
- Variantes top concentrées sur des actifs réels et identifiables (cf. setup-variant-matrix.topBySetup).

## 5. Pourquoi certains setups sont fragiles

Les setups mal notés présentent au moins un de ces signaux :
- Profit factor agrégé < 1.2 → l'edge est marginal, dévoré par les frais en réel.
- Aucune cellule ROBUST ou STABLE → le setup ne tient pas dans le temps.
- Forte concentration en INSUFFICIENT_DATA → on n'a pas assez de trades pour conclure.
- Variantes massivement classées AVOID dans setup-variant-matrix.

## 6. Comparaison v1 vs v2 (tradable universe)

Le passage v1 → v2 (durci par rolling walk-forward) érode brutalement les ALLOW sauf pour les setups les plus robustes :

| Setup | ALLOW v1 | ALLOW v2 | Perte |
|---|---:|---:|---:|
| PULLBACK_MOMENTUM | 328 | 24 | −304 |
| RELATIVE_STRENGTH_ROTATION | 7 | 0 | −7 |
| MEAN_REVERSION | 0 | 0 | +0 |
| BREAKOUT_EXPANSION | 11 | 2 | −9 |
| VOLATILITY_COMPRESSION | 0 | 0 | +0 |

## 7. Impact du rolling walk-forward

Le rolling walk-forward (3 splits) classe les cellules par leur capacité à tenir sur plusieurs périodes 2021-2025. Voir distribution par setup :

| Setup | Évaluées | ROBUST | STABLE | FRAGILE | OVERFIT | INSUFFICIENT |
|---|---:|---:|---:|---:|---:|---:|
| PULLBACK_MOMENTUM | 6520 | 16 | 15 | 2313 | 51 | 4125 |
| RELATIVE_STRENGTH_ROTATION | 420 | 0 | 0 | 59 | 1 | 360 |
| MEAN_REVERSION | 988 | 0 | 0 | 126 | 1 | 861 |
| BREAKOUT_EXPANSION | 1266 | 1 | 2 | 379 | 2 | 882 |
| VOLATILITY_COMPRESSION | 315 | 0 | 0 | 9 | 0 | 306 |

## 8. Setups à éviter

- **MEAN_REVERSION** (grade D, score 23/100) — aucune cellule ROBUST/STABLE, aucun ALLOW v2 survivant
- **BREAKOUT_EXPANSION** (grade D, score 17/100) — PF 0.91
- **VOLATILITY_COMPRESSION** (grade FAILED, score 4/100) — PF 0.78, aucune cellule ROBUST/STABLE, aucun ALLOW v2 survivant

## 9. Setups prometteurs

- **PULLBACK_MOMENTUM** (grade B, score 63/100) — winrate 27.97 %, PF 1.72, 31 cellules ROBUST/STABLE.
- **RELATIVE_STRENGTH_ROTATION** (grade B, score 48/100) — winrate 53.97 %, PF 1.54, 0 cellules ROBUST/STABLE.

## 10. Ce qu'on apprend réellement

- **Le winrate seul ne suffit pas** : RS Rotation a ~55 % de winrate mais 0 cellule ROBUST/STABLE → fragile dans le temps.
- **Pullback Momentum domine en volume** : énorme nombre de trades, mais hétérogène (winrate ~28 % moyen, sauvé par quelques variantes à PF > 5).
- **Breakout Expansion est éparpillé** : 1 seule cellule ROBUST (GLD), beaucoup de variantes AVOID.
- **Mean Reversion et Volatility Compression** sont les vraies cibles à abandonner : PF marginal, aucune ROBUST, expectancy basse.
- **Le filtre rolling élimine 92 %+ des ALLOW v1** sur la plupart des setups, ce qui confirme que la sélection v1 était optimiste.

## 11. Limites

- **PF et expectancy agrégés sont pondérés par trades** : c'est une approximation, pas une moyenne arithmétique. Plus la variante a de trades, plus elle pèse. C'est un compromis pour avoir UN chiffre par setup.
- **Pas de calcul de PF "vrai"** au sens des gains/pertes individuels, car les fichiers résultats n'exportent que les agrégats par variante.
- **Max drawdown** est le max observé sur les variantes (le pire), pas un DD agrégé.
- **RS Rotation** est consolidé en sommant tous les regimeModes — il y a donc une légère surcounting des trades RISK_ON inclus dans NO_RISK_OFF et ALL_REGIMES.
- **Pas de friction (frais/slippage)** dans cette synthèse. Voir `friction-adjusted-report.json` pour la couche friction.
- **Le grade A/B/C/D/FAILED est une heuristique simple** : 6 composantes pondérées, pas d'optimisation. Documenté composante par composante dans chaque détail setup.
- **Pas d'audit anti-look-ahead** réalisé dans cette synthèse — un setup peut avoir un beau PF si l'indicateur utilise des données futures. À traiter dans une PR séparée.

## 12. Prochaine étape recommandée

- **Abandonner officiellement** les setups grade FAILED (cf. SETUPS_REGISTRY.md à mettre à jour si politique).
- **Restreindre tradable-universe-v3** aux setups grade A/B en première intention.
- **Audit anti-look-ahead** des indicateurs pour les setups grade A/B (priorité : Pullback Momentum vu le volume).
- **Calibration empirique** de la friction sur les top variantes, pour mesurer l'edge survivant après coûts.
- **Walk-forward conditionnel au régime** : si un setup tient en RISK_ON mais explose en RISK_OFF, son grade global cache le risque régime.
