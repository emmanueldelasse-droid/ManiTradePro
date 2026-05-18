# Allocation Plan v2 — Fine Theme Caps — ManiTradePro

> Généré le 2026-05-18T10:21:48.662Z par `tools/backtests/allocation-engine-v2.mjs`.

**⚠ Plan théorique uniquement. Aucun ordre n'est passé. Ne pas trader sans validation humaine + paper trading + gestion du risque opérationnelle.**

## 1. Résumé global

- Source univers : `tools/backtests/output/tradable-universe.json`
- Source classification : `tools/backtests/output/theme-classification-v2.json`
- Statut : ok
- Cellules candidates : **538**
- Positions sélectionnées : **10** (max 10)
- Poids total normalisé : 100.02 %

Distribution par tier :

| Tier | Positions | Poids total |
|---|---:|---:|
| A | 5 | 66.25 % |
| B | 3 | 27.81 % |
| C | 1 | 4.64 % |
| D | 1 | 1.32 % |

## 2. Plan v2 — positions sélectionnées

| # | Symbole | Tier | Setup | Variante | Régime | Poids | Broad | Fine themes |
|---:|---|---|---|---|---|---:|---|---|
| 1 | VUG | A | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 13.25 % | tech_ai | us_growth_etf, quality_growth |
| 2 | SPYG | A | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | 13.25 % | tech_ai | us_growth_etf, broad_market |
| 3 | APP | A | RELATIVE_STRENGTH_ROTATION | `rs_90d_top10_hold20` | RISK_ON | 13.25 % | tech_ai | ai_hypergrowth, software_saas |
| 4 | SOXQ | A | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | 13.25 % | tech_ai | semis_pure |
| 5 | GLD | A | BREAKOUT_EXPANSION | `breakout_h20_vol1.5_stop1_rr2` | RISK_ON | 13.25 % | defensive_other | precious_metals, macro_defensive |
| 6 | SOL | B | RELATIVE_STRENGTH_ROTATION | `rs_90d_top10_hold20` | RISK_ON | 9.27 % | crypto | crypto_layer1 |
| 7 | MSTR | B | RELATIVE_STRENGTH_ROTATION | `rs_90d_top10_hold20` | RISK_ON | 9.27 % | crypto | crypto_correlated_equity |
| 8 | JPM | B | BREAKOUT_EXPANSION | `breakout_h20_vol1.2_stop1_rr2` | RISK_ON | 9.27 % | defensive_other | banks_financials |
| 9 | ROM | C | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | 4.64 % | leveraged | leveraged_tech, mega_cap_tech |
| 10 | CRWD | D | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RANGE | 1.32 % | tech_ai | cybersecurity, software_saas |

## 3. Comparaison v1 vs v2

- Symboles retirés vs v1 : IYW
- Symboles ajoutés vs v1 : SOXQ

Delta exposition broad theme (v2 − v1) :

| Broad theme | v1 | v2 | Delta |
|---|---:|---:|---:|
| crypto | 18.54 % | 18.54 % | 0.00 % |
| defensive_other | 22.52 % | 22.52 % | 0.00 % |
| leveraged | 4.64 % | 4.64 % | 0.00 % |
| tech_ai | 54.32 % | 54.32 % | 0.00 % |

## 4. Exposition par sous-thème (fine themes)

| Sous-thème | Positions | Poids | Cap fin v2 | Statut |
|---|---:|---:|---:|---|
| us_growth_etf | 2 | 26.50 % | 30 % | ✓ |
| software_saas | 2 | 14.57 % | 25 % | ✓ |
| quality_growth | 1 | 13.25 % | 30 % | ✓ |
| broad_market | 1 | 13.25 % | 40 % | ✓ |
| ai_hypergrowth | 1 | 13.25 % | 20 % | ✓ |
| semis_pure | 1 | 13.25 % | 25 % | ✓ |
| precious_metals | 1 | 13.25 % | 15 % | ✓ |
| macro_defensive | 1 | 13.25 % | 20 % | ✓ |
| crypto_layer1 | 1 | 9.27 % | 15 % | ✓ |
| crypto_correlated_equity | 1 | 9.27 % | 10 % | ✓ |
| banks_financials | 1 | 9.27 % | 15 % | ✓ |
| leveraged_tech | 1 | 4.64 % | 5 % | ✓ |
| mega_cap_tech | 1 | 4.64 % | 25 % | ✓ |
| cybersecurity | 1 | 1.32 % | 15 % | ✓ |

## 5. Caps fins appliqués (référence)

| Sous-thème | Cap |
|---|---:|
| us_growth_etf | 30 % |
| mega_cap_tech | 25 % |
| software_saas | 25 % |
| ai_hypergrowth | 20 % |
| semis_pure | 25 % |
| semis_equipment | 15 % |
| cybersecurity | 15 % |
| cloud_platform | 20 % |
| fintech | 20 % |
| crypto_layer1 | 15 % |
| crypto_correlated_equity | 10 % |
| crypto_exchange | 10 % |
| leveraged_tech | 5 % |
| leveraged_macro | 5 % |
| precious_metals | 15 % |
| banks_financials | 15 % |
| macro_defensive | 20 % |
| industrials | 20 % |
| europe_equity | 20 % |
| broad_market | 40 % |
| quality_growth | 30 % |
| macro_fx | 10 % |

## 6. Candidats rejetés par cap fin

1 candidats rejetés par caps fins. Distribution :

| Cap fin déclencheur | Cellules rejetées |
|---|---:|
| cap fin us_growth_etf | 1 |

Premiers exemples :

| Symbole | Setup | Variante | Régime | Raison |
|---|---|---|---|---|
| IYW | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | cap fin us_growth_etf dépasserait 30% (futur 3.00) |

## 7. Concentrations restantes

Sous-thèmes représentant > 15 % du portefeuille v2 :

- **us_growth_etf** : 26.50 % (2 positions) — cap 30 %

## 8. Symboles inconnus / limites de classification

_tous les symboles du plan sont classifiés_

## 9. Limites de fiabilité

- **Caps fins arbitraires v1.** Les seuils (us_growth_etf 30 %, semis_pure 25 %, etc.) sont une première proposition. À calibrer empiriquement après paper trading.
- **Classification dupliquée** depuis `theme-classification-v2.mjs` pour ne pas modifier ce fichier (cf. brief PR). Toute évolution doit être propagée aux deux endroits. Dette technique à unifier.
- **Multi-tag = chevauchement attendu.** Un actif (NVDA = semis_pure + ai_hypergrowth + mega_cap_tech) compte dans plusieurs caps en même temps — les rejets peuvent se cumuler.
- **Symboles UNKNOWN forcés à allocation micro.** Ils peuvent être rejetés si le tier composite < D, ou conservés en micro. Préférer ajouter à la classification que laisser inconnu.
- **Pas de coût de transaction** modélisé. Voir `friction-model-v1` + `friction-adjusted-allocation-v2` pour la couche friction.
- **Plan théorique uniquement.** Aucun ordre, aucun broker, aucun endpoint live.

## 10. Prochaine étape recommandée

- **Calibration empirique** des caps fins après premier paper trading live.
- **Unification CLASSIFICATION** : refactor pour partager une seule source de vérité entre `theme-classification-v2.mjs` et `allocation-engine-v2.mjs`.
- **Friction-adjusted v2-plan** : étendre `friction-adjusted-allocation-v2.mjs` pour consommer aussi `allocation-plan-v2.json`.
- **Backfill ETF holdings** : propager les sous-thèmes sous-jacents des ETFs (QQQ contient ~40 % mega_cap_tech) pour des caps encore plus précis.
- **Caps croisés** : ajouter des caps par stage de croissance (hypergrowth ≤ 40 %) ou par sensibilité macro (cyclique ≤ 50 %).
