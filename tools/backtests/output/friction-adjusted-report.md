# Friction-Adjusted Report — ManiTradePro

> Généré le 2026-05-18T09:57:02.516Z par `tools/backtests/friction-model-v1.mjs`.

**⚠ Modèle heuristique v1.** Aucune donnée broker réelle, aucun carnet d'ordre live, aucun barème réel. Les pourcentages sont des hypothèses prudentes par classe d'actif. À recalibrer après paper trading live. Ne pas confondre avec une simulation d'exécution.

**Le modèle ne PROMEUT JAMAIS une cellule.** Friction = maintenir ou dégrader. Le plan d'allocation existant n'est PAS modifié sur disque.

## 1. Résumé global

- Cellules analysées : **10878**
- Positions du plan d'allocation : **10**
- Positions avec suggestion de dégradation : **7**

Distribution decision (original → ajusté) :

| Decision | Original | Ajusté | Delta |
|---|---:|---:|---:|
| ALLOW | 346 | 178 | -168 |
| REDUCE | 10 | 162 | +152 |
| EXPERIMENTAL | 182 | 188 | +6 |
| BLOCK | 10340 | 10350 | +10 |

Transitions observées :

| Transition | Cellules |
|---|---:|
| unchanged | 360 |
| ALLOW to REDUCE | 159 |
| ALLOW to EXPERIMENTAL | 9 |
| REDUCE to BLOCK | 7 |
| EXPERIMENTAL to BLOCK | 3 |

## 2. Hypothèses de friction

Composants modélisés (par trade, round-trip) :
- `commissionPct` : frais broker estimés
- `spreadPct` : écart bid-ask moyen en %
- `slippagePct` : glissement à l'exécution
- `gapRiskPct` : risque de gap d'ouverture (overnight / weekend pour crypto)

Profils de base :

| Profil | Commission | Spread | Slippage | Gap | Total |
|---|---:|---:|---:|---:|---:|
| low | 0.020% | 0.030% | 0.050% | 0.050% | 0.150% |
| medium | 0.020% | 0.080% | 0.120% | 0.100% | 0.320% |
| high | 0.050% | 0.200% | 0.250% | 0.200% | 0.700% |
| extreme | 0.050% | 0.400% | 0.500% | 0.400% | 1.350% |

Pénalités contextuelles additionnelles :
- Setup `BREAKOUT_EXPANSION` : +0.10% slippage timing
- Classe `crypto_pure` : +0.10% spread + slippage
- Classe `leveraged_etf` : +0.20% gap amplifié
- Decision `EXPERIMENTAL` : +0.10% prudence
- Régime `RISK_OFF` : +0.15% gap/régime
- Confidence `LOW` : +0.05%
- Walk-forward `INSUFFICIENT_DATA` : +0.05% prudence

Règle de dégradation decision :
- friction < 0.25% : inchangé
- 0.25-0.50% : ALLOW → REDUCE
- 0.50-1.00% : ALLOW → REDUCE, REDUCE → EXPERIMENTAL
- > 1.00% : ALLOW → REDUCE, REDUCE → EXPERIMENTAL, EXPERIMENTAL → BLOCK

## 3. Impact sur tradable universe

Sur 538 cellules analysées (decision != BLOCK initial) : **178** dégradées par le modèle de friction (33.1%).

## 4. Cellules ALLOW dégradées en REDUCE

159 cellules. Premiers exemples :

| Symbole | Setup | Variante | Régime | Classe | Friction | Pénalités contextuelles |
|---|---|---|---|---|---:|---|
| APP | RELATIVE_STRENGTH_ROTATION | `rs_90d_top10_hold20` | RISK_ON | semi_ai_volatile | 0.320% | — |
| VRNS | PULLBACK_MOMENTUM | `rsi42_58_chg20_5_stop0.1` | RISK_ON | semi_ai_volatile | 0.320% | — |
| VRNS | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | semi_ai_volatile | 0.320% | — |
| SLAB | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | semi_ai_volatile | 0.320% | — |
| VRNS | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | semi_ai_volatile | 0.320% | — |
| VRNS | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | semi_ai_volatile | 0.320% | — |
| APLD | RELATIVE_STRENGTH_ROTATION | `rs_90d_top10_hold20` | RISK_ON | semi_ai_volatile | 0.320% | — |
| VRNS | PULLBACK_MOMENTUM | `rsi42_58_chg20_5_stop0.5` | RISK_ON | semi_ai_volatile | 0.320% | — |
| CLOU | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.5` | RISK_ON | semi_ai_volatile | 0.320% | — |
| SLAB | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.5` | RISK_ON | semi_ai_volatile | 0.320% | — |
| FICO | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.5` | RISK_ON | semi_ai_volatile | 0.320% | — |
| FICO | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | semi_ai_volatile | 0.320% | — |
| ROKU | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | semi_ai_volatile | 0.320% | — |
| ROKU | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | semi_ai_volatile | 0.320% | — |
| HUBS | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | semi_ai_volatile | 0.320% | — |
| ROKU | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | semi_ai_volatile | 0.320% | — |
| CLOU | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | semi_ai_volatile | 0.320% | — |
| VRNS | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | semi_ai_volatile | 0.320% | — |
| ANET | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | semi_ai_volatile | 0.320% | — |
| CLOU | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | semi_ai_volatile | 0.320% | — |
_139 cellules supplémentaires non listées_

## 5. REDUCE et EXPERIMENTAL dégradés

10 cellules. Premiers exemples :

| Symbole | Setup | Variante | Régime | Original | Ajusté | Friction |
|---|---|---|---|---|---|---:|
| ROM | PULLBACK_MOMENTUM | `rsi42_58_chg20_5_stop0.1` | RISK_ON | REDUCE | BLOCK | 0.900% |
| ROM | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | REDUCE | BLOCK | 0.900% |
| ROM | PULLBACK_MOMENTUM | `pullback_rsi42_58_chg20_5_stop0.1` | RISK_ON | REDUCE | BLOCK | 0.900% |
| ROM | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | REDUCE | BLOCK | 0.900% |
| ROM | PULLBACK_MOMENTUM | `pullback_rsi42_58_chg20_3_stop0.1` | RISK_ON | REDUCE | BLOCK | 0.900% |
| ROM | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | REDUCE | BLOCK | 0.900% |
| USD | BREAKOUT_EXPANSION | `breakout_h20_vol1.2_stop1_rr2` | RISK_ON | REDUCE | BLOCK | 1.000% |
| USD | RELATIVE_STRENGTH_ROTATION | `rs_90d_top10_hold20` | RISK_ON | EXPERIMENTAL | BLOCK | 1.050% |
| SOL | BREAKOUT_EXPANSION | `breakout_h50_vol1.5_stop1.5_rr2.5` | RANGE | EXPERIMENTAL | BLOCK | 1.050% |
| SOL | BREAKOUT_EXPANSION | `breakout_h20_vol1.5_stop1_rr2` | RANGE | EXPERIMENTAL | BLOCK | 1.050% |

## 6. Impact sur allocation-plan

Pour chaque position du plan d'allocation, suggestion de dégradation et poids ajustés indicatifs (le plan original sur disque n'est PAS modifié) :

| # | Symbole | Setup | Régime | Tier | Friction | Suggestion | Poids orig. | Poids ajusté | Poids ajusté norm. |
|---:|---|---|---|---|---:|---|---:|---:|---:|
| 1 | VUG | PULLBACK_MOMENTUM | RISK_ON | A | 0.150% | normal | 13.25% | 13.25% | 14.42% |
| 2 | SPYG | PULLBACK_MOMENTUM | RISK_ON | A | 0.150% | normal | 13.25% | 13.25% | 14.42% |
| 3 | APP | RELATIVE_STRENGTH_ROTATION | RISK_ON | A | 0.320% | reduce_10_pct | 13.25% | 11.93% | 12.98% |
| 4 | IYW | PULLBACK_MOMENTUM | RISK_ON | A | 0.150% | normal | 13.25% | 13.25% | 14.42% |
| 5 | GLD | BREAKOUT_EXPANSION | RISK_ON | A | 0.250% | reduce_10_pct | 13.25% | 11.93% | 12.98% |
| 6 | SOL | RELATIVE_STRENGTH_ROTATION | RISK_ON | B | 0.800% | reduce_25_pct | 9.27% | 6.95% | 7.56% |
| 7 | MSTR | RELATIVE_STRENGTH_ROTATION | RISK_ON | B | 0.320% | reduce_10_pct | 9.27% | 8.34% | 9.07% |
| 8 | JPM | BREAKOUT_EXPANSION | RISK_ON | B | 0.250% | reduce_10_pct | 9.27% | 8.34% | 9.07% |
| 9 | ROM | PULLBACK_MOMENTUM | RISK_ON | C | 0.900% | reduce_25_pct | 4.64% | 3.48% | 3.79% |
| 10 | CRWD | PULLBACK_MOMENTUM | RANGE | D | 0.250% | reduce_10_pct | 1.32% | 1.19% | 1.29% |

## 7. Positions les plus pénalisées (allocation-plan)

Top 5 par friction totale :

| Symbole | Classe | Profil | Friction | Pénalités |
|---|---|---|---:|---|
| ROM | leveraged_etf | high | 0.900% | leveraged : +0.20% gap amplifié |
| SOL | crypto_pure | high | 0.800% | crypto : +0.10% spread + slippage |
| APP | semi_ai_volatile | medium | 0.320% | — |
| MSTR | crypto_correlated | medium | 0.320% | — |
| GLD | etf_large_liquide | low | 0.250% | breakout : +0.10% slippage timing |

## 8. Positions robustes après friction (allocation-plan)

3 positions restent classées `normal` (friction < 0.25%) :

| Symbole | Setup | Régime | Tier | Friction |
|---|---|---|---|---:|
| VUG | PULLBACK_MOMENTUM | RISK_ON | A | 0.150% |
| SPYG | PULLBACK_MOMENTUM | RISK_ON | A | 0.150% |
| IYW | PULLBACK_MOMENTUM | RISK_ON | A | 0.150% |

## 9. Limites du modèle

- **Modèle heuristique v1.** Pas de carnet d'ordre réel, pas de spread live, pas de barème broker. Les pourcentages reflètent un avis prudent, pas une mesure.
- **Classification asset class best-effort.** Tout actif non listé tombe en `defensive_other` profil medium. À étendre si l'univers évolue.
- **Pas de modélisation du market impact.** Une position grosse vs petite paie le même slippage en %. À raffiner si nécessaire en intégrant la taille de l'ordre vs volume moyen.
- **Pas de distinction broker** (Interactive Brokers vs Alpaca vs Binance). Une fois un broker choisi, calibrer les commissionPct et spreadPct sur son barème réel.
- **Pas de coût d'opportunité** ni de coût de financement (overnight rates pour positions levered).
- **Le plan d'allocation original n'est pas modifié sur disque.** Les poids ajustés sont indicatifs ; la décision de réduire / retirer reste humaine.
- **Pas de propagation arrière.** Les cellules dégradées par friction ne sont pas reflétées dans `tradable-universe.json` ni dans `allocation-plan.json`. Le rapport friction est une couche d'analyse en aval, pas une réécriture des sources.

## 10. Prochaine étape recommandée

- **Calibration empirique** : après le premier paper trading live, mesurer les frictions réelles (commission, spread bid-ask, slippage observé) et ajuster les profils v1.
- **Brancher le broker réel** : choisir un broker (Interactive Brokers, Alpaca, Binance, etc.) et substituer ses barèmes réels aux hypothèses v1.
- **Friction-adjusted-allocation-engine v2** : générer un plan d'allocation qui intègre nativement la friction au lieu de la traiter en couche d'analyse aval.
- **Sizing dépendant du volume** : raffiner le modèle slippage en fonction de la taille de l'ordre vs volume moyen de l'actif.
- **Walk-forward roulant** : multi-splits pour réduire la dépendance au split unique 2021-2023 / 2024-2025 (priorité quant orthogonale).
