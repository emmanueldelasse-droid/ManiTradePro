# Asset × Setup Matrix — ManiTradePro

> Généré le 2026-05-18T07:38:39.479Z par `tools/backtests/asset-setup-matrix-v1.mjs`.

## 1. Synthèse globale

- Actifs analysés : **181**
- Cellules actif × setup : **744**
- Setups couverts : PULLBACK_MOMENTUM, BREAKOUT_EXPANSION, RELATIVE_STRENGTH_ROTATION, MEAN_REVERSION, VOLATILITY_COMPRESSION

Répartition globale des cellules :

| Tier | Nombre |
|---|---:|
| STRONG | 70 |
| OK | 104 |
| WEAK | 109 |
| AVOID | 461 |

Par setup :

| Setup | STRONG | OK | WEAK | AVOID |
|---|---:|---:|---:|---:|
| PULLBACK_MOMENTUM | 48 | 46 | 26 | 61 |
| BREAKOUT_EXPANSION | 0 | 14 | 31 | 113 |
| RELATIVE_STRENGTH_ROTATION | 21 | 12 | 15 | 76 |
| MEAN_REVERSION | 0 | 26 | 26 | 105 |
| VOLATILITY_COMPRESSION | 1 | 6 | 11 | 106 |

## 2. Top actifs par setup

### PULLBACK_MOMENTUM

| Symbole | Tier | Score | Trades | Winrate | Expectancy | PF | TotalR/PnL | Drawdown |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| SOXL | STRONG | 100 | 318 | 75.5% | 2.03 | 8.46 | 495.29 | 3.00 |
| VRNS | STRONG | 100 | 834 | 62.5% | 1.68 | 7.78 | 1017.96 | 6.00 |
| ANET | STRONG | 95 | 473 | 54.1% | 1.16 | 4.94 | 546.95 | 7.11 |
| CAMT | STRONG | 95 | 509 | 54.0% | 1.35 | 6.29 | 514.99 | 6.00 |
| CRWD | STRONG | 95 | 846 | 54.4% | 1.38 | 5.51 | 871.74 | 8.00 |
| PLTR | STRONG | 95 | 436 | 56.0% | 1.56 | 6.62 | 520.06 | 5.00 |
| PSI | STRONG | 95 | 749 | 52.2% | 2.25 | 6.06 | 1277.20 | 6.00 |
| SOXQ | STRONG | 95 | 860 | 57.6% | 1.97 | 9.63 | 1278.36 | 4.00 |
| SOXX | STRONG | 95 | 638 | 55.5% | 2.18 | 6.14 | 1029.84 | 6.00 |
| XSD | STRONG | 95 | 530 | 52.8% | 1.28 | 4.27 | 525.09 | 6.00 |

### BREAKOUT_EXPANSION

| Symbole | Tier | Score | Trades | Winrate | Expectancy | PF | TotalR/PnL | Drawdown |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| SMCI | OK | 70 | 113 | 42.5% | 0.56 | 3.13 | n/a | 5.00 |
| APP | OK | 60 | 101 | 32.7% | 0.42 | 2.88 | n/a | 5.00 |
| GLD | OK | 60 | 223 | 40.8% | 0.45 | 2.72 | n/a | 9.00 |
| NVDA | OK | 60 | 74 | 43.2% | 0.53 | 3.78 | n/a | 3.00 |
| SOL | OK | 60 | 185 | 38.9% | 0.49 | 3.15 | n/a | 4.00 |
| AVGO | OK | 58 | 100 | 30.0% | 0.31 | 2.10 | n/a | 3.00 |
| IGV | OK | 58 | 22 | 45.5% | 0.79 | 3.89 | n/a | 1.00 |
| AMD | OK | 55 | 89 | 36.0% | 0.44 | 2.86 | n/a | 5.00 |
| COIN | OK | 55 | 84 | 39.3% | 0.46 | 2.31 | n/a | 6.00 |
| DUOL | OK | 55 | 80 | 26.3% | 0.24 | 2.14 | n/a | 3.00 |

### RELATIVE_STRENGTH_ROTATION

| Symbole | Tier | Score | Trades | Winrate | Expectancy | PF | TotalR/PnL | Drawdown |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| APP | STRONG | 100 | 255 | 64.3% | 1.84 | 5.78 | 468.31 | 15.39 |
| AVAX | STRONG | 98 | 153 | 62.7% | 2.79 | 5.65 | 427.54 | 11.00 |
| PLTR | STRONG | 98 | 198 | 71.2% | 1.87 | 6.11 | 370.83 | 13.62 |
| SMCI | STRONG | 95 | 235 | 58.3% | 1.18 | 2.61 | 277.10 | 17.91 |
| SOL | STRONG | 95 | 212 | 56.6% | 2.90 | 7.01 | 615.53 | 15.17 |
| AEHR | STRONG | 93 | 262 | 53.8% | 1.54 | 2.24 | 403.38 | 21.74 |
| NBIS | STRONG | 93 | 88 | 62.5% | 1.77 | 2.86 | 155.92 | 16.10 |
| FTNT | STRONG | 92 | 49 | 65.3% | 1.20 | 21.83 | 58.74 | 1.51 |
| NFLX | STRONG | 90 | 51 | 76.5% | 0.88 | 7.81 | 45.05 | 5.19 |
| ALGM | STRONG | 88 | 56 | 66.1% | 0.63 | 3.81 | 35.38 | 7.60 |

### MEAN_REVERSION
_(setup non prioritaire — à utiliser avec parcimonie)_

| Symbole | Tier | Score | Trades | Winrate | Expectancy | PF | TotalR/PnL | Drawdown |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| TENB | OK | 71 | 21 | 66.7% | 0.58 | 2.23 | n/a | 1.00 |
| TTWO | OK | 68 | 25 | 64.0% | 0.52 | 3.32 | n/a | 3.00 |
| ESTC | OK | 67 | 46 | 54.3% | 0.59 | 1.91 | n/a | 2.00 |
| SMH | OK | 63 | 21 | 66.7% | 0.77 | 1.80 | n/a | 1.00 |
| ACLS | OK | 62 | 31 | 58.1% | 0.47 | 2.61 | n/a | 2.00 |
| AMD | OK | 62 | 30 | 50.0% | 0.35 | 2.10 | n/a | 2.00 |
| AMKR | OK | 62 | 39 | 53.8% | 0.34 | 2.84 | n/a | 5.00 |
| PDD | OK | 62 | 47 | 53.2% | 0.41 | 2.99 | n/a | 2.00 |
| AKAM | OK | 60 | 56 | 51.8% | 0.46 | 1.54 | n/a | 2.00 |
| MSTR | OK | 60 | 74 | 54.1% | 0.50 | 5.00 | n/a | 5.00 |

### VOLATILITY_COMPRESSION
_(setup non prioritaire — à utiliser avec parcimonie)_

| Symbole | Tier | Score | Trades | Winrate | Expectancy | PF | TotalR/PnL | Drawdown |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| BNB | STRONG | 82 | 30 | 60.0% | 1.00 | 4.50 | n/a | 1.00 |
| JPM | OK | 72 | 33 | 54.5% | 0.74 | 2.04 | n/a | 4.00 |
| MSFT | OK | 66 | 21 | 52.4% | 0.71 | 3.95 | n/a | 2.00 |

## 3. Actifs ELITE/CORE mais faibles sur un setup donné

Ces actifs ont une bonne note globale mais sont à exclure / réduire sur le setup concerné :

| Symbole | Tier global | Setup | Cell tier | Score | Trades | Expectancy | PF | Raison |
|---|---|---|---|---:|---:|---:|---:|---|
| GTLB | CORE | RELATIVE_STRENGTH_ROTATION | AVOID | 0 | 36 | -0.86 | 0.36 | performance dégradée par RISK_OFF ; espérance -0.86 ; PF 0.36 < 1 |
| PANW | CORE | RELATIVE_STRENGTH_ROTATION | AVOID | 0 | 22 | -1.27 | 0.86 | performance dégradée par RISK_OFF ; espérance -1.27 ; PF 0.86 < 1 |
| FTNT | ELITE | BREAKOUT_EXPANSION | AVOID | 3 | 20 | -0.60 | 0.00 | espérance -0.60 |
| NVMI | CORE | RELATIVE_STRENGTH_ROTATION | AVOID | 3 | 20 | -2.44 | 0.09 | espérance -2.44 ; PF 0.09 < 1 |
| ROKU | CORE | RELATIVE_STRENGTH_ROTATION | AVOID | 3 | 20 | -0.97 | 0.24 | espérance -0.97 ; PF 0.24 < 1 |
| TENB | CORE | BREAKOUT_EXPANSION | AVOID | 3 | 20 | -1.00 | 0.00 | espérance -1.00 |
| TER | CORE | BREAKOUT_EXPANSION | AVOID | 3 | 27 | -0.31 | 0.43 | espérance -0.31 ; PF 0.43 < 1 |
| SLAB | CORE | BREAKOUT_EXPANSION | AVOID | 6 | 25 | -0.08 | 0.72 | espérance -0.08 ; PF 0.72 < 1 |
| AMZN | CORE | BREAKOUT_EXPANSION | AVOID | 7 | 43 | -0.33 | 0.68 | espérance -0.33 ; PF 0.68 < 1 |
| MA | CORE | BREAKOUT_EXPANSION | AVOID | 7 | 47 | -0.45 | 0.28 | espérance -0.45 ; PF 0.28 < 1 |
| MCHP | CORE | BREAKOUT_EXPANSION | AVOID | 7 | 37 | -0.20 | 0.83 | espérance -0.20 ; PF 0.83 < 1 |
| MSFT | CORE | BREAKOUT_EXPANSION | AVOID | 7 | 49 | -0.39 | 0.43 | espérance -0.39 ; PF 0.43 < 1 |
| PANW | CORE | BREAKOUT_EXPANSION | AVOID | 7 | 46 | -0.50 | 0.35 | espérance -0.50 ; PF 0.35 < 1 |
| SHOP | CORE | RELATIVE_STRENGTH_ROTATION | AVOID | 7 | 45 | -0.37 | 0.66 | espérance -0.37 ; PF 0.66 < 1 |
| SPY | CORE | BREAKOUT_EXPANSION | AVOID | 7 | 36 | -0.11 | 0.74 | espérance -0.11 ; PF 0.74 < 1 |
| STM | CORE | BREAKOUT_EXPANSION | AVOID | 7 | 40 | -0.20 | 1.00 | espérance -0.20 ; PF 1.00 < 1 |
| TYL | CORE | BREAKOUT_EXPANSION | AVOID | 7 | 34 | -0.24 | 0.59 | espérance -0.24 ; PF 0.59 < 1 |
| WCLD | CORE | BREAKOUT_EXPANSION | AVOID | 7 | 37 | -0.26 | 0.85 | espérance -0.26 ; PF 0.85 < 1 |
| SOXL | ELITE | BREAKOUT_EXPANSION | AVOID | 8 | 22 | -0.00 | 1.11 | espérance -0.00 |
| AEHR | ELITE | BREAKOUT_EXPANSION | AVOID | 10 | 71 | -0.34 | 0.44 | espérance -0.34 ; PF 0.44 < 1 |
| AIR | CORE | BREAKOUT_EXPANSION | AVOID | 10 | 65 | -0.39 | 0.65 | espérance -0.39 ; PF 0.65 < 1 |
| AMAT | CORE | BREAKOUT_EXPANSION | AVOID | 10 | 57 | -0.65 | 0.15 | espérance -0.65 ; PF 0.15 < 1 |
| AXP | CORE | BREAKOUT_EXPANSION | AVOID | 10 | 69 | -0.35 | 0.39 | espérance -0.35 ; PF 0.39 < 1 |
| CIBR | CORE | BREAKOUT_EXPANSION | AVOID | 10 | 88 | -0.32 | 0.60 | espérance -0.32 ; PF 0.60 < 1 |
| CRWD | ELITE | BREAKOUT_EXPANSION | AVOID | 10 | 78 | -0.15 | 0.72 | espérance -0.15 ; PF 0.72 < 1 |
| CYBR | CORE | BREAKOUT_EXPANSION | AVOID | 10 | 59 | -0.22 | 0.59 | espérance -0.22 ; PF 0.59 < 1 |
| ETN | CORE | BREAKOUT_EXPANSION | AVOID | 10 | 81 | -0.08 | 0.89 | espérance -0.08 ; PF 0.89 < 1 |
| FICO | ELITE | BREAKOUT_EXPANSION | AVOID | 10 | 76 | -0.18 | 0.62 | espérance -0.18 ; PF 0.62 < 1 |
| FTEC | CORE | BREAKOUT_EXPANSION | AVOID | 10 | 57 | -0.35 | 0.39 | espérance -0.35 ; PF 0.39 < 1 |
| HACK | CORE | BREAKOUT_EXPANSION | AVOID | 10 | 76 | -0.30 | 0.42 | espérance -0.30 ; PF 0.42 < 1 |
| MELI | CORE | BREAKOUT_EXPANSION | AVOID | 10 | 63 | -0.27 | 0.43 | espérance -0.27 ; PF 0.43 < 1 |
| META | ELITE | BREAKOUT_EXPANSION | AVOID | 10 | 76 | -0.22 | 0.66 | espérance -0.22 ; PF 0.66 < 1 |
| MPWR | CORE | BREAKOUT_EXPANSION | AVOID | 10 | 50 | -0.52 | 0.14 | espérance -0.52 ; PF 0.14 < 1 |
| PDD | CORE | BREAKOUT_EXPANSION | AVOID | 10 | 79 | -0.06 | 0.80 | espérance -0.06 ; PF 0.80 < 1 |
| ROM | CORE | BREAKOUT_EXPANSION | AVOID | 10 | 76 | -0.66 | 0.09 | espérance -0.66 ; PF 0.09 < 1 |
| VGT | CORE | BREAKOUT_EXPANSION | AVOID | 10 | 63 | -0.09 | 0.97 | espérance -0.09 ; PF 0.97 < 1 |
| XSD | ELITE | BREAKOUT_EXPANSION | AVOID | 10 | 58 | -0.19 | 0.71 | espérance -0.19 ; PF 0.71 < 1 |
| PSI | ELITE | BREAKOUT_EXPANSION | AVOID | 12 | 34 | -0.06 | 1.02 | espérance -0.06 |
| AIR | CORE | PULLBACK_MOMENTUM | AVOID | 15 | 563 | -0.10 | 0.95 | espérance -0.10 ; PF 0.95 < 1 |
| APLD | CORE | PULLBACK_MOMENTUM | AVOID | 15 | 321 | -0.12 | 0.86 | espérance -0.12 ; PF 0.86 < 1 |
| AVAX | ELITE | PULLBACK_MOMENTUM | AVOID | 15 | 420 | -0.61 | 0.21 | espérance -0.61 ; PF 0.21 < 1 |
| CIBR | CORE | PULLBACK_MOMENTUM | AVOID | 15 | 729 | -0.16 | 0.87 | espérance -0.16 ; PF 0.87 < 1 |
| LINK | CORE | PULLBACK_MOMENTUM | AVOID | 15 | 485 | -0.29 | 0.63 | espérance -0.29 ; PF 0.63 < 1 |
| MSFT | CORE | PULLBACK_MOMENTUM | AVOID | 15 | 706 | -0.29 | 0.79 | espérance -0.29 ; PF 0.79 < 1 |
| ORCL | CORE | BREAKOUT_EXPANSION | AVOID | 15 | 108 | -0.05 | 0.95 | espérance -0.05 ; PF 0.95 < 1 |
| SOXQ | ELITE | BREAKOUT_EXPANSION | AVOID | 15 | 108 | -0.29 | 0.54 | espérance -0.29 ; PF 0.54 < 1 |
| SOXX | ELITE | BREAKOUT_EXPANSION | AVOID | 15 | 60 | -0.08 | 1.17 | espérance -0.08 |
| UPST | ELITE | PULLBACK_MOMENTUM | AVOID | 15 | 252 | -0.13 | 0.85 | espérance -0.13 ; PF 0.85 < 1 |
| VRNS | ELITE | BREAKOUT_EXPANSION | AVOID | 15 | 63 | -0.35 | 1.08 | espérance -0.35 |
| XLK | CORE | BREAKOUT_EXPANSION | AVOID | 15 | 58 | -0.03 | 0.50 | espérance -0.03 ; PF 0.50 < 1 |
| AEHR | ELITE | PULLBACK_MOMENTUM | AVOID | 18 | 205 | -0.17 | 0.64 | espérance -0.17 ; PF 0.64 < 1 |
| ASML | CORE | BREAKOUT_EXPANSION | AVOID | 18 | 53 | 0.08 | 0.52 | PF 0.52 < 1 |
| SHOP | CORE | BREAKOUT_EXPANSION | AVOID | 18 | 54 | -0.21 | 1.08 | espérance -0.21 |
| SMCI | ELITE | PULLBACK_MOMENTUM | AVOID | 18 | 743 | -0.20 | 0.92 | espérance -0.20 ; PF 0.92 < 1 |
| TTWO | CORE | BREAKOUT_EXPANSION | AVOID | 18 | 51 | 0.04 | 0.92 | PF 0.92 < 1 |
| GTLB | CORE | PULLBACK_MOMENTUM | AVOID | 20 | 401 | -0.05 | 0.94 | espérance -0.05 ; PF 0.94 < 1 |
| LIN | CORE | BREAKOUT_EXPANSION | AVOID | 20 | 38 | 0.03 | 1.13 | — |
| TENB | CORE | PULLBACK_MOMENTUM | AVOID | 20 | 674 | -0.03 | 1.14 | espérance -0.03 |
| TSM | CORE | BREAKOUT_EXPANSION | AVOID | 20 | 109 | -0.12 | 1.04 | espérance -0.12 |
| EA | CORE | BREAKOUT_EXPANSION | AVOID | 22 | 57 | -0.05 | 1.23 | espérance -0.05 |
| GTLB | CORE | BREAKOUT_EXPANSION | AVOID | 22 | 42 | 0.50 | 0.23 | PF 0.23 < 1 |
| NBIS | ELITE | PULLBACK_MOMENTUM | AVOID | 23 | 156 | -0.12 | 1.06 | espérance -0.12 |
| MSTR | CORE | PULLBACK_MOMENTUM | AVOID | 24 | 278 | -0.01 | 1.19 | espérance -0.01 |
| RMBS | CORE | BREAKOUT_EXPANSION | AVOID | 27 | 147 | -0.07 | 1.27 | espérance -0.07 |
| LRCX | ELITE | BREAKOUT_EXPANSION | AVOID | 28 | 77 | 0.03 | 1.17 | — |
| MPWR | CORE | RELATIVE_STRENGTH_ROTATION | AVOID | 28 | 25 | -0.35 | 2.21 | espérance -0.35 |
| NFLX | ELITE | BREAKOUT_EXPANSION | AVOID | 28 | 79 | 0.04 | 1.03 | — |
| ACLS | ELITE | BREAKOUT_EXPANSION | AVOID | 30 | 91 | -0.07 | 1.52 | espérance -0.07 |
| AVAX | ELITE | BREAKOUT_EXPANSION | AVOID | 30 | 97 | 0.01 | 1.28 | — |
| NVMI | CORE | BREAKOUT_EXPANSION | AVOID | 30 | 91 | 0.03 | 1.44 | — |
| APP | ELITE | PULLBACK_MOMENTUM | AVOID | 32 | 567 | 0.02 | 1.05 | — |
| PDD | CORE | PULLBACK_MOMENTUM | AVOID | 32 | 649 | 0.05 | 1.16 | — |
| KLAC | CORE | BREAKOUT_EXPANSION | AVOID | 33 | 56 | 0.08 | 1.34 | — |
| FTNT | ELITE | PULLBACK_MOMENTUM | AVOID | 34 | 564 | -0.01 | 1.26 | espérance -0.01 |
| LINK | CORE | BREAKOUT_EXPANSION | WEAK | 35 | 79 | 0.18 | 1.24 | — |
| PH | ELITE | BREAKOUT_EXPANSION | WEAK | 35 | 73 | 0.03 | 1.47 | — |
| PLTR | ELITE | BREAKOUT_EXPANSION | WEAK | 35 | 128 | 0.11 | 1.47 | — |
| APLD | CORE | BREAKOUT_EXPANSION | WEAK | 38 | 82 | 0.04 | 1.60 | — |
| BTC | ELITE | BREAKOUT_EXPANSION | WEAK | 38 | 174 | 0.04 | 1.21 | — |
| MU | CORE | BREAKOUT_EXPANSION | WEAK | 38 | 106 | 0.17 | 1.37 | — |
| SAP | CORE | BREAKOUT_EXPANSION | WEAK | 38 | 57 | 0.18 | 1.54 | — |
| BNB | ELITE | BREAKOUT_EXPANSION | WEAK | 40 | 171 | 0.10 | 1.33 | — |
| TER | CORE | RELATIVE_STRENGTH_ROTATION | AVOID | 42 | 36 | -0.12 | 2.86 | espérance -0.12 |
| SOXL | ELITE | RELATIVE_STRENGTH_ROTATION | AVOID | 45 | 134 | -0.01 | 1.84 | espérance -0.01 |
| CAMT | ELITE | BREAKOUT_EXPANSION | WEAK | 46 | 132 | 0.17 | 1.57 | — |
| ETH | CORE | BREAKOUT_EXPANSION | WEAK | 46 | 123 | 0.17 | 1.74 | — |
| IYW | CORE | BREAKOUT_EXPANSION | WEAK | 46 | 58 | 0.14 | 2.27 | — |
| SOL | ELITE | PULLBACK_MOMENTUM | WEAK | 47 | 737 | 0.04 | 1.52 | — |
| UPST | ELITE | BREAKOUT_EXPANSION | WEAK | 47 | 36 | 0.39 | 1.91 | — |
| RMBS | CORE | RELATIVE_STRENGTH_ROTATION | WEAK | 48 | 61 | 0.06 | 1.55 | — |
| TTWO | CORE | PULLBACK_MOMENTUM | WEAK | 48 | 654 | 0.17 | 1.40 | — |
| ALGM | ELITE | BREAKOUT_EXPANSION | WEAK | 50 | 47 | 0.49 | 3.64 | — |
| GOOGL | ELITE | BREAKOUT_EXPANSION | WEAK | 50 | 54 | 0.25 | 1.55 | — |
| MELI | CORE | RELATIVE_STRENGTH_ROTATION | WEAK | 50 | 37 | 0.20 | 5.51 | — |
| NVDA | CORE | RELATIVE_STRENGTH_ROTATION | AVOID | 50 | 133 | -1.38 | 5.47 | espérance -1.38 |
| CLOU | CORE | BREAKOUT_EXPANSION | WEAK | 52 | 46 | 0.39 | 2.13 | — |
| SMH | ELITE | BREAKOUT_EXPANSION | WEAK | 52 | 47 | 0.40 | 2.19 | — |
| BKNG | CORE | BREAKOUT_EXPANSION | WEAK | 53 | 59 | 0.28 | 2.31 | — |
| EA | CORE | PULLBACK_MOMENTUM | WEAK | 53 | 700 | 0.05 | 1.56 | — |
| HACK | CORE | PULLBACK_MOMENTUM | WEAK | 53 | 792 | 0.18 | 1.72 | — |
| IGV | CORE | PULLBACK_MOMENTUM | WEAK | 53 | 550 | 0.17 | 1.89 | — |
| ORCL | CORE | RELATIVE_STRENGTH_ROTATION | WEAK | 53 | 47 | 0.13 | 5.58 | — |
| VRNS | ELITE | RELATIVE_STRENGTH_ROTATION | AVOID | 55 | 28 | 0.92 | 0.99 | PF 0.99 < 1 |

## 4. Actifs BLACKLIST mais exploitables sur un setup

Ces actifs sont BLACKLIST globalement mais ont un setup où ils performent — à considérer pour un usage strictement ciblé :

| Symbole | Setup | Cell tier | Score | Trades | Expectancy | PF |
|---|---|---|---:|---:|---:|---:|
| PAYX | PULLBACK_MOMENTUM | OK | 60 | 410 | 0.20 | 1.69 |
| ZEN | PULLBACK_MOMENTUM | OK | 60 | 76 | 0.37 | 2.55 |
| ONTO | PULLBACK_MOMENTUM | OK | 56 | 682 | 0.16 | 1.67 |
| DUOL | BREAKOUT_EXPANSION | OK | 55 | 80 | 0.24 | 2.14 |
| GBPUSD | PULLBACK_MOMENTUM | OK | 55 | 553 | 0.22 | 1.45 |

## 5. Recommandations moteur

Sur la base de cette matrice, le moteur ManiTradePro devrait :

- **Autoriser un trade uniquement si la cellule (actif × setup) est STRONG ou OK** avec confiance ≥ MEDIUM.
- **Ignorer un setup pour un actif** si la cellule est WEAK ou AVOID, même si l'actif est ELITE globalement (cf. section 3).
- **Reconsidérer les actifs BLACKLIST** uniquement pour les setups où ils sortent STRONG/OK (cf. section 4) — usage ciblé, pas générique.
- **Ne pas utiliser les setups non prioritaires (MEAN_REVERSION, VOLATILITY_COMPRESSION) comme moteur principal** — les considérer comme complément, jamais comme source unique de décision.
- **Préférer NO_RISK_OFF en mode opérationnel** pour Relative Strength Rotation (cf. SETUPS_REGISTRY.md).

## 6. Matrice complète

Lignes = actifs, colonnes = setups. Chaque cellule affiche `tier (score)`. `—` = pas de données.

| Symbole | PULLBACK_MOMENTUM | BREAKOUT_EXPANSION | RELATIVE_STRENGTH_ROTATION | MEAN_REVERSION | VOLATILITY_COMPRESSION |
|---|---|---|---|---|---|
| AAPL | OK (63) | AVOID (10) | AVOID (3) | AVOID (32) | AVOID (0) |
| ABNB | OK (63) | AVOID (7) | AVOID (0) | AVOID (11) | AVOID (0) |
| ACLS | STRONG (90) | AVOID (30) | STRONG (80) | OK (62) | AVOID (0) |
| ADBE | AVOID (27) | AVOID (27) | WEAK (58) | AVOID (15) | — |
| ADI | OK (65) | AVOID (7) | AVOID (0) | AVOID (10) | AVOID (0) |
| ADSK | WEAK (53) | AVOID (7) | — | AVOID (28) | AVOID (0) |
| AEHR | AVOID (18) | AVOID (10) | STRONG (93) | WEAK (49) | AVOID (0) |
| AI | AVOID (15) | AVOID (7) | AVOID (33) | WEAK (50) | AVOID (25) |
| AIR | AVOID (15) | AVOID (10) | AVOID (0) | OK (66) | AVOID (0) |
| AKAM | OK (70) | AVOID (3) | AVOID (0) | OK (60) | AVOID (0) |
| ALGM | OK (60) | WEAK (50) | STRONG (88) | AVOID (7) | WEAK (40) |
| AMAT | STRONG (75) | AVOID (10) | WEAK (36) | AVOID (30) | AVOID (0) |
| AMD | OK (63) | OK (55) | AVOID (10) | OK (62) | AVOID (0) |
| AMKR | AVOID (43) | AVOID (26) | WEAK (39) | OK (62) | — |
| AMZN | STRONG (80) | AVOID (7) | — | WEAK (43) | AVOID (0) |
| ANET | STRONG (95) | — | — | — | — |
| APLD | AVOID (15) | WEAK (38) | STRONG (78) | AVOID (27) | AVOID (0) |
| APP | AVOID (32) | OK (60) | STRONG (100) | AVOID (28) | AVOID (0) |
| ARM | AVOID (18) | AVOID (7) | WEAK (54) | AVOID (0) | AVOID (0) |
| ASML | OK (65) | AVOID (18) | OK (58) | WEAK (37) | WEAK (53) |
| ASX | WEAK (48) | WEAK (35) | AVOID (0) | AVOID (40) | AVOID (0) |
| AVAX | AVOID (15) | AVOID (30) | STRONG (98) | AVOID (20) | AVOID (0) |
| AVGO | WEAK (45) | OK (58) | OK (62) | WEAK (50) | — |
| AXP | OK (65) | AVOID (10) | AVOID (26) | OK (65) | WEAK (46) |
| BBAI | AVOID (31) | WEAK (35) | AVOID (23) | AVOID (7) | OK (60) |
| BKNG | OK (65) | WEAK (53) | AVOID (0) | OK (65) | AVOID (0) |
| BNB | OK (68) | WEAK (40) | OK (59) | AVOID (26) | STRONG (82) |
| BOTZ | OK (60) | AVOID (10) | — | AVOID (19) | AVOID (0) |
| BTC | OK (68) | WEAK (38) | STRONG (88) | AVOID (18) | WEAK (48) |
| BUG | WEAK (42) | WEAK (43) | — | WEAK (40) | AVOID (0) |
| CAMT | STRONG (95) | WEAK (46) | STRONG (80) | AVOID (0) | — |
| CAP | AVOID (15) | AVOID (23) | — | AVOID (3) | AVOID (0) |
| CDNS | OK (58) | — | — | — | — |
| CFLT | OK (65) | — | — | — | — |
| CHKP | STRONG (75) | AVOID (10) | AVOID (0) | AVOID (8) | AVOID (0) |
| CIBR | AVOID (15) | AVOID (10) | — | OK (65) | AVOID (3) |
| CLOU | STRONG (78) | WEAK (52) | — | AVOID (3) | AVOID (0) |
| COIN | AVOID (15) | OK (55) | STRONG (75) | AVOID (11) | AVOID (0) |
| COST | OK (65) | AVOID (10) | AVOID (0) | OK (58) | AVOID (3) |
| CRM | WEAK (45) | WEAK (35) | — | AVOID (30) | — |
| CRWD | STRONG (95) | AVOID (10) | STRONG (87) | OK (55) | AVOID (0) |
| CRWV | AVOID (0) | — | WEAK (36) | — | — |
| CYBR | STRONG (80) | AVOID (10) | AVOID (0) | AVOID (11) | AVOID (0) |
| DDOG | WEAK (47) | AVOID (10) | AVOID (29) | WEAK (53) | AVOID (0) |
| DELL | STRONG (80) | — | — | — | — |
| DOCN | OK (65) | AVOID (7) | WEAK (44) | AVOID (7) | — |
| DSY | AVOID (10) | OK (60) | AVOID (0) | AVOID (12) | AVOID (0) |
| DT | OK (68) | AVOID (10) | AVOID (28) | AVOID (12) | AVOID (0) |
| DUOL | AVOID (15) | OK (55) | AVOID (22) | AVOID (7) | AVOID (0) |
| EA | WEAK (53) | AVOID (22) | AVOID (0) | OK (58) | AVOID (3) |
| ELV | AVOID (24) | AVOID (6) | AVOID (11) | AVOID (15) | AVOID (0) |
| ENTG | OK (65) | AVOID (14) | AVOID (28) | WEAK (52) | — |
| ESTC | AVOID (15) | AVOID (7) | AVOID (7) | OK (67) | AVOID (0) |
| ETH | OK (68) | WEAK (46) | OK (63) | AVOID (13) | AVOID (0) |
| ETN | STRONG (80) | AVOID (10) | AVOID (30) | OK (65) | AVOID (3) |
| EURUSD | AVOID (15) | — | — | — | — |
| FDN | WEAK (38) | WEAK (43) | — | AVOID (28) | AVOID (7) |
| FICO | STRONG (90) | AVOID (10) | STRONG (75) | AVOID (15) | AVOID (0) |
| FORM | WEAK (45) | AVOID (7) | AVOID (33) | WEAK (40) | AVOID (0) |
| FTEC | OK (68) | AVOID (10) | — | AVOID (20) | AVOID (30) |
| FTNT | AVOID (34) | AVOID (3) | STRONG (92) | AVOID (21) | — |
| GBPUSD | OK (55) | — | — | — | — |
| GEN | OK (63) | — | — | — | — |
| GLD | OK (58) | OK (60) | WEAK (53) | — | OK (60) |
| GOOGL | STRONG (85) | WEAK (50) | OK (68) | AVOID (10) | — |
| GTLB | AVOID (20) | AVOID (22) | AVOID (0) | OK (71) | AVOID (0) |
| HACK | WEAK (53) | AVOID (10) | — | WEAK (52) | AVOID (3) |
| HCP | AVOID (15) | — | — | — | — |
| HUBB | WEAK (39) | AVOID (10) | AVOID (3) | AVOID (8) | AVOID (16) |
| HUBS | OK (65) | AVOID (25) | WEAK (50) | AVOID (7) | — |
| IBIT | AVOID (18) | AVOID (7) | AVOID (31) | AVOID (0) | AVOID (0) |
| IGM | STRONG (80) | — | — | — | — |
| IGV | WEAK (53) | OK (58) | — | AVOID (10) | AVOID (0) |
| INTC | AVOID (15) | — | — | — | — |
| INTU | AVOID (15) | AVOID (7) | AVOID (0) | AVOID (11) | AVOID (0) |
| IPGP | WEAK (35) | AVOID (3) | AVOID (33) | WEAK (52) | AVOID (0) |
| IWM | AVOID (27) | WEAK (42) | — | WEAK (35) | AVOID (0) |
| IYW | STRONG (80) | WEAK (46) | — | AVOID (32) | WEAK (43) |
| JPM | OK (63) | OK (55) | AVOID (18) | OK (70) | OK (72) |
| KLAC | STRONG (80) | AVOID (33) | — | AVOID (20) | AVOID (0) |
| LIN | STRONG (80) | AVOID (20) | — | AVOID (30) | AVOID (3) |
| LINK | AVOID (15) | WEAK (35) | STRONG (75) | AVOID (27) | AVOID (0) |
| LLY | AVOID (20) | WEAK (43) | AVOID (18) | WEAK (48) | AVOID (0) |
| LRCX | OK (60) | AVOID (28) | OK (75) | WEAK (43) | — |
| LSCC | AVOID (27) | AVOID (3) | AVOID (32) | AVOID (24) | — |
| LVMH | AVOID (15) | AVOID (3) | AVOID (9) | AVOID (3) | AVOID (0) |
| MA | STRONG (80) | AVOID (7) | AVOID (0) | AVOID (25) | AVOID (0) |
| MCHP | STRONG (80) | AVOID (7) | AVOID (24) | OK (68) | — |
| MDB | AVOID (15) | AVOID (12) | AVOID (40) | WEAK (47) | AVOID (0) |
| MDY | WEAK (48) | AVOID (7) | — | AVOID (25) | AVOID (0) |
| MELI | STRONG (78) | AVOID (10) | WEAK (50) | AVOID (30) | — |
| META | OK (65) | AVOID (10) | STRONG (87) | AVOID (7) | AVOID (3) |
| MPWR | STRONG (75) | AVOID (10) | AVOID (28) | AVOID (15) | AVOID (0) |
| MRVL | AVOID (20) | AVOID (10) | AVOID (0) | AVOID (18) | WEAK (40) |
| MSCI | AVOID (23) | AVOID (3) | AVOID (50) | AVOID (11) | — |
| MSFT | AVOID (15) | AVOID (7) | — | WEAK (45) | OK (66) |
| MSTR | AVOID (24) | OK (55) | STRONG (75) | OK (60) | AVOID (0) |
| MU | OK (63) | WEAK (38) | OK (70) | AVOID (20) | AVOID (0) |
| NBIS | AVOID (23) | WEAK (50) | STRONG (93) | AVOID (20) | — |
| NESN | AVOID (20) | AVOID (0) | AVOID (30) | AVOID (11) | AVOID (0) |
| NET | AVOID (20) | AVOID (23) | WEAK (46) | AVOID (23) | WEAK (41) |
| NFLX | OK (65) | AVOID (28) | STRONG (90) | AVOID (15) | AVOID (0) |
| NOW | WEAK (42) | WEAK (43) | — | WEAK (48) | AVOID (0) |
| NVDA | STRONG (78) | OK (60) | AVOID (50) | AVOID (10) | — |
| NVMI | OK (63) | AVOID (30) | AVOID (3) | OK (71) | AVOID (0) |
| NXPI | STRONG (78) | WEAK (46) | AVOID (28) | AVOID (0) | — |
| OKTA | AVOID (15) | AVOID (3) | AVOID (7) | AVOID (22) | AVOID (0) |
| ON | OK (60) | AVOID (7) | AVOID (7) | WEAK (48) | — |
| ONTO | OK (56) | AVOID (18) | AVOID (3) | AVOID (25) | — |
| ORCL | STRONG (80) | AVOID (15) | WEAK (53) | AVOID (3) | OK (78) |
| PANW | STRONG (90) | AVOID (7) | AVOID (0) | WEAK (53) | AVOID (0) |
| PATH | STRONG (75) | — | — | — | — |
| PAYC | OK (65) | AVOID (0) | AVOID (35) | AVOID (15) | — |
| PAYX | OK (60) | — | — | — | — |
| PD | AVOID (15) | AVOID (0) | AVOID (0) | WEAK (39) | — |
| PDD | AVOID (32) | AVOID (10) | OK (68) | OK (62) | AVOID (0) |
| PH | STRONG (93) | WEAK (35) | — | AVOID (20) | AVOID (3) |
| PLTR | STRONG (95) | WEAK (35) | STRONG (98) | AVOID (19) | WEAK (50) |
| PSI | STRONG (95) | AVOID (12) | — | WEAK (50) | AVOID (0) |
| QCOM | AVOID (15) | AVOID (10) | AVOID (0) | AVOID (30) | — |
| QQQ | OK (63) | AVOID (7) | — | AVOID (20) | AVOID (7) |
| QRVO | WEAK (50) | AVOID (0) | AVOID (0) | AVOID (30) | — |
| RBRK | AVOID (10) | — | — | — | — |
| RMBS | STRONG (78) | AVOID (27) | WEAK (48) | AVOID (7) | AVOID (0) |
| RMS | AVOID (20) | WEAK (53) | AVOID (46) | AVOID (3) | AVOID (20) |
| ROKU | STRONG (80) | AVOID (3) | AVOID (3) | AVOID (15) | AVOID (0) |
| ROM | OK (68) | AVOID (10) | AVOID (23) | AVOID (7) | AVOID (34) |
| ROP | WEAK (42) | AVOID (7) | — | AVOID (14) | AVOID (0) |
| S | AVOID (20) | AVOID (0) | AVOID (3) | AVOID (19) | AVOID (0) |
| SAP | STRONG (75) | WEAK (38) | AVOID (0) | AVOID (0) | AVOID (0) |
| SE | WEAK (35) | AVOID (25) | WEAK (42) | AVOID (18) | AVOID (0) |
| SENT | STRONG (85) | — | — | — | — |
| SHOP | OK (68) | AVOID (18) | AVOID (7) | WEAK (48) | AVOID (0) |
| SIE | STRONG (78) | — | — | — | — |
| SKYY | WEAK (53) | AVOID (10) | — | AVOID (40) | AVOID (3) |
| SLAB | STRONG (83) | AVOID (6) | AVOID (0) | AVOID (24) | AVOID (0) |
| SMCI | AVOID (18) | OK (70) | STRONG (95) | AVOID (18) | AVOID (20) |
| SMH | STRONG (85) | WEAK (52) | — | OK (63) | AVOID (18) |
| SNOW | AVOID (27) | AVOID (7) | AVOID (0) | AVOID (15) | WEAK (40) |
| SNPS | OK (63) | — | — | — | — |
| SOL | WEAK (47) | OK (60) | STRONG (95) | OK (55) | AVOID (26) |
| SOUN | AVOID (15) | AVOID (15) | AVOID (35) | AVOID (20) | AVOID (6) |
| SOXL | STRONG (100) | AVOID (8) | AVOID (45) | OK (60) | AVOID (25) |
| SOXQ | STRONG (95) | AVOID (15) | — | WEAK (40) | AVOID (0) |
| SOXX | STRONG (95) | AVOID (15) | — | AVOID (10) | AVOID (0) |
| SPGI | WEAK (50) | AVOID (7) | AVOID (33) | WEAK (43) | AVOID (3) |
| SPLK | AVOID (18) | — | — | — | — |
| SPY | STRONG (85) | AVOID (7) | — | AVOID (15) | AVOID (10) |
| SPYG | STRONG (80) | — | — | — | — |
| STM | STRONG (83) | AVOID (7) | WEAK (35) | AVOID (16) | AVOID (0) |
| SWKS | OK (63) | AVOID (0) | AVOID (28) | WEAK (50) | — |
| SYNA | AVOID (15) | AVOID (3) | AVOID (12) | OK (55) | — |
| TEAM | AVOID (15) | WEAK (43) | AVOID (10) | AVOID (23) | — |
| TENB | AVOID (20) | AVOID (3) | AVOID (0) | OK (71) | — |
| TER | STRONG (80) | AVOID (3) | AVOID (42) | AVOID (10) | — |
| TLT | AVOID (15) | AVOID (0) | — | AVOID (10) | — |
| TSLA | AVOID (15) | WEAK (52) | AVOID (15) | AVOID (18) | AVOID (0) |
| TSM | OK (65) | AVOID (20) | AVOID (0) | OK (60) | AVOID (19) |
| TT | WEAK (45) | AVOID (10) | AVOID (7) | AVOID (3) | OK (58) |
| TTD | WEAK (45) | AVOID (7) | AVOID (0) | AVOID (10) | AVOID (20) |
| TTE | AVOID (15) | AVOID (7) | AVOID (22) | AVOID (20) | — |
| TTWO | WEAK (48) | AVOID (18) | OK (75) | OK (68) | AVOID (0) |
| TXN | AVOID (15) | AVOID (3) | — | AVOID (6) | AVOID (27) |
| TYL | STRONG (75) | AVOID (7) | OK (68) | AVOID (0) | AVOID (0) |
| UBER | AVOID (15) | AVOID (10) | AVOID (13) | AVOID (20) | AVOID (0) |
| UPST | AVOID (15) | WEAK (47) | STRONG (88) | AVOID (28) | AVOID (0) |
| USD | OK (63) | OK (55) | OK (56) | AVOID (18) | AVOID (0) |
| USDJPY | WEAK (48) | — | — | — | — |
| V | WEAK (48) | WEAK (40) | — | AVOID (23) | AVOID (0) |
| VGT | OK (68) | AVOID (10) | — | AVOID (20) | WEAK (38) |
| VRNS | STRONG (100) | AVOID (15) | AVOID (55) | AVOID (23) | — |
| VRTX | AVOID (15) | AVOID (10) | OK (73) | AVOID (16) | AVOID (0) |
| VUG | STRONG (80) | — | — | — | — |
| WCLD | STRONG (80) | AVOID (7) | — | AVOID (16) | — |
| WDAY | AVOID (20) | AVOID (7) | AVOID (0) | AVOID (3) | — |
| WM | OK (63) | AVOID (10) | AVOID (0) | AVOID (0) | AVOID (0) |
| XLK | OK (68) | AVOID (15) | — | AVOID (18) | AVOID (10) |
| XSD | STRONG (95) | AVOID (10) | — | AVOID (5) | AVOID (0) |
| XSW | OK (63) | — | — | — | — |
| ZEN | OK (60) | — | — | — | — |
| ZS | AVOID (15) | AVOID (10) | WEAK (52) | WEAK (35) | WEAK (50) |
