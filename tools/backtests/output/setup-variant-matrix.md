# Setup × Variant Matrix — ManiTradePro

> Généré le 2026-05-18T10:09:46.705Z par `tools/backtests/setup-variant-matrix-v1.mjs`.

## 1. Synthèse globale

- Actifs analysés : **181**
- Variantes distinctes (setup × variant) : **30**
- Cellules (actif × setup × variant) : **4301**
- Setups couverts : BREAKOUT_EXPANSION, MEAN_REVERSION, PULLBACK_MOMENTUM, RELATIVE_STRENGTH_ROTATION, VOLATILITY_COMPRESSION

Répartition globale des cellules :

| Tier | Nombre |
|---|---:|
| STRONG | 389 |
| OK | 676 |
| WEAK | 667 |
| AVOID | 2569 |

Par setup :

| Setup | STRONG | OK | WEAK | AVOID |
|---|---:|---:|---:|---:|
| BREAKOUT_EXPANSION | 2 | 29 | 96 | 501 |
| MEAN_REVERSION | 1 | 30 | 54 | 350 |
| PULLBACK_MOMENTUM | 344 | 560 | 454 | 1208 |
| RELATIVE_STRENGTH_ROTATION | 42 | 52 | 42 | 279 |
| VOLATILITY_COMPRESSION | 0 | 5 | 21 | 231 |

Par variante (toutes setups confondus) :

| Variante | STRONG | OK | WEAK | AVOID | Total |
|---|---:|---:|---:|---:|---:|
| PULLBACK_MOMENTUM / rsi42_58_chg20_3_stop0.1 | 66 | 28 | 22 | 62 | 178 |
| PULLBACK_MOMENTUM / rsi42_58_chg20_5_stop0.1 | 45 | 42 | 22 | 66 | 175 |
| PULLBACK_MOMENTUM / base_rsi42_58_chg20_0_stop0.1 | 49 | 37 | 32 | 61 | 179 |
| PULLBACK_MOMENTUM / rsi42_58_chg20_3_stop0.5 | 35 | 44 | 27 | 71 | 177 |
| PULLBACK_MOMENTUM / rsi42_58_chg20_0_stop0.5 | 38 | 36 | 32 | 73 | 179 |
| PULLBACK_MOMENTUM / rsi42_58_chg20_5_stop0.5 | 27 | 40 | 25 | 83 | 175 |
| PULLBACK_MOMENTUM / pullback_rsi42_58_chg20_3_stop0.1 | 7 | 51 | 35 | 65 | 158 |
| PULLBACK_MOMENTUM / pullback_base_rsi42_58_chg20_0_stop0.1 | 10 | 44 | 40 | 64 | 158 |
| PULLBACK_MOMENTUM / pullback_rsi42_58_chg20_5_stop0.1 | 5 | 47 | 31 | 75 | 158 |
| PULLBACK_MOMENTUM / rsi45_55_chg20_0_stop0.1 | 26 | 26 | 29 | 98 | 179 |
| PULLBACK_MOMENTUM / rsi42_58_chg20_0_stop1.0 | 13 | 38 | 31 | 96 | 178 |
| PULLBACK_MOMENTUM / rsi42_58_chg20_3_stop1.0 | 9 | 38 | 33 | 95 | 175 |
| PULLBACK_MOMENTUM / rsi42_58_chg20_5_stop1.0 | 6 | 32 | 32 | 103 | 173 |
| PULLBACK_MOMENTUM / pullback_rsi42_58_chg20_3_stop0.5 | 6 | 29 | 37 | 86 | 158 |
| RELATIVE_STRENGTH_ROTATION / rs_120d_top10_hold20 | 17 | 16 | 9 | 56 | 98 |
| PULLBACK_MOMENTUM / pullback_rsi42_58_chg20_5_stop0.5 | 2 | 28 | 26 | 102 | 158 |
| RELATIVE_STRENGTH_ROTATION / rs_90d_top10_hold20 | 11 | 19 | 11 | 62 | 103 |
| MEAN_REVERSION / meanrev_rsi35_dist4_stop1_rr1.2 | 1 | 27 | 31 | 98 | 157 |
| RELATIVE_STRENGTH_ROTATION / rs_20d_top5_hold5 | 8 | 9 | 13 | 89 | 119 |
| RELATIVE_STRENGTH_ROTATION / rs_60d_top5_hold10 | 6 | 8 | 9 | 72 | 95 |
| BREAKOUT_EXPANSION / breakout_h20_vol1.2_stop1_rr2 | 0 | 11 | 37 | 110 | 158 |
| BREAKOUT_EXPANSION / breakout_h20_vol1.5_stop1_rr2 | 2 | 7 | 29 | 119 | 157 |
| BREAKOUT_EXPANSION / breakout_h50_vol1.2_stop1.5_rr2.5 | 0 | 7 | 16 | 135 | 158 |
| VOLATILITY_COMPRESSION / compression_20_ratio0.75_break20_stop1_rr2 | 0 | 5 | 12 | 100 | 117 |
| BREAKOUT_EXPANSION / breakout_h50_vol1.5_stop1.5_rr2.5 | 0 | 4 | 14 | 137 | 155 |
| MEAN_REVERSION / meanrev_rsi30_dist5_stop1_rr1.2 | 0 | 3 | 12 | 126 | 141 |
| MEAN_REVERSION / meanrev_rsi30_dist7_stop1.5_rr1.5 | 0 | 0 | 11 | 126 | 137 |
| PULLBACK_MOMENTUM / UNKNOWN_VARIANT | 0 | 0 | 0 | 8 | 8 |
| VOLATILITY_COMPRESSION / compression_20_ratio0.65_break20_stop1_rr2 | 0 | 0 | 9 | 62 | 71 |
| VOLATILITY_COMPRESSION / compression_40_ratio0.7_break30_stop1.5_rr2.5 | 0 | 0 | 0 | 69 | 69 |

## 2. Meilleures variantes par setup

### BREAKOUT_EXPANSION

| Symbole | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD |
|---|---|---|---:|---:|---:|---:|---:|---:|
| GLD | breakout_h20_vol1.5_stop1_rr2 | STRONG | 75 | 47 | 53.2% | 0.62 | 2.53 | 4.00 |
| SMCI | breakout_h20_vol1.5_stop1_rr2 | STRONG | 75 | 25 | 52.0% | 0.68 | 3.64 | 3.00 |
| CLOU | breakout_h20_vol1.2_stop1_rr2 | OK | 72 | 17 | 58.8% | 0.82 | 3.94 | 2.00 |
| NVDA | breakout_h20_vol1.5_stop1_rr2 | OK | 68 | 13 | 53.8% | 0.62 | 5.13 | 2.00 |
| AMD | breakout_h20_vol1.5_stop1_rr2 | OK | 67 | 19 | 47.4% | 0.68 | 4.10 | 3.00 |
| MSTR | breakout_h20_vol1.5_stop1_rr2 | OK | 67 | 21 | 47.6% | 0.62 | 3.31 | 2.00 |
| MU | breakout_h20_vol1.5_stop1_rr2 | OK | 67 | 22 | 45.5% | 0.50 | 2.36 | 2.00 |
| NOW | breakout_h20_vol1.2_stop1_rr2 | OK | 67 | 21 | 52.4% | 0.62 | 3.95 | 4.00 |
| AMD | breakout_h20_vol1.2_stop1_rr2 | OK | 65 | 29 | 44.8% | 0.55 | 4.37 | 5.00 |
| APP | breakout_h50_vol1.2_stop1.5_rr2.5 | OK | 65 | 28 | 35.7% | 0.64 | 3.91 | 2.00 |

### MEAN_REVERSION
_(setup non prioritaire)_

| Symbole | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD |
|---|---|---|---:|---:|---:|---:|---:|---:|
| AKAM | meanrev_rsi35_dist4_stop1_rr1.2 | STRONG | 80 | 30 | 60.0% | 0.55 | 2.09 | 2.00 |
| ACLS | meanrev_rsi35_dist4_stop1_rr1.2 | OK | 77 | 21 | 66.7% | 0.56 | 3.44 | 2.00 |
| GTLB | meanrev_rsi35_dist4_stop1_rr1.2 | OK | 77 | 15 | 66.7% | 0.67 | 5.02 | 1.00 |
| TENB | meanrev_rsi35_dist4_stop1_rr1.2 | OK | 77 | 15 | 73.3% | 0.61 | 2.88 | 1.00 |
| JPM | meanrev_rsi35_dist4_stop1_rr1.2 | OK | 73 | 10 | 80.0% | 0.76 | 2.40 | 1.00 |
| AIR | meanrev_rsi35_dist4_stop1_rr1.2 | OK | 71 | 11 | 81.8% | 0.80 | 2.88 | 1.00 |
| ETN | meanrev_rsi35_dist4_stop1_rr1.2 | OK | 71 | 12 | 75.0% | 0.73 | 5.14 | 1.00 |
| MCHP | meanrev_rsi35_dist4_stop1_rr1.2 | OK | 71 | 12 | 75.0% | 0.65 | 2.10 | 1.00 |
| NVMI | meanrev_rsi35_dist4_stop1_rr1.2 | OK | 71 | 12 | 75.0% | 0.73 | 2.80 | 1.00 |
| SMH | meanrev_rsi35_dist4_stop1_rr1.2 | OK | 71 | 11 | 81.8% | 0.89 | 3.60 | 1.00 |

### PULLBACK_MOMENTUM

| Symbole | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD |
|---|---|---|---:|---:|---:|---:|---:|---:|
| ACLS | rsi42_58_chg20_0_stop0.5 | STRONG | 100 | 57 | 68.4% | 1.20 | 5.78 | 3.00 |
| CRWD | rsi42_58_chg20_5_stop0.5 | STRONG | 100 | 60 | 60.0% | 1.28 | 5.67 | 4.00 |
| CRWD | rsi42_58_chg20_3_stop0.5 | STRONG | 100 | 66 | 60.6% | 1.32 | 5.96 | 6.00 |
| PANW | rsi42_58_chg20_5_stop0.5 | STRONG | 100 | 50 | 60.0% | 1.16 | 3.60 | 9.00 |
| PANW | rsi42_58_chg20_3_stop0.5 | STRONG | 100 | 71 | 63.4% | 1.20 | 4.36 | 10.00 |
| PANW | rsi42_58_chg20_0_stop0.5 | STRONG | 100 | 87 | 62.1% | 1.13 | 4.22 | 11.00 |
| SOXQ | rsi42_58_chg20_5_stop0.5 | STRONG | 100 | 56 | 64.3% | 2.07 | 17.83 | 1.00 |
| SOXQ | rsi42_58_chg20_3_stop0.5 | STRONG | 100 | 70 | 60.0% | 1.77 | 9.16 | 3.00 |
| SOXQ | rsi42_58_chg20_0_stop0.5 | STRONG | 100 | 84 | 61.9% | 1.71 | 9.53 | 3.00 |
| SOXQ | rsi42_58_chg20_0_stop1.0 | STRONG | 100 | 50 | 64.0% | 1.26 | 11.85 | 1.00 |

### RELATIVE_STRENGTH_ROTATION

| Symbole | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD |
|---|---|---|---:|---:|---:|---:|---:|---:|
| APP | rs_90d_top10_hold20 | STRONG | 100 | 83 | 62.7% | 2.30 | 5.81 | 9.96 |
| APP | rs_120d_top10_hold20 | STRONG | 100 | 87 | 67.8% | 2.43 | 7.60 | 15.39 |
| PLTR | rs_120d_top10_hold20 | STRONG | 100 | 70 | 78.6% | 2.49 | 7.80 | 6.62 |
| PLTR | rs_90d_top10_hold20 | STRONG | 100 | 65 | 76.9% | 2.45 | 7.53 | 6.62 |
| SMCI | rs_90d_top10_hold20 | STRONG | 100 | 61 | 60.7% | 1.35 | 2.33 | 10.53 |
| ACLS | rs_120d_top10_hold20 | STRONG | 95 | 41 | 61.0% | 1.03 | 5.63 | 10.86 |
| AEHR | rs_120d_top10_hold20 | STRONG | 95 | 77 | 54.5% | 1.74 | 2.05 | 18.90 |
| AVAX | rs_90d_top10_hold20 | STRONG | 95 | 42 | 71.4% | 4.48 | 8.55 | 4.82 |
| CAMT | rs_120d_top10_hold20 | STRONG | 95 | 32 | 75.0% | 1.15 | 5.31 | 7.28 |
| FICO | rs_120d_top10_hold20 | STRONG | 95 | 30 | 80.0% | 1.01 | 6.39 | 3.67 |

### VOLATILITY_COMPRESSION
_(setup non prioritaire)_

| Symbole | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD |
|---|---|---|---:|---:|---:|---:|---:|---:|
| JPM | compression_20_ratio0.75_break20_stop1_rr2 | OK | 82 | 18 | 66.7% | 1.05 | 2.00 | 3.00 |
| ORCL | compression_20_ratio0.75_break20_stop1_rr2 | OK | 78 | 14 | 78.6% | 1.36 | 6.82 | 2.00 |
| BNB | compression_20_ratio0.75_break20_stop1_rr2 | OK | 75 | 16 | 62.5% | 0.94 | 4.40 | 1.00 |
| MSFT | compression_20_ratio0.75_break20_stop1_rr2 | OK | 66 | 11 | 54.5% | 0.73 | 3.91 | 2.00 |
| TSM | compression_20_ratio0.75_break20_stop1_rr2 | OK | 66 | 10 | 50.0% | 0.50 | 2.25 | 2.00 |

## 3. Meilleures variantes par actif ELITE / CORE

Pour chaque actif ELITE ou CORE, les 3 meilleures variantes (hors setups non prioritaires) :

| Symbole | Tier global | Top 1 (variante / score) | Top 2 | Top 3 |
|---|---|---|---|---|
| ACLS | ELITE | `rsi42_58_chg20_0_stop0.5` (100, STRONG, 57t) | `rs_120d_top10_hold20` (95, STRONG, 41t) | `rsi42_58_chg20_3_stop0.5` (93, STRONG, 45t) |
| APP | ELITE | `rs_90d_top10_hold20` (100, STRONG, 83t) | `rs_120d_top10_hold20` (100, STRONG, 87t) | `rs_60d_top5_hold10` (93, STRONG, 49t) |
| CRWD | ELITE | `rsi42_58_chg20_5_stop0.5` (100, STRONG, 60t) | `rsi42_58_chg20_3_stop0.5` (100, STRONG, 66t) | `rsi42_58_chg20_5_stop0.1` (95, STRONG, 80t) |
| PLTR | ELITE | `rs_120d_top10_hold20` (100, STRONG, 70t) | `rs_90d_top10_hold20` (100, STRONG, 65t) | `rsi42_58_chg20_5_stop0.5` (95, STRONG, 32t) |
| SMCI | ELITE | `rs_90d_top10_hold20` (100, STRONG, 61t) | `rs_120d_top10_hold20` (95, STRONG, 82t) | `rs_60d_top5_hold10` (95, STRONG, 51t) |
| SOXQ | ELITE | `rsi42_58_chg20_5_stop0.5` (100, STRONG, 56t) | `rsi42_58_chg20_3_stop0.5` (100, STRONG, 70t) | `rsi42_58_chg20_0_stop0.5` (100, STRONG, 84t) |
| VRNS | ELITE | `rsi42_58_chg20_5_stop0.1` (100, STRONG, 62t) | `rsi42_58_chg20_3_stop0.1` (100, STRONG, 86t) | `rsi42_58_chg20_5_stop0.5` (100, STRONG, 53t) |
| AEHR | ELITE | `rs_120d_top10_hold20` (95, STRONG, 77t) | `rs_90d_top10_hold20` (93, STRONG, 78t) | `rs_60d_top5_hold10` (93, STRONG, 63t) |
| ANET | ELITE | `rsi42_58_chg20_3_stop0.1` (95, STRONG, 64t) | `base_rsi42_58_chg20_0_stop0.1` (95, STRONG, 95t) | `rsi42_58_chg20_3_stop0.5` (95, STRONG, 56t) |
| AVAX | ELITE | `rs_90d_top10_hold20` (95, STRONG, 42t) | `rs_120d_top10_hold20` (93, STRONG, 45t) | `rs_20d_top5_hold5` (93, STRONG, 37t) |
| CAMT | ELITE | `rsi42_58_chg20_5_stop0.1` (95, STRONG, 57t) | `rsi42_58_chg20_3_stop0.1` (95, STRONG, 60t) | `rsi42_58_chg20_5_stop0.5` (95, STRONG, 33t) |
| FICO | ELITE | `rsi42_58_chg20_3_stop0.5` (95, STRONG, 69t) | `rsi42_58_chg20_0_stop0.5` (95, STRONG, 95t) | `rs_120d_top10_hold20` (95, STRONG, 30t) |
| PSI | ELITE | `rsi42_58_chg20_3_stop0.1` (95, STRONG, 83t) | `base_rsi42_58_chg20_0_stop0.1` (95, STRONG, 110t) | `rsi42_58_chg20_3_stop1.0` (95, STRONG, 33t) |
| SOL | ELITE | `rs_120d_top10_hold20` (95, STRONG, 56t) | `rs_90d_top10_hold20` (95, STRONG, 58t) | `rs_60d_top5_hold10` (85, STRONG, 49t) |
| SOXL | ELITE | `rsi42_58_chg20_3_stop0.1` (95, STRONG, 29t) | `rsi42_58_chg20_5_stop0.1` (93, STRONG, 25t) | `base_rsi42_58_chg20_0_stop0.1` (93, STRONG, 42t) |
| SOXX | ELITE | `rsi42_58_chg20_5_stop0.1` (95, STRONG, 48t) | `rsi42_58_chg20_3_stop0.1` (95, STRONG, 63t) | `base_rsi42_58_chg20_0_stop0.1` (95, STRONG, 102t) |
| XSD | ELITE | `rsi42_58_chg20_5_stop0.1` (95, STRONG, 35t) | `rsi45_55_chg20_0_stop0.1` (95, STRONG, 60t) | `rsi42_58_chg20_5_stop0.5` (93, STRONG, 33t) |
| PH | ELITE | `rsi42_58_chg20_3_stop0.5` (93, STRONG, 31t) | `rsi42_58_chg20_0_stop0.5` (93, STRONG, 44t) | `rsi42_58_chg20_3_stop0.1` (90, STRONG, 46t) |
| SMH | ELITE | `rsi42_58_chg20_3_stop0.5` (93, STRONG, 58t) | `rsi42_58_chg20_5_stop0.1` (88, STRONG, 53t) | `rsi42_58_chg20_3_stop0.1` (88, STRONG, 68t) |
| UPST | ELITE | `rs_120d_top10_hold20` (93, STRONG, 66t) | `rs_90d_top10_hold20` (87, STRONG, 64t) | `rs_20d_top5_hold5` (61, OK, 50t) |
| BTC | ELITE | `rs_90d_top10_hold20` (92, OK, 20t) | `rsi42_58_chg20_5_stop0.1` (80, STRONG, 51t) | `rsi42_58_chg20_3_stop0.1` (78, STRONG, 66t) |
| FTNT | ELITE | `rs_90d_top10_hold20` (92, OK, 22t) | `rs_120d_top10_hold20` (81, OK, 14t) | `rsi42_58_chg20_5_stop1.0` (58, OK, 13t) |
| NFLX | ELITE | `rs_90d_top10_hold20` (92, OK, 21t) | `rs_120d_top10_hold20` (84, OK, 23t) | `rsi42_58_chg20_3_stop0.1` (78, STRONG, 79t) |
| BNB | ELITE | `rs_120d_top10_hold20` (90, STRONG, 28t) | `rsi42_58_chg20_0_stop0.5` (85, STRONG, 91t) | `rs_20d_top5_hold5` (85, OK, 21t) |
| GOOGL | ELITE | `rsi42_58_chg20_3_stop0.5` (90, STRONG, 72t) | `rsi42_58_chg20_0_stop0.5` (90, STRONG, 91t) | `rsi42_58_chg20_3_stop0.1` (85, STRONG, 94t) |
| ALGM | ELITE | `rs_90d_top10_hold20` (89, OK, 21t) | `rsi42_58_chg20_5_stop0.1` (70, OK, 30t) | `rsi42_58_chg20_3_stop0.1` (70, OK, 43t) |
| NBIS | ELITE | `rs_120d_top10_hold20` (85, STRONG, 26t) | `rs_90d_top10_hold20` (82, OK, 24t) | `rs_60d_top5_hold10` (57, OK, 22t) |
| META | ELITE | `rsi42_58_chg20_5_stop0.1` (80, STRONG, 47t) | `rs_120d_top10_hold20` (78, OK, 14t) | `rsi42_58_chg20_5_stop0.5` (75, STRONG, 41t) |
| LRCX | ELITE | `pullback_rsi42_58_chg20_5_stop0.1` (75, OK, 18t) | `rsi42_58_chg20_5_stop0.1` (75, STRONG, 42t) | `pullback_rsi42_58_chg20_3_stop0.1` (60, OK, 27t) |
| PANW | CORE | `rsi42_58_chg20_5_stop0.5` (100, STRONG, 50t) | `rsi42_58_chg20_3_stop0.5` (100, STRONG, 71t) | `rsi42_58_chg20_0_stop0.5` (100, STRONG, 87t) |
| ETN | CORE | `rsi45_55_chg20_0_stop0.1` (95, STRONG, 51t) | `rsi42_58_chg20_0_stop0.5` (88, STRONG, 62t) | `rsi42_58_chg20_3_stop0.1` (85, STRONG, 50t) |
| KLAC | CORE | `rsi42_58_chg20_5_stop0.5` (95, STRONG, 52t) | `rsi42_58_chg20_3_stop0.5` (90, STRONG, 66t) | `rsi42_58_chg20_5_stop0.1` (85, STRONG, 62t) |
| LINK | CORE | `rs_120d_top10_hold20` (95, STRONG, 30t) | `rs_20d_top5_hold5` (75, STRONG, 30t) | `rs_90d_top10_hold20` (60, OK, 24t) |
| SLAB | CORE | `rsi42_58_chg20_0_stop0.5` (95, STRONG, 58t) | `rsi42_58_chg20_5_stop0.5` (90, STRONG, 38t) | `rsi42_58_chg20_5_stop0.1` (85, STRONG, 52t) |
| TER | CORE | `rsi42_58_chg20_3_stop0.1` (95, STRONG, 74t) | `rsi45_55_chg20_0_stop0.1` (95, STRONG, 68t) | `base_rsi42_58_chg20_0_stop0.1` (85, STRONG, 94t) |
| FTEC | CORE | `rsi42_58_chg20_5_stop0.1` (92, OK, 23t) | `rsi42_58_chg20_5_stop0.5` (85, OK, 16t) | `rsi42_58_chg20_0_stop0.5` (80, STRONG, 69t) |
| LIN | CORE | `rsi42_58_chg20_5_stop0.5` (90, OK, 18t) | `rsi42_58_chg20_5_stop1.0` (90, OK, 16t) | `rsi42_58_chg20_3_stop1.0` (90, OK, 16t) |
| MA | CORE | `rsi42_58_chg20_0_stop1.0` (90, OK, 22t) | `rsi42_58_chg20_5_stop0.5` (87, OK, 22t) | `rsi42_58_chg20_0_stop0.5` (85, STRONG, 83t) |
| NXPI | CORE | `rsi42_58_chg20_3_stop0.5` (90, OK, 20t) | `rsi42_58_chg20_0_stop0.5` (90, STRONG, 33t) | `rsi42_58_chg20_5_stop0.5` (87, OK, 15t) |
| SAP | CORE | `rsi42_58_chg20_5_stop0.1` (90, STRONG, 29t) | `rsi42_58_chg20_3_stop0.1` (85, STRONG, 71t) | `base_rsi42_58_chg20_0_stop0.1` (78, STRONG, 116t) |
| SENT | CORE | `rsi42_58_chg20_3_stop0.1` (90, STRONG, 26t) | `base_rsi42_58_chg20_0_stop0.1` (85, STRONG, 64t) | `rsi42_58_chg20_3_stop0.5` (85, STRONG, 31t) |
| STM | CORE | `rsi42_58_chg20_5_stop0.5` (90, STRONG, 28t) | `rsi42_58_chg20_3_stop0.5` (90, STRONG, 31t) | `rsi42_58_chg20_3_stop1.0` (87, OK, 16t) |
| USD | CORE | `rs_90d_top10_hold20` (90, STRONG, 62t) | `rs_20d_top5_hold5` (82, OK, 15t) | `rsi42_58_chg20_5_stop0.5` (73, OK, 28t) |
| VUG | CORE | `rsi42_58_chg20_3_stop0.1` (90, STRONG, 38t) | `rsi42_58_chg20_3_stop0.5` (85, STRONG, 26t) | `rsi42_58_chg20_0_stop0.5` (85, STRONG, 63t) |
| IYW | CORE | `rsi42_58_chg20_3_stop0.1` (88, STRONG, 48t) | `rsi42_58_chg20_3_stop0.5` (83, STRONG, 37t) | `rsi42_58_chg20_5_stop0.1` (82, OK, 23t) |
| RMBS | CORE | `rsi42_58_chg20_0_stop0.5` (88, STRONG, 61t) | `rsi42_58_chg20_5_stop0.5` (83, STRONG, 40t) | `rsi42_58_chg20_3_stop0.5` (83, STRONG, 47t) |
| SPY | CORE | `rsi42_58_chg20_0_stop1.0` (88, STRONG, 32t) | `base_rsi42_58_chg20_0_stop0.1` (85, STRONG, 132t) | `rsi42_58_chg20_0_stop0.5` (80, STRONG, 103t) |
| JPM | CORE | `rsi42_58_chg20_5_stop0.5` (87, OK, 20t) | `rsi42_58_chg20_5_stop0.1` (75, STRONG, 35t) | `rsi42_58_chg20_3_stop1.0` (66, OK, 10t) |
| VGT | CORE | `rsi42_58_chg20_5_stop0.1` (87, OK, 19t) | `rsi42_58_chg20_5_stop0.5` (81, OK, 14t) | `rsi42_58_chg20_3_stop0.1` (75, STRONG, 47t) |
| AMAT | CORE | `rsi42_58_chg20_5_stop0.1` (85, STRONG, 70t) | `rsi42_58_chg20_3_stop0.1` (85, STRONG, 94t) | `base_rsi42_58_chg20_0_stop0.1` (83, STRONG, 110t) |
| AMZN | CORE | `rsi42_58_chg20_5_stop0.1` (85, STRONG, 56t) | `rsi42_58_chg20_5_stop1.0` (82, OK, 21t) | `rsi42_58_chg20_3_stop0.1` (80, STRONG, 99t) |
| ASML | CORE | `rsi42_58_chg20_5_stop0.1` (85, STRONG, 48t) | `rsi42_58_chg20_3_stop0.1` (80, STRONG, 73t) | `rsi42_58_chg20_5_stop0.5` (73, OK, 34t) |
| DELL | CORE | `rsi45_55_chg20_0_stop0.1` (85, STRONG, 59t) | `rsi42_58_chg20_5_stop0.1` (80, STRONG, 61t) | `rsi42_58_chg20_3_stop0.1` (80, STRONG, 83t) |
| IGM | CORE | `base_rsi42_58_chg20_0_stop0.1` (85, STRONG, 94t) | `rsi42_58_chg20_3_stop1.0` (85, OK, 16t) | `rsi42_58_chg20_3_stop0.1` (80, STRONG, 44t) |
| PDD | CORE | `rs_120d_top10_hold20` (85, STRONG, 34t) | `rs_90d_top10_hold20` (77, STRONG, 33t) | — |
| ROM | CORE | `rsi42_58_chg20_5_stop0.1` (85, STRONG, 55t) | `rsi42_58_chg20_3_stop0.1` (80, STRONG, 66t) | `rsi42_58_chg20_5_stop0.5` (75, STRONG, 34t) |
| SPYG | CORE | `rsi42_58_chg20_0_stop0.5` (85, STRONG, 77t) | `rsi42_58_chg20_3_stop0.1` (83, STRONG, 50t) | `rsi42_58_chg20_0_stop1.0` (83, STRONG, 32t) |
| MSTR | CORE | `rs_20d_top5_hold5` (84, STRONG, 49t) | `rs_120d_top10_hold20` (74, OK, 45t) | `breakout_h20_vol1.5_stop1_rr2` (67, OK, 21t) |
| MU | CORE | `rs_60d_top5_hold10` (84, OK, 16t) | `rs_120d_top10_hold20` (80, OK, 15t) | `breakout_h20_vol1.5_stop1_rr2` (67, OK, 22t) |
| APLD | CORE | `rs_90d_top10_hold20` (83, STRONG, 102t) | `rs_20d_top5_hold5` (79, STRONG, 86t) | `rs_120d_top10_hold20` (75, STRONG, 99t) |
| CYBR | CORE | `rsi42_58_chg20_5_stop0.1` (83, STRONG, 67t) | `rsi42_58_chg20_3_stop0.1` (80, STRONG, 98t) | `base_rsi42_58_chg20_0_stop0.1` (80, STRONG, 136t) |
| MELI | CORE | `rsi42_58_chg20_3_stop0.1` (83, STRONG, 62t) | `base_rsi42_58_chg20_0_stop0.1` (83, STRONG, 87t) | `rsi42_58_chg20_5_stop0.1` (78, STRONG, 44t) |
| WCLD | CORE | `rsi42_58_chg20_5_stop0.1` (83, STRONG, 50t) | `rsi42_58_chg20_3_stop0.1` (83, STRONG, 65t) | `base_rsi42_58_chg20_0_stop0.1` (83, STRONG, 90t) |
| AXP | CORE | `rsi42_58_chg20_3_stop0.1` (80, STRONG, 87t) | `rsi42_58_chg20_5_stop0.1` (78, STRONG, 52t) | `pullback_rsi42_58_chg20_3_stop0.1` (65, OK, 39t) |
| ETH | CORE | `rs_120d_top10_hold20` (80, STRONG, 26t) | `rsi42_58_chg20_5_stop0.1` (78, STRONG, 64t) | `rsi42_58_chg20_3_stop0.1` (78, STRONG, 78t) |
| MCHP | CORE | `rsi42_58_chg20_3_stop0.1` (80, STRONG, 55t) | `rsi42_58_chg20_5_stop0.1` (75, STRONG, 40t) | `base_rsi42_58_chg20_0_stop0.1` (70, OK, 65t) |
| NVDA | CORE | `rsi42_58_chg20_3_stop0.1` (80, STRONG, 63t) | `base_rsi42_58_chg20_0_stop0.1` (80, STRONG, 75t) | `rsi42_58_chg20_5_stop0.5` (78, STRONG, 35t) |
| ORCL | CORE | `rsi42_58_chg20_5_stop0.1` (80, STRONG, 64t) | `rsi42_58_chg20_3_stop0.1` (80, STRONG, 92t) | `rsi42_58_chg20_3_stop0.5` (80, STRONG, 74t) |
| ROKU | CORE | `rsi42_58_chg20_3_stop0.1` (80, STRONG, 59t) | `base_rsi42_58_chg20_0_stop0.1` (80, STRONG, 67t) | `rsi42_58_chg20_3_stop0.5` (80, STRONG, 51t) |
| SIE | CORE | `rsi42_58_chg20_3_stop0.1` (80, STRONG, 69t) | `base_rsi42_58_chg20_0_stop0.1` (78, STRONG, 120t) | `rsi45_55_chg20_0_stop0.1` (78, STRONG, 80t) |
| CLOU | CORE | `rsi42_58_chg20_3_stop0.1` (78, STRONG, 62t) | `base_rsi42_58_chg20_0_stop0.1` (78, STRONG, 91t) | `rsi45_55_chg20_0_stop0.1` (78, STRONG, 57t) |
| MPWR | CORE | `rsi42_58_chg20_3_stop0.1` (78, STRONG, 62t) | `base_rsi42_58_chg20_0_stop0.1` (78, STRONG, 71t) | `rsi42_58_chg20_5_stop0.1` (70, OK, 45t) |
| TYL | CORE | `rsi42_58_chg20_3_stop0.1` (78, STRONG, 53t) | `base_rsi42_58_chg20_0_stop0.1` (78, STRONG, 104t) | `rsi45_55_chg20_0_stop0.1` (78, STRONG, 67t) |
| XLK | CORE | `rsi42_58_chg20_3_stop0.1` (78, STRONG, 56t) | `rsi42_58_chg20_5_stop0.1` (75, STRONG, 25t) | `base_rsi42_58_chg20_0_stop0.1` (67, OK, 124t) |
| BKNG | CORE | `rsi42_58_chg20_5_stop0.1` (75, STRONG, 61t) | `base_rsi42_58_chg20_0_stop0.1` (68, OK, 118t) | `rsi42_58_chg20_3_stop0.1` (65, OK, 89t) |
| GLD | CORE | `breakout_h20_vol1.5_stop1_rr2` (75, STRONG, 47t) | `breakout_h50_vol1.5_stop1.5_rr2.5` (65, OK, 37t) | `rsi42_58_chg20_3_stop0.5` (65, OK, 61t) |
| PATH | CORE | `rsi42_58_chg20_3_stop0.1` (75, STRONG, 50t) | `base_rsi42_58_chg20_0_stop0.1` (72, OK, 58t) | `rsi45_55_chg20_0_stop0.1` (72, OK, 56t) |
| SHOP | CORE | `rsi42_58_chg20_3_stop1.0` (75, STRONG, 29t) | `rsi42_58_chg20_5_stop0.5` (70, OK, 39t) | `rsi42_58_chg20_3_stop0.5` (70, OK, 43t) |
| EA | CORE | `rsi42_58_chg20_5_stop0.1` (70, OK, 28t) | — | — |
| HACK | CORE | `rsi42_58_chg20_5_stop0.1` (70, OK, 29t) | `rsi42_58_chg20_5_stop0.5` (67, OK, 19t) | `rsi42_58_chg20_0_stop0.5` (65, OK, 99t) |
| TSM | CORE | `rsi42_58_chg20_3_stop0.5` (70, OK, 70t) | `rsi42_58_chg20_0_stop1.0` (70, OK, 50t) | `rsi42_58_chg20_5_stop0.5` (67, OK, 57t) |
| NVMI | CORE | `rsi42_58_chg20_3_stop0.5` (65, OK, 54t) | `rsi42_58_chg20_0_stop0.5` (65, OK, 60t) | `rsi42_58_chg20_3_stop0.1` (63, OK, 79t) |
| TTWO | CORE | `rsi45_55_chg20_0_stop0.1` (65, OK, 67t) | `rsi42_58_chg20_3_stop0.1` (57, OK, 64t) | — |
| IGV | CORE | `pullback_base_rsi42_58_chg20_0_stop0.1` (63, OK, 43t) | `base_rsi42_58_chg20_0_stop0.1` (59, OK, 103t) | — |
| CIBR | CORE | `rsi42_58_chg20_0_stop1.0` (57, OK, 28t) | — | — |

## 4. Variantes à abandonner

Critères : ≥ 10 actifs testés, aucune cellule STRONG, ratio AVOID > 0.70.

| Setup | Variante | Cellules | STRONG | OK | WEAK | AVOID | Ratio AVOID |
|---|---|---:|---:|---:|---:|---:|---:|
| VOLATILITY_COMPRESSION | compression_40_ratio0.7_break30_stop1.5_rr2.5 | 69 | 0 | 0 | 0 | 69 | 100% |
| MEAN_REVERSION | meanrev_rsi30_dist7_stop1.5_rr1.5 | 137 | 0 | 0 | 11 | 126 | 92% |
| MEAN_REVERSION | meanrev_rsi30_dist5_stop1_rr1.2 | 141 | 0 | 3 | 12 | 126 | 89% |
| BREAKOUT_EXPANSION | breakout_h50_vol1.5_stop1.5_rr2.5 | 155 | 0 | 4 | 14 | 137 | 88% |
| VOLATILITY_COMPRESSION | compression_20_ratio0.65_break20_stop1_rr2 | 71 | 0 | 0 | 9 | 62 | 87% |
| VOLATILITY_COMPRESSION | compression_20_ratio0.75_break20_stop1_rr2 | 117 | 0 | 5 | 12 | 100 | 85% |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | 158 | 0 | 7 | 16 | 135 | 85% |

## 5. Cas importants

### NVDA

| Setup | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD | Raison |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | STRONG | 80 | 75 | 29.3% | 0.73 | 2.20 | 10.00 | variante exploitable |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | STRONG | 80 | 63 | 31.7% | 0.90 | 2.39 | 10.00 | variante exploitable |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.5 | STRONG | 78 | 35 | 45.7% | 1.00 | 3.31 | 4.00 | variante exploitable |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.5 | OK | 75 | 16 | 50.0% | 1.15 | 3.92 | 4.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | STRONG | 75 | 43 | 41.9% | 0.80 | 3.04 | 4.96 | variante exploitable |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | OK | 73 | 48 | 41.7% | 0.76 | 3.08 | 4.96 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | OK | 73 | 49 | 28.6% | 0.93 | 2.18 | 9.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop1.0 | OK | 72 | 20 | 50.0% | 0.52 | 1.86 | 4.00 | — |
| BREAKOUT_EXPANSION | breakout_h20_vol1.5_stop1_rr2 | OK | 68 | 13 | 53.8% | 0.62 | 5.13 | 2.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.5 | OK | 67 | 20 | 45.0% | 0.91 | 3.83 | 4.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop1.0 | OK | 67 | 24 | 50.0% | 0.49 | 2.01 | 4.00 | — |
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | OK | 65 | 36 | 30.6% | 0.80 | 2.41 | 9.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | OK | 65 | 30 | 33.3% | 0.99 | 2.59 | 9.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.1 | OK | 65 | 23 | 30.4% | 1.06 | 2.18 | 9.00 | — |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | OK | 57 | 24 | 37.5% | 0.56 | 3.04 | 3.00 | — |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | AVOID | 55 | 52 | 61.5% | -1.13 | 6.34 | 35.20 | espérance -1.13 |
| BREAKOUT_EXPANSION | breakout_h50_vol1.5_stop1.5_rr2.5 | WEAK | 53 | 13 | 38.5% | 0.58 | 5.77 | 2.00 | — |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | WEAK | 52 | 24 | 45.8% | 0.42 | 2.70 | 3.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop1.0 | WEAK | 52 | 27 | 44.4% | 0.32 | 1.71 | 4.00 | — |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | AVOID | 50 | 56 | 57.1% | -1.00 | 5.76 | 35.20 | espérance -1.00 |
| RELATIVE_STRENGTH_ROTATION | rs_60d_top5_hold10 | WEAK | 42 | 17 | 52.9% | -3.15 | 4.29 | 36.14 | espérance -3.15 |
| MEAN_REVERSION | meanrev_rsi35_dist4_stop1_rr1.2 | AVOID | 23 | 25 | 36.0% | 0.03 | 1.05 | 5.00 | setup non prioritaire |
| RELATIVE_STRENGTH_ROTATION | rs_20d_top5_hold5 | AVOID | 13 | 8 | 50.0% | -1.92 | 0.23 | 17.95 | PF 0.23 < 1 |
| PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | AVOID | 10 | 43 | 18.6% | -0.28 | 0.68 | 10.54 | espérance -0.28 ; PF 0.68 < 1 |
| MEAN_REVERSION | meanrev_rsi30_dist5_stop1_rr1.2 | AVOID | 2 | 16 | 25.0% | -0.08 | 0.80 | 5.00 | espérance -0.08 ; PF 0.80 < 1 ; setup non prioritaire |
| MEAN_REVERSION | meanrev_rsi30_dist7_stop1.5_rr1.5 | AVOID | 2 | 16 | 12.5% | -0.25 | 0.43 | 7.00 | espérance -0.25 ; PF 0.43 < 1 ; setup non prioritaire |
| PULLBACK_MOMENTUM | UNKNOWN_VARIANT | AVOID | 0 | 3 | 33.3% | 0.02 | n/a | 0.00 | échantillon < 8 trades |

### SOXL

| Setup | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD | Raison |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | STRONG | 95 | 29 | 75.9% | 2.49 | 10.93 | 2.00 | variante exploitable |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | STRONG | 93 | 42 | 73.8% | 2.18 | 8.47 | 3.00 | variante exploitable |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | STRONG | 93 | 33 | 66.7% | 1.27 | 4.03 | 3.00 | variante exploitable |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | STRONG | 93 | 25 | 80.0% | 2.83 | 16.36 | 1.00 | variante exploitable |
| PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | STRONG | 93 | 37 | 83.8% | 2.55 | 14.25 | 2.00 | variante exploitable |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | OK | 87 | 23 | 69.6% | 1.48 | 5.38 | 2.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.5 | OK | 87 | 21 | 76.2% | 1.71 | 8.53 | 1.00 | — |
| RELATIVE_STRENGTH_ROTATION | rs_20d_top5_hold5 | STRONG | 80 | 29 | 48.3% | 0.55 | 2.36 | 4.56 | variante exploitable |
| MEAN_REVERSION | meanrev_rsi35_dist4_stop1_rr1.2 | OK | 68 | 10 | 70.0% | 0.54 | 2.10 | 1.00 | setup non prioritaire |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.1 | OK | 68 | 13 | 76.9% | 2.69 | 1.87 | 1.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | WEAK | 60 | 15 | 73.3% | 2.37 | 1.06 | 2.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.5 | OK | 60 | 11 | 72.7% | 1.59 | 1.22 | 1.00 | — |
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | WEAK | 57 | 22 | 72.7% | 2.10 | 1.00 | 3.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop1.0 | WEAK | 56 | 13 | 84.6% | 1.58 | n/a | 0.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop1.0 | WEAK | 56 | 11 | 81.8% | 1.55 | n/a | 0.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop1.0 | WEAK | 56 | 11 | 81.8% | 1.55 | n/a | 0.00 | — |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | WEAK | 53 | 44 | 54.5% | 0.16 | 2.32 | 17.61 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.5 | AVOID | 48 | 12 | 66.7% | 1.38 | 0.69 | 2.00 | PF 0.69 < 1 |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | AVOID | 40 | 40 | 50.0% | -0.11 | 1.61 | 14.69 | espérance -0.11 |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | AVOID | 31 | 11 | 36.4% | 0.09 | 1.64 | 2.00 | — |
| MEAN_REVERSION | meanrev_rsi30_dist5_stop1_rr1.2 | AVOID | 15 | 1 | 100.0% | 1.20 | n/a | 0.00 | échantillon < 8 trades ; setup non prioritaire |
| VOLATILITY_COMPRESSION | compression_20_ratio0.75_break20_stop1_rr2 | AVOID | 15 | 1 | 100.0% | 2.00 | n/a | 0.00 | échantillon < 8 trades ; setup non prioritaire |
| RELATIVE_STRENGTH_ROTATION | rs_60d_top5_hold10 | AVOID | 7 | 21 | 42.9% | -0.94 | 0.56 | 11.48 | espérance -0.94 ; PF 0.56 < 1 |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | AVOID | 3 | 11 | 18.2% | -0.09 | 0.38 | 3.00 | espérance -0.09 ; PF 0.38 < 1 |
| MEAN_REVERSION | meanrev_rsi30_dist7_stop1.5_rr1.5 | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | 0.00 | échantillon < 8 trades ; setup non prioritaire |

### AVGO

| Setup | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD | Raison |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | OK | 78 | 11 | 63.6% | 0.63 | 5.33 | 2.30 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | OK | 65 | 105 | 22.9% | 0.36 | 2.05 | 14.27 | — |
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | OK | 58 | 69 | 24.6% | 0.27 | 2.18 | 16.40 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | OK | 58 | 52 | 25.0% | 0.43 | 2.64 | 10.40 | — |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | OK | 57 | 145 | 23.4% | 0.21 | 1.66 | 22.31 | — |
| MEAN_REVERSION | meanrev_rsi35_dist4_stop1_rr1.2 | OK | 55 | 25 | 48.0% | 0.21 | 1.66 | 6.00 | setup non prioritaire |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | WEAK | 53 | 30 | 26.7% | 0.33 | 2.59 | 3.00 | — |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | WEAK | 48 | 33 | 33.3% | 0.27 | 1.95 | 3.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.5 | WEAK | 46 | 38 | 26.3% | 0.19 | 2.05 | 7.00 | — |
| BREAKOUT_EXPANSION | breakout_h20_vol1.5_stop1_rr2 | WEAK | 45 | 20 | 35.0% | 0.35 | 1.93 | 2.00 | — |
| MEAN_REVERSION | meanrev_rsi30_dist7_stop1.5_rr1.5 | WEAK | 45 | 18 | 38.9% | 0.31 | 1.80 | 5.00 | setup non prioritaire |
| BREAKOUT_EXPANSION | breakout_h50_vol1.5_stop1.5_rr2.5 | WEAK | 42 | 17 | 23.5% | 0.29 | 1.83 | 2.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop1.0 | WEAK | 42 | 50 | 28.0% | 0.13 | 1.44 | 5.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | WEAK | 38 | 96 | 24.0% | 0.05 | 1.22 | 15.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop1.0 | WEAK | 38 | 52 | 26.9% | 0.09 | 1.28 | 6.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | WEAK | 38 | 76 | 22.4% | 0.09 | 1.34 | 11.63 | — |
| MEAN_REVERSION | meanrev_rsi30_dist5_stop1_rr1.2 | AVOID | 30 | 18 | 44.4% | 0.20 | 1.40 | 6.00 | setup non prioritaire |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | AVOID | 23 | 72 | 16.7% | -0.06 | 1.11 | 11.00 | espérance -0.06 |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | AVOID | 23 | 4 | 100.0% | 0.51 | n/a | 0.00 | échantillon < 8 trades |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.1 | AVOID | 22 | 35 | 17.1% | -0.06 | 1.34 | 8.00 | espérance -0.06 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.5 | AVOID | 18 | 60 | 18.3% | -0.08 | 0.90 | 9.00 | espérance -0.08 ; PF 0.90 < 1 |
| PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | AVOID | 15 | 85 | 18.8% | -0.17 | 0.84 | 21.05 | espérance -0.17 ; PF 0.84 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop1.0 | AVOID | 13 | 43 | 20.9% | -0.08 | 0.89 | 4.00 | espérance -0.08 ; PF 0.89 < 1 |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.5 | AVOID | 10 | 29 | 20.7% | -0.02 | 0.82 | 6.00 | espérance -0.02 ; PF 0.82 < 1 |
| RELATIVE_STRENGTH_ROTATION | rs_20d_top5_hold5 | AVOID | 0 | 7 | 42.9% | -0.32 | 0.71 | 3.55 | échantillon < 8 trades ; PF 0.71 < 1 |

### QQQ

| Setup | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD | Raison |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop1.0 | OK | 82 | 18 | 61.1% | 0.95 | 3.62 | 1.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | STRONG | 80 | 54 | 38.9% | 0.98 | 3.44 | 6.93 | variante exploitable |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop1.0 | OK | 76 | 13 | 53.8% | 0.79 | 3.35 | 2.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | OK | 65 | 26 | 38.5% | 0.98 | 3.96 | 5.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | WEAK | 54 | 37 | 27.0% | 0.31 | 1.91 | 6.29 | — |
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | WEAK | 50 | 56 | 30.4% | 0.29 | 1.68 | 12.00 | — |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | WEAK | 46 | 118 | 29.7% | 0.26 | 1.50 | 21.93 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | WEAK | 46 | 70 | 28.6% | 0.23 | 1.45 | 14.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | WEAK | 46 | 22 | 27.3% | 0.28 | 1.75 | 4.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.5 | WEAK | 40 | 17 | 23.5% | 0.13 | 1.97 | 5.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.1 | WEAK | 38 | 11 | 27.3% | 0.28 | 1.88 | 4.00 | — |
| PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | AVOID | 28 | 85 | 27.1% | 0.01 | 1.10 | 18.72 | — |
| PULLBACK_MOMENTUM | UNKNOWN_VARIANT | AVOID | 27 | 16 | 43.8% | 0.73 | n/a | 0.00 | — |
| MEAN_REVERSION | meanrev_rsi30_dist7_stop1.5_rr1.5 | AVOID | 15 | 1 | 100.0% | 1.50 | n/a | 0.00 | échantillon < 8 trades ; setup non prioritaire |
| MEAN_REVERSION | meanrev_rsi35_dist4_stop1_rr1.2 | AVOID | 15 | 3 | 66.7% | 0.80 | 0.00 | 0.00 | échantillon < 8 trades ; setup non prioritaire |
| MEAN_REVERSION | meanrev_rsi30_dist5_stop1_rr1.2 | AVOID | 10 | 2 | 50.0% | 0.60 | 0.00 | 0.00 | échantillon < 8 trades ; setup non prioritaire |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | AVOID | 7 | 19 | 15.8% | -0.26 | 0.72 | 4.00 | espérance -0.26 ; PF 0.72 < 1 |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | AVOID | 7 | 19 | 5.3% | -0.34 | 0.53 | 4.00 | espérance -0.34 ; PF 0.53 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.5 | AVOID | 7 | 21 | 14.3% | -0.07 | 0.89 | 6.00 | espérance -0.07 ; PF 0.89 < 1 |
| VOLATILITY_COMPRESSION | compression_20_ratio0.75_break20_stop1_rr2 | AVOID | 7 | 16 | 18.8% | -0.13 | 0.81 | 2.00 | espérance -0.13 ; PF 0.81 < 1 ; setup non prioritaire |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.5 | AVOID | 3 | 10 | 10.0% | -0.37 | 0.34 | 4.00 | espérance -0.37 ; PF 0.34 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop1.0 | AVOID | 3 | 5 | 20.0% | 0.11 | 1.52 | 1.00 | échantillon < 8 trades |
| VOLATILITY_COMPRESSION | compression_20_ratio0.65_break20_stop1_rr2 | AVOID | 3 | 11 | 18.2% | -0.09 | 0.91 | 2.00 | espérance -0.09 ; PF 0.91 < 1 ; setup non prioritaire |
| VOLATILITY_COMPRESSION | compression_40_ratio0.7_break30_stop1.5_rr2.5 | AVOID | 2 | 16 | 0.0% | -0.31 | 0.00 | 5.00 | espérance -0.31 ; setup non prioritaire |
| BREAKOUT_EXPANSION | breakout_h20_vol1.5_stop1_rr2 | AVOID | 0 | 2 | 0.0% | -0.50 | 0.00 | 1.00 | échantillon < 8 trades |
| BREAKOUT_EXPANSION | breakout_h50_vol1.5_stop1.5_rr2.5 | AVOID | 0 | 2 | 0.0% | -0.50 | 0.00 | 1.00 | échantillon < 8 trades |

### PLTR

| Setup | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD | Raison |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | STRONG | 100 | 70 | 78.6% | 2.49 | 7.80 | 6.62 | variante exploitable |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | STRONG | 100 | 65 | 76.9% | 2.45 | 7.53 | 6.62 | variante exploitable |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | STRONG | 95 | 39 | 64.1% | 1.42 | 6.40 | 4.00 | variante exploitable |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | STRONG | 95 | 37 | 67.6% | 1.55 | 8.51 | 3.00 | variante exploitable |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.5 | STRONG | 95 | 32 | 62.5% | 1.53 | 7.44 | 3.00 | variante exploitable |
| RELATIVE_STRENGTH_ROTATION | rs_60d_top5_hold10 | STRONG | 95 | 44 | 65.9% | 1.05 | 3.63 | 13.62 | variante exploitable |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop1.0 | OK | 90 | 20 | 70.0% | 1.25 | 6.49 | 2.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop1.0 | OK | 90 | 20 | 70.0% | 1.25 | 6.49 | 2.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop1.0 | OK | 90 | 20 | 70.0% | 1.25 | 6.49 | 2.00 | — |
| PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | STRONG | 90 | 34 | 52.9% | 1.81 | 8.01 | 5.00 | variante exploitable |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | STRONG | 85 | 49 | 46.9% | 1.58 | 5.22 | 4.00 | variante exploitable |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | STRONG | 85 | 47 | 48.9% | 1.69 | 5.65 | 4.00 | variante exploitable |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.5 | OK | 82 | 18 | 66.7% | 1.55 | 8.65 | 2.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.5 | OK | 82 | 16 | 62.5% | 1.52 | 7.75 | 2.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | STRONG | 80 | 38 | 42.1% | 1.72 | 5.64 | 3.00 | variante exploitable |
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | OK | 72 | 24 | 45.8% | 1.55 | 5.84 | 3.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | OK | 72 | 23 | 47.8% | 1.66 | 6.23 | 3.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.1 | OK | 67 | 19 | 42.1% | 1.72 | 6.66 | 2.00 | — |
| BREAKOUT_EXPANSION | breakout_h20_vol1.5_stop1_rr2 | WEAK | 50 | 31 | 32.3% | 0.22 | 1.56 | 4.00 | — |
| BREAKOUT_EXPANSION | breakout_h50_vol1.5_stop1.5_rr2.5 | WEAK | 43 | 25 | 20.0% | 0.18 | 1.85 | 3.00 | — |
| VOLATILITY_COMPRESSION | compression_20_ratio0.75_break20_stop1_rr2 | WEAK | 40 | 3 | 66.7% | 1.00 | 4.00 | 1.00 | échantillon < 8 trades ; setup non prioritaire |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | AVOID | 30 | 39 | 28.2% | 0.08 | 1.35 | 5.00 | — |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | AVOID | 22 | 33 | 15.2% | -0.02 | 1.23 | 6.00 | espérance -0.02 |
| MEAN_REVERSION | meanrev_rsi35_dist4_stop1_rr1.2 | AVOID | 18 | 13 | 38.5% | -0.07 | 1.23 | 4.00 | espérance -0.07 ; setup non prioritaire |
| MEAN_REVERSION | meanrev_rsi30_dist5_stop1_rr1.2 | AVOID | 15 | 2 | 100.0% | 1.20 | n/a | 0.00 | échantillon < 8 trades ; setup non prioritaire |
| RELATIVE_STRENGTH_ROTATION | rs_20d_top5_hold5 | AVOID | 7 | 19 | 36.8% | -0.50 | 0.74 | 6.75 | espérance -0.50 ; PF 0.74 < 1 |
| MEAN_REVERSION | meanrev_rsi30_dist7_stop1.5_rr1.5 | AVOID | 0 | 2 | 0.0% | 0.00 | 0.00 | 0.00 | échantillon < 8 trades ; setup non prioritaire |

### APP

| Setup | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD | Raison |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | STRONG | 100 | 87 | 67.8% | 2.43 | 7.60 | 15.39 | variante exploitable |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | STRONG | 100 | 83 | 62.7% | 2.30 | 5.81 | 9.96 | variante exploitable |
| RELATIVE_STRENGTH_ROTATION | rs_60d_top5_hold10 | STRONG | 93 | 49 | 61.2% | 1.09 | 4.13 | 7.20 | variante exploitable |
| RELATIVE_STRENGTH_ROTATION | rs_20d_top5_hold5 | STRONG | 77 | 36 | 63.9% | 0.35 | 3.59 | 4.80 | variante exploitable |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | OK | 65 | 28 | 35.7% | 0.64 | 3.91 | 2.00 | — |
| BREAKOUT_EXPANSION | breakout_h20_vol1.5_stop1_rr2 | WEAK | 52 | 22 | 31.8% | 0.32 | 2.39 | 3.00 | — |
| BREAKOUT_EXPANSION | breakout_h50_vol1.5_stop1.5_rr2.5 | WEAK | 52 | 19 | 26.3% | 0.40 | 3.49 | 2.00 | — |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | WEAK | 50 | 32 | 34.4% | 0.31 | 1.96 | 5.00 | — |
| PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | WEAK | 44 | 58 | 31.0% | 0.16 | 1.28 | 8.01 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | WEAK | 40 | 67 | 28.4% | 0.14 | 1.24 | 12.01 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | WEAK | 35 | 58 | 29.3% | 0.14 | 1.27 | 9.37 | — |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | AVOID | 33 | 69 | 27.5% | 0.11 | 1.18 | 13.01 | — |
| MEAN_REVERSION | meanrev_rsi30_dist5_stop1_rr1.2 | AVOID | 15 | 4 | 100.0% | 1.20 | n/a | 0.00 | échantillon < 8 trades ; setup non prioritaire |
| MEAN_REVERSION | meanrev_rsi35_dist4_stop1_rr1.2 | AVOID | 15 | 18 | 44.4% | 0.03 | 0.80 | 5.80 | PF 0.80 < 1 ; setup non prioritaire |
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | AVOID | 15 | 32 | 25.0% | -0.06 | 0.91 | 8.00 | espérance -0.06 ; PF 0.91 < 1 |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | AVOID | 15 | 31 | 25.8% | -0.03 | 0.97 | 8.00 | espérance -0.03 ; PF 0.97 < 1 |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.1 | AVOID | 10 | 27 | 25.9% | -0.08 | 0.94 | 8.00 | espérance -0.08 ; PF 0.94 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | AVOID | 10 | 46 | 21.7% | -0.07 | 0.92 | 8.13 | espérance -0.07 ; PF 0.92 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | AVOID | 10 | 44 | 22.7% | -0.03 | 0.98 | 7.13 | espérance -0.03 ; PF 0.98 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.5 | AVOID | 10 | 37 | 21.6% | -0.03 | 0.97 | 6.13 | espérance -0.03 ; PF 0.97 < 1 |
| VOLATILITY_COMPRESSION | compression_40_ratio0.7_break30_stop1.5_rr2.5 | AVOID | 10 | 2 | 50.0% | 1.25 | n/a | 0.00 | échantillon < 8 trades ; setup non prioritaire |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.5 | AVOID | 7 | 20 | 20.0% | -0.12 | 0.87 | 4.00 | espérance -0.12 ; PF 0.87 < 1 |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.5 | AVOID | 7 | 17 | 17.6% | -0.16 | 0.76 | 3.00 | espérance -0.16 ; PF 0.76 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop1.0 | AVOID | 7 | 21 | 14.3% | -0.13 | 0.62 | 2.32 | espérance -0.13 ; PF 0.62 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop1.0 | AVOID | 7 | 21 | 14.3% | -0.13 | 0.62 | 2.32 | espérance -0.13 ; PF 0.62 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop1.0 | AVOID | 7 | 19 | 15.8% | -0.04 | 0.85 | 2.00 | espérance -0.04 ; PF 0.85 < 1 |
| MEAN_REVERSION | meanrev_rsi30_dist7_stop1.5_rr1.5 | AVOID | 0 | 4 | 25.0% | 0.12 | 1.50 | 1.00 | échantillon < 8 trades ; setup non prioritaire |
| VOLATILITY_COMPRESSION | compression_20_ratio0.65_break20_stop1_rr2 | AVOID | 0 | 2 | 0.0% | -0.50 | 0.00 | 1.00 | échantillon < 8 trades ; setup non prioritaire |
| VOLATILITY_COMPRESSION | compression_20_ratio0.75_break20_stop1_rr2 | AVOID | 0 | 4 | 25.0% | 0.25 | 0.00 | 1.00 | échantillon < 8 trades ; setup non prioritaire |

### SMCI

| Setup | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD | Raison |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | STRONG | 100 | 61 | 60.7% | 1.35 | 2.33 | 10.53 | variante exploitable |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | STRONG | 95 | 82 | 57.3% | 1.07 | 2.29 | 17.91 | variante exploitable |
| RELATIVE_STRENGTH_ROTATION | rs_60d_top5_hold10 | STRONG | 95 | 51 | 51.0% | 1.59 | 2.97 | 10.77 | variante exploitable |
| RELATIVE_STRENGTH_ROTATION | rs_20d_top5_hold5 | STRONG | 87 | 41 | 65.9% | 0.61 | 3.20 | 10.10 | variante exploitable |
| BREAKOUT_EXPANSION | breakout_h20_vol1.5_stop1_rr2 | STRONG | 75 | 25 | 52.0% | 0.68 | 3.64 | 3.00 | variante exploitable |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | OK | 65 | 30 | 36.7% | 0.58 | 2.89 | 2.00 | — |
| BREAKOUT_EXPANSION | breakout_h50_vol1.5_stop1.5_rr2.5 | OK | 62 | 22 | 36.4% | 0.55 | 2.90 | 3.00 | — |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | OK | 55 | 36 | 44.4% | 0.47 | 3.11 | 5.00 | — |
| MEAN_REVERSION | meanrev_rsi35_dist4_stop1_rr1.2 | WEAK | 35 | 35 | 42.9% | 0.17 | 1.20 | 6.00 | setup non prioritaire |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.1 | AVOID | 33 | 34 | 17.6% | -0.09 | 1.69 | 11.00 | espérance -0.09 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | AVOID | 32 | 66 | 18.2% | -0.07 | 1.30 | 14.00 | espérance -0.07 |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | AVOID | 25 | 37 | 16.2% | -0.16 | 1.23 | 13.00 | espérance -0.16 |
| PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | AVOID | 25 | 70 | 18.6% | -0.08 | 1.10 | 17.02 | espérance -0.08 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | AVOID | 20 | 69 | 15.9% | -0.30 | 0.78 | 18.45 | espérance -0.30 ; PF 0.78 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | AVOID | 20 | 73 | 16.4% | -0.16 | 0.99 | 17.00 | espérance -0.16 ; PF 0.99 < 1 |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | AVOID | 18 | 84 | 15.5% | -0.24 | 0.87 | 22.54 | espérance -0.24 ; PF 0.87 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | AVOID | 18 | 62 | 12.9% | -0.36 | 0.65 | 17.14 | espérance -0.36 ; PF 0.65 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.5 | AVOID | 18 | 57 | 14.0% | -0.30 | 0.72 | 14.14 | espérance -0.30 ; PF 0.72 < 1 |
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | AVOID | 15 | 39 | 15.4% | -0.21 | 1.15 | 14.00 | espérance -0.21 |
| VOLATILITY_COMPRESSION | compression_20_ratio0.65_break20_stop1_rr2 | AVOID | 15 | 1 | 100.0% | 2.00 | n/a | 0.00 | échantillon < 8 trades ; setup non prioritaire |
| MEAN_REVERSION | meanrev_rsi30_dist5_stop1_rr1.2 | AVOID | 10 | 25 | 32.0% | -0.06 | 0.78 | 6.00 | espérance -0.06 ; PF 0.78 < 1 ; setup non prioritaire |
| MEAN_REVERSION | meanrev_rsi30_dist7_stop1.5_rr1.5 | AVOID | 10 | 25 | 16.0% | -0.08 | 0.56 | 7.00 | espérance -0.08 ; PF 0.56 < 1 ; setup non prioritaire |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.5 | AVOID | 10 | 33 | 12.1% | -0.38 | 0.83 | 12.00 | espérance -0.38 ; PF 0.83 < 1 |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.5 | AVOID | 10 | 31 | 12.9% | -0.34 | 0.88 | 10.00 | espérance -0.34 ; PF 0.88 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop1.0 | AVOID | 10 | 30 | 6.7% | -0.12 | 0.38 | 5.00 | espérance -0.12 ; PF 0.38 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop1.0 | AVOID | 10 | 29 | 6.9% | -0.10 | 0.41 | 4.00 | espérance -0.10 ; PF 0.41 < 1 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop1.0 | AVOID | 10 | 29 | 6.9% | -0.10 | 0.41 | 4.00 | espérance -0.10 ; PF 0.41 < 1 |
| VOLATILITY_COMPRESSION | compression_20_ratio0.75_break20_stop1_rr2 | AVOID | 10 | 4 | 50.0% | 0.50 | 0.00 | 2.00 | échantillon < 8 trades ; setup non prioritaire |

### BTC

| Setup | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD | Raison |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | OK | 92 | 20 | 70.0% | 1.21 | 2.90 | 2.69 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | STRONG | 80 | 51 | 25.5% | 0.65 | 2.18 | 5.00 | variante exploitable |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | STRONG | 78 | 66 | 27.3% | 0.55 | 4.40 | 6.00 | variante exploitable |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | OK | 71 | 14 | 57.1% | 0.74 | 1.82 | 1.63 | — |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | OK | 68 | 100 | 30.0% | 0.41 | 2.19 | 10.99 | — |
| RELATIVE_STRENGTH_ROTATION | rs_20d_top5_hold5 | OK | 65 | 12 | 66.7% | 0.35 | 8.34 | 1.48 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | OK | 63 | 34 | 29.4% | 0.64 | 6.94 | 6.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | OK | 62 | 39 | 23.1% | 0.24 | 2.35 | 3.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.1 | OK | 60 | 26 | 26.9% | 0.67 | 1.62 | 5.00 | — |
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | OK | 58 | 51 | 31.4% | 0.47 | 3.16 | 10.99 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.5 | OK | 57 | 36 | 22.2% | 0.25 | 1.62 | 3.00 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.5 | WEAK | 50 | 20 | 25.0% | 0.32 | 3.01 | 3.00 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | WEAK | 48 | 60 | 23.3% | 0.05 | 1.64 | 9.00 | — |
| VOLATILITY_COMPRESSION | compression_20_ratio0.75_break20_stop1_rr2 | WEAK | 48 | 6 | 66.7% | 1.00 | 6.67 | 1.00 | échantillon < 8 trades ; setup non prioritaire |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.5 | WEAK | 37 | 18 | 22.2% | 0.28 | 1.42 | 3.00 | — |
| BREAKOUT_EXPANSION | breakout_h20_vol1.5_stop1_rr2 | WEAK | 35 | 40 | 22.5% | 0.07 | 1.43 | 4.00 | — |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | AVOID | 31 | 61 | 23.0% | 0.05 | 1.16 | 7.00 | — |
| BREAKOUT_EXPANSION | breakout_h50_vol1.5_stop1.5_rr2.5 | AVOID | 28 | 30 | 16.7% | 0.05 | 1.13 | 3.00 | — |
| MEAN_REVERSION | meanrev_rsi35_dist4_stop1_rr1.2 | AVOID | 21 | 33 | 42.4% | 0.14 | 0.90 | 6.00 | PF 0.90 < 1 ; setup non prioritaire |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop1.0 | AVOID | 18 | 7 | 57.1% | 0.99 | 0.00 | 0.00 | échantillon < 8 trades |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop1.0 | AVOID | 18 | 7 | 57.1% | 0.99 | 0.00 | 0.00 | échantillon < 8 trades |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop1.0 | AVOID | 18 | 7 | 57.1% | 0.99 | 0.00 | 0.00 | échantillon < 8 trades |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | AVOID | 15 | 43 | 16.3% | -0.01 | 1.16 | 6.00 | espérance -0.01 |
| PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | AVOID | 15 | 63 | 23.8% | -0.10 | 0.90 | 8.44 | espérance -0.10 ; PF 0.90 < 1 |
| VOLATILITY_COMPRESSION | compression_20_ratio0.65_break20_stop1_rr2 | AVOID | 10 | 2 | 50.0% | 0.50 | 0.00 | 1.00 | échantillon < 8 trades ; setup non prioritaire |
| MEAN_REVERSION | meanrev_rsi30_dist5_stop1_rr1.2 | AVOID | 7 | 16 | 31.3% | -0.00 | 0.58 | 5.00 | espérance -0.00 ; PF 0.58 < 1 ; setup non prioritaire |
| MEAN_REVERSION | meanrev_rsi30_dist7_stop1.5_rr1.5 | AVOID | 7 | 16 | 18.8% | -0.03 | 0.33 | 4.00 | espérance -0.03 ; PF 0.33 < 1 ; setup non prioritaire |
| RELATIVE_STRENGTH_ROTATION | rs_60d_top5_hold10 | AVOID | 3 | 9 | 44.4% | -0.41 | 0.99 | 4.41 | PF 0.99 < 1 |
| VOLATILITY_COMPRESSION | compression_40_ratio0.7_break30_stop1.5_rr2.5 | AVOID | 0 | 3 | 0.0% | -1.00 | 0.00 | 3.00 | échantillon < 8 trades ; setup non prioritaire |

### SOL

| Setup | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD | Raison |
|---|---|---|---:|---:|---:|---:|---:|---:|---|
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | STRONG | 95 | 56 | 57.1% | 4.09 | 6.95 | 10.17 | variante exploitable |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | STRONG | 95 | 58 | 58.6% | 3.87 | 9.31 | 7.02 | variante exploitable |
| RELATIVE_STRENGTH_ROTATION | rs_20d_top5_hold5 | STRONG | 85 | 49 | 55.1% | 1.39 | 8.62 | 7.14 | variante exploitable |
| RELATIVE_STRENGTH_ROTATION | rs_60d_top5_hold10 | STRONG | 85 | 49 | 55.1% | 1.92 | 2.84 | 15.17 | variante exploitable |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | OK | 65 | 44 | 34.1% | 0.51 | 3.27 | 3.00 | — |
| BREAKOUT_EXPANSION | breakout_h50_vol1.5_stop1.5_rr2.5 | OK | 63 | 36 | 36.1% | 0.57 | 4.13 | 2.00 | — |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | OK | 60 | 60 | 41.7% | 0.45 | 2.65 | 4.00 | — |
| MEAN_REVERSION | meanrev_rsi35_dist4_stop1_rr1.2 | OK | 60 | 34 | 52.9% | 0.31 | 1.50 | 4.00 | setup non prioritaire |
| PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | OK | 57 | 69 | 30.4% | 0.31 | 1.83 | 11.29 | — |
| BREAKOUT_EXPANSION | breakout_h20_vol1.5_stop1_rr2 | OK | 55 | 45 | 42.2% | 0.47 | 2.92 | 3.00 | — |
| MEAN_REVERSION | meanrev_rsi30_dist5_stop1_rr1.2 | WEAK | 53 | 14 | 50.0% | 0.39 | 2.20 | 1.00 | setup non prioritaire |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | WEAK | 50 | 80 | 28.7% | 0.20 | 1.60 | 14.29 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | WEAK | 46 | 71 | 26.8% | 0.15 | 1.58 | 13.29 | — |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | WEAK | 46 | 70 | 25.7% | 0.12 | 1.55 | 13.29 | — |
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | WEAK | 45 | 40 | 30.0% | 0.23 | 1.96 | 12.29 | — |
| MEAN_REVERSION | meanrev_rsi30_dist7_stop1.5_rr1.5 | WEAK | 43 | 14 | 35.7% | 0.32 | 2.13 | 1.00 | setup non prioritaire |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | WEAK | 38 | 36 | 27.8% | 0.17 | 1.96 | 11.29 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.1 | WEAK | 38 | 35 | 25.7% | 0.12 | 1.92 | 11.29 | — |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.5 | AVOID | 30 | 28 | 21.4% | -0.15 | 1.56 | 9.00 | espérance -0.15 |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.5 | AVOID | 30 | 28 | 21.4% | -0.15 | 1.56 | 9.00 | espérance -0.15 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | AVOID | 30 | 61 | 24.6% | -0.08 | 1.24 | 12.00 | espérance -0.08 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | AVOID | 30 | 56 | 23.2% | -0.11 | 1.22 | 11.00 | espérance -0.11 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.5 | AVOID | 30 | 56 | 23.2% | -0.11 | 1.22 | 11.00 | espérance -0.11 |
| VOLATILITY_COMPRESSION | compression_20_ratio0.75_break20_stop1_rr2 | AVOID | 26 | 14 | 35.7% | 0.14 | 1.26 | 4.00 | setup non prioritaire |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop1.0 | AVOID | 22 | 35 | 17.1% | -0.20 | 1.25 | 7.00 | espérance -0.20 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop1.0 | AVOID | 22 | 35 | 17.1% | -0.20 | 1.25 | 7.00 | espérance -0.20 |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop1.0 | AVOID | 15 | 37 | 16.2% | -0.25 | 1.17 | 8.00 | espérance -0.25 |
| VOLATILITY_COMPRESSION | compression_40_ratio0.7_break30_stop1.5_rr2.5 | AVOID | 15 | 5 | 80.0% | 2.00 | n/a | 0.00 | échantillon < 8 trades ; setup non prioritaire |
| VOLATILITY_COMPRESSION | compression_20_ratio0.65_break20_stop1_rr2 | AVOID | 0 | 7 | 28.6% | -0.14 | 0.93 | 4.00 | échantillon < 8 trades ; PF 0.93 < 1 ; setup non prioritaire |

## 6. Limites de fiabilité

- **Variantes nommées différemment selon la source** : `pullback_rsi42_58_chg20_5_stop0.1` (multi-setup-grid) et `rsi42_58_chg20_5_stop0.1` (pullback-grid + walk-forward) sont sémantiquement proches mais nommées différemment. Pas de fusion automatique — chaque label est traité comme une variante distincte pour ne pas inventer une équivalence non vérifiée.
- **UNKNOWN_VARIANT** : 8 records (results-pullback-2025.json) n'exposent pas de nom de variante. Comptés sous `UNKNOWN_VARIANT`, exclus des sections "meilleures variantes" et "à abandonner".
- **Échantillons faibles** : une variante avec < 8 trades reçoit une pénalité de -25. Les cellules low-confidence (< 15 trades) sont marquées MEDIUM/LOW pour rappel.
- **Régime** : la pénalité RISK_OFF n'est appliquée qu'à `RELATIVE_STRENGTH_ROTATION` (seul setup où on dispose des deux modes ALL_REGIMES / NO_RISK_OFF).
- **Pas d'allocation** : cette matrice dit quoi trader, pas combien. La sizing reste à concevoir en fonction du tier (STRONG / OK / WEAK) et du contexte régime.
- **Pas de walk-forward strict** : les variantes sont scorées sur l'ensemble des années disponibles. Une variante peut paraître STRONG sur l'historique tout en surajustant — c'est précisément ce que la priorité #2 de SESSION.md adresse (Walk-forward réel).
