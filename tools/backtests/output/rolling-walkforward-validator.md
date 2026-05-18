# Rolling Walk-Forward Validator — ManiTradePro

> Généré le 2026-05-18T10:49:55.512Z par `tools/backtests/rolling-walkforward-validator-v1.mjs`.

**⚠ Validateur de robustesse temporelle.** Teste chaque cellule (symbol × setup × variant × regime) sur plusieurs splits walk-forward indépendants. Le moteur ne **promeut jamais** — il confirme, dégrade ou invalide.

## 1. Résumé global

- Cellules évaluées : **9509**
- ROBUST : **17**
- STABLE : **17**
- FRAGILE : **2886**
- OVERFIT : **55**
- INSUFFICIENT_DATA : **6534**

## 2. Splits utilisés

Les splits sont adaptés aux années réellement présentes (2021-2025 selon les sources, 2022-2025 pour Pullback yearly-walkforward). Le brief original suggérait des splits avec TRAIN 2020-* mais cette année n'est pas dans les sources actuelles.

| Split | TRAIN | TEST | Description |
|---|---|---|---|
| S1 | 2021, 2022 | 2023 | TRAIN 2021-2022 → TEST 2023 (expanding) |
| S2 | 2021, 2022, 2023 | 2024 | TRAIN 2021-2023 → TEST 2024 (expanding, ≡ ancien split unique élargi) |
| S3 | 2022, 2023, 2024 | 2025 | TRAIN 2022-2024 → TEST 2025 (rolling) |

## 3. Distribution des verdicts

| Verdict | Cellules | % |
|---|---:|---:|
| ROBUST | 17 | 0.2 % |
| STABLE | 17 | 0.2 % |
| FRAGILE | 2886 | 30.4 % |
| OVERFIT | 55 | 0.6 % |
| INSUFFICIENT_DATA | 6534 | 68.7 % |

## 4. Cellules ROBUST

17 cellules — PASS sur 100 % des splits valides avec variance faible.

| Symbole | Setup | Variante | Régime | Splits | Drift | Exp stddev |
|---|---|---|---|---:|---|---:|
| ASML | PULLBACK_MOMENTUM | `pullback_base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.071 |
| CLOU | PULLBACK_MOMENTUM | `pullback_base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.643 |
| CLOU | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.643 |
| DOCN | PULLBACK_MOMENTUM | `pullback_rsi42_58_chg20_3_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.078 |
| DOCN | PULLBACK_MOMENTUM | `pullback_rsi42_58_chg20_5_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.113 |
| DOCN | PULLBACK_MOMENTUM | `rsi42_58_chg20_5_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.113 |
| DOCN | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.078 |
| DOCN | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.049 |
| GLD | BREAKOUT_EXPANSION | `breakout_h50_vol1.2_stop1.5_rr2.5` | RISK_ON | 2/2 | indéterminé | 0.028 |
| GOOGL | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | 2/2 | indéterminé | 0.163 |
| KLAC | PULLBACK_MOMENTUM | `pullback_base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.566 |
| KLAC | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.566 |
| PH | PULLBACK_MOMENTUM | `pullback_base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.014 |
| PH | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.014 |
| PSI | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.028 |
| VRNS | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.276 |
| XSW | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 2/2 | indéterminé | 0.120 |

## 5. Cellules OVERFIT

55 cellules — train consistant positif mais test échoue ≥ 50 % des splits. À retirer du tradable universe.

| Symbole | Setup | Variante | Régime | PASS/FAIL | Notes |
|---|---|---|---|---|---|
| AMZN | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | 1/1 | train consistant positif mais test échoue ≥ 50% |
| CDNS | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | 1/1 | train consistant positif mais test échoue ≥ 50% |
| CDNS | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 1/1 | train consistant positif mais test échoue ≥ 50% |
| CDNS | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | 1/1 | train consistant positif mais test échoue ≥ 50% |
| DOCN | PULLBACK_MOMENTUM | `rsi42_58_chg20_5_stop0.5` | RISK_ON | 1/1 | train consistant positif mais test échoue ≥ 50% |
| DOCN | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.5` | RISK_ON | 1/1 | train consistant positif mais test échoue ≥ 50% |
| DOCN | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | 1/1 | train consistant positif mais test échoue ≥ 50% |
| JPM | PULLBACK_MOMENTUM | `pullback_base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 1/1 | train consistant positif mais test échoue ≥ 50% |
| JPM | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 1/1 | train consistant positif mais test échoue ≥ 50% |
| META | PULLBACK_MOMENTUM | `pullback_base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 1/1 | train consistant positif mais test échoue ≥ 50% |
| META | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 1/1 | train consistant positif mais test échoue ≥ 50% |
| VRTX | PULLBACK_MOMENTUM | `pullback_base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 1/1 | train consistant positif mais test échoue ≥ 50% |
| ACLS | PULLBACK_MOMENTUM | `pullback_rsi42_58_chg20_3_stop0.5` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| BOTZ | BREAKOUT_EXPANSION | `breakout_h20_vol1.2_stop1_rr2` | RISK_ON | 0/2 | train consistant positif mais test échoue ≥ 50% |
| CDNS | PULLBACK_MOMENTUM | `rsi42_58_chg20_5_stop0.5` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| CDNS | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.5` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| DELL | PULLBACK_MOMENTUM | `rsi42_58_chg20_5_stop0.1` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| DELL | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop1.0` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| DELL | PULLBACK_MOMENTUM | `rsi42_58_chg20_5_stop1.0` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| DELL | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop1.0` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| FICO | MEAN_REVERSION | `meanrev_rsi35_dist4_stop1_rr1.2` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| FICO | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop1.0` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| FICO | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop1.0` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| GBPUSD | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| GOOGL | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| JPM | PULLBACK_MOMENTUM | `pullback_rsi42_58_chg20_3_stop0.1` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| JPM | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| JPM | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| JPM | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
| KLAC | PULLBACK_MOMENTUM | `pullback_rsi42_58_chg20_3_stop0.5` | RISK_ON | 0/1 | train consistant positif mais test échoue ≥ 50% |
_25 cellules supplémentaires non listées_

## 6. Setups les plus stables

| Setup | ROBUST | STABLE | FRAGILE | OVERFIT | INSUF. | Total | Ratio ROBUST+STABLE |
|---|---:|---:|---:|---:|---:|---:|---:|
| PULLBACK_MOMENTUM | 16 | 15 | 2313 | 51 | 4125 | 6520 | 0.5 % |
| BREAKOUT_EXPANSION | 1 | 2 | 379 | 2 | 882 | 1266 | 0.2 % |
| RELATIVE_STRENGTH_ROTATION | 0 | 0 | 59 | 1 | 360 | 420 | 0.0 % |
| MEAN_REVERSION | 0 | 0 | 126 | 1 | 861 | 988 | 0.0 % |
| VOLATILITY_COMPRESSION | 0 | 0 | 9 | 0 | 306 | 315 | 0.0 % |

## 7. Setups les plus fragiles

| Setup | Fragile + Overfit | Total | % fragile |
|---|---:|---:|---:|
| PULLBACK_MOMENTUM | 2364 | 6520 | 36.3 % |
| BREAKOUT_EXPANSION | 381 | 1266 | 30.1 % |
| MEAN_REVERSION | 127 | 988 | 12.9 % |
| RELATIVE_STRENGTH_ROTATION | 60 | 420 | 14.3 % |
| VOLATILITY_COMPRESSION | 9 | 315 | 2.9 % |

## 8. Régimes les plus robustes

| Régime | ROBUST | STABLE | FRAGILE | OVERFIT | INSUF. | Total | Ratio ROBUST+STABLE |
|---|---:|---:|---:|---:|---:|---:|---:|
| RISK_ON | 17 | 17 | 1962 | 50 | 1807 | 3853 | 0.9 % |
| RANGE | 0 | 0 | 896 | 5 | 2540 | 3441 | 0.0 % |
| RISK_OFF | 0 | 0 | 28 | 0 | 2187 | 2215 | 0.0 % |

## 9. Variance observée (top 10 cellules les plus volatiles)

| Symbole | Setup | Variante | Régime | Exp rel stddev | Drift | Verdict |
|---|---|---|---|---:|---|---|
| ETH | PULLBACK_MOMENTUM | `pullback_base_rsi42_58_chg20_0_stop0.1` | RANGE | 291.51 | falling | FRAGILE |
| ETH | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RANGE | 291.51 | falling | FRAGILE |
| SHOP | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | 284.26 | indéterminé | FRAGILE |
| ACLS | PULLBACK_MOMENTUM | `pullback_rsi42_58_chg20_3_stop0.1` | RISK_ON | 281.43 | indéterminé | FRAGILE |
| META | PULLBACK_MOMENTUM | `pullback_rsi42_58_chg20_3_stop0.1` | RISK_ON | 188.09 | indéterminé | FRAGILE |
| META | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | 188.09 | indéterminé | FRAGILE |
| AMD | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | 171.12 | indéterminé | FRAGILE |
| ASML | PULLBACK_MOMENTUM | `pullback_rsi42_58_chg20_3_stop0.5` | RANGE | 148.50 | falling | FRAGILE |
| ASML | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.5` | RANGE | 148.50 | falling | FRAGILE |
| BTC | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 140.01 | indéterminé | FRAGILE |

## 10. Limites

- **5 ans de données seulement.** 3 splits walk-forward — suffisant pour détecter les overfits massifs, insuffisant pour une mesure de robustesse statistique fine.
- **Mêmes seuils PASS/FAIL** que `walk-forward-regime-validator-v1` (test exp > 0, test PF ≥ 1.1, drawdown ≤ 2× totalR). Volontairement strict.
- **Variance relative** : si l'expectancy moyenne est très petite, la variance relative explose mécaniquement. Le seuil 0.5 (50 %) est arbitraire v1.
- **OVERFIT detection** se base sur train consistant positif + test fail majoritaire. Une cellule avec train mitigé peut passer en FRAGILE plutôt qu'OVERFIT.
- **Pas de propagation** : ce moteur ne modifie ni `tradable-universe.json` ni `allocation-plan.json`. À utiliser comme filtre amont manuel.
- **Mode régime canonique unique** : `ALL_REGIMES`. Les modes NO_RISK_OFF / RISK_ON_ONLY ne sont pas évalués séparément.
- **Pas d'intégration au pipeline orchestré** dans cette PR.

## 11. Prochaine étape recommandée

- **Cross-check avec `walk-forward-regime-validator-v1`** : les cellules PASS du validateur unique ET ROBUST du validateur roulant sont les candidates les plus solides. Les PASS du validateur unique mais FRAGILE / OVERFIT en roulant sont des faux positifs à examiner.
- **Intégration tradable-universe** : étendre `tradable-universe-v1.mjs` pour exiger en plus du walk-forward unique un verdict ROBUST ou STABLE en walk-forward roulant. Bloquerait les cellules OVERFIT.
- **Walk-forward conditionnel au régime** : faire les splits SEULEMENT sur les périodes du même régime macro, pour vérifier que la robustesse n'est pas due à un seul environnement.
- **Ajouter 2020** : si une PR ingère des données 2020, on pourrait avoir 4-5 splits au lieu de 3.
