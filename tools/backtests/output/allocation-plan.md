# Allocation Plan — ManiTradePro

> Généré le 2026-05-18T10:09:50.692Z par `tools/backtests/allocation-engine-v1.mjs`.

**⚠ Plan théorique uniquement. Aucun ordre n'est passé. Aucun connecteur broker n'est touché. Ne pas trader sans validation humaine + paper trading + gestion du risque opérationnelle.**

## 1. Résumé global

- Source : `tools/backtests/output/tradable-universe.json`
- Statut : ok
- Cellules candidates (tradables hors BLOCK) : **538**
- Positions sélectionnées : **10** (max 10)
- Poids total normalisé : 100.02%

Distribution par tier :

| Tier | Positions | Poids total |
|---|---:|---:|
| A | 5 | 66.25% |
| B | 3 | 27.81% |
| C | 1 | 4.64% |
| D | 1 | 1.32% |

Exposition par setup :

| Setup | Positions | Poids total | Cap |
|---|---:|---:|---:|
| PULLBACK_MOMENTUM | 5 | 45.71% | 50% |
| RELATIVE_STRENGTH_ROTATION | 3 | 31.79% | 35% |
| BREAKOUT_EXPANSION | 2 | 22.52% | 25% |

Exposition par thème :

| Thème | Positions | Poids total | Cap |
|---|---:|---:|---:|
| tech_ai | 5 | 54.32% | 60% |
| defensive_other | 2 | 22.52% | — |
| crypto | 2 | 18.54% | 25% |
| leveraged | 1 | 4.64% | 5% |

## 2. Positions sélectionnées

| # | Symbole | Tier | Setup | Variante | Régime | Décision | Poids | Thème | Profil alloc. |
|---:|---|---|---|---|---|---|---:|---|---|
| 1 | VUG | A | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | ALLOW | 13.25% | tech_ai | normal |
| 2 | SPYG | A | PULLBACK_MOMENTUM | `rsi42_58_chg20_0_stop0.5` | RISK_ON | ALLOW | 13.25% | tech_ai | normal |
| 3 | APP | A | RELATIVE_STRENGTH_ROTATION | `rs_90d_top10_hold20` | RISK_ON | ALLOW | 13.25% | tech_ai | normal |
| 4 | IYW | A | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | ALLOW | 13.25% | tech_ai | normal |
| 5 | GLD | A | BREAKOUT_EXPANSION | `breakout_h20_vol1.5_stop1_rr2` | RISK_ON | ALLOW | 13.25% | defensive_other | normal |
| 6 | SOL | B | RELATIVE_STRENGTH_ROTATION | `rs_90d_top10_hold20` | RISK_ON | ALLOW | 9.27% | crypto | normal |
| 7 | MSTR | B | RELATIVE_STRENGTH_ROTATION | `rs_90d_top10_hold20` | RISK_ON | ALLOW | 9.27% | crypto | normal |
| 8 | JPM | B | BREAKOUT_EXPANSION | `breakout_h20_vol1.2_stop1_rr2` | RISK_ON | ALLOW | 9.27% | defensive_other | normal |
| 9 | ROM | C | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | REDUCE | 4.64% | leveraged | reduced |
| 10 | CRWD | D | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RANGE | EXPERIMENTAL | 1.32% | tech_ai | micro |

## 3. Poids par actif

| Symbole | Poids |
|---|---:|
| VUG | 13.25% |
| SPYG | 13.25% |
| APP | 13.25% |
| IYW | 13.25% |
| GLD | 13.25% |
| SOL | 9.27% |
| MSTR | 9.27% |
| JPM | 9.27% |
| ROM | 4.64% |
| CRWD | 1.32% |

## 4. Exposition par setup (détail)

- **PULLBACK_MOMENTUM** : 5 positions, 45.71% (cap 50%) ✓
- **RELATIVE_STRENGTH_ROTATION** : 3 positions, 31.79% (cap 35%) ✓
- **BREAKOUT_EXPANSION** : 2 positions, 22.52% (cap 25%) ✓

## 5. Exposition par thème (détail)

- **tech_ai** : 5 positions, 54.32% (cap 60%) ✓
- **defensive_other** : 2 positions, 22.52% (cap —) —
- **crypto** : 2 positions, 18.54% (cap 25%) ✓
- **leveraged** : 1 positions, 4.64% (cap 5%) ✓

## 6. Candidats rejetés

Distribution des raisons de rejet :

| Raison | Cellules |
|---|---:|
| cap thème tech_ai dépasserait 60% du budget cible | 54 |
| max 10 positions atteintes | 49 |
| cap setup PULLBACK_MOMENTUM dépasserait 50% du budget cible | 13 |
| setup non prioritaire | 4 |
| cap setup BREAKOUT_EXPANSION dépasserait 25% du budget cible | 1 |
| symbole MSTR déjà en portefeuille | 1 |
| cap thème crypto dépasserait 25% du budget cible | 1 |
| cap thème leveraged dépasserait 5% du budget cible | 1 |
| symbole GLD déjà en portefeuille | 1 |

Premiers exemples :

| Symbole | Setup | Variante | Régime | Tier | Raison |
|---|---|---|---|---|---|
| SOXQ | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| VRNS | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| APLD | RELATIVE_STRENGTH_ROTATION | `rs_90d_top10_hold20` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| CLOU | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| FICO | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.5` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| ABNB | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| IGM | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| PSI | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| ANET | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| PANW | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.5` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| XSD | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| DELL | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| GOOGL | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| MA | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | A | cap setup PULLBACK_MOMENTUM dépasserait 50% du budget cible (3.50 unités, futur 4.00) |
| SIE | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | cap setup PULLBACK_MOMENTUM dépasserait 50% du budget cible (3.50 unités, futur 4.00) |
| SMH | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| SPY | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | cap setup PULLBACK_MOMENTUM dépasserait 50% du budget cible (3.50 unités, futur 4.00) |
| SHOP | PULLBACK_MOMENTUM | `rsi45_55_chg20_0_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| SLAB | PULLBACK_MOMENTUM | `rsi42_58_chg20_3_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
| XLK | PULLBACK_MOMENTUM | `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | A | cap thème tech_ai dépasserait 60% du budget cible (4.20 unités, futur 5.00) |
_105 rejets supplémentaires non listés_

## 7. Contraintes appliquées

| Contrainte | Valeur |
|---|---|
| Max positions | 10 |
| Max EXPERIMENTAL | 2 |
| Max 1 position par symbole | ✓ |
| Cap thème `crypto` | 25% |
| Cap thème `tech_ai` | 60% |
| Cap thème `leveraged` | 5% |
| Cap setup `PULLBACK_MOMENTUM` | 50% |
| Cap setup `RELATIVE_STRENGTH_ROTATION` | 35% |
| Cap setup `BREAKOUT_EXPANSION` | 25% |
| Cap setup `MEAN_REVERSION` | 0% |
| Cap setup `VOLATILITY_COMPRESSION` | 0% |
| Setups non prioritaires (MeanRev, VolComp) | interdits en allocation principale |
| Leveraged ETFs | forcés à profil REDUCE max |

## 8. Risques connus

| Risque | Positions concernées |
|---|---:|
| ETF à effet de levier — profil de risque non-linéaire, le moteur ne le détecte pas seul | 1 |

**Warnings :**

- ⚠ Aucune position RISK_OFF dans le plan — le portefeuille n'a pas de couverture explicite si le régime macro bascule en RISK_OFF.
- ⚠ 3 ETF tech sélectionnés (VUG, SPYG, IYW) — risque de doublon d'exposition, vérifier la corrélation entre eux.

## 9. Limites de fiabilité

- **Plan théorique uniquement.** Aucun ordre n'est passé, aucun connecteur broker n'est touché. Le plan informe une décision humaine ; il ne décide pas seul.
- **Pas de coût de transaction** modélisé : slippage, spread, gaps et frais peuvent réduire significativement la rentabilité réelle. Priorité #3 du TODO quant.
- **Classification thématique best-effort** : la liste `tech_ai` couvre l'univers actuel mais est large. Une cellule classifiée `defensive_other` peut en réalité être plus risquée ou plus exposée qu'estimé.
- **Caps statiques** : les pourcentages (crypto 25 %, tech 60 %, leveraged 5 %) sont arbitraires v1, à calibrer empiriquement quand le paper trading live aura tourné.
- **Unités de base statiques** (A=1.0, B=0.7, C=0.35, D=0.10) : peuvent être ajustées par tier confidence ou par score si une v2 le justifie.
- **Pas de rebalancing dynamique** : ce plan est une photo à l'instant T, basée sur tradable-universe.json courant. Toute évolution des sources change le plan.
- **Diversification limitée par construction** : la matrice variant-regime ne couvre rigoureusement que les setups pour lesquels `bySymbolByRegime[]` existe. Les actifs hors couverture (forex, bonds, certains défensifs) ne peuvent pas être autoriser ici.
- **Verdict ALLOW dans tradable-universe ≠ autorisation live.** Ce moteur d'allocation ajoute une couche de contraintes mais ne suffit pas pour passer en argent réel. Voir BOT_OBJECTIVE.md pour les pré-requis broker.

## 10. Prochaine étape recommandée

- Validation humaine du plan (lecture, sanity check, cohérence vs intuition trader).
- Modélisation des frictions réelles (priorité #3) : injecter slippage / spread / gaps / frais dans la chaîne de backtest, recalculer les 6 niveaux + l'allocation.
- Construction d'un broker connector / paper trading wire-up qui consomme ce plan ET ajoute la gestion du risque opérationnelle (max daily loss, kill switch, cooldown).
- Walk-forward roulant pour réduire la dépendance au split unique 2021-2023 / 2024-2025.
- Classification thématique plus précise (secteurs GICS, beta vs BTC, sensibilité taux, etc.).
