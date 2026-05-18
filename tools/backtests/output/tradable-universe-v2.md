# Tradable Universe v2 — Rolling-Walk-Forward Hardened — ManiTradePro

> Généré le 2026-05-18T11:16:52.655Z par `tools/backtests/tradable-universe-v2.mjs`.

**⚠ Tradable universe v2 — durci par le rolling walk-forward.** Le rolling validator ne promeut jamais : il peut seulement confirmer, dégrader ou invalider. v1 BLOCK reste BLOCK.

Règles de transition v1 → v2 :

| Rolling verdict | Effet |
|---|---|
| ROBUST | confirme decision v1 |
| STABLE | confirme decision v1 |
| FRAGILE | dégrade d'un cran (ALLOW→REDUCE, REDUCE→EXPERIMENTAL, EXPERIMENTAL→BLOCK) |
| OVERFIT | BLOCK |
| INSUFFICIENT_DATA | EXPERIMENTAL si v1=ALLOW + tier A/B + WF unique PASS, sinon BLOCK |

## 1. Résumé global

- Cellules totales : **10878**

## 2. Comparaison v1 vs v2

Distribution des décisions :

| Décision | v1 | v2 | Delta |
|---|---:|---:|---:|
| ALLOW | 346 | 26 | -320 |
| REDUCE | 10 | 300 | +290 |
| EXPERIMENTAL | 182 | 20 | -162 |
| BLOCK | 10340 | 10532 | +192 |

Matrice de transition v1 → v2 (cellules effectives, hors BLOCK→BLOCK qui n'a pas changé) :

| Transition | Cellules |
|---|---:|
| ALLOW to ALLOW | 26 |
| ALLOW to REDUCE | 300 |
| ALLOW to EXPERIMENTAL | 10 |
| ALLOW to BLOCK | 10 |
| REDUCE to EXPERIMENTAL | 10 |
| EXPERIMENTAL to BLOCK | 182 |
| BLOCK to BLOCK | 10340 |

## 3. Distribution rolling verdicts

| Verdict | Cellules |
|---|---:|
| ROBUST | 17 |
| STABLE | 17 |
| FRAGILE | 2886 |
| OVERFIT | 55 |
| INSUFFICIENT_DATA | 6534 |
| ABSENT | 1369 |

Robustness tier (v2-spécifique) :

| Tier | Sens | Cellules |
|---|---|---:|
| CONFIRMED | rolling ROBUST ou STABLE, decisionV1 préservé | 26 |
| EXCEPTION | rolling INSUFFICIENT mais exception EXPERIMENTAL | 10 |
| DEGRADED | rolling FRAGILE, dégradation d'un cran | 310 |
| REMOVED | rolling OVERFIT / fragile→BLOCK / insuff→BLOCK / v1=BLOCK | 9163 |
| UNEVALUATED | aucun rolling verdict | 1369 |

## 4. Cellules ROBUST survivantes (ALLOW v2 + rolling ROBUST)

| Symbole | Setup | Variante | Régime | Tier | Splits PASS | Exp stddev |
|---|---|---|---|---|---:|---:|
| VRNS | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | A | 2/2 | 0.276 |
| CLOU | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | 2/2 | 0.643 |
| PSI | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | 2/2 | 0.028 |
| GOOGL | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | A | 2/2 | 0.163 |
| PH | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | 2/2 | 0.014 |
| CLOU | PULLBACK_MOMENTUM | `pullback_base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | 2/2 | 0.643 |
| KLAC | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | 2/2 | 0.566 |
| KLAC | PULLBACK_MOMENTUM | `pullback_base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | 2/2 | 0.566 |
| PH | PULLBACK_MOMENTUM | `pullback_base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | 2/2 | 0.014 |
| GLD | BREAKOUT_EXPANSION | `breakout_h50_vol1.2_stop1.5_rr2.5` | RISK_ON | A | 2/2 | 0.028 |
| DOCN | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | A | 2/2 | 0.049 |
| DOCN | PULLBACK_MOMENTUM | `rsi42_58_chg20_5_stop0.1` | RISK_ON | A | 2/2 | 0.113 |
| DOCN | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | A | 2/2 | 0.078 |
| DOCN | PULLBACK_MOMENTUM | `pullback_rsi42_58_chg20_3_stop0.1` | RISK_ON | A | 2/2 | 0.078 |

## 5. Cellules OVERFIT éliminées (étaient ALLOW/REDUCE/EXPERIMENTAL v1 → BLOCK v2)

10 cellules OVERFIT v1=non-BLOCK → BLOCK v2.

| Symbole | Setup | Variante | Régime | v1 → v2 | Splits PASS/FAIL |
|---|---|---|---|---|---|
| GOOGL | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | ALLOW → BLOCK | 0/1 |
| DOCN | PULLBACK_MOMENTUM | `rsi42_58_chg20_5_stop0.5` | RISK_ON | ALLOW → BLOCK | 1/1 |
| KLAC | PULLBACK_MOMENTUM | `pullback_rsi42_58_chg20_3_stop0.5` | RISK_ON | ALLOW → BLOCK | 0/1 |
| AMZN | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | ALLOW → BLOCK | 1/1 |
| DOCN | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.5` | RISK_ON | ALLOW → BLOCK | 1/1 |
| DOCN | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | ALLOW → BLOCK | 1/1 |
| JPM | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | ALLOW → BLOCK | 0/1 |
| CDNS | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | ALLOW → BLOCK | 1/1 |
| CDNS | PULLBACK_MOMENTUM | `rsi42_58_chg20_5_stop0.5` | RISK_ON | ALLOW → BLOCK | 0/1 |
| PH | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | ALLOW → BLOCK | 0/1 |

## 6. Impact par setup

| Setup | v1 ALLOW | v2 ALLOW | Delta | v1 REDUCE | v2 REDUCE | v1 EXP | v2 EXP | v2 BLOCK ajoutés |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| BREAKOUT_EXPANSION | 11 | 2 | -9 | 1 | 6 | 3 | 4 | +3 |
| MEAN_REVERSION | 0 | 0 | +0 | 0 | 0 | 2 | 0 | +2 |
| PULLBACK_MOMENTUM | 328 | 24 | -304 | 9 | 287 | 146 | 16 | +156 |
| RELATIVE_STRENGTH_ROTATION | 7 | 0 | -7 | 0 | 7 | 29 | 0 | +29 |
| UNKNOWN | 0 | 0 | +0 | 0 | 0 | 0 | 0 | +0 |
| VOLATILITY_COMPRESSION | 0 | 0 | +0 | 0 | 0 | 2 | 0 | +2 |

## 7. Impact par régime

| Régime | v1 ALLOW | v2 ALLOW | Delta | v1 REDUCE | v2 REDUCE | v1 EXP | v2 EXP |
|---|---:|---:|---:|---:|---:|---:|---:|
| RANGE | 3 | 0 | -3 | 1 | 3 | 105 | 1 |
| RISK_OFF | 0 | 0 | +0 | 0 | 0 | 5 | 0 |
| RISK_ON | 343 | 26 | -317 | 9 | 297 | 72 | 19 |

## 8. Actifs leaders survivants v2 (ALLOW v2, triés par robustness)

12 symboles distincts, 26 cellules ALLOW v2.

| Symbole | Cellules ALLOW | Rolling verdicts |
|---|---:|---|
| DOCN | 5 | ROBUST, STABLE |
| VRNS | 3 | STABLE, ROBUST |
| KLAC | 3 | ROBUST, STABLE |
| CLOU | 2 | ROBUST |
| GOOGL | 2 | STABLE, ROBUST |
| PH | 2 | ROBUST |
| ABNB | 2 | STABLE |
| AMZN | 2 | STABLE |
| GLD | 2 | ROBUST, STABLE |
| PSI | 1 | ROBUST |
| WCLD | 1 | STABLE |
| BOTZ | 1 | STABLE |

## 9. Impact sur l'univers tradable

- ALLOW v1 : **346** cellules
- ALLOW v2 : **26** cellules
- Perte : **320** cellules (92.5 % du ALLOW v1 disparu)

La perte est attendue et souhaitée : le rolling walk-forward est exigeant, et la grande majorité des cellules ALLOW v1 sont FRAGILE ou INSUFFICIENT_DATA à l'échelle temporelle. v2 ne garde que ce qui résiste à plusieurs splits.

## 10. Limites

- **3 splits walk-forward seulement** (2021-2025 disponibles). Une fenêtre temporelle plus longue donnerait plus de splits.
- **Rolling verdict INSUFFICIENT_DATA est la majorité** (~70 % des cellules). La règle d'exception EXPERIMENTAL est restrictive (v1=ALLOW + tier A/B + WF unique PASS) pour éviter les faux positifs.
- **Pas de propagation arrière** dans `tradable-universe.json`. v2 coexiste avec v1, le user choisit explicitement.
- **Pas de recalcul allocation** dans cette PR. Pour reconstruire un plan v2, il faudra une PR future qui consomme `tradable-universe-v2.json` à la place de `tradable-universe.json`.
- **Pas d'intégration au pipeline orchestré** (volontaire).
- **Verdict v2 ≠ autorisation live.** Toujours valider manuellement avant tout passage en réel.

## 11. Prochaine étape recommandée

- **Allocation v3 sur tradable-universe-v2** : générer un plan d'allocation qui consomme `tradable-universe-v2.json` à la place de `tradable-universe.json`. La distribution de positions sera bien plus restreinte (probablement < 10 cellules ALLOW v2 selon les résultats).
- **Étendre rolling walk-forward** : récolter les données 2020 ou plus anciennes pour multiplier les splits, ce qui durcirait encore plus la validation.
- **Calibrer le seuil de variance** : actuellement `expectancy rel stddev < 0.5` pour ROBUST. Ajuster selon les retours paper trading.
- **Cross-validation par régime** : faire le rolling walk-forward CONDITIONNELLEMENT au régime macro pour vérifier que la robustesse n'est pas due à un seul environnement.
