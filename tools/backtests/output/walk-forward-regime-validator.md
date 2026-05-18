# Walk-Forward Regime Validator — ManiTradePro

> Généré le 2026-05-18T09:21:56.876Z par `tools/backtests/walk-forward-regime-validator-v1.mjs`.

Split : TRAIN = 2021-2022-2023 | TEST = 2024-2025.

Mode régime canonique : `ALL_REGIMES` (le mode contient les trades par régime individuel, sans filtre opérationnel).

## 1. Résumé global

- Cellules analysées : **9509**
- Actifs uniques : **181**
- Variantes uniques : **27**

Distribution :

| Tier walk-forward | Nombre | % |
|---|---:|---:|
| PASS | 729 | 7.7% |
| WATCH | 46 | 0.5% |
| FAIL | 575 | 6.0% |
| INSUFFICIENT_DATA | 8159 | 85.8% |

Par setup :

| Setup | PASS | WATCH | FAIL | INSUFFICIENT_DATA |
|---|---:|---:|---:|---:|
| BREAKOUT_EXPANSION | 75 | 3 | 98 | 1090 |
| MEAN_REVERSION | 7 | 0 | 11 | 970 |
| PULLBACK_MOMENTUM | 631 | 41 | 455 | 5393 |
| RELATIVE_STRENGTH_ROTATION | 14 | 0 | 9 | 397 |
| VOLATILITY_COMPRESSION | 2 | 2 | 2 | 309 |

Cross-check baseTier (variant-regime-matrix) × walkForwardTier :

| Base tier | PASS | WATCH | FAIL | INSUFFICIENT_DATA |
|---|---:|---:|---:|---:|
| STRONG | 304 | 0 | 7 | 246 |
| OK | 216 | 4 | 16 | 814 |
| WEAK | 134 | 26 | 31 | 926 |
| AVOID | 75 | 16 | 521 | 6173 |
| null | 0 | 0 | 0 | 0 |

## 2. Cellules `STRONG` qui échouent en walk-forward

Ces cellules étaient classées STRONG sur l'historique global mais ratent le test 2024-2025. À retirer du tradable-universe.

| Symbole | Setup | Variante | Régime | Train (trades / exp / PF) | Test (trades / exp / PF) | Raison |
|---|---|---|---|---|---|---|
| APP | RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RANGE | 14 / 1.74 / 3.76 | 4 / 0.49 / 0.28 | test drawdown 7.06 > 2× totalR 1.95 |
| TTWO | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | RANGE | 6 / 1.62 / 10.73 | 6 / 0.07 / 2.02 | test drawdown 1.00 > 2× totalR 0.42 |
| BTC | PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | RANGE | 16 / 1.48 / 5.07 | 14 / -0.05 / 1.07 | test expectancy -0.05 avec 14 trades |
| USDJPY | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RANGE | 19 / 1.08 / 5.03 | 10 / 0.02 / 1.47 | test drawdown 2.00 > 2× totalR 0.19 |
| APP | RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RANGE | 12 / 1.62 / 3.21 | 2 / 0.18 / 1.21 | test drawdown 1.63 > 2× totalR 0.35 |
| BTC | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RANGE | 14 / 1.20 / 5.07 | 14 / -0.05 / 1.07 | test expectancy -0.05 avec 14 trades |
| BTC | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RANGE | 9 / 1.82 / 16.32 | 9 / 0.14 / 1.42 | test drawdown 4.00 > 2× totalR 1.29 |

## 3. Cellules `STRONG` confirmées PASS

Cellules STRONG validées par le test (304 cellules).

| Symbole | Setup | Variante | Régime | Train | Test | Score drop |
|---|---|---|---|---|---|---:|
| AAPL | PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | RISK_ON | t=6 exp=4.06 PF=12.08 | t=14 exp=0.06 PF=4.46 | 45% |
| CRM | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | RISK_ON | t=5 exp=1.97 PF=10.87 | t=11 exp=0.48 PF=6.72 | 36% |
| FICO | PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | RISK_ON | t=3 exp=14.28 PF=41.50 | t=29 exp=1.09 PF=5.55 | 7% |
| FICO | PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | RISK_ON | t=3 exp=14.28 PF=41.50 | t=21 exp=0.65 PF=4.51 | 19% |
| FICO | PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.5 | RISK_ON | t=3 exp=1.91 PF=5.05 | t=17 exp=1.40 PF=22.70 | -3% |
| FICO | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RISK_ON | t=3 exp=14.28 PF=41.50 | t=21 exp=0.65 PF=4.51 | 19% |
| FICO | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RISK_ON | t=3 exp=14.28 PF=41.50 | t=29 exp=1.09 PF=5.55 | 7% |
| FICO | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | RISK_ON | t=3 exp=1.91 PF=5.05 | t=17 exp=1.40 PF=22.70 | -3% |
| FICO | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | RISK_ON | t=3 exp=1.91 PF=5.05 | t=22 exp=1.50 PF=32.01 | -3% |
| DELL | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RISK_ON | t=4 exp=3.81 PF=16.23 | t=22 exp=0.97 PF=6.58 | 19% |
| DELL | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RISK_ON | t=4 exp=3.81 PF=16.23 | t=26 exp=1.01 PF=7.13 | 7% |
| DELL | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | RISK_ON | t=4 exp=2.26 PF=10.03 | t=17 exp=0.56 PF=5.33 | 19% |
| DELL | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | RISK_ON | t=4 exp=2.26 PF=10.03 | t=18 exp=0.62 PF=6.97 | 19% |
| DELL | PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | RISK_ON | t=3 exp=3.63 PF=11.89 | t=14 exp=1.14 PF=1.60 | 19% |
| PANW | PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.5 | RISK_ON | t=5 exp=0.73 PF=2.82 | t=16 exp=1.02 PF=3.72 | -13% |
| PANW | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.5 | RISK_ON | t=5 exp=0.73 PF=2.82 | t=16 exp=1.02 PF=3.72 | -13% |
| FICO | PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.1 | RISK_ON | t=2 exp=20.25 PF=41.50 | t=15 exp=0.20 PF=3.33 | 28% |
| FICO | PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_5_stop0.5 | RISK_ON | t=2 exp=2.02 PF=5.05 | t=11 exp=1.30 PF=8.33 | -3% |
| FICO | PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.1 | RISK_ON | t=2 exp=20.25 PF=41.50 | t=15 exp=0.20 PF=3.33 | 28% |
| FICO | PULLBACK_MOMENTUM | rsi42_58_chg20_5_stop0.5 | RISK_ON | t=2 exp=2.02 PF=5.05 | t=11 exp=1.30 PF=8.33 | -3% |
| SHOP | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RISK_ON | t=3 exp=0.76 PF=3.29 | t=18 exp=0.48 PF=3.26 | 28% |
| ABNB | PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | RISK_ON | t=2 exp=1.23 PF=3.47 | t=18 exp=1.08 PF=4.36 | -11% |
| SHOP | PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | RISK_ON | t=3 exp=0.76 PF=3.29 | t=21 exp=0.53 PF=4.85 | 5% |
| SOUN | RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | t=2 exp=2.44 PF=5.65 | t=18 exp=1.07 PF=2.13 | -11% |
| TTD | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RISK_ON | t=6 exp=0.74 PF=2.48 | t=19 exp=0.57 PF=2.07 | 10% |
| GOOGL | PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | RISK_ON | t=10 exp=13.26 PF=31.83 | t=26 exp=1.03 PF=3.59 | -5% |
| CIBR | PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | RISK_ON | t=2 exp=0.54 PF=2.07 | t=10 exp=1.12 PF=2.55 | -20% |
| CIBR | PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RISK_ON | t=2 exp=0.54 PF=2.07 | t=10 exp=1.12 PF=2.55 | -20% |
| CIBR | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RISK_ON | t=2 exp=0.54 PF=2.07 | t=25 exp=0.52 PF=2.10 | 0% |
| VUG | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RISK_ON | t=4 exp=0.71 PF=2.42 | t=26 exp=1.79 PF=7.37 | -25% |
| ... | | | | | | 274 cellules supplémentaires non listées |

## 4. Cellules Breakout suspectes (STRONG ou OK → FAIL ou WATCH)

_aucune cellule Breakout STRONG/OK ne tombe en FAIL/WATCH_

## 5. Cas focus par actif

### NVDA

Distribution : PASS 2 / WATCH 0 / FAIL 1 / INSUFFICIENT_DATA 59 (total 62).

| Setup | Variante | Régime | Base | WF | Train (t/exp/PF) | Test (t/exp/PF) | Score drop |
|---|---|---|---|---|---|---|---:|
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | RISK_ON | STRONG | PASS | 2/-1.00/0.00 | 16/0.69/3.66 | 0% |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | RISK_ON | STRONG | PASS | 2/-0.50/0.00 | 16/1.03/4.57 | 0% |

### SOXL

Distribution : PASS 2 / WATCH 0 / FAIL 1 / INSUFFICIENT_DATA 56 (total 59).

| Setup | Variante | Régime | Base | WF | Train (t/exp/PF) | Test (t/exp/PF) | Score drop |
|---|---|---|---|---|---|---|---:|
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RISK_ON | AVOID | PASS | 4/-5.19/0.00 | 15/1.13/2.08 | 0% |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | OK | PASS | 3/-4.44/0.00 | 16/0.97/2.98 | 0% |

### PLTR

Distribution : PASS 5 / WATCH 0 / FAIL 0 / INSUFFICIENT_DATA 47 (total 52).

| Setup | Variante | Régime | Base | WF | Train (t/exp/PF) | Test (t/exp/PF) | Score drop |
|---|---|---|---|---|---|---|---:|
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | RISK_ON | OK | PASS | 1/4.40/n/a | 13/0.31/1.59 | 7% |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | RISK_ON | OK | PASS | 1/4.40/n/a | 12/0.43/1.89 | 7% |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RISK_ON | OK | PASS | 1/4.40/n/a | 12/0.43/1.89 | 7% |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RISK_ON | OK | PASS | 1/4.40/n/a | 13/0.31/1.59 | 7% |
| PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | RISK_ON | OK | PASS | 1/4.40/n/a | 10/0.28/1.48 | 24% |

### APP

Distribution : PASS 2 / WATCH 0 / FAIL 14 / INSUFFICIENT_DATA 39 (total 55).

| Setup | Variante | Régime | Base | WF | Train (t/exp/PF) | Test (t/exp/PF) | Score drop |
|---|---|---|---|---|---|---|---:|
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RANGE | STRONG | FAIL | 14/1.74/3.76 | 4/0.49/0.28 | n/a |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RANGE | STRONG | FAIL | 12/1.62/3.21 | 2/0.18/1.21 | n/a |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | STRONG | PASS | 2/5.06/0.00 | 25/2.65/7.16 | -100% |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | RISK_ON | OK | PASS | 1/-1.00/0.00 | 27/0.45/2.21 | 0% |

### SMCI

Distribution : PASS 7 / WATCH 0 / FAIL 1 / INSUFFICIENT_DATA 65 (total 73).

| Setup | Variante | Régime | Base | WF | Train (t/exp/PF) | Test (t/exp/PF) | Score drop |
|---|---|---|---|---|---|---|---:|
| PULLBACK_MOMENTUM | rsi45_55_chg20_0_stop0.1 | RISK_ON | WEAK | PASS | 4/-0.05/1.34 | 10/0.27/2.00 | -292% |
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | RISK_ON | AVOID | PASS | 10/-0.52/0.54 | 10/0.27/2.00 | -571% |
| PULLBACK_MOMENTUM | pullback_rsi42_58_chg20_3_stop0.1 | RISK_ON | AVOID | PASS | 9/-0.47/0.00 | 10/0.27/2.00 | -1467% |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RISK_ON | WEAK | PASS | 6/-0.37/0.00 | 10/0.27/2.00 | -1467% |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RISK_ON | AVOID | PASS | 7/-0.46/0.77 | 10/0.27/2.00 | -1467% |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | RISK_ON | STRONG | PASS | 3/-0.67/0.00 | 10/1.40/8.00 | 0% |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | RISK_ON | OK | PASS | 2/-0.50/0.00 | 10/1.20/5.00 | 0% |

### AVGO

Distribution : PASS 1 / WATCH 0 / FAIL 16 / INSUFFICIENT_DATA 49 (total 66).

| Setup | Variante | Régime | Base | WF | Train (t/exp/PF) | Test (t/exp/PF) | Score drop |
|---|---|---|---|---|---|---|---:|
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | RISK_ON | WEAK | PASS | 8/0.13/1.50 | 12/0.08/1.50 | -13% |

### BTC

Distribution : PASS 1 / WATCH 0 / FAIL 10 / INSUFFICIENT_DATA 44 (total 55).

| Setup | Variante | Régime | Base | WF | Train (t/exp/PF) | Test (t/exp/PF) | Score drop |
|---|---|---|---|---|---|---|---:|
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | RANGE | STRONG | FAIL | 16/1.48/5.07 | 14/-0.05/1.07 | n/a |
| PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RANGE | STRONG | FAIL | 14/1.20/5.07 | 14/-0.05/1.07 | n/a |
| PULLBACK_MOMENTUM | rsi42_58_chg20_3_stop0.1 | RANGE | STRONG | FAIL | 9/1.82/16.32 | 9/0.14/1.42 | n/a |
| PULLBACK_MOMENTUM | pullback_base_rsi42_58_chg20_0_stop0.1 | RISK_ON | WEAK | PASS | 6/0.06/1.18 | 15/0.06/2.63 | -150% |

### SOL

Distribution : PASS 4 / WATCH 0 / FAIL 14 / INSUFFICIENT_DATA 36 (total 54).

| Setup | Variante | Régime | Base | WF | Train (t/exp/PF) | Test (t/exp/PF) | Score drop |
|---|---|---|---|---|---|---|---:|
| VOLATILITY_COMPRESSION | compression_20_ratio0.75_break20_stop1_rr2 | RISK_ON | WEAK | PASS | 2/0.50/2.00 | 10/0.30/1.60 | 30% |
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | RISK_ON | OK | PASS | 6/0.67/1.00 | 27/0.22/1.70 | -5% |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | STRONG | PASS | 5/0.62/1.35 | 11/3.38/7.90 | -93% |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | RISK_ON | WEAK | PASS | 4/0.38/0.00 | 14/0.04/1.48 | -80% |

### COIN

Distribution : PASS 1 / WATCH 0 / FAIL 1 / INSUFFICIENT_DATA 46 (total 48).

| Setup | Variante | Régime | Base | WF | Train (t/exp/PF) | Test (t/exp/PF) | Score drop |
|---|---|---|---|---|---|---|---:|
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | OK | PASS | 3/-2.68/0.14 | 13/1.70/3.09 | 0% |

### MSTR

Distribution : PASS 6 / WATCH 0 / FAIL 0 / INSUFFICIENT_DATA 46 (total 52).

| Setup | Variante | Régime | Base | WF | Train (t/exp/PF) | Test (t/exp/PF) | Score drop |
|---|---|---|---|---|---|---|---:|
| BREAKOUT_EXPANSION | breakout_h20_vol1.2_stop1_rr2 | RISK_ON | OK | PASS | 2/0.50/2.00 | 18/0.44/2.00 | 22% |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | RISK_ON | WEAK | PASS | 2/0.75/2.50 | 11/0.27/1.43 | 43% |
| MEAN_REVERSION | meanrev_rsi35_dist4_stop1_rr1.2 | RISK_ON | WEAK | PASS | 1/-1.00/0.00 | 21/0.14/3.86 | 0% |
| BREAKOUT_EXPANSION | breakout_h20_vol1.5_stop1_rr2 | RISK_ON | OK | PASS | 1/-1.00/0.00 | 12/0.92/4.67 | 0% |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | RISK_ON | OK | PASS | 1/-5.25/0.00 | 13/2.48/1.91 | 0% |
| RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | STRONG | PASS | 3/-2.37/0.00 | 16/3.40/3.73 | 0% |

## 6. Recommandations moteur

- **PASS** : cellule confirmée par le test 2024-2025. À conserver dans le tradable-universe avec sizing standard. Reste susceptible de surajustement long terme — ne pas considérer comme garantie.
- **WATCH** : cellule positive en test mais avec score drop élevé ou PF marginal. Allocation réduite, surveillance renforcée.
- **FAIL** : cellule à exclure du tradable-universe pour le futur, même si la matrice variant-regime la classe STRONG. C'est exactement le filtre anti-surajustement attendu.
- **INSUFFICIENT_DATA** : pas assez d'échantillons sur 2024-2025 (typiquement < 10 trades). Ne pas trader sur cette base — attendre plus de data ou utiliser le tier global.

Le validateur ne **remplace pas** les 4 niveaux précédents (asset-quality, asset-setup, setup-variant, variant-regime). Il les **complète** en filtrant le futur tradable-universe. Toute décision live doit combiner les 5 niveaux.

## 7. Limites de fiabilité

- **Split unique 3/2** : le validateur utilise un seul split (2021-2023 train, 2024-2025 test). Un split différent (ex. 2/3) pourrait donner des verdicts différents. Une v2 future pourrait faire du walk-forward roulant.
- **Petits échantillons** : beaucoup de cellules ont < 10 trades en test → INSUFFICIENT_DATA. Le résultat dépend fortement de la couverture des données 2024-2025.
- **Pas de pénalité de transaction** : ce walk-forward suppose des frictions nulles (pas de slippage, pas de spread, pas de frais). Une cellule PASS reste vulnérable à des frictions réelles. Priorité #3 du TODO quant.
- **Pas de validation régime cross-period** : si le régime macro 2024-2025 est très différent de 2021-2023, certaines cellules PASS peuvent être de la chance. Idéalement il faudrait faire le walk-forward CONDITIONNELLEMENT au régime (mais les échantillons deviennent encore plus petits).
- **Effet de levier (SOXL) toujours invisible** : SOXL peut PASS sur les chiffres bruts mais reste un instrument à risque non-linéaire.
- **Données yearly limitées** : seuls les setups avec breakdown yearly + bySymbolByRegime sont validables. Si une cellule existe dans variant-regime-matrix sans yearly breakdown, elle ne peut pas être validée ici (verdict INSUFFICIENT_DATA).
- **Verdict ≠ autorisation live** : un PASS dit "le passé récent confirme l'historique long". Cela ne dit pas que le futur ressemblera au passé récent. À combiner avec la gestion du risque, le sizing dynamique et l'observation live.
