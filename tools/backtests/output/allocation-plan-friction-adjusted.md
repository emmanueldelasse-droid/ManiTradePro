# Allocation Plan — Friction-Adjusted v2 — ManiTradePro

> Généré le 2026-05-18T09:57:02.615Z par `tools/backtests/friction-adjusted-allocation-v2.mjs`.

**⚠ Plan théorique ajusté par friction.** Aucun ordre n'est passé. Le plan original `allocation-plan.json` et le rapport `friction-adjusted-report.json` sont inchangés sur disque. Ce rapport est une couche aval prudente, basée sur des hypothèses heuristiques v1.

## 1. Résumé global

- Statut : ok
- Positions originales : **10**
- Positions actives après ajustement : **10**
- Positions retirées (`remove_candidate`) : **0**
- Positions réduites (`reduce_10_pct` ou `reduce_25_pct`) : **7**
- Poids total original : 100.02 %
- Poids total ajusté (normalisé) : 100.02 %
- Pénalité brute totale (avant renormalisation) : 8.11 % du portefeuille original

## 2. Plan original vs plan ajusté

| # | Symbole | Setup | Régime | Tier | Poids orig. | Suggestion | Poids ajusté |
|---:|---|---|---|---|---:|---|---:|
| 1 | VUG | PULLBACK_MOMENTUM | RISK_ON | A | 13.25 % | normal | 14.42 % |
| 2 | SPYG | PULLBACK_MOMENTUM | RISK_ON | A | 13.25 % | normal | 14.42 % |
| 3 | APP | RELATIVE_STRENGTH_ROTATION | RISK_ON | A | 13.25 % | reduce_10_pct | 12.98 % |
| 4 | IYW | PULLBACK_MOMENTUM | RISK_ON | A | 13.25 % | normal | 14.42 % |
| 5 | GLD | BREAKOUT_EXPANSION | RISK_ON | A | 13.25 % | reduce_10_pct | 12.98 % |
| 6 | SOL | RELATIVE_STRENGTH_ROTATION | RISK_ON | B | 9.27 % | reduce_25_pct | 7.56 % |
| 7 | MSTR | RELATIVE_STRENGTH_ROTATION | RISK_ON | B | 9.27 % | reduce_10_pct | 9.08 % |
| 8 | JPM | BREAKOUT_EXPANSION | RISK_ON | B | 9.27 % | reduce_10_pct | 9.08 % |
| 9 | ROM | PULLBACK_MOMENTUM | RISK_ON | C | 4.64 % | reduce_25_pct | 3.79 % |
| 10 | CRWD | PULLBACK_MOMENTUM | RANGE | D | 1.32 % | reduce_10_pct | 1.29 % |

## 3. Positions conservées (poids inchangé avant renormalisation)

| Symbole | Setup | Régime | Tier | Friction | Poids orig. → ajusté |
|---|---|---|---|---:|---|
| VUG | PULLBACK_MOMENTUM | RISK_ON | A | 0.150 % | 13.25 % → 14.42 % |
| SPYG | PULLBACK_MOMENTUM | RISK_ON | A | 0.150 % | 13.25 % → 14.42 % |
| IYW | PULLBACK_MOMENTUM | RISK_ON | A | 0.150 % | 13.25 % → 14.42 % |

## 4. Positions réduites

| Symbole | Setup | Régime | Tier | Friction | Suggestion | Poids orig. → ajusté |
|---|---|---|---|---:|---|---|
| APP | RELATIVE_STRENGTH_ROTATION | RISK_ON | A | 0.320 % | reduce_10_pct | 13.25 % → 12.98 % |
| GLD | BREAKOUT_EXPANSION | RISK_ON | A | 0.250 % | reduce_10_pct | 13.25 % → 12.98 % |
| SOL | RELATIVE_STRENGTH_ROTATION | RISK_ON | B | 0.800 % | reduce_25_pct | 9.27 % → 7.56 % |
| MSTR | RELATIVE_STRENGTH_ROTATION | RISK_ON | B | 0.320 % | reduce_10_pct | 9.27 % → 9.08 % |
| JPM | BREAKOUT_EXPANSION | RISK_ON | B | 0.250 % | reduce_10_pct | 9.27 % → 9.08 % |
| ROM | PULLBACK_MOMENTUM | RISK_ON | C | 0.900 % | reduce_25_pct | 4.64 % → 3.79 % |
| CRWD | PULLBACK_MOMENTUM | RANGE | D | 0.250 % | reduce_10_pct | 1.32 % → 1.29 % |

## 5. Positions retirées

_aucune position retirée_

## 6. Exposition ajustée par thème

| Thème | Positions | Poids ajusté |
|---|---:|---:|
| tech_ai | 5 | 57.53 % |
| defensive_other | 2 | 22.06 % |
| crypto | 2 | 16.64 % |
| leveraged | 1 | 3.79 % |

## 7. Exposition ajustée par setup

| Setup | Positions | Poids ajusté |
|---|---:|---:|
| PULLBACK_MOMENTUM | 5 | 48.34 % |
| RELATIVE_STRENGTH_ROTATION | 3 | 29.62 % |
| BREAKOUT_EXPANSION | 2 | 22.06 % |

## 8. Risques restants

_aucun warning_

Note structurelle : la renormalisation à 100 % peut **augmenter** le poids relatif final d'une position conservée, même si son poids brut n'a pas changé. Exemple : si VUG passe de 13.25 % à 13.25 % en absolu, mais que le total des autres positions a baissé, alors VUG passe à un % relatif plus élevé. Ce n'est PAS une promotion — c'est une conséquence mécanique du fait que d'autres positions ont été réduites ou retirées.

## 9. Limites de fiabilité

- **Modèle de friction hérité de friction-model-v1** : heuristique v1, pas de données broker réelles. Voir `friction-adjusted-report.md` pour le détail des hypothèses.
- **Pas de modification des sources** : `allocation-plan.json` et `friction-adjusted-report.json` restent inchangés. Ce moteur produit une vue alternative.
- **Pas intégré dans le pipeline orchestré** (`run-quant-pipeline-v1.mjs`) pour l'instant. À ajouter explicitement si besoin.
- **Renormalisation mécanique** : peut augmenter le poids relatif final d'une position conservée. Documenté ci-dessus.
- **Si toutes les positions sont retirées** (status `failed`), le moteur sort avec exit code 1 — c'est volontaire pour ne pas laisser passer un portefeuille vide.
- **Verdict ajusté ≠ autorisation live.** Cette PR reste offline.

## 10. Prochaine étape recommandée

- **Validation humaine** : relire ce plan ajusté, comparer avec le plan original (`allocation-plan.md`), et accepter explicitement chaque dégradation.
- **Calibration des frictions** : après le premier paper trading live, ajuster les profils du `friction-model-v1` avec des chiffres mesurés (commission réelle, spread observé, slippage moyen).
- **Friction-aware allocation engine natif** : v3 pourrait intégrer la friction dès la sélection des positions (au lieu de la traiter en couche aval), pour éviter de remplir 10 slots avant de réduire 7.
- **Intégration pipeline optionnelle** : étendre `run-quant-pipeline-v1.mjs` pour inclure cette 9e étape, si l'utilisateur le demande.
