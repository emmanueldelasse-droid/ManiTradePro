# Allocation Plan v3 — Rolling-Hardened — ManiTradePro

> Généré le 2026-05-18T11:38:03.667Z par `tools/backtests/allocation-engine-v3.mjs`.

**⚠ Plan théorique uniquement. Aucun ordre. Aucun broker. Aucun endpoint live. Ne pas trader sans paper trading et validation humaine.**

## 1. Résumé global

- Source univers : `tools/backtests/output/tradable-universe-v2.json`
- Source classification : `tools/backtests/lib/theme-table.mjs`
- Statut : **ok**
- Cellules candidates retenues (pré-tri) : **346**
- Cellules après dédoublonnage par symbole : **73**
- Positions sélectionnées : **10** (min 3, max 10)
- Positions ALLOW : 5 · WATCH/REDUCE : 5 · EXPERIMENTAL : 0
- Poids total normalisé : 100.00 %

Distribution par décision v2 :

| Décision v2 | Positions |
|---|---:|
| ALLOW | 5 |
| REDUCE | 5 |

Distribution par verdict rolling :

| Rolling verdict | Positions |
|---|---:|
| ROBUST | 5 |
| FRAGILE | 5 |

## 2. Plan v3 — positions sélectionnées

| # | Symbole | Decision v2 | Rolling | Tier | Setup | Variante | Régime | Poids | Base unit | Tags | Fine themes |
|---:|---|---|---|---|---|---|---|---:|---:|---|---|
| 1 | VRNS | ALLOW | ROBUST | A | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | 14.81 % | 1.00 | — | cybersecurity |
| 2 | CLOU | ALLOW | ROBUST | A | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 14.81 % | 1.00 | — | cloud_platform |
| 3 | PSI | ALLOW | ROBUST | A | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 14.81 % | 1.00 | — | semis_pure |
| 4 | GOOGL | ALLOW | ROBUST | A | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | 14.81 % | 1.00 | — | mega_cap_tech, software_saas |
| 5 | GLD | ALLOW | ROBUST | A | BREAKOUT_EXPANSION | `breakout_h50_vol1.2_stop1.5_rr2.5` | RISK_ON | 14.81 % | 1.00 | — | precious_metals, macro_defensive |
| 6 | APP | REDUCE | FRAGILE | A | RELATIVE_STRENGTH_ROTATION | `rs_90d_top10_hold20` | RISK_ON | 5.19 % | 0.35 | reduced_due_to_fragility | ai_hypergrowth, software_saas |
| 7 | APLD | REDUCE | FRAGILE | A | RELATIVE_STRENGTH_ROTATION | `rs_90d_top10_hold20` | RISK_ON | 5.19 % | 0.35 | reduced_due_to_fragility | ai_hypergrowth, cloud_platform |
| 8 | SOL | REDUCE | FRAGILE | A | BREAKOUT_EXPANSION | `breakout_h20_vol1.2_stop1_rr2` | RISK_ON | 5.19 % | 0.35 | reduced_due_to_fragility | crypto_layer1 |
| 9 | MSTR | REDUCE | FRAGILE | B | RELATIVE_STRENGTH_ROTATION | `rs_90d_top10_hold20` | RISK_ON | 5.19 % | 0.35 | reduced_due_to_fragility | crypto_correlated_equity |
| 10 | SMCI | REDUCE | FRAGILE | B | BREAKOUT_EXPANSION | `breakout_h20_vol1.2_stop1_rr2` | RISK_ON | 5.19 % | 0.35 | reduced_due_to_fragility | ai_hypergrowth, industrials |

## 3. Comparaison avec allocation v1 / v2

**vs allocation v1 :**

- Symboles retirés : VUG, SPYG, IYW, JPM, ROM, CRWD
- Symboles ajoutés : VRNS, CLOU, PSI, GOOGL, APLD, SMCI

| Broad catégorie | v1 | v3 | Delta |
|---|---:|---:|---:|
| crypto | 18.54 % | 10.38 % | -8.16 % |
| defensive_other | 22.52 % | 0.00 % | -22.52 % |
| leveraged | 4.64 % | 0.00 % | -4.64 % |
| other | 0.00 % | 89.62 % | +89.62 % |
| tech_ai | 54.32 % | 0.00 % | -54.32 % |

**vs allocation v2 :**

- Symboles retirés : VUG, SPYG, SOXQ, JPM, ROM, CRWD
- Symboles ajoutés : VRNS, CLOU, PSI, GOOGL, APLD, SMCI

| Broad catégorie | v2 | v3 | Delta |
|---|---:|---:|---:|
| crypto | 18.54 % | 10.38 % | -8.16 % |
| defensive_other | 22.52 % | 0.00 % | -22.52 % |
| leveraged | 4.64 % | 0.00 % | -4.64 % |
| other | 0.00 % | 89.62 % | +89.62 % |
| tech_ai | 54.32 % | 0.00 % | -54.32 % |

## 4. Positions ALLOW robustes (priorité 1-2)

| # | Symbole | Rolling | Setup | Régime | Poids |
|---:|---|---|---|---|---:|
| 1 | VRNS | ROBUST | PULLBACK_MOMENTUM | RISK_ON | 14.81 % |
| 2 | CLOU | ROBUST | PULLBACK_MOMENTUM | RISK_ON | 14.81 % |
| 3 | PSI | ROBUST | PULLBACK_MOMENTUM | RISK_ON | 14.81 % |
| 4 | GOOGL | ROBUST | PULLBACK_MOMENTUM | RISK_ON | 14.81 % |
| 5 | GLD | ROBUST | BREAKOUT_EXPANSION | RISK_ON | 14.81 % |

## 5. Positions WATCH/REDUCE retenues (FRAGILE)

| # | Symbole | Setup | Régime | Tier | Poids | Justification |
|---:|---|---|---|---|---:|---|
| 6 | APP | RELATIVE_STRENGTH_ROTATION | RISK_ON | A | 5.19 % | reduced_due_to_fragility |
| 7 | APLD | RELATIVE_STRENGTH_ROTATION | RISK_ON | A | 5.19 % | reduced_due_to_fragility |
| 8 | SOL | BREAKOUT_EXPANSION | RISK_ON | A | 5.19 % | reduced_due_to_fragility |
| 9 | MSTR | RELATIVE_STRENGTH_ROTATION | RISK_ON | B | 5.19 % | reduced_due_to_fragility |
| 10 | SMCI | BREAKOUT_EXPANSION | RISK_ON | B | 5.19 % | reduced_due_to_fragility |

## 6. Positions EXPERIMENTAL retenues / exclues

_aucune position EXPERIMENTAL retenue dans le plan v3_

## 7. Candidats rejetés (top causes)

| Cause | Rejets |
|---|---:|
| cap setup PULLBACK_MOMENTUM | 54 |
| max 10 positions atteintes | 9 |

Premiers exemples :

| Symbole | Setup | Régime | Tier | Decision v2 | Rolling | Raison |
|---|---|---|---|---|---|---|
| PH | PULLBACK_MOMENTUM | RISK_ON | A | ALLOW | ROBUST | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 5.00 u vs cap 4.00 u) |
| KLAC | PULLBACK_MOMENTUM | RISK_ON | A | ALLOW | ROBUST | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 5.00 u vs cap 4.00 u) |
| DOCN | PULLBACK_MOMENTUM | RISK_ON | A | ALLOW | ROBUST | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 5.00 u vs cap 4.00 u) |
| ABNB | PULLBACK_MOMENTUM | RISK_ON | A | ALLOW | STABLE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.80 u vs cap 4.00 u) |
| WCLD | PULLBACK_MOMENTUM | RISK_ON | A | ALLOW | STABLE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.80 u vs cap 4.00 u) |
| AMZN | PULLBACK_MOMENTUM | RISK_ON | A | ALLOW | STABLE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.80 u vs cap 4.00 u) |
| BOTZ | PULLBACK_MOMENTUM | RISK_ON | A | ALLOW | STABLE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.80 u vs cap 4.00 u) |
| VUG | PULLBACK_MOMENTUM | RISK_ON | A | REDUCE | FRAGILE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.35 u vs cap 4.00 u) |
| SPYG | PULLBACK_MOMENTUM | RISK_ON | A | REDUCE | FRAGILE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.35 u vs cap 4.00 u) |
| IYW | PULLBACK_MOMENTUM | RISK_ON | A | REDUCE | FRAGILE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.35 u vs cap 4.00 u) |
| SOXQ | PULLBACK_MOMENTUM | RISK_ON | A | REDUCE | FRAGILE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.35 u vs cap 4.00 u) |
| FICO | PULLBACK_MOMENTUM | RISK_ON | A | REDUCE | FRAGILE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.35 u vs cap 4.00 u) |
| IGM | PULLBACK_MOMENTUM | RISK_ON | A | REDUCE | FRAGILE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.35 u vs cap 4.00 u) |
| ANET | PULLBACK_MOMENTUM | RISK_ON | A | REDUCE | FRAGILE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.35 u vs cap 4.00 u) |
| DELL | PULLBACK_MOMENTUM | RISK_ON | A | REDUCE | FRAGILE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.35 u vs cap 4.00 u) |
| PANW | PULLBACK_MOMENTUM | RISK_ON | A | REDUCE | FRAGILE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.35 u vs cap 4.00 u) |
| MA | PULLBACK_MOMENTUM | RISK_ON | A | REDUCE | FRAGILE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.35 u vs cap 4.00 u) |
| SIE | PULLBACK_MOMENTUM | RISK_ON | A | REDUCE | FRAGILE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.35 u vs cap 4.00 u) |
| SMH | PULLBACK_MOMENTUM | RISK_ON | A | REDUCE | FRAGILE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.35 u vs cap 4.00 u) |
| SPY | PULLBACK_MOMENTUM | RISK_ON | A | REDUCE | FRAGILE | cap setup PULLBACK_MOMENTUM dépasserait 50% (futur 4.35 u vs cap 4.00 u) |
_43 rejets supplémentaires non listés_

## 8. Exposition par setup

| Setup | Positions | Poids | Cap v3 | Statut |
|---|---:|---:|---:|---|
| PULLBACK_MOMENTUM | 4 | 59.24 % | 50 % | ✗ |
| BREAKOUT_EXPANSION | 3 | 25.19 % | 25 % | ✗ |
| RELATIVE_STRENGTH_ROTATION | 3 | 15.57 % | 35 % | ✓ |

## 9. Exposition par sous-thème

| Sous-thème | Positions | Poids | Cap v3 | Statut |
|---|---:|---:|---:|---|
| cloud_platform | 2 | 20.00 % | — | — |
| software_saas | 2 | 20.00 % | 25 % | ✓ |
| ai_hypergrowth | 3 | 15.57 % | 20 % | ✓ |
| cybersecurity | 1 | 14.81 % | — | — |
| semis_pure | 1 | 14.81 % | 25 % | ✓ |
| mega_cap_tech | 1 | 14.81 % | 25 % | ✓ |
| precious_metals | 1 | 14.81 % | 20 % | ✓ |
| macro_defensive | 1 | 14.81 % | — | — |
| crypto_layer1 | 1 | 5.19 % | 10 % | ✓ |
| crypto_correlated_equity | 1 | 5.19 % | 8 % | ✓ |
| industrials | 1 | 5.19 % | — | — |

## 10. Risques et limites

- ⚠ Toutes les positions sont en régime RISK_ON — concentration régime.
- ⚠ Aucune position RISK_OFF — pas de couverture explicite si bascule macro.
- ⚠ 5 position(s) FRAGILE retenue(s) — allocation réduite explicite (reduced_due_to_fragility).

- **Caps en valeur absolue** : la construction greedy applique les caps en parts du `TARGET_BUDGET` (8.0 unités). Si le portefeuille final ne se remplit pas à ce budget, les pourcentages effectifs peuvent être supérieurs aux caps annoncés.
- **Pas de coût de transaction** modélisé. Voir `friction-model-v1` pour la couche friction.
- **Pas de corrélation inter-position** prise en compte — un portefeuille concentré sur 3 setups Pullback techs peut sembler diversifié par sous-thème mais rester très corrélé en bêta.
- **Symboles UNKNOWN** : non couverts par les caps fins, peuvent passer sous le radar. Ajouter à `lib/theme-table.mjs`.
- **Plan théorique uniquement.** Aucun ordre, aucun broker, aucun endpoint live.

## 11. Prochaine étape recommandée

- **Stress-test** ce plan v3 contre `friction-adjusted-report.json` pour mesurer l'érosion edge après coûts.
- **Backfill ETF holdings** : propager les sous-jacents des ETFs détenus (BOTZ, CLOU, WCLD, IGV…) pour vérifier qu'aucun cap fin n'est dépassé une fois la transparence appliquée.
- **Corrélations inter-positions** : ajouter une couche corrélation 2024-2025 pour détecter les paires trop liées (ex. plusieurs Pullback semis_pure différents).
- **Calibration empirique** des caps fins après premier paper trading.
- **Walk-forward conditionnel au régime** : durcir encore en exigeant que le verdict ROBUST tienne aussi dans le régime cible (RISK_ON / RISK_OFF / NEUTRAL).
