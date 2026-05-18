# Tradable Universe — ManiTradePro

> Généré le 2026-05-18T10:21:16.623Z par `tools/backtests/tradable-universe-v1.mjs`.

Consolidation officielle des 5 moteurs quant en une décision finale par cellule (`symbol × setup × variant × regime`). Mode régime canonique : `ALL_REGIMES`.

## 1. Résumé global

- Cellules évaluées : **10878**

Distribution par décision :

| Décision | Nombre | % |
|---|---:|---:|
| ALLOW | 346 | 3.2% |
| REDUCE | 10 | 0.1% |
| EXPERIMENTAL | 182 | 1.7% |
| BLOCK | 10340 | 95.1% |

Composite tier :

| Tier | Nombre | Allocation |
|---|---:|---|
| A | 183 | normal |
| B | 163 | normal |
| C | 10 | reduced |
| D | 182 | micro |
| BLOCKED | 10340 | none |

Rejets par filtre :

| Filtre | Cellules rejetées |
|---|---:|
| asset-quality (tier BLACKLIST) | 3006 |
| asset-setup-matrix (AVOID/WEAK) | 3582 |
| setup-variant-matrix (AVOID/WEAK) | 1908 |
| variant-regime-matrix (AVOID/WEAK) | 1396 |
| walk-forward (FAIL ou WF insuff. sans base très forte) | 448 |
| données absentes pour un filtre | 0 |
| politique (autres règles dures) | 0 |

## 2. Top ALLOW par régime (tier A puis B)

### RANGE

| Symbole | Setup | Variante | Tier | Confiance | Score VR | WF | Allocation |
|---|---|---|---|---|---:|---|---|
| BNB | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | A | HIGH | 62 | PASS | normal |
| BNB | PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | A | HIGH | 55 | PASS | normal |
| BNB | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | B | MEDIUM | 50 | PASS | normal |

### RISK_ON

| Symbole | Setup | Variante | Tier | Confiance | Score VR | WF | Allocation |
|---|---|---|---|---|---:|---|---|
| VUG | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | A | HIGH | 95 | PASS | normal |
| SPYG | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | A | HIGH | 95 | PASS | normal |
| APP | RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | A | HIGH | 95 | PASS | normal |
| IYW | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | A | HIGH | 95 | PASS | normal |
| SOXQ | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | A | HIGH | 95 | PASS | normal |
| VRNS | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | A | HIGH | 95 | PASS | normal |
| VRNS | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | A | HIGH | 95 | PASS | normal |
| VRNS | PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | A | HIGH | 95 | PASS | normal |
| APLD | RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | A | HIGH | 92 | PASS | normal |
| FICO | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | A | HIGH | 90 | PASS | normal |
| FICO | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | A | HIGH | 90 | PASS | normal |
| ABNB | PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | A | HIGH | 90 | PASS | normal |
| VUG | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | A | HIGH | 90 | PASS | normal |
| IGM | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | A | HIGH | 90 | PASS | normal |
| PSI | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | A | HIGH | 90 | PASS | normal |
| SOXQ | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | A | HIGH | 90 | PASS | normal |
| VRNS | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | A | HIGH | 90 | PASS | normal |
| ANET | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | A | HIGH | 90 | PASS | normal |
| CLOU | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | A | HIGH | 90 | PASS | normal |
| PSI | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | A | HIGH | 90 | PASS | normal |
| SOXQ | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | A | HIGH | 90 | PASS | normal |
| SOXQ | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | A | HIGH | 90 | PASS | normal |
| ANET | PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | A | HIGH | 90 | PASS | normal |
| PSI | PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | A | HIGH | 90 | PASS | normal |
| PANW | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | A | HIGH | 87 | PASS | normal |
_318 cellules supplémentaires non listées_

### RISK_OFF

_aucune cellule ALLOW dans ce régime_

## 3. Top REDUCE

| Symbole | Setup | Variante | Régime | Score VR | WF | Raison principale |
|---|---|---|---|---:|---|---|
| ROM | PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | RISK_ON | 90 | PASS | WF PASS — test 2024-2025 confirme train 2021-2023 |
| ROM | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RISK_ON | 80 | PASS | WF PASS — test 2024-2025 confirme train 2021-2023 |
| ROM | PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.1 | RISK_ON | 75 | PASS | WF PASS — test 2024-2025 confirme train 2021-2023 |
| ROM | PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | RISK_ON | 75 | PASS | WF PASS — test 2024-2025 confirme train 2021-2023 |
| ROM | PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | RISK_ON | 65 | PASS | WF PASS — test 2024-2025 confirme train 2021-2023 |
| PANW | PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | RISK_ON | 60 | WATCH | WF WATCH — score drop 59% |
| GLD | PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | RISK_ON | 60 | WATCH | WF WATCH — score drop 68% |
| ROM | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RISK_ON | 57 | PASS | WF PASS — test 2024-2025 confirme train 2021-2023 |
| LIN | PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | RANGE | 55 | WATCH | WF WATCH — score drop 65% |
| USD | BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | RISK_ON | 55 | PASS | WF PASS — test 2024-2025 confirme train 2021-2023 |

## 4. EXPERIMENTAL à surveiller

| Symbole | Setup | Variante | Régime | Base VR | WF | Raison |
|---|---|---|---|---|---|---|
| CRWD | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| VRNS | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| CRWD | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| VRNS | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| VRNS | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| VRNS | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| CRWD | PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| ETN | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| SIE | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RISK_ON | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| APP | RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RISK_ON | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| PLTR | RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RISK_ON | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| PLTR | RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| VRNS | PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| ACLS | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| ANET | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| CAMT | RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| SOL | RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| SOL | RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| ACLS | RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| ANET | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| ETH | RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RISK_ON | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| AVAX | RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| VUG | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RISK_ON | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| WCLD | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | RISK_ON | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| MA | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop1.0 | RISK_ON | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| SPYG | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop1.0 | RISK_ON | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| CRWD | PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| CRWD | PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.5 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| CRWD | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
| CRWD | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | RANGE | STRONG | INSUFFICIENT_DATA | WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM) |
_152 cellules supplémentaires non listées_

## 5. BLOCK importants (STRONG-base bloquées par walk-forward)

Ces cellules étaient STRONG dans la matrice variant-regime mais sont bloquées par le walk-forward. **Anti-surajustement actif.**

| Symbole | Setup | Variante | Régime | Train (exp/PF) | Test (exp/PF) | Raison WF |
|---|---|---|---|---|---|---|
| APP | RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RANGE | 1.74 / 3.76 | 0.49 / 0.28 | walk-forward FAIL (test drawdown 7.06 > 2× totalR 1.95) |
| APP | RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RANGE | 1.62 / 3.21 | 0.18 / 1.21 | walk-forward FAIL (test drawdown 1.63 > 2× totalR 0.35) |
| BTC | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RANGE | 1.20 / 5.07 | -0.05 / 1.07 | walk-forward FAIL (test expectancy -0.05 avec 14 trades) |
| BTC | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RANGE | 1.82 / 16.32 | 0.14 / 1.42 | walk-forward FAIL (test drawdown 4.00 > 2× totalR 1.29) |
| BTC | PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | RANGE | 1.48 / 5.07 | -0.05 / 1.07 | walk-forward FAIL (test expectancy -0.05 avec 14 trades) |

## 6. Cas focus par actif

### NVDA

Distribution : ALLOW 1 / REDUCE 0 / EXPERIMENTAL 5 / BLOCK 63 (total 69).

| Setup | Variante | Régime | Décision | Tier | Confiance | Allocation |
|---|---|---|---|---|---|---|
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | RISK_ON | ALLOW | B | MEDIUM | normal |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RISK_ON | EXPERIMENTAL | D | MEDIUM | micro |
| PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RANGE | EXPERIMENTAL | D | HIGH | micro |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |

### PLTR

Distribution : ALLOW 5 / REDUCE 0 / EXPERIMENTAL 11 / BLOCK 44 (total 60).

| Setup | Variante | Régime | Décision | Tier | Confiance | Allocation |
|---|---|---|---|---|---|---|
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RISK_ON | ALLOW | B | MEDIUM | normal |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RISK_ON | ALLOW | B | MEDIUM | normal |
| PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | RISK_ON | ALLOW | B | MEDIUM | normal |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | RISK_ON | ALLOW | B | MEDIUM | normal |
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | RISK_ON | ALLOW | B | MEDIUM | normal |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RISK_ON | EXPERIMENTAL | D | HIGH | micro |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | EXPERIMENTAL | D | MEDIUM | micro |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |
| PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |
_1 cellules supplémentaires non listées_

### APP

Distribution : ALLOW 1 / REDUCE 0 / EXPERIMENTAL 1 / BLOCK 64 (total 66).

| Setup | Variante | Régime | Décision | Tier | Confiance | Allocation |
|---|---|---|---|---|---|---|
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | ALLOW | A | HIGH | normal |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RISK_ON | EXPERIMENTAL | D | HIGH | micro |

### SMCI

Distribution : ALLOW 2 / REDUCE 0 / EXPERIMENTAL 5 / BLOCK 76 (total 83).

| Setup | Variante | Régime | Décision | Tier | Confiance | Allocation |
|---|---|---|---|---|---|---|
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | RISK_ON | ALLOW | B | MEDIUM | normal |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | RISK_ON | ALLOW | B | MEDIUM | normal |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RANGE | EXPERIMENTAL | D | HIGH | micro |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | EXPERIMENTAL | D | MEDIUM | micro |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RISK_OFF | EXPERIMENTAL | D | MEDIUM | micro |
| BREAKOUT_EXPANSION | breakout_h20_vol1.5_stop1_rr2 | RISK_ON | EXPERIMENTAL | D | MEDIUM | micro |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |

### AVGO

Distribution : ALLOW 0 / REDUCE 0 / EXPERIMENTAL 0 / BLOCK 73 (total 73).

_aucune cellule tradable_

### SOXL

Distribution : ALLOW 0 / REDUCE 0 / EXPERIMENTAL 0 / BLOCK 65 (total 65). ⚠ ETF leveragé (cap REDUCE)

_aucune cellule tradable_

### BTC

Distribution : ALLOW 0 / REDUCE 0 / EXPERIMENTAL 1 / BLOCK 71 (total 72).

| Setup | Variante | Régime | Décision | Tier | Confiance | Allocation |
|---|---|---|---|---|---|---|
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | RANGE | EXPERIMENTAL | D | HIGH | micro |

### SOL

Distribution : ALLOW 2 / REDUCE 0 / EXPERIMENTAL 5 / BLOCK 59 (total 66).

| Setup | Variante | Régime | Décision | Tier | Confiance | Allocation |
|---|---|---|---|---|---|---|
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | ALLOW | B | MEDIUM | normal |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | RISK_ON | ALLOW | A | HIGH | normal |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RANGE | EXPERIMENTAL | D | MEDIUM | micro |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RISK_ON | EXPERIMENTAL | D | MEDIUM | micro |
| BREAKOUT_EXPANSION | breakout_h50_vol1.5_stop1.5_rr2.5 | RANGE | EXPERIMENTAL | D | HIGH | micro |
| BREAKOUT_EXPANSION | breakout_h20_vol1.5_stop1_rr2 | RANGE | EXPERIMENTAL | D | HIGH | micro |

### COIN

Distribution : ALLOW 1 / REDUCE 0 / EXPERIMENTAL 0 / BLOCK 53 (total 54).

| Setup | Variante | Régime | Décision | Tier | Confiance | Allocation |
|---|---|---|---|---|---|---|
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | ALLOW | B | MEDIUM | normal |

### MSTR

Distribution : ALLOW 4 / REDUCE 0 / EXPERIMENTAL 0 / BLOCK 62 (total 66).

| Setup | Variante | Régime | Décision | Tier | Confiance | Allocation |
|---|---|---|---|---|---|---|
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | ALLOW | B | MEDIUM | normal |
| BREAKOUT_EXPANSION | breakout_h20_vol1.5_stop1_rr2 | RISK_ON | ALLOW | B | MEDIUM | normal |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RISK_ON | ALLOW | B | MEDIUM | normal |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | RISK_ON | ALLOW | B | MEDIUM | normal |

## 7. Risques connus

| Risque | Cellules tradables concernées |
|---|---:|
| ETF à effet de levier — profil de risque non-linéaire, le moteur ne le détecte pas seul | 8 |
| setup non prioritaire (Mean Reversion / Volatility Compression) | 4 |

## 8. Limites de fiabilité

- **Dépend des 5 sources** : si l'une est obsolète ou manquante, des cellules entières peuvent passer à BLOCK ou disparaître. Toujours relancer les 5 moteurs avant ce consolidateur.
- **Mode régime canonique unique** : on n'évalue que `ALL_REGIMES`. Les modes `NO_RISK_OFF` et `RISK_ON_ONLY` du backtest RS regime sont des filtres opérationnels dérivés, pas évalués séparément ici (ils donnent des chiffres identiques par cellule individuelle).
- **Setups non-prioritaires** (MEAN_REVERSION, VOLATILITY_COMPRESSION) ne peuvent jamais sortir ALLOW. Au mieux EXPERIMENTAL avec base très forte. Politique stricte.
- **Leveraged ETFs** : SOXL, USD, ROM sont systématiquement capés REDUCE. Liste à étendre si l'univers ajoute TQQQ, SQQQ, UPRO, etc.
- **Aucun coût de transaction** : la décision ne tient pas compte du slippage, du spread, des frais ou des gaps. Une cellule ALLOW peut redevenir non rentable avec frictions réelles. Priorité #3 du TODO quant.
- **Walk-forward unique** : un seul split 2021-2023 / 2024-2025. Une cellule INSUFFICIENT_DATA promue EXPERIMENTAL doit être manipulée prudemment.
- **Verdict ALLOW ≠ autorisation live** : ce tradable universe alimente un futur allocation-engine et sert de filtre amont. Le passage à l'argent réel reste conditionné à : paper trading live validé, gestion du risque opérationnelle, kill-switch testé, connecteur broker.

## 9. Recommandations pour allocation-engine-v1

- **Lecture de ce JSON** : `cells[].decision` + `compositeTier` + `recommendedAllocationProfile` est suffisant pour décider qui est autorisé.
- **Sizing par tier** :
  - `A` (ALLOW + HIGH confidence + priority setup + non-leveraged) → allocation pleine (à calibrer, ex. 1×).
  - `B` (ALLOW autre) → allocation pleine (à calibrer, ex. 1×).
  - `C` (REDUCE) → allocation réduite (ex. 0.5×).
  - `D` (EXPERIMENTAL) → allocation micro (ex. 0.25×) — uniquement si tracking actif et tolérance perte.
  - `BLOCKED` → 0.
- **Exposition globale** : ne pas dépasser N positions ALLOW simultanées (M à calibrer). Privilégier diversification setup × régime × secteur.
- **Gestion RISK_OFF macro** : quand le régime macro courant est RISK_OFF, ne considérer que les cellules dont `regime === "RISK_OFF"` ET dont la décision est ALLOW/REDUCE (très peu — confirme que RISK_OFF doit forcer une réduction d'exposition générale).
- **Stop & kill-switch** : si le résultat live (paper trading) diverge significativement du test 2024-2025 sur N trades consécutifs, dégrader temporairement la cellule à C ou D.
