# Asset Quality Report — ManiTradePro

> Généré le 2026-05-17T22:04:42.339Z par `tools/backtests/asset-quality-engine-v1.mjs`.

## Synthèse

- Actifs analysés : **181**
- ELITE : 29
- CORE : 60
- TACTICAL : 38
- BLACKLIST : 54

## Sources lues

- `tools/backtests/results-multi-setup-grid.json`
- `tools/backtests/results-pullback-2025.json`
- `tools/backtests/results-pullback-grid-2025.json`
- `tools/backtests/results-pullback-yearly-walkforward.json`
- `tools/backtests/results-relative-strength-rotation-regime-v1.json`
- `tools/backtests/results-relative-strength-rotation-v1.json`

## ELITE — actifs majeurs (allocation forte)

| Symbole | Score | Confiance | Meilleur setup | Trades | Winrate | Expectancy | PF | TotalR | DrawDown |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|
| SOXL | 100 | HIGH | PULLBACK_MOMENTUM | 487 | 66.1% | 2.03 | 8.46 | -1.44 | 17.61 |
| APP | 98 | HIGH | RELATIVE_STRENGTH_ROTATION | 957 | 36.8% | 1.84 | 5.78 | 468.31 | 15.39 |
| VRNS | 98 | HIGH | PULLBACK_MOMENTUM | 992 | 57.8% | 1.68 | 7.78 | 25.82 | 10.90 |
| PLTR | 95 | HIGH | RELATIVE_STRENGTH_ROTATION | 782 | 54.3% | 1.87 | 6.11 | 370.83 | 13.62 |
| SOXQ | 92 | HIGH | PULLBACK_MOMENTUM | 988 | 52.5% | 1.97 | 9.63 | 1278.36 | 7.00 |
| SOXX | 92 | HIGH | PULLBACK_MOMENTUM | 750 | 50.9% | 2.18 | 6.14 | 1029.84 | 8.00 |
| CRWD | 91 | HIGH | PULLBACK_MOMENTUM | 1002 | 51.7% | 1.38 | 5.51 | 48.58 | 8.88 |
| FTNT | 91 | HIGH | RELATIVE_STRENGTH_ROTATION | 721 | 30.0% | 1.20 | 21.83 | 58.74 | 14.47 |
| META | 91 | HIGH | RELATIVE_STRENGTH_ROTATION | 1025 | 31.4% | 1.53 | 5.96 | 70.71 | 15.00 |
| PH | 91 | HIGH | PULLBACK_MOMENTUM | 520 | 46.0% | 1.30 | 4.50 | 404.22 | 6.00 |
| PSI | 91 | HIGH | PULLBACK_MOMENTUM | 838 | 50.5% | 2.25 | 6.06 | 1277.20 | 6.00 |
| BNB | 90 | HIGH | VOLATILITY_COMPRESSION | 1224 | 32.3% | 1.00 | 4.50 | 24.00 | 18.00 |
| NBIS | 90 | HIGH | RELATIVE_STRENGTH_ROTATION | 289 | 37.7% | 1.77 | 2.86 | 155.92 | 16.10 |
| SMCI | 90 | HIGH | RELATIVE_STRENGTH_ROTATION | 1181 | 27.4% | 1.18 | 2.61 | 277.10 | 22.54 |
| SOL | 90 | HIGH | RELATIVE_STRENGTH_ROTATION | 1222 | 34.0% | 2.90 | 7.01 | 615.53 | 15.17 |
| ANET | 88 | HIGH | PULLBACK_MOMENTUM | 473 | 54.1% | 1.16 | 4.94 | 546.95 | 7.11 |
| AVAX | 88 | HIGH | RELATIVE_STRENGTH_ROTATION | 808 | 23.8% | 2.79 | 5.65 | 427.54 | 14.96 |
| CAMT | 88 | HIGH | PULLBACK_MOMENTUM | 741 | 50.1% | 1.35 | 6.29 | 54.30 | 8.86 |
| XSD | 88 | HIGH | PULLBACK_MOMENTUM | 610 | 48.9% | 1.28 | 4.27 | 525.09 | 6.00 |
| FICO | 87 | HIGH | PULLBACK_MOMENTUM | 1015 | 44.6% | 1.23 | 5.45 | 43.72 | 14.14 |
| ACLS | 86 | HIGH | PULLBACK_MOMENTUM | 738 | 48.4% | 0.81 | 3.21 | 54.43 | 11.44 |
| AEHR | 86 | HIGH | RELATIVE_STRENGTH_ROTATION | 577 | 36.2% | 1.54 | 2.24 | 403.38 | 21.74 |
| UPST | 86 | HIGH | RELATIVE_STRENGTH_ROTATION | 555 | 36.0% | 1.02 | 1.85 | 229.80 | 32.80 |
| BTC | 85 | HIGH | RELATIVE_STRENGTH_ROTATION | 890 | 28.9% | 0.64 | 3.55 | 35.15 | 10.99 |
| LRCX | 84 | HIGH | RELATIVE_STRENGTH_ROTATION | 709 | 27.8% | 1.19 | 6.19 | 14.20 | 10.51 |
| ALGM | 83 | HIGH | RELATIVE_STRENGTH_ROTATION | 468 | 34.4% | 0.63 | 3.81 | 35.38 | 8.45 |
| NFLX | 83 | HIGH | RELATIVE_STRENGTH_ROTATION | 903 | 35.3% | 0.88 | 7.81 | 45.05 | 13.87 |
| SMH | 83 | HIGH | PULLBACK_MOMENTUM | 784 | 44.1% | 1.24 | 4.10 | 648.25 | 7.00 |
| GOOGL | 81 | HIGH | PULLBACK_MOMENTUM | 976 | 38.2% | 2.07 | 5.28 | 9.27 | 14.00 |

## CORE — actifs fiables (allocation normale)

| Symbole | Score | Confiance | Meilleur setup | Trades | Winrate | Expectancy | PF | TotalR | DrawDown |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|
| ORCL | 86 | HIGH | VOLATILITY_COMPRESSION | 1077 | 29.0% | 1.42 | 6.25 | 6.34 | 19.33 |
| MCHP | 83 | HIGH | MEAN_REVERSION | 531 | 30.3% | 0.83 | 2.10 | 2.12 | 9.00 |
| KLAC | 78 | HIGH | PULLBACK_MOMENTUM | 870 | 38.4% | 1.00 | 3.96 | 567.04 | 9.99 |
| ROKU | 78 | HIGH | PULLBACK_MOMENTUM | 661 | 35.4% | 0.60 | 2.43 | -19.50 | 11.00 |
| SPY | 78 | HIGH | PULLBACK_MOMENTUM | 707 | 32.5% | 1.07 | 2.75 | 470.80 | 15.00 |
| STM | 78 | HIGH | PULLBACK_MOMENTUM | 500 | 39.8% | 1.02 | 2.75 | 7.22 | 8.00 |
| TSM | 78 | HIGH | MEAN_REVERSION | 1050 | 28.4% | 0.65 | 1.50 | -12.75 | 13.31 |
| TTWO | 78 | HIGH | RELATIVE_STRENGTH_ROTATION | 750 | 28.4% | 0.55 | 4.72 | 7.18 | 14.00 |
| WCLD | 78 | HIGH | PULLBACK_MOMENTUM | 675 | 25.6% | 5.42 | 10.22 | 2309.14 | 14.58 |
| IYW | 77 | HIGH | PULLBACK_MOMENTUM | 618 | 42.9% | 0.88 | 3.59 | 360.30 | 20.41 |
| APLD | 76 | HIGH | RELATIVE_STRENGTH_ROTATION | 819 | 33.9% | 0.96 | 2.01 | 358.86 | 40.02 |
| RMBS | 76 | HIGH | PULLBACK_MOMENTUM | 845 | 37.2% | 0.51 | 2.14 | 3.42 | 11.00 |
| AMZN | 75 | HIGH | PULLBACK_MOMENTUM | 1041 | 28.6% | 0.65 | 2.46 | 447.79 | 23.51 |
| DELL | 75 | HIGH | PULLBACK_MOMENTUM | 663 | 31.1% | 0.63 | 3.55 | 418.76 | 11.55 |
| MA | 75 | HIGH | PULLBACK_MOMENTUM | 651 | 37.3% | 0.85 | 3.07 | -5.66 | 8.22 |
| SENT | 75 | MEDIUM | PULLBACK_MOMENTUM | 280 | 34.3% | 1.30 | 4.60 | 363.28 | 10.00 |
| SLAB | 75 | HIGH | PULLBACK_MOMENTUM | 697 | 38.0% | 1.02 | 3.78 | -1.66 | 11.62 |
| TER | 75 | HIGH | PULLBACK_MOMENTUM | 741 | 40.2% | 0.74 | 2.84 | -4.23 | 12.39 |
| GLD | 74 | HIGH | VOLATILITY_COMPRESSION | 1178 | 25.6% | 0.77 | 2.73 | 2.45 | 21.78 |
| LINK | 74 | HIGH | RELATIVE_STRENGTH_ROTATION | 720 | 24.6% | 0.45 | 2.98 | 48.73 | 18.28 |
| PANW | 74 | HIGH | PULLBACK_MOMENTUM | 922 | 45.2% | 1.25 | 4.31 | -27.93 | 20.00 |
| IGM | 73 | HIGH | PULLBACK_MOMENTUM | 353 | 36.5% | 0.99 | 4.46 | 350.80 | 22.96 |
| LIN | 73 | HIGH | PULLBACK_MOMENTUM | 691 | 40.2% | 1.16 | 7.36 | 520.00 | 18.91 |
| NVMI | 73 | HIGH | MEAN_REVERSION | 789 | 26.9% | 0.71 | 2.10 | -48.83 | 9.26 |
| NXPI | 73 | HIGH | PULLBACK_MOMENTUM | 445 | 31.9% | 0.57 | 2.04 | 0.81 | 14.04 |
| SPYG | 73 | HIGH | PULLBACK_MOMENTUM | 457 | 37.0% | 0.53 | 2.06 | 240.43 | 21.87 |
| VUG | 73 | HIGH | PULLBACK_MOMENTUM | 349 | 41.0% | 0.64 | 2.49 | 221.77 | 13.10 |
| MSTR | 72 | HIGH | RELATIVE_STRENGTH_ROTATION | 617 | 35.2% | 0.85 | 1.90 | 150.59 | 36.98 |
| SIE | 72 | HIGH | PULLBACK_MOMENTUM | 459 | 38.3% | 0.58 | 3.02 | 266.71 | 7.45 |
| AXP | 71 | HIGH | MEAN_REVERSION | 987 | 22.0% | 0.89 | 3.60 | -2.49 | 13.15 |
| ETN | 71 | HIGH | MEAN_REVERSION | 606 | 40.6% | 0.73 | 5.14 | 1.89 | 14.00 |
| HACK | 71 | HIGH | MEAN_REVERSION | 898 | 25.5% | 0.62 | 1.29 | 123.50 | 25.31 |
| IGV | 71 | HIGH | BREAKOUT_EXPANSION | 633 | 29.7% | 0.79 | 3.89 | 56.17 | 20.58 |
| JPM | 71 | HIGH | MEAN_REVERSION | 726 | 30.7% | 0.86 | 2.40 | 0.83 | 16.76 |
| MU | 70 | HIGH | RELATIVE_STRENGTH_ROTATION | 947 | 31.0% | 0.80 | 6.90 | 49.27 | 18.36 |
| TENB | 70 | HIGH | MEAN_REVERSION | 722 | 22.9% | 0.58 | 2.23 | -13.75 | 9.83 |
| AIR | 68 | HIGH | MEAN_REVERSION | 656 | 21.5% | 0.60 | 1.60 | -3.61 | 16.00 |
| AMAT | 68 | HIGH | PULLBACK_MOMENTUM | 928 | 39.2% | 0.96 | 5.13 | 9.88 | 11.00 |
| CYBR | 68 | HIGH | PULLBACK_MOMENTUM | 1038 | 30.1% | 0.51 | 2.65 | -16.81 | 16.96 |
| GTLB | 68 | HIGH | MEAN_REVERSION | 499 | 27.5% | 0.73 | 4.60 | -31.12 | 12.00 |
| MPWR | 68 | HIGH | PULLBACK_MOMENTUM | 590 | 29.3% | 0.53 | 2.75 | -8.69 | 9.00 |
| NVDA | 68 | HIGH | PULLBACK_MOMENTUM | 819 | 39.3% | 0.72 | 2.41 | -183.89 | 36.14 |
| ROM | 68 | HIGH | PULLBACK_MOMENTUM | 718 | 30.5% | 0.42 | 2.16 | 2.99 | 12.00 |
| TYL | 68 | HIGH | PULLBACK_MOMENTUM | 588 | 35.5% | 0.67 | 3.19 | 4.55 | 7.00 |
| CIBR | 67 | HIGH | MEAN_REVERSION | 852 | 20.3% | 0.92 | 2.88 | -92.80 | 26.17 |
| PDD | 67 | HIGH | RELATIVE_STRENGTH_ROTATION | 900 | 24.1% | 0.48 | 1.85 | 58.02 | 14.63 |
| ASML | 66 | HIGH | RELATIVE_STRENGTH_ROTATION | 756 | 31.5% | 0.89 | 1.17 | 9.78 | 14.00 |
| BKNG | 66 | HIGH | MEAN_REVERSION | 947 | 34.5% | 0.60 | 1.50 | -2.37 | 14.00 |
| CLOU | 66 | HIGH | PULLBACK_MOMENTUM | 654 | 32.9% | 0.59 | 2.47 | 246.68 | 13.76 |
| EA | 66 | HIGH | MEAN_REVERSION | 809 | 21.8% | 0.47 | 2.15 | -0.27 | 18.06 |
| ETH | 66 | HIGH | RELATIVE_STRENGTH_ROTATION | 990 | 30.9% | 0.48 | 3.08 | 38.96 | 11.63 |
| FTEC | 66 | HIGH | PULLBACK_MOMENTUM | 646 | 35.1% | 0.49 | 2.57 | 208.83 | 20.96 |
| MELI | 66 | HIGH | PULLBACK_MOMENTUM | 652 | 16.7% | 0.92 | 2.39 | 7.27 | 17.19 |
| SAP | 66 | HIGH | PULLBACK_MOMENTUM | 680 | 39.1% | 0.56 | 3.18 | -0.19 | 17.93 |
| SHOP | 66 | HIGH | PULLBACK_MOMENTUM | 794 | 32.6% | 0.32 | 2.56 | -16.82 | 11.09 |
| VGT | 66 | HIGH | PULLBACK_MOMENTUM | 613 | 36.4% | 0.49 | 2.49 | 193.99 | 23.07 |
| XLK | 66 | HIGH | PULLBACK_MOMENTUM | 678 | 33.3% | 0.41 | 2.36 | 183.31 | 16.50 |
| MSFT | 65 | HIGH | VOLATILITY_COMPRESSION | 784 | 18.2% | 0.71 | 3.95 | -169.96 | 22.34 |
| PATH | 65 | HIGH | PULLBACK_MOMENTUM | 356 | 38.2% | 0.67 | 3.46 | 239.08 | 11.00 |
| USD | 65 | HIGH | PULLBACK_MOMENTUM | 722 | 37.1% | 0.36 | 1.62 | 37.86 | 29.58 |

## TACTICAL — actifs opportunistes (allocation réduite)

| Symbole | Score | Confiance | Meilleur setup | Trades | Winrate | Expectancy | PF | TotalR | DrawDown |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|
| COIN | 64 | HIGH | RELATIVE_STRENGTH_ROTATION | 574 | 18.6% | 0.89 | 1.94 | 98.27 | 17.00 |
| HUBS | 64 | HIGH | RELATIVE_STRENGTH_ROTATION | 581 | 33.7% | 0.94 | 0.00 | 9.38 | 8.00 |
| ABNB | 63 | HIGH | PULLBACK_MOMENTUM | 744 | 28.6% | 0.39 | 1.77 | -1.65 | 10.00 |
| DDOG | 63 | HIGH | MEAN_REVERSION | 579 | 26.1% | 0.33 | 2.26 | -10.55 | 14.00 |
| ENTG | 63 | HIGH | MEAN_REVERSION | 427 | 37.9% | 0.65 | 1.20 | 0.74 | 8.18 |
| PAYC | 63 | HIGH | PULLBACK_MOMENTUM | 512 | 30.5% | 0.47 | 2.14 | 8.08 | 7.00 |
| ADBE | 62 | HIGH | RELATIVE_STRENGTH_ROTATION | 595 | 26.2% | 1.01 | 0.00 | 15.23 | 12.00 |
| ARM | 61 | MEDIUM | RELATIVE_STRENGTH_ROTATION | 549 | 21.7% | 0.30 | 1.49 | 20.78 | 17.18 |
| BBAI | 61 | HIGH | VOLATILITY_COMPRESSION | 645 | 26.2% | 0.82 | 5.50 | 0.56 | 38.01 |
| CHKP | 61 | HIGH | PULLBACK_MOMENTUM | 630 | 31.3% | 0.55 | 1.94 | -10.26 | 28.40 |
| COST | 61 | HIGH | PULLBACK_MOMENTUM | 804 | 31.6% | 0.47 | 2.37 | -1.26 | 14.00 |
| DSY | 61 | HIGH | BREAKOUT_EXPANSION | 122 | 23.0% | 0.75 | 3.25 | -6.42 | 11.00 |
| AKAM | 60 | HIGH | PULLBACK_MOMENTUM | 618 | 29.0% | 0.99 | 1.95 | -0.55 | 18.81 |
| CFLT | 60 | HIGH | PULLBACK_MOMENTUM | 240 | 30.8% | 0.37 | 2.24 | 88.06 | 12.00 |
| DT | 60 | HIGH | PULLBACK_MOMENTUM | 603 | 30.2% | 0.33 | 2.15 | 2.16 | 12.53 |
| ON | 60 | HIGH | MEAN_REVERSION | 822 | 30.5% | 0.38 | 1.82 | -38.55 | 12.64 |
| SNPS | 60 | HIGH | PULLBACK_MOMENTUM | 642 | 29.3% | 0.36 | 1.91 | 228.84 | 19.91 |
| AMKR | 59 | HIGH | MEAN_REVERSION | 783 | 19.9% | 0.34 | 2.84 | 9.13 | 13.24 |
| TT | 59 | HIGH | VOLATILITY_COMPRESSION | 679 | 22.2% | 0.55 | 1.75 | 0.90 | 22.30 |
| AMD | 58 | HIGH | BREAKOUT_EXPANSION | 736 | 29.9% | 0.44 | 2.86 | -52.15 | 12.00 |
| DOCN | 58 | HIGH | RELATIVE_STRENGTH_ROTATION | 1103 | 31.4% | 0.36 | 1.12 | 19.27 | 13.24 |
| QQQ | 58 | HIGH | PULLBACK_MOMENTUM | 670 | 28.7% | 0.35 | 1.86 | 144.88 | 21.93 |
| SWKS | 58 | HIGH | MEAN_REVERSION | 431 | 29.2% | 0.30 | 2.42 | 0.60 | 8.00 |
| BUG | 57 | HIGH | MEAN_REVERSION | 846 | 28.0% | 0.96 | 0.00 | 68.75 | 28.66 |
| WM | 57 | HIGH | PULLBACK_MOMENTUM | 570 | 30.7% | 0.38 | 1.67 | 0.12 | 20.00 |
| AVGO | 56 | HIGH | BREAKOUT_EXPANSION | 1190 | 25.0% | 0.31 | 2.10 | 6.67 | 22.31 |
| AI | 55 | HIGH | MEAN_REVERSION | 487 | 28.7% | 0.20 | 1.50 | 12.24 | 28.60 |
| CDNS | 55 | HIGH | PULLBACK_MOMENTUM | 712 | 19.4% | 0.13 | 1.54 | 92.40 | 27.42 |
| VRTX | 55 | HIGH | RELATIVE_STRENGTH_ROTATION | 854 | 17.8% | 0.27 | 3.02 | 16.90 | 26.37 |
| NOW | 54 | HIGH | MEAN_REVERSION | 695 | 25.6% | 0.28 | 1.82 | 45.96 | 20.00 |
| GEN | 53 | HIGH | PULLBACK_MOMENTUM | 464 | 28.0% | 0.23 | 1.66 | 104.77 | 9.36 |
| AAPL | 51 | HIGH | PULLBACK_MOMENTUM | 860 | 25.2% | 0.20 | 1.64 | -10.36 | 22.29 |
| ADI | 51 | HIGH | PULLBACK_MOMENTUM | 955 | 25.2% | 0.21 | 2.35 | -6.97 | 15.00 |
| BOTZ | 51 | HIGH | PULLBACK_MOMENTUM | 947 | 28.3% | 0.26 | 1.97 | 164.23 | 14.30 |
| LLY | 51 | HIGH | MEAN_REVERSION | 850 | 26.7% | 1.24 | n/a | 1.46 | 28.53 |
| SYNA | 51 | HIGH | MEAN_REVERSION | 560 | 15.9% | 0.32 | 1.61 | -45.26 | 20.96 |
| XSW | 51 | HIGH | PULLBACK_MOMENTUM | 531 | 23.7% | 0.28 | 1.61 | 148.03 | 19.46 |
| SPGI | 50 | HIGH | MEAN_REVERSION | 825 | 28.4% | 0.39 | 1.17 | 2.24 | 21.03 |

## BLACKLIST — actifs incompatibles

| Symbole | Score | Confiance | Meilleur setup | Trades | Winrate | Expectancy | PF | TotalR | DrawDown |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|
| SKYY | 61 | HIGH | MEAN_REVERSION | 880 | 21.8% | 0.58 | 0.40 | 131.81 | 30.00 |
| ASX | 55 | HIGH | MEAN_REVERSION | 1090 | 29.0% | 0.82 | 0.80 | 0.15 | 22.60 |
| MSCI | 55 | HIGH | RELATIVE_STRENGTH_ROTATION | 887 | 22.0% | 0.82 | 0.55 | 8.98 | 25.00 |
| ADSK | 49 | HIGH | MEAN_REVERSION | 689 | 17.1% | 0.32 | 0.52 | 99.21 | 22.00 |
| ZEN | 49 | LOW | PULLBACK_MOMENTUM | 76 | 36.8% | 0.37 | 2.55 | 27.94 | 4.00 |
| ESTC | 48 | HIGH | MEAN_REVERSION | 689 | 22.6% | 0.59 | 1.91 | -4.07 | 10.00 |
| QRVO | 48 | HIGH | PULLBACK_MOMENTUM | 636 | 30.2% | 0.13 | 1.76 | -0.55 | 20.73 |
| RMS | 48 | HIGH | RELATIVE_STRENGTH_ROTATION | 588 | 22.3% | 0.44 | 0.91 | 11.96 | 15.76 |
| USDJPY | 48 | HIGH | PULLBACK_MOMENTUM | 428 | 27.1% | 0.14 | 1.42 | 59.81 | 15.96 |
| ZS | 47 | HIGH | RELATIVE_STRENGTH_ROTATION | 885 | 16.4% | 0.38 | 1.88 | 11.29 | 27.43 |
| CRM | 46 | HIGH | PULLBACK_MOMENTUM | 815 | 26.5% | 0.19 | 1.43 | 136.20 | 12.37 |
| V | 46 | HIGH | PULLBACK_MOMENTUM | 464 | 31.9% | 0.19 | 1.24 | 54.58 | 10.27 |
| GBPUSD | 45 | HIGH | PULLBACK_MOMENTUM | 553 | 30.2% | 0.22 | 1.45 | 120.52 | 18.00 |
| IPGP | 45 | HIGH | MEAN_REVERSION | 520 | 22.5% | 0.30 | 1.63 | 1.59 | 10.62 |
| MDB | 45 | HIGH | MEAN_REVERSION | 1059 | 14.1% | 0.34 | 1.34 | -0.57 | 28.48 |
| NET | 45 | HIGH | VOLATILITY_COMPRESSION | 1017 | 24.5% | 0.80 | 0.00 | 25.63 | 17.80 |
| PAYX | 45 | HIGH | PULLBACK_MOMENTUM | 410 | 31.0% | 0.20 | 1.69 | 82.92 | 18.00 |
| FORM | 44 | HIGH | MEAN_REVERSION | 921 | 27.1% | 0.30 | 1.07 | -6.84 | 15.83 |
| IWM | 42 | HIGH | BREAKOUT_EXPANSION | 794 | 27.0% | 0.33 | 1.81 | -21.42 | 31.67 |
| MDY | 40 | HIGH | PULLBACK_MOMENTUM | 820 | 21.7% | 0.17 | 1.47 | 103.66 | 26.96 |
| TSLA | 40 | HIGH | BREAKOUT_EXPANSION | 627 | 13.9% | 0.26 | 2.08 | -66.85 | 22.00 |
| FDN | 38 | HIGH | MEAN_REVERSION | 804 | 20.4% | 0.42 | 0.49 | 19.62 | 21.01 |
| NESN | 38 | HIGH | RELATIVE_STRENGTH_ROTATION | 429 | 16.8% | 0.11 | 0.82 | 1.44 | 24.00 |
| TXN | 38 | HIGH | VOLATILITY_COMPRESSION | 610 | 10.3% | 0.36 | 1.25 | -215.04 | 29.73 |
| TTD | 36 | HIGH | PULLBACK_MOMENTUM | 996 | 25.5% | 0.18 | 1.37 | -24.61 | 12.00 |
| PD | 35 | HIGH | MEAN_REVERSION | 556 | 6.3% | 0.22 | 1.34 | -2.14 | 21.71 |
| QCOM | 35 | HIGH | MEAN_REVERSION | 708 | 17.1% | 0.35 | 0.67 | -6.16 | 10.06 |
| LSCC | 34 | HIGH | RELATIVE_STRENGTH_ROTATION | 728 | 19.5% | 0.19 | 0.79 | 6.27 | 16.00 |
| ONTO | 34 | HIGH | MEAN_REVERSION | 809 | 25.0% | 0.24 | 0.72 | -28.77 | 17.00 |
| TEAM | 34 | HIGH | BREAKOUT_EXPANSION | 681 | 19.7% | 0.29 | 2.10 | -38.78 | 20.00 |
| ROP | 33 | HIGH | MEAN_REVERSION | 437 | 25.4% | 0.14 | 0.85 | 31.66 | 10.00 |
| DUOL | 31 | HIGH | BREAKOUT_EXPANSION | 603 | 31.3% | 0.24 | 2.14 | -34.48 | 18.95 |
| IBIT | 30 | MEDIUM | RELATIVE_STRENGTH_ROTATION | 390 | 22.3% | -0.12 | 1.64 | -2.74 | 15.33 |
| S | 28 | HIGH | MEAN_REVERSION | 387 | 24.5% | 0.08 | 1.12 | -11.78 | 11.38 |
| CRWV | 27 | LOW | RELATIVE_STRENGTH_ROTATION | 29 | 27.6% | 0.12 | 2.70 | 2.58 | 17.35 |
| CAP | 26 | HIGH | BREAKOUT_EXPANSION | 187 | 11.8% | 0.28 | 1.00 | n/a | 11.00 |
| HUBB | 26 | HIGH | MEAN_REVERSION | 599 | 28.0% | 0.07 | 0.21 | -3.76 | 13.16 |
| INTU | 23 | HIGH | MEAN_REVERSION | 624 | 16.2% | 0.01 | 0.42 | -0.44 | 19.00 |
| MRVL | 23 | HIGH | MEAN_REVERSION | 826 | 17.8% | 0.22 | 0.83 | -5.72 | 12.35 |
| OKTA | 20 | HIGH | MEAN_REVERSION | 725 | 6.1% | 0.21 | 0.74 | -37.17 | 33.00 |
| SPLK | 16 | MEDIUM | PULLBACK_MOMENTUM | 427 | 14.3% | -0.14 | 0.78 | -60.12 | 18.37 |
| WDAY | 15 | HIGH | PULLBACK_MOMENTUM | 830 | 16.3% | -0.14 | 1.03 | -0.68 | 21.96 |
| SE | 14 | HIGH | MEAN_REVERSION | 824 | 28.0% | 0.13 | 0.85 | 7.92 | 18.00 |
| ELV | 13 | HIGH | MEAN_REVERSION | 772 | 19.6% | 0.13 | 0.86 | 1.77 | 28.32 |
| SOUN | 13 | HIGH | VOLATILITY_COMPRESSION | 692 | 22.4% | -0.03 | 0.54 | -17.07 | 32.95 |
| RBRK | 12 | MEDIUM | PULLBACK_MOMENTUM | 76 | 10.5% | -0.54 | 0.27 | -40.72 | 4.00 |
| HCP | 11 | HIGH | PULLBACK_MOMENTUM | 102 | 0.0% | -0.92 | 0.00 | -94.00 | 13.00 |
| INTC | 11 | HIGH | PULLBACK_MOMENTUM | 606 | 14.9% | -0.22 | 0.82 | -135.01 | 18.71 |
| SNOW | 11 | HIGH | MEAN_REVERSION | 476 | 18.3% | 0.07 | 0.85 | -20.75 | 17.12 |
| EURUSD | 10 | HIGH | PULLBACK_MOMENTUM | 456 | 20.0% | -0.28 | 0.64 | -129.16 | 33.30 |
| LVMH | 10 | HIGH | PULLBACK_MOMENTUM | 877 | 13.8% | -0.07 | 0.72 | 2.89 | 39.06 |
| TLT | 10 | HIGH | PULLBACK_MOMENTUM | 543 | 10.5% | -0.39 | 0.63 | -172.93 | 39.27 |
| UBER | 10 | HIGH | PULLBACK_MOMENTUM | 986 | 15.5% | -0.32 | 0.68 | -11.32 | 25.36 |
| TTE | 1 | HIGH | PULLBACK_MOMENTUM | 639 | 15.6% | -0.42 | 0.54 | -21.33 | 26.75 |

## Détail par actif

### SOXL — ELITE (score 100, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 318, winrate 75.5%, expectancy 2.03, PF 8.46
- Agrégé global : trades 487, winrate 66.1%, expectancy 1.34, PF 5.02, totalR -1.44, drawdown 17.61, série perdante max 4
- Forces : espérance forte (2.03) ; PF élevé (8.46) ; gagne 75.5 % des trades ; drawdown faible (0.04 × gain) ; stable sur 4/5 années ; compatible avec 2 familles de setup

### APP — ELITE (score 98, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (4 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 255, winrate 64.3%, expectancy 1.84, PF 5.78
- Agrégé global : trades 957, winrate 36.8%, expectancy 0.56, PF 2.54, totalR 468.31, drawdown 15.39, série perdante max 7
- Forces : espérance forte (1.84) ; PF élevé (5.78) ; gagne 64.3 % des trades ; drawdown faible (0.03 × gain) ; stable sur 4/5 années ; compatible avec 4 familles de setup

### VRNS — ELITE (score 98, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 834, winrate 62.5%, expectancy 1.68, PF 7.78
- Agrégé global : trades 992, winrate 57.8%, expectancy 1.41, PF 6.74, totalR 25.82, drawdown 10.90, série perdante max 7
- Forces : espérance forte (1.68) ; PF élevé (7.78) ; gagne 62.5 % des trades ; drawdown faible (0.01 × gain) ; stable sur 4/5 années ; compatible avec 3 familles de setup

### PLTR — ELITE (score 95, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (4 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 198, winrate 71.2%, expectancy 1.87, PF 6.11
- Agrégé global : trades 782, winrate 54.3%, expectancy 1.37, PF 5.52, totalR 370.83, drawdown 13.62, série perdante max 5
- Forces : espérance forte (1.87) ; PF élevé (6.11) ; gagne 71.2 % des trades ; drawdown faible (0.04 × gain) ; compatible avec 4 familles de setup

### SOXQ — ELITE (score 92, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 860, winrate 57.6%, expectancy 1.97, PF 9.63
- Agrégé global : trades 988, winrate 52.5%, expectancy 1.68, PF 8.39, totalR n/a, drawdown 7.00, série perdante max 6
- Forces : espérance forte (1.97) ; PF élevé (9.63) ; drawdown faible (0.01 × gain) ; stable sur 4/4 années

### SOXX — ELITE (score 92, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 638, winrate 55.5%, expectancy 2.18, PF 6.14
- Agrégé global : trades 750, winrate 50.9%, expectancy 1.84, PF 5.31, totalR n/a, drawdown 8.00, série perdante max 8
- Forces : espérance forte (2.18) ; PF élevé (6.14) ; drawdown faible (0.01 × gain) ; stable sur 4/5 années

### CRWD — ELITE (score 91, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (5 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 846, winrate 54.4%, expectancy 1.38, PF 5.51
- Agrégé global : trades 1002, winrate 51.7%, expectancy 1.22, PF 4.99, totalR 48.58, drawdown 8.88, série perdante max 8
- Forces : espérance forte (1.38) ; PF élevé (5.51) ; drawdown faible (0.01 × gain) ; stable sur 5/5 années ; compatible avec 3 familles de setup

### FTNT — ELITE (score 91, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 49, winrate 65.3%, expectancy 1.20, PF 21.83
- Agrégé global : trades 721, winrate 30.0%, expectancy 0.06, PF 2.55, totalR 58.74, drawdown 14.47, série perdante max 13
- Forces : espérance forte (1.20) ; PF élevé (21.83) ; gagne 65.3 % des trades ; drawdown faible (0.25 × gain) ; compatible avec 2 familles de setup

### META — ELITE (score 91, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 46, winrate 80.4%, expectancy 1.53, PF 5.96
- Agrégé global : trades 1025, winrate 31.4%, expectancy 0.39, PF 1.80, totalR 70.71, drawdown 15.00, série perdante max 15
- Forces : espérance forte (1.53) ; PF élevé (5.96) ; gagne 80.4 % des trades ; drawdown faible (0.21 × gain) ; compatible avec 2 familles de setup

### PH — ELITE (score 91, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 420, winrate 53.1%, expectancy 1.30, PF 4.50
- Agrégé global : trades 520, winrate 46.0%, expectancy 1.04, PF 3.82, totalR n/a, drawdown 6.00, série perdante max 6
- Forces : espérance forte (1.30) ; PF élevé (4.50) ; drawdown faible (0.01 × gain) ; stable sur 4/5 années ; compatible avec 2 familles de setup

### PSI — ELITE (score 91, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 749, winrate 52.2%, expectancy 2.25, PF 6.06
- Agrégé global : trades 838, winrate 50.5%, expectancy 2.02, PF 5.53, totalR n/a, drawdown 6.00, série perdante max 6
- Forces : espérance forte (2.25) ; PF élevé (6.06) ; drawdown faible (0.00 × gain) ; stable sur 4/5 années ; compatible avec 2 familles de setup

### BNB — ELITE (score 90, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (5 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `VOLATILITY_COMPRESSION` — trades 30, winrate 60.0%, expectancy 1.00, PF 4.50
- Agrégé global : trades 1224, winrate 32.3%, expectancy 0.33, PF 2.31, totalR 24.00, drawdown 18.00, série perdante max 12
- Forces : espérance forte (1.00) ; PF élevé (4.50) ; gagne 60.0 % des trades ; stable sur 4/5 années ; compatible avec 5 familles de setup

### NBIS — ELITE (score 90, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2024, 2025 (2 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 88, winrate 62.5%, expectancy 1.77, PF 2.86
- Agrégé global : trades 289, winrate 37.7%, expectancy 0.51, PF 1.64, totalR 155.92, drawdown 16.10, série perdante max 16
- Forces : espérance forte (1.77) ; PF élevé (2.86) ; gagne 62.5 % des trades ; drawdown faible (0.10 × gain) ; compatible avec 3 familles de setup
- Risques : série de pertes longue (16 consécutives)

### SMCI — ELITE (score 90, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 235, winrate 58.3%, expectancy 1.18, PF 2.61
- Agrégé global : trades 1181, winrate 27.4%, expectancy 0.17, PF 1.46, totalR 277.10, drawdown 22.54, série perdante max 9
- Forces : espérance forte (1.18) ; PF élevé (2.61) ; drawdown faible (0.08 × gain) ; compatible avec 3 familles de setup

### SOL — ELITE (score 90, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (5 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 212, winrate 56.6%, expectancy 2.90, PF 7.01
- Agrégé global : trades 1222, winrate 34.0%, expectancy 0.63, PF 2.73, totalR 615.53, drawdown 15.17, série perdante max 9
- Forces : espérance forte (2.90) ; PF élevé (7.01) ; drawdown faible (0.02 × gain) ; compatible avec 5 familles de setup

### ANET — ELITE (score 88, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 473, winrate 54.1%, expectancy 1.16, PF 4.94
- Agrégé global : trades 473, winrate 54.1%, expectancy 1.16, PF 4.94, totalR n/a, drawdown 7.11, série perdante max 6
- Forces : espérance forte (1.16) ; PF élevé (4.94) ; drawdown faible (0.01 × gain) ; stable sur 3/4 années

### AVAX — ELITE (score 88, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 153, winrate 62.7%, expectancy 2.79, PF 5.65
- Agrégé global : trades 808, winrate 23.8%, expectancy 0.21, PF 1.50, totalR 427.54, drawdown 14.96, série perdante max 10
- Forces : espérance forte (2.79) ; PF élevé (5.65) ; gagne 62.7 % des trades ; drawdown faible (0.03 × gain) ; compatible avec 2 familles de setup

### CAMT — ELITE (score 88, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 509, winrate 54.0%, expectancy 1.35, PF 6.29
- Agrégé global : trades 741, winrate 50.1%, expectancy 1.03, PF 4.93, totalR 54.30, drawdown 8.86, série perdante max 5
- Forces : espérance forte (1.35) ; PF élevé (6.29) ; drawdown faible (0.02 × gain) ; compatible avec 3 familles de setup

### XSD — ELITE (score 88, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 530, winrate 52.8%, expectancy 1.28, PF 4.27
- Agrégé global : trades 610, winrate 48.9%, expectancy 1.09, PF 3.79, totalR n/a, drawdown 6.00, série perdante max 6
- Forces : espérance forte (1.28) ; PF élevé (4.27) ; drawdown faible (0.01 × gain) ; stable sur 4/5 années

### FICO — ELITE (score 87, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 814, winrate 45.6%, expectancy 1.23, PF 5.45
- Agrégé global : trades 1015, winrate 44.6%, expectancy 1.01, PF 4.87, totalR 43.72, drawdown 14.14, série perdante max 9
- Forces : espérance forte (1.23) ; PF élevé (5.45) ; drawdown faible (0.02 × gain) ; stable sur 4/5 années ; compatible avec 3 familles de setup

### ACLS — ELITE (score 86, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (5 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 523, winrate 50.7%, expectancy 0.81, PF 3.21
- Agrégé global : trades 738, winrate 48.4%, expectancy 0.66, PF 3.29, totalR 54.43, drawdown 11.44, série perdante max 7
- Forces : espérance solide (0.81) ; PF élevé (3.21) ; drawdown faible (0.04 × gain) ; stable sur 5/5 années ; compatible avec 3 familles de setup

### AEHR — ELITE (score 86, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 262, winrate 53.8%, expectancy 1.54, PF 2.24
- Agrégé global : trades 577, winrate 36.2%, expectancy 0.61, PF 1.40, totalR 403.38, drawdown 21.74, série perdante max 7
- Forces : espérance forte (1.54) ; PF élevé (2.24) ; drawdown faible (0.05 × gain) ; compatible avec 2 familles de setup

### ORCL — CORE (score 86, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `VOLATILITY_COMPRESSION` — trades 19, winrate 78.9%, expectancy 1.42, PF 6.25
- Agrégé global : trades 1077, winrate 29.0%, expectancy 0.60, PF 3.01, totalR 6.34, drawdown 19.33, série perdante max 12
- Forces : espérance forte (1.42) ; PF élevé (6.25) ; gagne 78.9 % des trades ; stable sur 4/5 années ; compatible avec 3 familles de setup
- Risques : drawdown supérieur au gain (3.05 × gain)

### UPST — ELITE (score 86, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 226, winrate 50.0%, expectancy 1.02, PF 1.85
- Agrégé global : trades 555, winrate 36.0%, expectancy 0.39, PF 1.35, totalR 229.80, drawdown 32.80, série perdante max 9
- Forces : espérance forte (1.02) ; PF solide (1.85) ; drawdown faible (0.14 × gain) ; stable sur 4/5 années ; compatible avec 3 familles de setup

### BTC — ELITE (score 85, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (5 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 55, winrate 61.8%, expectancy 0.64, PF 3.55
- Agrégé global : trades 890, winrate 28.9%, expectancy 0.30, PF 2.24, totalR 35.15, drawdown 10.99, série perdante max 9
- Forces : espérance solide (0.64) ; PF élevé (3.55) ; gagne 61.8 % des trades ; compatible avec 5 familles de setup

### LRCX — ELITE (score 84, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 4 (4 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 12, winrate 58.3%, expectancy 1.19, PF 6.19
- Agrégé global : trades 709, winrate 27.8%, expectancy 0.21, PF 1.81, totalR 14.20, drawdown 10.51, série perdante max 6
- Forces : espérance forte (1.19) ; PF élevé (6.19) ; compatible avec 4 familles de setup

### ALGM — ELITE (score 83, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 56, winrate 66.1%, expectancy 0.63, PF 3.81
- Agrégé global : trades 468, winrate 34.4%, expectancy 0.35, PF 1.99, totalR 35.38, drawdown 8.45, série perdante max 8
- Forces : espérance solide (0.63) ; PF élevé (3.81) ; gagne 66.1 % des trades ; drawdown faible (0.24 × gain) ; compatible avec 3 familles de setup

### MCHP — CORE (score 83, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 16, winrate 81.3%, expectancy 0.83, PF 2.10
- Agrégé global : trades 531, winrate 30.3%, expectancy 0.49, PF 2.51, totalR 2.12, drawdown 9.00, série perdante max 7
- Forces : espérance solide (0.83) ; PF élevé (2.10) ; gagne 81.3 % des trades ; stable sur 3/4 années ; compatible avec 2 familles de setup
- Risques : drawdown supérieur au gain (4.25 × gain)

### NFLX — ELITE (score 83, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 51, winrate 76.5%, expectancy 0.88, PF 7.81
- Agrégé global : trades 903, winrate 35.3%, expectancy 0.37, PF 2.18, totalR 45.05, drawdown 13.87, série perdante max 12
- Forces : espérance solide (0.88) ; PF élevé (7.81) ; gagne 76.5 % des trades ; compatible avec 3 familles de setup

### SMH — ELITE (score 83, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 694, winrate 44.7%, expectancy 1.24, PF 4.10
- Agrégé global : trades 784, winrate 44.1%, expectancy 1.14, PF 3.87, totalR n/a, drawdown 7.00, série perdante max 7
- Forces : espérance forte (1.24) ; PF élevé (4.10) ; drawdown faible (0.01 × gain) ; stable sur 4/5 années ; compatible avec 3 familles de setup

### GOOGL — ELITE (score 81, confiance HIGH)

- Profil d'allocation : `strong`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 817, winrate 40.8%, expectancy 2.07, PF 5.28
- Agrégé global : trades 976, winrate 38.2%, expectancy 1.73, PF 4.62, totalR 9.27, drawdown 14.00, série perdante max 14
- Forces : espérance forte (2.07) ; PF élevé (5.28) ; drawdown faible (0.01 × gain) ; stable sur 4/5 années ; compatible avec 3 familles de setup

### KLAC — CORE (score 78, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 799, winrate 39.4%, expectancy 1.00, PF 3.96
- Agrégé global : trades 870, winrate 38.4%, expectancy 0.92, PF 3.73, totalR n/a, drawdown 9.99, série perdante max 8
- Forces : espérance solide (1.00) ; PF élevé (3.96) ; drawdown faible (0.02 × gain) ; stable sur 4/5 années ; compatible avec 2 familles de setup

### ROKU — CORE (score 78, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 582, winrate 37.3%, expectancy 0.60, PF 2.43
- Agrégé global : trades 661, winrate 35.4%, expectancy 0.48, PF 2.20, totalR -19.50, drawdown 11.00, série perdante max 9
- Forces : espérance solide (0.60) ; PF élevé (2.43) ; drawdown faible (0.04 × gain) ; stable sur 4/5 années ; compatible avec 2 familles de setup

### SPY — CORE (score 78, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 603, winrate 35.2%, expectancy 1.07, PF 2.75
- Agrégé global : trades 707, winrate 32.5%, expectancy 0.91, PF 2.47, totalR n/a, drawdown 15.00, série perdante max 15
- Forces : espérance forte (1.07) ; PF élevé (2.75) ; drawdown faible (0.03 × gain) ; stable sur 4/4 années

### STM — CORE (score 78, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 426, winrate 41.3%, expectancy 1.02, PF 2.75
- Agrégé global : trades 500, winrate 39.8%, expectancy 0.86, PF 2.49, totalR 7.22, drawdown 8.00, série perdante max 6
- Forces : espérance forte (1.02) ; PF élevé (2.75) ; drawdown faible (0.02 × gain) ; compatible avec 2 familles de setup

### TSM — CORE (score 78, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 11, winrate 72.7%, expectancy 0.65, PF 1.50
- Agrégé global : trades 1050, winrate 28.4%, expectancy 0.25, PF 1.84, totalR -12.75, drawdown 13.31, série perdante max 9
- Forces : espérance solide (0.65) ; PF solide (1.50) ; gagne 72.7 % des trades ; stable sur 4/5 années ; compatible avec 3 familles de setup

### TTWO — CORE (score 78, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (4 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 13, winrate 61.5%, expectancy 0.55, PF 4.72
- Agrégé global : trades 750, winrate 28.4%, expectancy 0.18, PF 1.49, totalR 7.18, drawdown 14.00, série perdante max 10
- Forces : espérance solide (0.55) ; PF élevé (4.72) ; gagne 61.5 % des trades ; compatible avec 4 familles de setup
- Risques : drawdown supérieur au gain (1.95 × gain)

### WCLD — CORE (score 78, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 3 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 618, winrate 25.6%, expectancy 5.42, PF 10.22
- Agrégé global : trades 675, winrate 25.6%, expectancy 4.95, PF 9.46, totalR n/a, drawdown 14.58, série perdante max 9
- Forces : espérance forte (5.42) ; PF élevé (10.22) ; drawdown faible (0.01 × gain) ; compatible avec 2 familles de setup

### IYW — CORE (score 77, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 516, winrate 45.9%, expectancy 0.88, PF 3.59
- Agrégé global : trades 618, winrate 42.9%, expectancy 0.77, PF 3.37, totalR n/a, drawdown 20.41, série perdante max 10
- Forces : espérance solide (0.88) ; PF élevé (3.59) ; drawdown faible (0.06 × gain) ; compatible avec 3 familles de setup

### APLD — CORE (score 76, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 372, winrate 50.5%, expectancy 0.96, PF 2.01
- Agrégé global : trades 819, winrate 33.9%, expectancy 0.41, PF 1.47, totalR 358.86, drawdown 40.02, série perdante max 9
- Forces : espérance solide (0.96) ; PF élevé (2.01) ; drawdown faible (0.11 × gain) ; stable sur 4/5 années ; compatible avec 3 familles de setup
- Risques : performance fortement dégradée en RISK_OFF

### RMBS — CORE (score 76, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 618, winrate 40.8%, expectancy 0.51, PF 2.14
- Agrégé global : trades 845, winrate 37.2%, expectancy 0.36, PF 1.92, totalR 3.42, drawdown 11.00, série perdante max 11
- Forces : espérance solide (0.51) ; PF élevé (2.14) ; drawdown faible (0.05 × gain) ; stable sur 4/5 années ; compatible avec 2 familles de setup

### AMZN — CORE (score 75, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 888, winrate 28.4%, expectancy 0.65, PF 2.46
- Agrégé global : trades 1041, winrate 28.6%, expectancy 0.56, PF 2.28, totalR n/a, drawdown 23.51, série perdante max 16
- Forces : espérance solide (0.65) ; PF élevé (2.46) ; drawdown faible (0.05 × gain) ; stable sur 4/5 années ; compatible avec 2 familles de setup
- Risques : série de pertes longue (16 consécutives)

### DELL — CORE (score 75, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 663, winrate 31.1%, expectancy 0.63, PF 3.55
- Agrégé global : trades 663, winrate 31.1%, expectancy 0.63, PF 3.55, totalR n/a, drawdown 11.55, série perdante max 9
- Forces : espérance solide (0.63) ; PF élevé (3.55) ; drawdown faible (0.03 × gain) ; stable sur 3/4 années

### MA — CORE (score 75, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 578, winrate 40.0%, expectancy 0.85, PF 3.07
- Agrégé global : trades 651, winrate 37.3%, expectancy 0.72, PF 2.75, totalR -5.66, drawdown 8.22, série perdante max 6
- Forces : espérance solide (0.85) ; PF élevé (3.07) ; drawdown faible (0.02 × gain) ; stable sur 3/4 années

### SENT — CORE (score 75, confiance MEDIUM)

- Profil d'allocation : `normal`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 280, winrate 34.3%, expectancy 1.30, PF 4.60
- Agrégé global : trades 280, winrate 34.3%, expectancy 1.30, PF 4.60, totalR n/a, drawdown 10.00, série perdante max 7
- Forces : espérance forte (1.30) ; PF élevé (4.60) ; drawdown faible (0.03 × gain)

### SLAB — CORE (score 75, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 625, winrate 39.0%, expectancy 1.02, PF 3.78
- Agrégé global : trades 697, winrate 38.0%, expectancy 0.91, PF 3.49, totalR -1.66, drawdown 11.62, série perdante max 8
- Forces : espérance forte (1.02) ; PF élevé (3.78) ; drawdown faible (0.02 × gain)

### TER — CORE (score 75, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 640, winrate 42.3%, expectancy 0.74, PF 2.84
- Agrégé global : trades 741, winrate 40.2%, expectancy 0.61, PF 2.63, totalR -4.23, drawdown 12.39, série perdante max 7
- Forces : espérance solide (0.74) ; PF élevé (2.84) ; drawdown faible (0.04 × gain) ; stable sur 4/5 années

### GLD — CORE (score 74, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (4 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `VOLATILITY_COMPRESSION` — trades 11, winrate 54.5%, expectancy 0.77, PF 2.73
- Agrégé global : trades 1178, winrate 25.6%, expectancy 0.23, PF 1.89, totalR 2.45, drawdown 21.78, série perdante max 15
- Forces : espérance solide (0.77) ; PF élevé (2.73) ; stable sur 3/4 années ; compatible avec 4 familles de setup
- Risques : drawdown supérieur au gain (8.89 × gain)

### LINK — CORE (score 74, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 107, winrate 57.9%, expectancy 0.45, PF 2.98
- Agrégé global : trades 720, winrate 24.6%, expectancy -0.10, PF 1.07, totalR 48.73, drawdown 18.28, série perdante max 5
- Forces : espérance positive (0.45) ; PF élevé (2.98) ; compatible avec 3 familles de setup

### PANW — CORE (score 74, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 765, winrate 48.5%, expectancy 1.25, PF 4.31
- Agrégé global : trades 922, winrate 45.2%, expectancy 0.99, PF 3.79, totalR -27.93, drawdown 20.00, série perdante max 20
- Forces : espérance forte (1.25) ; PF élevé (4.31) ; drawdown faible (0.03 × gain) ; stable sur 4/5 années ; compatible avec 2 familles de setup
- Risques : série de pertes longue (20 consécutives) ; performance fortement dégradée en RISK_OFF

### IGM — CORE (score 73, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 353, winrate 36.5%, expectancy 0.99, PF 4.46
- Agrégé global : trades 353, winrate 36.5%, expectancy 0.99, PF 4.46, totalR n/a, drawdown 22.96, série perdante max 13
- Forces : espérance solide (0.99) ; PF élevé (4.46) ; drawdown faible (0.07 × gain) ; stable sur 3/4 années

### LIN — CORE (score 73, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 628, winrate 42.2%, expectancy 1.16, PF 7.36
- Agrégé global : trades 691, winrate 40.2%, expectancy 1.04, PF 6.77, totalR n/a, drawdown 18.91, série perdante max 9
- Forces : espérance forte (1.16) ; PF élevé (7.36) ; drawdown faible (0.04 × gain) ; compatible avec 3 familles de setup

### NVMI — CORE (score 73, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 18, winrate 66.7%, expectancy 0.71, PF 2.10
- Agrégé global : trades 789, winrate 26.9%, expectancy 0.18, PF 1.48, totalR -48.83, drawdown 9.26, série perdante max 8
- Forces : espérance solide (0.71) ; PF élevé (2.10) ; gagne 66.7 % des trades ; compatible avec 3 familles de setup

### NXPI — CORE (score 73, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 415, winrate 31.6%, expectancy 0.57, PF 2.04
- Agrégé global : trades 445, winrate 31.9%, expectancy 0.54, PF 2.05, totalR 0.81, drawdown 14.04, série perdante max 7
- Forces : espérance solide (0.57) ; PF élevé (2.04) ; drawdown faible (0.08 × gain) ; compatible avec 2 familles de setup

### SPYG — CORE (score 73, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 457, winrate 37.0%, expectancy 0.53, PF 2.06
- Agrégé global : trades 457, winrate 37.0%, expectancy 0.53, PF 2.06, totalR n/a, drawdown 21.87, série perdante max 15
- Forces : espérance solide (0.53) ; PF élevé (2.06) ; drawdown faible (0.09 × gain) ; stable sur 3/4 années

### VUG — CORE (score 73, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 349, winrate 41.0%, expectancy 0.64, PF 2.49
- Agrégé global : trades 349, winrate 41.0%, expectancy 0.64, PF 2.49, totalR n/a, drawdown 13.10, série perdante max 13
- Forces : espérance solide (0.64) ; PF élevé (2.49) ; drawdown faible (0.06 × gain) ; stable sur 3/4 années

### MSTR — CORE (score 72, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 178, winrate 48.3%, expectancy 0.85, PF 1.90
- Agrégé global : trades 617, winrate 35.2%, expectancy 0.36, PF 1.97, totalR 150.59, drawdown 36.98, série perdante max 6
- Forces : espérance solide (0.85) ; PF solide (1.90) ; drawdown faible (0.25 × gain) ; compatible avec 3 familles de setup

### SIE — CORE (score 72, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 459, winrate 38.3%, expectancy 0.58, PF 3.02
- Agrégé global : trades 459, winrate 38.3%, expectancy 0.58, PF 3.02, totalR n/a, drawdown 7.45, série perdante max 4
- Forces : espérance solide (0.58) ; PF élevé (3.02) ; drawdown faible (0.03 × gain)

### AXP — CORE (score 71, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 10, winrate 80.0%, expectancy 0.89, PF 3.60
- Agrégé global : trades 987, winrate 22.0%, expectancy 0.28, PF 1.89, totalR -2.49, drawdown 13.15, série perdante max 11
- Forces : espérance solide (0.89) ; PF élevé (3.60) ; gagne 80.0 % des trades ; stable sur 4/5 années ; compatible avec 3 familles de setup
- Risques : performance fortement dégradée en RISK_OFF

### ETN — CORE (score 71, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 12, winrate 75.0%, expectancy 0.73, PF 5.14
- Agrégé global : trades 606, winrate 40.6%, expectancy 0.53, PF 3.20, totalR 1.89, drawdown 14.00, série perdante max 14
- Forces : espérance solide (0.73) ; PF élevé (5.14) ; gagne 75.0 % des trades ; compatible avec 2 familles de setup
- Risques : drawdown supérieur au gain (7.41 × gain)

### HACK — CORE (score 71, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 13, winrate 69.2%, expectancy 0.62, PF 1.29
- Agrégé global : trades 898, winrate 25.5%, expectancy 0.13, PF 1.58, totalR n/a, drawdown 25.31, série perdante max 13
- Forces : espérance solide (0.62) ; gagne 69.2 % des trades ; drawdown faible (0.20 × gain) ; compatible avec 2 familles de setup

### IGV — CORE (score 71, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `BREAKOUT_EXPANSION` — trades 22, winrate 45.5%, expectancy 0.79, PF 3.89
- Agrégé global : trades 633, winrate 29.7%, expectancy 0.17, PF 1.83, totalR n/a, drawdown 20.58, série perdante max 19
- Forces : espérance solide (0.79) ; PF élevé (3.89) ; compatible avec 2 familles de setup
- Risques : série de pertes longue (19 consécutives)

### JPM — CORE (score 71, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (4 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 12, winrate 83.3%, expectancy 0.86, PF 2.40
- Agrégé global : trades 726, winrate 30.7%, expectancy 0.31, PF 1.68, totalR 0.83, drawdown 16.76, série perdante max 11
- Forces : espérance solide (0.86) ; PF élevé (2.40) ; gagne 83.3 % des trades ; compatible avec 4 familles de setup
- Risques : drawdown supérieur au gain (20.19 × gain)

### MU — CORE (score 70, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 62, winrate 58.1%, expectancy 0.80, PF 6.90
- Agrégé global : trades 947, winrate 31.0%, expectancy 0.27, PF 2.10, totalR 49.27, drawdown 18.36, série perdante max 11
- Forces : espérance solide (0.80) ; PF élevé (6.90) ; compatible avec 3 familles de setup
- Risques : performance fortement dégradée en RISK_OFF

### TENB — CORE (score 70, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 21, winrate 66.7%, expectancy 0.58, PF 2.23
- Agrégé global : trades 722, winrate 22.9%, expectancy -0.06, PF 1.12, totalR -13.75, drawdown 9.83, série perdante max 9
- Forces : espérance solide (0.58) ; PF élevé (2.23) ; gagne 66.7 % des trades

### AIR — CORE (score 68, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 17, winrate 64.7%, expectancy 0.60, PF 1.60
- Agrégé global : trades 656, winrate 21.5%, expectancy -0.12, PF 0.91, totalR -3.61, drawdown 16.00, série perdante max 15
- Forces : espérance solide (0.60) ; PF solide (1.60) ; gagne 64.7 % des trades

### AMAT — CORE (score 68, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 851, winrate 40.9%, expectancy 0.96, PF 5.13
- Agrégé global : trades 928, winrate 39.2%, expectancy 0.85, PF 4.76, totalR 9.88, drawdown 11.00, série perdante max 10
- Forces : espérance solide (0.96) ; PF élevé (5.13) ; drawdown faible (0.02 × gain) ; compatible avec 2 familles de setup

### CYBR — CORE (score 68, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 944, winrate 31.1%, expectancy 0.51, PF 2.65
- Agrégé global : trades 1038, winrate 30.1%, expectancy 0.44, PF 2.47, totalR -16.81, drawdown 16.96, série perdante max 10
- Forces : espérance solide (0.51) ; PF élevé (2.65) ; drawdown faible (0.04 × gain) ; compatible avec 2 familles de setup

### GTLB — CORE (score 68, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 19, winrate 68.4%, expectancy 0.73, PF 4.60
- Agrégé global : trades 499, winrate 27.5%, expectancy -0.04, PF 0.95, totalR -31.12, drawdown 12.00, série perdante max 8
- Forces : espérance solide (0.73) ; PF élevé (4.60) ; gagne 68.4 % des trades ; compatible avec 2 familles de setup
- Risques : performance fortement dégradée en RISK_OFF

### MPWR — CORE (score 68, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 483, winrate 31.3%, expectancy 0.53, PF 2.75
- Agrégé global : trades 590, winrate 29.3%, expectancy 0.37, PF 2.39, totalR -8.69, drawdown 9.00, série perdante max 8
- Forces : espérance solide (0.53) ; PF élevé (2.75) ; drawdown faible (0.05 × gain) ; compatible avec 2 familles de setup

### NVDA — CORE (score 68, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 555, winrate 35.7%, expectancy 0.72, PF 2.41
- Agrégé global : trades 819, winrate 39.3%, expectancy 0.31, PF 2.93, totalR -183.89, drawdown 36.14, série perdante max 10
- Forces : espérance solide (0.72) ; PF élevé (2.41) ; drawdown faible (0.13 × gain) ; compatible avec 2 familles de setup

### ROM — CORE (score 68, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 579, winrate 34.7%, expectancy 0.42, PF 2.16
- Agrégé global : trades 718, winrate 30.5%, expectancy 0.26, PF 1.82, totalR 2.99, drawdown 12.00, série perdante max 9
- Forces : espérance positive (0.42) ; PF élevé (2.16) ; drawdown faible (0.07 × gain) ; compatible avec 2 familles de setup

### TYL — CORE (score 68, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 523, winrate 36.3%, expectancy 0.67, PF 3.19
- Agrégé global : trades 588, winrate 35.5%, expectancy 0.58, PF 3.15, totalR 4.55, drawdown 7.00, série perdante max 7
- Forces : espérance solide (0.67) ; PF élevé (3.19) ; drawdown faible (0.03 × gain) ; compatible avec 2 familles de setup

### CIBR — CORE (score 67, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 11, winrate 81.8%, expectancy 0.92, PF 2.88
- Agrégé global : trades 852, winrate 20.3%, expectancy -0.17, PF 0.84, totalR n/a, drawdown 26.17, série perdante max 19
- Forces : espérance solide (0.92) ; PF élevé (2.88) ; gagne 81.8 % des trades
- Risques : série de pertes longue (19 consécutives)

### PDD — CORE (score 67, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 121, winrate 46.3%, expectancy 0.48, PF 1.85
- Agrégé global : trades 900, winrate 24.1%, expectancy 0.12, PF 1.29, totalR 58.02, drawdown 14.63, série perdante max 7
- Forces : espérance positive (0.48) ; PF solide (1.85) ; drawdown faible (0.25 × gain) ; compatible avec 3 familles de setup

### ASML — CORE (score 66, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (4 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 11, winrate 81.8%, expectancy 0.89, PF 1.17
- Agrégé global : trades 756, winrate 31.5%, expectancy 0.28, PF 1.76, totalR 9.78, drawdown 14.00, série perdante max 13
- Forces : espérance solide (0.89) ; gagne 81.8 % des trades ; stable sur 4/5 années ; compatible avec 4 familles de setup
- Risques : drawdown supérieur au gain (1.43 × gain)

### BKNG — CORE (score 66, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 10, winrate 70.0%, expectancy 0.60, PF 1.50
- Agrégé global : trades 947, winrate 34.5%, expectancy 0.29, PF 2.32, totalR -2.37, drawdown 14.00, série perdante max 14
- Forces : espérance solide (0.60) ; PF solide (1.50) ; gagne 70.0 % des trades ; compatible avec 3 familles de setup

### CLOU — CORE (score 66, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 580, winrate 32.6%, expectancy 0.59, PF 2.47
- Agrégé global : trades 654, winrate 32.9%, expectancy 0.55, PF 2.38, totalR n/a, drawdown 13.76, série perdante max 11
- Forces : espérance solide (0.59) ; PF élevé (2.47) ; drawdown faible (0.06 × gain) ; compatible avec 2 familles de setup

### EA — CORE (score 66, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 20, winrate 65.0%, expectancy 0.47, PF 2.15
- Agrégé global : trades 809, winrate 21.8%, expectancy 0.04, PF 1.51, totalR -0.27, drawdown 18.06, série perdante max 11
- Forces : espérance positive (0.47) ; PF élevé (2.15) ; gagne 65.0 % des trades ; compatible avec 2 familles de setup

### ETH — CORE (score 66, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 81, winrate 51.9%, expectancy 0.48, PF 3.08
- Agrégé global : trades 990, winrate 30.9%, expectancy 0.29, PF 2.03, totalR 38.96, drawdown 11.63, série perdante max 6
- Forces : espérance positive (0.48) ; PF élevé (3.08) ; drawdown faible (0.30 × gain) ; compatible avec 3 familles de setup
- Risques : performance fortement dégradée en RISK_OFF

### FTEC — CORE (score 66, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 543, winrate 38.1%, expectancy 0.49, PF 2.57
- Agrégé global : trades 646, winrate 35.1%, expectancy 0.39, PF 2.29, totalR n/a, drawdown 20.96, série perdante max 12
- Forces : espérance positive (0.49) ; PF élevé (2.57) ; drawdown faible (0.10 × gain) ; compatible avec 2 familles de setup

### MELI — CORE (score 66, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 541, winrate 15.0%, expectancy 0.92, PF 2.39
- Agrégé global : trades 652, winrate 16.7%, expectancy 0.75, PF 2.33, totalR 7.27, drawdown 17.19, série perdante max 13
- Forces : espérance solide (0.92) ; PF élevé (2.39) ; drawdown faible (0.06 × gain) ; compatible avec 3 familles de setup

### SAP — CORE (score 66, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 607, winrate 41.0%, expectancy 0.56, PF 3.18
- Agrégé global : trades 680, winrate 39.1%, expectancy 0.50, PF 2.97, totalR -0.19, drawdown 17.93, série perdante max 14
- Forces : espérance solide (0.56) ; PF élevé (3.18) ; drawdown faible (0.07 × gain) ; compatible avec 2 familles de setup

### SHOP — CORE (score 66, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 619, winrate 33.4%, expectancy 0.32, PF 2.56
- Agrégé global : trades 794, winrate 32.6%, expectancy 0.23, PF 2.26, totalR -16.82, drawdown 11.09, série perdante max 11
- Forces : espérance positive (0.32) ; PF élevé (2.56) ; drawdown faible (0.06 × gain) ; compatible avec 2 familles de setup

### VGT — CORE (score 66, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 506, winrate 39.1%, expectancy 0.49, PF 2.49
- Agrégé global : trades 613, winrate 36.4%, expectancy 0.41, PF 2.26, totalR n/a, drawdown 23.07, série perdante max 13
- Forces : espérance positive (0.49) ; PF élevé (2.49) ; drawdown faible (0.12 × gain) ; compatible avec 2 familles de setup

### XLK — CORE (score 66, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 571, winrate 35.9%, expectancy 0.41, PF 2.36
- Agrégé global : trades 678, winrate 33.3%, expectancy 0.34, PF 2.12, totalR n/a, drawdown 16.50, série perdante max 13
- Forces : espérance positive (0.41) ; PF élevé (2.36) ; drawdown faible (0.09 × gain) ; compatible avec 2 familles de setup

### MSFT — CORE (score 65, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `VOLATILITY_COMPRESSION` — trades 21, winrate 52.4%, expectancy 0.71, PF 3.95
- Agrégé global : trades 784, winrate 18.2%, expectancy -0.26, PF 0.86, totalR n/a, drawdown 22.34, série perdante max 18
- Forces : espérance solide (0.71) ; PF élevé (3.95)
- Risques : série de pertes longue (18 consécutives)

### PATH — CORE (score 65, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 356, winrate 38.2%, expectancy 0.67, PF 3.46
- Agrégé global : trades 356, winrate 38.2%, expectancy 0.67, PF 3.46, totalR n/a, drawdown 11.00, série perdante max 6
- Forces : espérance solide (0.67) ; PF élevé (3.46) ; drawdown faible (0.05 × gain)

### USD — CORE (score 65, confiance HIGH)

- Profil d'allocation : `normal`
- Setups testés : 5 (4 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 422, winrate 30.3%, expectancy 0.36, PF 1.62
- Agrégé global : trades 722, winrate 37.1%, expectancy 0.30, PF 1.71, totalR 37.86, drawdown 29.58, série perdante max 5
- Forces : espérance positive (0.36) ; PF solide (1.62) ; drawdown faible (0.25 × gain) ; compatible avec 4 familles de setup

### COIN — TACTICAL (score 64, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 111, winrate 48.6%, expectancy 0.89, PF 1.94
- Agrégé global : trades 574, winrate 18.6%, expectancy -0.16, PF 0.78, totalR 98.27, drawdown 17.00, série perdante max 16
- Forces : espérance solide (0.89) ; PF solide (1.94) ; drawdown faible (0.17 × gain) ; compatible avec 3 familles de setup
- Risques : série de pertes longue (16 consécutives)

### HUBS — TACTICAL (score 64, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 10, winrate 80.0%, expectancy 0.94, PF 0.00
- Agrégé global : trades 581, winrate 33.7%, expectancy 0.37, PF 2.50, totalR 9.38, drawdown 8.00, série perdante max 5
- Forces : espérance solide (0.94) ; gagne 80.0 % des trades ; compatible avec 3 familles de setup
- Risques : PF sous 1 (0.00)

### ABNB — TACTICAL (score 63, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 677, winrate 30.1%, expectancy 0.39, PF 1.77
- Agrégé global : trades 744, winrate 28.6%, expectancy 0.32, PF 1.64, totalR -1.65, drawdown 10.00, série perdante max 10
- Forces : espérance positive (0.39) ; PF solide (1.77) ; drawdown faible (0.05 × gain) ; compatible avec 2 familles de setup

### DDOG — TACTICAL (score 63, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 20, winrate 55.0%, expectancy 0.33, PF 2.26
- Agrégé global : trades 579, winrate 26.1%, expectancy -0.03, PF 1.74, totalR -10.55, drawdown 14.00, série perdante max 14
- Forces : espérance positive (0.33) ; PF élevé (2.26) ; compatible avec 2 familles de setup

### ENTG — TACTICAL (score 63, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 11, winrate 72.7%, expectancy 0.65, PF 1.20
- Agrégé global : trades 427, winrate 37.9%, expectancy 0.44, PF 2.92, totalR 0.74, drawdown 8.18, série perdante max 7
- Forces : espérance solide (0.65) ; gagne 72.7 % des trades ; compatible avec 3 familles de setup
- Risques : drawdown supérieur au gain (11.05 × gain)

### PAYC — TACTICAL (score 63, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 406, winrate 32.3%, expectancy 0.47, PF 2.14
- Agrégé global : trades 512, winrate 30.5%, expectancy 0.36, PF 1.89, totalR 8.08, drawdown 7.00, série perdante max 7
- Forces : espérance positive (0.47) ; PF élevé (2.14) ; drawdown faible (0.04 × gain) ; compatible avec 2 familles de setup

### ADBE — TACTICAL (score 62, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 15, winrate 80.0%, expectancy 1.01, PF 0.00
- Agrégé global : trades 595, winrate 26.2%, expectancy -0.00, PF 1.18, totalR 15.23, drawdown 12.00, série perdante max 7
- Forces : espérance forte (1.01) ; gagne 80.0 % des trades ; compatible avec 3 familles de setup
- Risques : PF sous 1 (0.00)

### ARM — TACTICAL (score 61, confiance MEDIUM)

- Profil d'allocation : `reduced`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2024, 2025 (1 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 68, winrate 55.9%, expectancy 0.30, PF 1.49
- Agrégé global : trades 549, winrate 21.7%, expectancy -0.17, PF 0.75, totalR 20.78, drawdown 17.18, série perdante max 8
- Forces : espérance positive (0.30)

### BBAI — TACTICAL (score 61, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (4 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `VOLATILITY_COMPRESSION` — trades 14, winrate 50.0%, expectancy 0.82, PF 5.50
- Agrégé global : trades 645, winrate 26.2%, expectancy 0.01, PF 1.21, totalR 0.56, drawdown 38.01, série perdante max 6
- Forces : espérance solide (0.82) ; PF élevé (5.50) ; compatible avec 4 familles de setup
- Risques : drawdown supérieur au gain (67.88 × gain) ; performance fortement dégradée en RISK_OFF

### CHKP — TACTICAL (score 61, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 534, winrate 31.8%, expectancy 0.55, PF 1.94
- Agrégé global : trades 630, winrate 31.3%, expectancy 0.44, PF 1.75, totalR -10.26, drawdown 28.40, série perdante max 11
- Forces : espérance solide (0.55) ; PF solide (1.94) ; drawdown faible (0.14 × gain) ; stable sur 4/4 années ; compatible avec 2 familles de setup
- Risques : performance fortement dégradée en RISK_OFF

### COST — TACTICAL (score 61, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 701, winrate 32.5%, expectancy 0.47, PF 2.37
- Agrégé global : trades 804, winrate 31.6%, expectancy 0.38, PF 2.19, totalR -1.26, drawdown 14.00, série perdante max 14
- Forces : espérance positive (0.47) ; PF élevé (2.37) ; drawdown faible (0.06 × gain) ; compatible avec 2 familles de setup

### DSY — TACTICAL (score 61, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `BREAKOUT_EXPANSION` — trades 12, winrate 50.0%, expectancy 0.75, PF 3.25
- Agrégé global : trades 122, winrate 23.0%, expectancy -0.33, PF 1.06, totalR -6.42, drawdown 11.00, série perdante max 11
- Forces : espérance solide (0.75) ; PF élevé (3.25)

### SKYY — BLACKLIST (score 61, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 14, winrate 64.3%, expectancy 0.58, PF 0.40
- Agrégé global : trades 880, winrate 21.8%, expectancy 0.14, PF 1.50, totalR n/a, drawdown 30.00, série perdante max 14
- Forces : espérance solide (0.58) ; gagne 64.3 % des trades ; drawdown faible (0.23 × gain) ; compatible avec 2 familles de setup
- Risques : PF sous 1 (0.40)

### AKAM — TACTICAL (score 60, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 528, winrate 27.8%, expectancy 0.99, PF 1.95
- Agrégé global : trades 618, winrate 29.0%, expectancy 0.87, PF 1.82, totalR -0.55, drawdown 18.81, série perdante max 18
- Forces : espérance solide (0.99) ; PF solide (1.95) ; drawdown faible (0.06 × gain) ; compatible avec 2 familles de setup
- Risques : série de pertes longue (18 consécutives)

### CFLT — TACTICAL (score 60, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 240, winrate 30.8%, expectancy 0.37, PF 2.24
- Agrégé global : trades 240, winrate 30.8%, expectancy 0.37, PF 2.24, totalR n/a, drawdown 12.00, série perdante max 7
- Forces : espérance positive (0.37) ; PF élevé (2.24) ; drawdown faible (0.14 × gain)

### DT — TACTICAL (score 60, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 507, winrate 31.4%, expectancy 0.33, PF 2.15
- Agrégé global : trades 603, winrate 30.2%, expectancy 0.25, PF 1.94, totalR 2.16, drawdown 12.53, série perdante max 7
- Forces : espérance positive (0.33) ; PF élevé (2.15) ; drawdown faible (0.09 × gain)

### ON — TACTICAL (score 60, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 24, winrate 58.3%, expectancy 0.38, PF 1.82
- Agrégé global : trades 822, winrate 30.5%, expectancy 0.14, PF 1.81, totalR -38.55, drawdown 12.64, série perdante max 8
- Forces : espérance positive (0.38) ; PF solide (1.82) ; compatible avec 2 familles de setup

### SNPS — TACTICAL (score 60, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 642, winrate 29.3%, expectancy 0.36, PF 1.91
- Agrégé global : trades 642, winrate 29.3%, expectancy 0.36, PF 1.91, totalR n/a, drawdown 19.91, série perdante max 9
- Forces : espérance positive (0.36) ; PF solide (1.91) ; drawdown faible (0.09 × gain)

### AMKR — TACTICAL (score 59, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 39, winrate 53.8%, expectancy 0.34, PF 2.84
- Agrégé global : trades 783, winrate 19.9%, expectancy 0.01, PF 2.30, totalR 9.13, drawdown 13.24, série perdante max 11
- Forces : espérance positive (0.34) ; PF élevé (2.84) ; compatible avec 3 familles de setup
- Risques : drawdown supérieur au gain (1.45 × gain)

### TT — TACTICAL (score 59, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `VOLATILITY_COMPRESSION` — trades 10, winrate 50.0%, expectancy 0.55, PF 1.75
- Agrégé global : trades 679, winrate 22.2%, expectancy 0.14, PF 1.08, totalR 0.90, drawdown 22.30, série perdante max 14
- Forces : espérance solide (0.55) ; PF solide (1.75) ; compatible avec 2 familles de setup
- Risques : drawdown supérieur au gain (24.78 × gain)

### AMD — TACTICAL (score 58, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `BREAKOUT_EXPANSION` — trades 89, winrate 36.0%, expectancy 0.44, PF 2.86
- Agrégé global : trades 736, winrate 29.9%, expectancy 0.26, PF 1.88, totalR -52.15, drawdown 12.00, série perdante max 6
- Forces : espérance positive (0.44) ; PF élevé (2.86) ; compatible avec 3 familles de setup

### DOCN — TACTICAL (score 58, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 53, winrate 54.7%, expectancy 0.36, PF 1.12
- Agrégé global : trades 1103, winrate 31.4%, expectancy 0.23, PF 1.56, totalR 19.27, drawdown 13.24, série perdante max 11
- Forces : espérance positive (0.36) ; stable sur 4/5 années ; compatible avec 2 familles de setup

### QQQ — TACTICAL (score 58, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 579, winrate 30.9%, expectancy 0.35, PF 1.86
- Agrégé global : trades 670, winrate 28.7%, expectancy 0.27, PF 1.68, totalR n/a, drawdown 21.93, série perdante max 12
- Forces : espérance positive (0.35) ; PF solide (1.86) ; drawdown faible (0.15 × gain)

### SWKS — TACTICAL (score 58, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 33, winrate 42.4%, expectancy 0.30, PF 2.42
- Agrégé global : trades 431, winrate 29.2%, expectancy 0.20, PF 1.59, totalR 0.60, drawdown 8.00, série perdante max 8
- Forces : espérance positive (0.30) ; PF élevé (2.42) ; compatible avec 2 familles de setup
- Risques : drawdown supérieur au gain (13.33 × gain)

### BUG — TACTICAL (score 57, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 10, winrate 80.0%, expectancy 0.96, PF 0.00
- Agrégé global : trades 846, winrate 28.0%, expectancy 0.09, PF 1.44, totalR n/a, drawdown 28.66, série perdante max 16
- Forces : espérance solide (0.96) ; gagne 80.0 % des trades ; compatible avec 3 familles de setup
- Risques : PF sous 1 (0.00) ; série de pertes longue (16 consécutives)

### WM — TACTICAL (score 57, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 502, winrate 32.9%, expectancy 0.38, PF 1.67
- Agrégé global : trades 570, winrate 30.7%, expectancy 0.29, PF 1.53, totalR 0.12, drawdown 20.00, série perdante max 20
- Forces : espérance positive (0.38) ; PF solide (1.67) ; drawdown faible (0.16 × gain)
- Risques : série de pertes longue (20 consécutives)

### AVGO — TACTICAL (score 56, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (4 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `BREAKOUT_EXPANSION` — trades 100, winrate 30.0%, expectancy 0.31, PF 2.10
- Agrégé global : trades 1190, winrate 25.0%, expectancy 0.14, PF 1.57, totalR 6.67, drawdown 22.31, série perdante max 12
- Forces : espérance positive (0.31) ; PF élevé (2.10) ; compatible avec 4 familles de setup
- Risques : drawdown supérieur au gain (3.34 × gain)

### AI — TACTICAL (score 55, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (4 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 71, winrate 46.5%, expectancy 0.20, PF 1.50
- Agrégé global : trades 487, winrate 28.7%, expectancy 0.03, PF 1.00, totalR 12.24, drawdown 28.60, série perdante max 8
- Forces : PF solide (1.50) ; stable sur 4/5 années ; compatible avec 2 familles de setup
- Risques : drawdown supérieur au gain (2.34 × gain)

### ASX — BLACKLIST (score 55, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 14, winrate 78.6%, expectancy 0.82, PF 0.80
- Agrégé global : trades 1090, winrate 29.0%, expectancy 0.10, PF 1.38, totalR 0.15, drawdown 22.60, série perdante max 16
- Forces : espérance solide (0.82) ; gagne 78.6 % des trades ; compatible avec 3 familles de setup
- Risques : PF sous 1 (0.80) ; drawdown supérieur au gain (150.67 × gain) ; série de pertes longue (16 consécutives)

### CDNS — TACTICAL (score 55, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 712, winrate 19.4%, expectancy 0.13, PF 1.54
- Agrégé global : trades 712, winrate 19.4%, expectancy 0.13, PF 1.54, totalR n/a, drawdown 27.42, série perdante max 22
- Forces : PF solide (1.54) ; drawdown faible (0.30 × gain) ; stable sur 3/4 années
- Risques : série de pertes longue (22 consécutives)

### MSCI — BLACKLIST (score 55, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 11, winrate 81.8%, expectancy 0.82, PF 0.55
- Agrégé global : trades 887, winrate 22.0%, expectancy -0.04, PF 1.02, totalR 8.98, drawdown 25.00, série perdante max 18
- Forces : espérance solide (0.82) ; gagne 81.8 % des trades ; compatible avec 2 familles de setup
- Risques : PF sous 1 (0.55) ; drawdown supérieur au gain (2.78 × gain) ; série de pertes longue (18 consécutives)

### VRTX — TACTICAL (score 55, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 63, winrate 58.7%, expectancy 0.27, PF 3.02
- Agrégé global : trades 854, winrate 17.8%, expectancy -0.28, PF 0.66, totalR 16.90, drawdown 26.37, série perdante max 17
- Forces : PF élevé (3.02) ; compatible avec 2 familles de setup
- Risques : drawdown supérieur au gain (1.56 × gain) ; série de pertes longue (17 consécutives)

### NOW — TACTICAL (score 54, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 17, winrate 52.9%, expectancy 0.28, PF 1.82
- Agrégé global : trades 695, winrate 25.6%, expectancy 0.04, PF 1.32, totalR n/a, drawdown 20.00, série perdante max 14
- Forces : PF solide (1.82) ; compatible avec 3 familles de setup

### GEN — TACTICAL (score 53, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 464, winrate 28.0%, expectancy 0.23, PF 1.66
- Agrégé global : trades 464, winrate 28.0%, expectancy 0.23, PF 1.66, totalR n/a, drawdown 9.36, série perdante max 8
- Forces : PF solide (1.66) ; drawdown faible (0.09 × gain)

### AAPL — TACTICAL (score 51, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 764, winrate 25.3%, expectancy 0.20, PF 1.64
- Agrégé global : trades 860, winrate 25.2%, expectancy 0.15, PF 1.53, totalR -10.36, drawdown 22.29, série perdante max 15
- Forces : PF solide (1.64) ; drawdown faible (0.27 × gain)

### ADI — TACTICAL (score 51, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 886, winrate 25.5%, expectancy 0.21, PF 2.35
- Agrégé global : trades 955, winrate 25.2%, expectancy 0.18, PF 2.24, totalR -6.97, drawdown 15.00, série perdante max 11
- Forces : PF élevé (2.35) ; drawdown faible (0.10 × gain)

### BOTZ — TACTICAL (score 51, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 816, winrate 28.9%, expectancy 0.26, PF 1.97
- Agrégé global : trades 947, winrate 28.3%, expectancy 0.19, PF 1.81, totalR n/a, drawdown 14.30, série perdante max 8
- Forces : PF solide (1.97) ; drawdown faible (0.09 × gain) ; compatible avec 2 familles de setup

### LLY — TACTICAL (score 51, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 15, winrate 100.0%, expectancy 1.24, PF n/a
- Agrégé global : trades 850, winrate 26.7%, expectancy -0.06, PF 1.16, totalR 1.46, drawdown 28.53, série perdante max 15
- Forces : espérance forte (1.24) ; gagne 100.0 % des trades ; compatible avec 3 familles de setup
- Risques : drawdown supérieur au gain (19.54 × gain) ; performance fortement dégradée en RISK_OFF

### SYNA — TACTICAL (score 51, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (0 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 31, winrate 54.8%, expectancy 0.32, PF 1.61
- Agrégé global : trades 560, winrate 15.9%, expectancy -0.55, PF 0.39, totalR -45.26, drawdown 20.96, série perdante max 12
- Forces : espérance positive (0.32) ; PF solide (1.61)

### XSW — TACTICAL (score 51, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 531, winrate 23.7%, expectancy 0.28, PF 1.61
- Agrégé global : trades 531, winrate 23.7%, expectancy 0.28, PF 1.61, totalR n/a, drawdown 19.46, série perdante max 12
- Forces : PF solide (1.61) ; drawdown faible (0.13 × gain)

### SPGI — TACTICAL (score 50, confiance HIGH)

- Profil d'allocation : `reduced`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 20, winrate 60.0%, expectancy 0.39, PF 1.17
- Agrégé global : trades 825, winrate 28.4%, expectancy 0.15, PF 1.52, totalR 2.24, drawdown 21.03, série perdante max 19
- Forces : espérance positive (0.39) ; gagne 60.0 % des trades ; compatible avec 2 familles de setup
- Risques : drawdown supérieur au gain (9.39 × gain) ; série de pertes longue (19 consécutives)

### ADSK — BLACKLIST (score 49, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 20, winrate 50.0%, expectancy 0.32, PF 0.52
- Agrégé global : trades 689, winrate 17.1%, expectancy 0.08, PF 1.70, totalR n/a, drawdown 22.00, série perdante max 14
- Forces : espérance positive (0.32) ; drawdown faible (0.22 × gain) ; compatible avec 2 familles de setup
- Risques : PF sous 1 (0.52)

### ZEN — BLACKLIST (score 49, confiance LOW)

- Profil d'allocation : `none`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 76, winrate 36.8%, expectancy 0.37, PF 2.55
- Agrégé global : trades 76, winrate 36.8%, expectancy 0.37, PF 2.55, totalR n/a, drawdown 4.00, série perdante max 4
- Forces : espérance positive (0.37) ; PF élevé (2.55) ; drawdown faible (0.14 × gain)
- Risques : performance observée sur une seule période

### ESTC — BLACKLIST (score 48, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 46, winrate 54.3%, expectancy 0.59, PF 1.91
- Agrégé global : trades 689, winrate 22.6%, expectancy -0.01, PF 0.96, totalR -4.07, drawdown 10.00, série perdante max 8
- Forces : espérance solide (0.59) ; PF solide (1.91)
- Risques : performance fortement dégradée en RISK_OFF

### QRVO — BLACKLIST (score 48, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 589, winrate 30.1%, expectancy 0.13, PF 1.76
- Agrégé global : trades 636, winrate 30.2%, expectancy 0.11, PF 1.70, totalR -0.55, drawdown 20.73, série perdante max 14
- Forces : PF solide (1.76) ; compatible avec 2 familles de setup

### RMS — BLACKLIST (score 48, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 27, winrate 63.0%, expectancy 0.44, PF 0.91
- Agrégé global : trades 588, winrate 22.3%, expectancy -0.15, PF 1.13, totalR 11.96, drawdown 15.76, série perdante max 9
- Forces : espérance positive (0.44) ; gagne 63.0 % des trades ; compatible avec 2 familles de setup
- Risques : PF sous 1 (0.91) ; drawdown supérieur au gain (1.32 × gain)

### USDJPY — BLACKLIST (score 48, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 428, winrate 27.1%, expectancy 0.14, PF 1.42
- Agrégé global : trades 428, winrate 27.1%, expectancy 0.14, PF 1.42, totalR n/a, drawdown 15.96, série perdante max 10
- Forces : drawdown faible (0.27 × gain)

### ZS — BLACKLIST (score 47, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 30, winrate 56.7%, expectancy 0.38, PF 1.88
- Agrégé global : trades 885, winrate 16.4%, expectancy -0.33, PF 0.86, totalR 11.29, drawdown 27.43, série perdante max 25
- Forces : espérance positive (0.38) ; PF solide (1.88) ; compatible avec 2 familles de setup
- Risques : drawdown supérieur au gain (2.43 × gain) ; série de pertes longue (25 consécutives) ; performance fortement dégradée en RISK_OFF

### CRM — BLACKLIST (score 46, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 3 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 701, winrate 26.1%, expectancy 0.19, PF 1.43
- Agrégé global : trades 815, winrate 26.5%, expectancy 0.17, PF 1.42, totalR n/a, drawdown 12.37, série perdante max 10
- Forces : drawdown faible (0.09 × gain) ; compatible avec 3 familles de setup

### V — BLACKLIST (score 46, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 408, winrate 31.6%, expectancy 0.19, PF 1.24
- Agrégé global : trades 464, winrate 31.9%, expectancy 0.19, PF 1.25, totalR n/a, drawdown 10.27, série perdante max 10
- Forces : drawdown faible (0.19 × gain) ; compatible avec 2 familles de setup

### GBPUSD — BLACKLIST (score 45, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 553, winrate 30.2%, expectancy 0.22, PF 1.45
- Agrégé global : trades 553, winrate 30.2%, expectancy 0.22, PF 1.45, totalR n/a, drawdown 18.00, série perdante max 18
- Forces : drawdown faible (0.15 × gain)
- Risques : série de pertes longue (18 consécutives)

### IPGP — BLACKLIST (score 45, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 46, winrate 47.8%, expectancy 0.30, PF 1.63
- Agrégé global : trades 520, winrate 22.5%, expectancy 0.04, PF 1.37, totalR 1.59, drawdown 10.62, série perdante max 9
- Forces : PF solide (1.63) ; compatible avec 2 familles de setup
- Risques : drawdown supérieur au gain (6.68 × gain)

### MDB — BLACKLIST (score 45, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (0 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 48, winrate 52.1%, expectancy 0.34, PF 1.34
- Agrégé global : trades 1059, winrate 14.1%, expectancy -0.44, PF 0.49, totalR -0.57, drawdown 28.48, série perdante max 22
- Forces : espérance positive (0.34)
- Risques : série de pertes longue (22 consécutives)

### NET — BLACKLIST (score 45, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (4 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `VOLATILITY_COMPRESSION` — trades 15, winrate 53.3%, expectancy 0.80, PF 0.00
- Agrégé global : trades 1017, winrate 24.5%, expectancy -0.07, PF 1.15, totalR 25.63, drawdown 17.80, série perdante max 9
- Forces : espérance solide (0.80) ; compatible avec 4 familles de setup
- Risques : PF sous 1 (0.00) ; performance fortement dégradée en RISK_OFF

### PAYX — BLACKLIST (score 45, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 1 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 410, winrate 31.0%, expectancy 0.20, PF 1.69
- Agrégé global : trades 410, winrate 31.0%, expectancy 0.20, PF 1.69, totalR n/a, drawdown 18.00, série perdante max 18
- Forces : PF solide (1.69) ; drawdown faible (0.22 × gain)
- Risques : série de pertes longue (18 consécutives)

### FORM — BLACKLIST (score 44, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 41, winrate 51.2%, expectancy 0.30, PF 1.07
- Agrégé global : trades 921, winrate 27.1%, expectancy 0.08, PF 1.27, totalR -6.84, drawdown 15.83, série perdante max 12
- Forces : espérance positive (0.30) ; compatible avec 2 familles de setup

### IWM — BLACKLIST (score 42, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `BREAKOUT_EXPANSION` — trades 36, winrate 30.6%, expectancy 0.33, PF 1.81
- Agrégé global : trades 794, winrate 27.0%, expectancy -0.02, PF 1.33, totalR n/a, drawdown 31.67, série perdante max 19
- Forces : espérance positive (0.33) ; PF solide (1.81)
- Risques : série de pertes longue (19 consécutives)

### MDY — BLACKLIST (score 40, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 759, winrate 22.8%, expectancy 0.17, PF 1.47
- Agrégé global : trades 820, winrate 21.7%, expectancy 0.13, PF 1.38, totalR n/a, drawdown 26.96, série perdante max 18
- Forces : drawdown faible (0.26 × gain)
- Risques : série de pertes longue (18 consécutives)

### TSLA — BLACKLIST (score 40, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `BREAKOUT_EXPANSION` — trades 47, winrate 31.9%, expectancy 0.26, PF 2.08
- Agrégé global : trades 627, winrate 13.9%, expectancy -0.42, PF 0.73, totalR -66.85, drawdown 22.00, série perdante max 21
- Forces : PF élevé (2.08)
- Risques : série de pertes longue (21 consécutives)

### FDN — BLACKLIST (score 38, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 17, winrate 52.9%, expectancy 0.42, PF 0.49
- Agrégé global : trades 804, winrate 20.4%, expectancy 0.05, PF 1.26, totalR n/a, drawdown 21.01, série perdante max 16
- Forces : espérance positive (0.42) ; compatible avec 3 familles de setup
- Risques : PF sous 1 (0.49) ; drawdown supérieur au gain (1.07 × gain) ; série de pertes longue (16 consécutives)

### NESN — BLACKLIST (score 38, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 13, winrate 69.2%, expectancy 0.11, PF 0.82
- Agrégé global : trades 429, winrate 16.8%, expectancy -0.05, PF 1.00, totalR 1.44, drawdown 24.00, série perdante max 10
- Forces : gagne 69.2 % des trades
- Risques : PF sous 1 (0.82) ; drawdown supérieur au gain (16.67 × gain)

### TXN — BLACKLIST (score 38, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `VOLATILITY_COMPRESSION` — trades 11, winrate 36.4%, expectancy 0.36, PF 1.25
- Agrégé global : trades 610, winrate 10.3%, expectancy -0.47, PF 0.36, totalR n/a, drawdown 29.73, série perdante max 15
- Forces : espérance positive (0.36)

### TTD — BLACKLIST (score 36, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (3 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 860, winrate 25.3%, expectancy 0.18, PF 1.37
- Agrégé global : trades 996, winrate 25.5%, expectancy 0.12, PF 1.29, totalR -24.61, drawdown 12.00, série perdante max 12
- Forces : drawdown faible (0.12 × gain)
- Risques : performance fortement dégradée en RISK_OFF

### PD — BLACKLIST (score 35, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (0 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 34, winrate 47.1%, expectancy 0.22, PF 1.34
- Agrégé global : trades 556, winrate 6.3%, expectancy -0.45, PF 0.18, totalR -2.14, drawdown 21.71, série perdante max 11

### QCOM — BLACKLIST (score 35, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 10, winrate 60.0%, expectancy 0.35, PF 0.67
- Agrégé global : trades 708, winrate 17.1%, expectancy -0.29, PF 0.56, totalR -6.16, drawdown 10.06, série perdante max 10
- Forces : espérance positive (0.35) ; gagne 60.0 % des trades
- Risques : PF sous 1 (0.67) ; performance fortement dégradée en RISK_OFF

### LSCC — BLACKLIST (score 34, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 33, winrate 54.5%, expectancy 0.19, PF 0.79
- Agrégé global : trades 728, winrate 19.5%, expectancy -0.08, PF 1.21, totalR 6.27, drawdown 16.00, série perdante max 10
- Forces : compatible avec 2 familles de setup
- Risques : PF sous 1 (0.79) ; drawdown supérieur au gain (2.55 × gain)

### ONTO — BLACKLIST (score 34, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 14, winrate 50.0%, expectancy 0.24, PF 0.72
- Agrégé global : trades 809, winrate 25.0%, expectancy 0.10, PF 1.55, totalR -28.77, drawdown 17.00, série perdante max 10
- Forces : compatible avec 2 familles de setup
- Risques : PF sous 1 (0.72)

### TEAM — BLACKLIST (score 34, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `BREAKOUT_EXPANSION` — trades 28, winrate 32.1%, expectancy 0.29, PF 2.10
- Agrégé global : trades 681, winrate 19.7%, expectancy -0.21, PF 0.71, totalR -38.78, drawdown 20.00, série perdante max 14
- Forces : PF élevé (2.10) ; compatible avec 2 familles de setup
- Risques : performance fortement dégradée en RISK_OFF

### ROP — BLACKLIST (score 33, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 19, winrate 36.8%, expectancy 0.14, PF 0.85
- Agrégé global : trades 437, winrate 25.4%, expectancy 0.05, PF 1.20, totalR n/a, drawdown 10.00, série perdante max 8
- Forces : compatible avec 2 familles de setup
- Risques : PF sous 1 (0.85)

### DUOL — BLACKLIST (score 31, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `BREAKOUT_EXPANSION` — trades 80, winrate 26.3%, expectancy 0.24, PF 2.14
- Agrégé global : trades 603, winrate 31.3%, expectancy -0.12, PF 1.18, totalR -34.48, drawdown 18.95, série perdante max 11
- Forces : PF élevé (2.14)
- Risques : performance fortement dégradée en RISK_OFF

### IBIT — BLACKLIST (score 30, confiance MEDIUM)

- Profil d'allocation : `none`
- Setups testés : 5 (0 compatible(s))
- Années observées : 2024, 2025 (0 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 22, winrate 45.5%, expectancy -0.12, PF 1.64
- Agrégé global : trades 390, winrate 22.3%, expectancy -0.18, PF 0.87, totalR -2.74, drawdown 15.33, série perdante max 12
- Forces : PF solide (1.64)
- Risques : espérance non positive (-0.12) ; aucun gain net cumulé observé ; aucun setup réellement compatible

### S — BLACKLIST (score 28, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 18, winrate 38.9%, expectancy 0.08, PF 1.12
- Agrégé global : trades 387, winrate 24.5%, expectancy -0.30, PF 1.02, totalR -11.78, drawdown 11.38, série perdante max 10

### CRWV — BLACKLIST (score 27, confiance LOW)

- Profil d'allocation : `none`
- Setups testés : 2 (1 compatible(s))
- Années observées : 2025 (0 profitable(s))
- Meilleur setup : `RELATIVE_STRENGTH_ROTATION` — trades 21, winrate 38.1%, expectancy 0.12, PF 2.70
- Agrégé global : trades 29, winrate 27.6%, expectancy -0.19, PF 1.87, totalR 2.58, drawdown 17.35, série perdante max 4
- Forces : PF élevé (2.70)
- Risques : drawdown supérieur au gain (6.72 × gain) ; performance observée sur une seule période

### CAP — BLACKLIST (score 26, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (1 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `BREAKOUT_EXPANSION` — trades 18, winrate 16.7%, expectancy 0.28, PF 1.00
- Agrégé global : trades 187, winrate 11.8%, expectancy -0.16, PF 0.64, totalR n/a, drawdown 11.00, série perdante max 11

### HUBB — BLACKLIST (score 26, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 14, winrate 35.7%, expectancy 0.07, PF 0.21
- Agrégé global : trades 599, winrate 28.0%, expectancy 0.00, PF 1.21, totalR -3.76, drawdown 13.16, série perdante max 7
- Forces : compatible avec 3 familles de setup
- Risques : PF sous 1 (0.21)

### INTU — BLACKLIST (score 23, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (0 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 18, winrate 33.3%, expectancy 0.01, PF 0.42
- Agrégé global : trades 624, winrate 16.2%, expectancy -0.20, PF 0.77, totalR -0.44, drawdown 19.00, série perdante max 9
- Risques : PF sous 1 (0.42)

### MRVL — BLACKLIST (score 23, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 18, winrate 44.4%, expectancy 0.22, PF 0.83
- Agrégé global : trades 826, winrate 17.8%, expectancy -0.02, PF 1.04, totalR -5.72, drawdown 12.35, série perdante max 10
- Risques : PF sous 1 (0.83)

### OKTA — BLACKLIST (score 20, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 37, winrate 35.1%, expectancy 0.21, PF 0.74
- Agrégé global : trades 725, winrate 6.1%, expectancy -0.68, PF 0.13, totalR -37.17, drawdown 33.00, série perdante max 19
- Risques : PF sous 1 (0.74) ; série de pertes longue (19 consécutives)

### SPLK — BLACKLIST (score 16, confiance MEDIUM)

- Profil d'allocation : `none`
- Setups testés : 1 (0 compatible(s))
- Années observées : 2022, 2023 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 427, winrate 14.3%, expectancy -0.14, PF 0.78
- Agrégé global : trades 427, winrate 14.3%, expectancy -0.14, PF 0.78, totalR n/a, drawdown 18.37, série perdante max 12
- Risques : espérance non positive (-0.14) ; PF sous 1 (0.78) ; aucun gain net cumulé observé ; aucun setup réellement compatible

### WDAY — BLACKLIST (score 15, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (0 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 756, winrate 16.7%, expectancy -0.14, PF 1.03
- Agrégé global : trades 830, winrate 16.3%, expectancy -0.16, PF 0.97, totalR -0.68, drawdown 21.96, série perdante max 20
- Risques : espérance non positive (-0.14) ; aucun gain net cumulé observé ; série de pertes longue (20 consécutives) ; aucun setup réellement compatible

### SE — BLACKLIST (score 14, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (3 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (2 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 61, winrate 34.4%, expectancy 0.13, PF 0.85
- Agrégé global : trades 824, winrate 28.0%, expectancy 0.02, PF 1.37, totalR 7.92, drawdown 18.00, série perdante max 13
- Forces : compatible avec 3 familles de setup
- Risques : PF sous 1 (0.85) ; drawdown supérieur au gain (2.27 × gain) ; performance fortement dégradée en RISK_OFF

### ELV — BLACKLIST (score 13, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (2 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 34, winrate 35.3%, expectancy 0.13, PF 0.86
- Agrégé global : trades 772, winrate 19.6%, expectancy -0.01, PF 1.08, totalR 1.77, drawdown 28.32, série perdante max 20
- Forces : compatible avec 2 familles de setup
- Risques : PF sous 1 (0.86) ; drawdown supérieur au gain (16.00 × gain) ; série de pertes longue (20 consécutives) ; performance fortement dégradée en RISK_OFF

### SOUN — BLACKLIST (score 13, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (0 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `VOLATILITY_COMPRESSION` — trades 15, winrate 26.7%, expectancy -0.03, PF 0.54
- Agrégé global : trades 692, winrate 22.4%, expectancy -0.30, PF 0.73, totalR -17.07, drawdown 32.95, série perdante max 8
- Risques : espérance non positive (-0.03) ; PF sous 1 (0.54) ; aucun gain net cumulé observé ; aucun setup réellement compatible

### RBRK — BLACKLIST (score 12, confiance MEDIUM)

- Profil d'allocation : `none`
- Setups testés : 1 (0 compatible(s))
- Années observées : 2024, 2025 (0 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 76, winrate 10.5%, expectancy -0.54, PF 0.27
- Agrégé global : trades 76, winrate 10.5%, expectancy -0.54, PF 0.27, totalR n/a, drawdown 4.00, série perdante max 4
- Risques : espérance non positive (-0.54) ; PF sous 1 (0.27) ; aucun gain net cumulé observé ; aucun setup réellement compatible

### HCP — BLACKLIST (score 11, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 1 (0 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (0 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 102, winrate 0.0%, expectancy -0.92, PF 0.00
- Agrégé global : trades 102, winrate 0.0%, expectancy -0.92, PF 0.00, totalR n/a, drawdown 13.00, série perdante max 13
- Risques : espérance non positive (-0.92) ; PF sous 1 (0.00) ; aucun gain net cumulé observé ; aucun setup réellement compatible

### INTC — BLACKLIST (score 11, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 1 (0 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 606, winrate 14.9%, expectancy -0.22, PF 0.82
- Agrégé global : trades 606, winrate 14.9%, expectancy -0.22, PF 0.82, totalR n/a, drawdown 18.71, série perdante max 13
- Risques : espérance non positive (-0.22) ; PF sous 1 (0.82) ; aucun gain net cumulé observé ; aucun setup réellement compatible

### SNOW — BLACKLIST (score 11, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (1 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `MEAN_REVERSION` — trades 37, winrate 40.5%, expectancy 0.07, PF 0.85
- Agrégé global : trades 476, winrate 18.3%, expectancy -0.18, PF 1.15, totalR -20.75, drawdown 17.12, série perdante max 12
- Risques : PF sous 1 (0.85) ; performance fortement dégradée en RISK_OFF

### EURUSD — BLACKLIST (score 10, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 1 (0 compatible(s))
- Années observées : 2022, 2023, 2024, 2025 (0 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 456, winrate 20.0%, expectancy -0.28, PF 0.64
- Agrégé global : trades 456, winrate 20.0%, expectancy -0.28, PF 0.64, totalR n/a, drawdown 33.30, série perdante max 24
- Risques : espérance non positive (-0.28) ; PF sous 1 (0.64) ; aucun gain net cumulé observé ; série de pertes longue (24 consécutives) ; aucun setup réellement compatible

### LVMH — BLACKLIST (score 10, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (0 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 816, winrate 13.5%, expectancy -0.07, PF 0.72
- Agrégé global : trades 877, winrate 13.8%, expectancy -0.08, PF 0.70, totalR 2.89, drawdown 39.06, série perdante max 18
- Risques : espérance non positive (-0.07) ; PF sous 1 (0.72) ; aucun gain net cumulé observé ; série de pertes longue (18 consécutives) ; aucun setup réellement compatible

### TLT — BLACKLIST (score 10, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 3 (0 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 528, winrate 10.2%, expectancy -0.39, PF 0.63
- Agrégé global : trades 543, winrate 10.5%, expectancy -0.39, PF 0.62, totalR n/a, drawdown 39.27, série perdante max 19
- Risques : espérance non positive (-0.39) ; PF sous 1 (0.63) ; aucun gain net cumulé observé ; série de pertes longue (19 consécutives) ; aucun setup réellement compatible

### UBER — BLACKLIST (score 10, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 5 (0 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (1 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 879, winrate 15.2%, expectancy -0.32, PF 0.68
- Agrégé global : trades 986, winrate 15.5%, expectancy -0.32, PF 0.67, totalR -11.32, drawdown 25.36, série perdante max 20
- Risques : espérance non positive (-0.32) ; PF sous 1 (0.68) ; aucun gain net cumulé observé ; série de pertes longue (20 consécutives) ; aucun setup réellement compatible

### TTE — BLACKLIST (score 1, confiance HIGH)

- Profil d'allocation : `none`
- Setups testés : 4 (0 compatible(s))
- Années observées : 2021, 2022, 2023, 2024, 2025 (0 profitable(s))
- Meilleur setup : `PULLBACK_MOMENTUM` — trades 555, winrate 14.4%, expectancy -0.42, PF 0.54
- Agrégé global : trades 639, winrate 15.6%, expectancy -0.43, PF 0.68, totalR -21.33, drawdown 26.75, série perdante max 15
- Risques : espérance non positive (-0.42) ; PF sous 1 (0.54) ; aucun gain net cumulé observé ; aucun setup réellement compatible ; performance fortement dégradée en RISK_OFF
