# Allocation Plan v3 — Rolling-Hardened — ManiTradePro

> Généré le 2026-05-18T12:25:12.672Z par `tools/backtests/allocation-engine-v3.mjs`.

**⚠ Plan théorique uniquement. Aucun ordre. Aucun broker. Aucun endpoint live. Ne pas trader sans paper trading et validation humaine.**

## 1. Résumé global

- Source univers : `tools/backtests/output/tradable-universe-v2.json`
- Source classification : `tools/backtests/lib/theme-table.mjs`
- Statut : **failed**
- Cellules candidates retenues (pré-tri) : **346**
- Cellules après dédoublonnage par symbole : **73**
- Positions sélectionnées : **0** (min 3, max 10)
- Positions ALLOW : 0 · WATCH/REDUCE : 0 · EXPERIMENTAL : 0
- Poids total normalisé : 0.00 %

Distribution par décision v2 :

| Décision v2 | Positions |
|---|---:|

Distribution par verdict rolling :

| Rolling verdict | Positions |
|---|---:|

## 2. Plan v3 — positions sélectionnées

_aucune position sélectionnée_

## 3. Comparaison avec allocation v1 / v2

**vs allocation v1 :**

- Symboles retirés : VUG, SPYG, APP, IYW, GLD, SOL, MSTR, JPM, ROM, CRWD
- Symboles ajoutés : _aucun_

| Broad catégorie | v1 | v3 | Delta |
|---|---:|---:|---:|
| crypto | 18.54 % | 0.00 % | -18.54 % |
| defensive_other | 22.52 % | 0.00 % | -22.52 % |
| leveraged | 4.64 % | 0.00 % | -4.64 % |
| tech_ai | 54.32 % | 0.00 % | -54.32 % |

**vs allocation v2 :**

- Symboles retirés : VUG, SPYG, APP, SOXQ, GLD, SOL, MSTR, JPM, ROM, CRWD
- Symboles ajoutés : _aucun_

| Broad catégorie | v2 | v3 | Delta |
|---|---:|---:|---:|
| crypto | 18.54 % | 0.00 % | -18.54 % |
| defensive_other | 22.52 % | 0.00 % | -22.52 % |
| leveraged | 4.64 % | 0.00 % | -4.64 % |
| tech_ai | 54.32 % | 0.00 % | -54.32 % |

## 4. Positions ALLOW robustes (priorité 1-2)

_aucune position ALLOW dans le plan v3_

## 5. Positions WATCH/REDUCE retenues (FRAGILE)

_aucune position FRAGILE retenue dans le plan v3_

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

## 9. Exposition par sous-thème

_aucun sous-thème exposé_

## 10. Contrôle post-normalisation des caps hard

- Itérations : **11**
- Positions retirées : **10**
- Positions ajoutées par swap-in : **0**
- Caps hard tous respectés sur les poids finaux : **n/a (portefeuille vide)**

⚠ **Aucun sous-ensemble du pool v2 ne respecte simultanément tous les caps hard demandés.** Le contrôle post-normalisation a retiré itérativement les positions violant les caps. À chaque retrait, un swap-in a été tenté depuis le reste du pool, mais aucun candidat n'a pu être ajouté sans recréer une violation. Conséquence : portefeuille vide, status `failed`.

**Cause mathématique probable :** la somme des caps setups (Pullback 50 % + Breakout 25 % + RS Rotation 35 % = 110 %) autorise en théorie un portefeuille à 3 setups, mais le pool v2 actuel n'offre qu'un seul Breakout ROBUST (GLD) et 4 RS Rotation FRAGILE, dont 2 (MSTR, COIN) déclenchent le cap fin `crypto_correlated_equity ≤ 8 %`. Toute combinaison testée viole soit Pullback 50 %, soit Breakout 25 %, soit crypto_correlated_equity 8 %, soit ai_hypergrowth 20 %.

**Pistes pour rendre la sélection viable** (à valider par ChatGPT) :
- Relâcher `crypto_correlated_equity` de 8 % à 12 % (permettrait d'inclure MSTR à 8.6 %).
- Relâcher `BREAKOUT_EXPANSION` de 25 % à 30 % (donne de la marge pour 1 GLD ROBUST + 1 Breakout FRAGILE).
- Étendre `tradable-universe-v2` en attendant qu'un walk-forward roulant futur fasse remonter d'autres Breakout/RS Rotation en ROBUST/STABLE.
- Ajuster les baseUnits (ex. ROBUST 0.7 au lieu de 1.0) pour réduire la concentration unitaire des P ROBUST.

Caps violés en sortie de greedy (avant correction) :

| Kind | Clé | Cap | Réel | Excès |
|---|---|---:|---:|---:|
| setup | PULLBACK_MOMENTUM | 50.00 % | 59.26 % | +9.26 % |
| setup | BREAKOUT_EXPANSION | 25.00 % | 25.19 % | +0.19 % |

Positions retirées par le contrôle post-normalisation :

| Symbole | Setup | Régime | Tier | Decision | Rolling | Cap déclencheur | Réel avant |
|---|---|---|---|---|---|---|---:|
| CLOU | PULLBACK_MOMENTUM | RISK_ON | A | ALLOW | ROBUST | setup PULLBACK_MOMENTUM (cap 50.00 %) | 59.26 % |
| SMCI | BREAKOUT_EXPANSION | RISK_ON | B | REDUCE | FRAGILE | setup BREAKOUT_EXPANSION (cap 25.00 %) | 29.57 % |
| GOOGL | PULLBACK_MOMENTUM | RISK_ON | A | ALLOW | ROBUST | setup PULLBACK_MOMENTUM (cap 50.00 %) | 55.56 % |
| SOL | BREAKOUT_EXPANSION | RISK_ON | A | REDUCE | FRAGILE | setup BREAKOUT_EXPANSION (cap 25.00 %) | 30.68 % |
| GLD | BREAKOUT_EXPANSION | RISK_ON | A | ALLOW | ROBUST | fine precious_metals (cap 20.00 %) | 24.69 % |
| PSI | PULLBACK_MOMENTUM | RISK_ON | A | ALLOW | ROBUST | setup PULLBACK_MOMENTUM (cap 50.00 %) | 65.57 % |
| MSTR | RELATIVE_STRENGTH_ROTATION | RISK_ON | B | REDUCE | FRAGILE | setup RELATIVE_STRENGTH_ROTATION (cap 35.00 %) | 51.22 % |
| APLD | RELATIVE_STRENGTH_ROTATION | RISK_ON | A | REDUCE | FRAGILE | fine ai_hypergrowth (cap 20.00 %) | 41.18 % |
| VRNS | PULLBACK_MOMENTUM | RISK_ON | A | ALLOW | ROBUST | setup PULLBACK_MOMENTUM (cap 50.00 %) | 74.07 % |
| APP | RELATIVE_STRENGTH_ROTATION | RISK_ON | A | REDUCE | FRAGILE | fine ai_hypergrowth (cap 20.00 %) | 100.00 % |

**✓ Tous les caps hard sont respectés sur le portefeuille final normalisé.**

## 11. Risques et limites

- ⚠ Portefeuille vide après contrôle post-normalisation — aucun sous-ensemble du pool v2 ne respecte simultanément tous les caps hard. Voir section 10 pour le diagnostic.
- ⚠ Contrôle post-normalisation : 10 position(s) retirée(s) pour respect des caps hard (11 itération(s)). Voir section "Contrôle post-normalisation".

- **Caps hard respectés sur les poids normalisés** (cf. section 10). Si le greedy initial dépasse un cap, le contrôle post-normalisation retire la position la moins prioritaire qui contribue, renormalise et boucle. Conséquence : le portefeuille peut compter moins de 10 positions si nécessaire pour respecter les caps.
- **Pas de coût de transaction** modélisé. Voir `friction-model-v1` pour la couche friction.
- **Pas de corrélation inter-position** prise en compte — un portefeuille concentré sur quelques setups Pullback techs peut sembler diversifié par sous-thème mais rester très corrélé en bêta.
- **Symboles UNKNOWN** : non couverts par les caps fins, peuvent passer sous le radar. Ajouter à `lib/theme-table.mjs`.
- **Plan théorique uniquement.** Aucun ordre, aucun broker, aucun endpoint live.

## 12. Prochaine étape recommandée

- **Stress-test** ce plan v3 contre `friction-adjusted-report.json` pour mesurer l'érosion edge après coûts.
- **Backfill ETF holdings** : propager les sous-jacents des ETFs détenus (BOTZ, CLOU, WCLD, IGV…) pour vérifier qu'aucun cap fin n'est dépassé une fois la transparence appliquée.
- **Corrélations inter-positions** : ajouter une couche corrélation 2024-2025 pour détecter les paires trop liées (ex. plusieurs Pullback semis_pure différents).
- **Calibration empirique** des caps fins après premier paper trading.
- **Walk-forward conditionnel au régime** : durcir encore en exigeant que le verdict ROBUST tienne aussi dans le régime cible (RISK_ON / RISK_OFF / NEUTRAL).
