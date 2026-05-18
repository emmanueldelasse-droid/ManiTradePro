# SECTOR_RS Concentration Control v1 — ManiTradePro

> Généré le 2026-05-18T16:34:57.005Z par `tools/backtests/sector-rs-concentration-control-v1.mjs`.

**⚠ Tests offline.** Aucun moteur modifié. Objectif : tester si on peut RÉDUIRE la concentration top 5 sans tuer l'edge. Pas d'optimisation du PF.

## 1. Scope

La PR #213 a révélé que SECTOR_RS v1 a un edge concentré à 103.3 % sur les top 5 tickers (APLD, APP, PLTR, NBIS, UPST = stars AI_MOMENTUM). Sans eux : PF 0.94, expectancy négative.

Cette PR teste 4 catégories de mécanismes de contrôle de concentration :
1. Cap par ticker (limite causale du %PnL cumulé)
2. Cap par secteur (élargir topSectors)
3. Position sizing anti-concentration (inverse cum, inverse vol, cooldown, capped repeat)
4. Exclusion stress (sans top N, sans secteur AI_MOMENTUM)

## 2. Baseline rappel

| Métrique | Valeur |
|---|---:|
| Trades | 445 |
| PF | **2.16** |
| Expectancy | 2.300 R |
| Max DD | 193.0 R |
| Années positives | 5/5 |
| **Top 5 share** | **103.3 %** |
| Edge decay | 0.68 |

Top 5 tickers :

| Symbole | Total R |
|---|---:|
| APLD | 362.7 |
| APP | 272.8 |
| PLTR | 225.1 |
| NBIS | 110.5 |
| UPST | 86.5 |

## 3. Concentration problem (rappel)

Tout l'edge vient de 5 stars AI_MOMENTUM. Hypothèse : si on tente de plafonner la contribution de ces tickers, soit on retire l'edge (concentration = edge), soit on découvre un edge distribué caché.

Règles d'acceptation d'une variante :
- PF post-friction ≥ 1.3
- ≥ 4/5 années positives
- Top 5 share < 70 %
- Edge decay < ×1.5

## 4. Ticker cap tests

Cap causal : à chaque rebalance, on calcule le %PnL cumulé de chaque ticker jusqu'à ce point. Si > cap, le ticker est exclu de la sélection pour ce rebalance.

| Variante | Trades | PF | Expectancy R | Max DD R | Years+ | Top 5 % | Decay | Corr vs base | Accept |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| ticker_cap=10% | 330 | 1.10 | 0.233 | 301.4 | 3/5 | 251.8 % | 0.48 | 0.82 | ✗ |
| ticker_cap=15% | 336 | 1.15 | 0.341 | 274.3 | 3/5 | 184.6 % | 0.50 | 0.83 | ✗ |
| ticker_cap=20% | 364 | 1.14 | 0.330 | 251.0 | 3/5 | 214.0 % | 0.54 | 0.87 | ✗ |
| ticker_cap=25% | 393 | 1.09 | 0.230 | 260.3 | 3/5 | 370.3 % | 0.67 | 0.84 | ✗ |

## 5. Sector cap tests

Élargissement de topSectors et combinaisons topSectors × topAssets :

| Variante | Trades | PF | Expectancy R | Max DD R | Years+ | Top 5 % | Decay | Corr vs base | Accept |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| topSectors=2 | 890 | 1.68 | 1.265 | 336.5 | 4/5 | 104.1 % | 0.80 | 0.92 | ✗ |
| topSectors=3 | 1335 | 1.54 | 0.956 | 609.5 | 4/5 | 84.5 % | 0.60 | 0.86 | ✗ |
| topSectors=4 | 1780 | 1.49 | 0.817 | 794.4 | 4/5 | 76.9 % | 0.60 | 0.78 | ✗ |
| topSectors=2/topAssets=3 | 534 | 1.37 | 0.792 | 384.5 | 5/5 | 179.6 % | 1.34 | 0.86 | ✗ |
| topSectors=2/topAssets=5 | 890 | 1.68 | 1.265 | 336.5 | 4/5 | 104.1 % | 0.80 | 0.92 | ✗ |

## 6. Position sizing tests

Mécanismes de pondération de taille appliqués au pnlR :
- `equal` : 1R par trade (baseline)
- `inverse_cum_contribution` : taille = max(0.2, 1 - 2 × tickerShare). Pénalise les tickers déjà sur-contribués.
- `inverse_volatility` : taille = min(2, max(0.3, refAtr/atr)). Pénalise les tickers volatils.
- `cooldown_60days` : exclut un ticker pendant 60j après un gain > 2R.
- `cooldown_120days` : idem mais 120j.
- `capped_repeat_N` : limite à N trades par ticker sur toute la période.

| Variante | Trades | PF | Expectancy R | Max DD R | Years+ | Top 5 % | Decay | Corr vs base | Accept |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| equal (baseline) | 445 | 2.16 | 2.300 | 193.0 | 5/5 | 103.3 % | 0.68 | 1.00 | ✗ |
| inverse_cum_contribution | 445 | 1.40 | 0.561 | 183.5 | 4/5 | 147.4 % | 0.58 | 0.94 | ✗ |
| inverse_volatility (1/ATR) | 445 | 2.59 | 4.119 | 203.8 | 5/5 | 96.9 % | 0.68 | 0.98 | ✗ |
| cooldown_60days_after_win | 377 | 0.75 | -0.689 | 316.1 | 1/5 | n/a % | 0.85 | 0.70 | ✗ |
| cooldown_120days_after_win | 317 | 0.76 | -0.599 | 240.3 | 1/5 | n/a % | 0.86 | 0.61 | ✗ |
| capped_repeat_10_trades_max | 265 | 1.50 | 1.038 | 193.0 | 3/5 | 169.4 % | 7.79 | 0.98 | ✗ |
| capped_repeat_20_trades_max | 355 | 1.94 | 1.855 | 193.0 | 4/5 | 94.4 % | 0.79 | 0.94 | ✗ |

## 7. Exclusion stress

Tests "que se passe-t-il si on retire les winners ?" (a posteriori, non causal — pour mesurer la dépendance) :

| Variante | Trades | PF | Expectancy R | Max DD R | Years+ | Top 5 % | Decay | Corr vs base | Accept |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| sans_top1_APLD | 445 | 1.90 | 1.753 | 163.6 | 4/5 | 105.1 % | 0.37 | 0.92 | ✗ |
| sans_top3 (APLD,APP,PLTR) | 443 | 1.03 | 0.066 | 375.5 | 2/5 | 1091.4 % | 1.64 | 0.57 | ✗ |
| sans_top5 (APLD,APP,PLTR,NBIS,UPST) | 411 | 0.94 | -0.121 | 322.7 | 2/5 | n/a % | 2.09 | 0.43 | ✗ |
| sans_AI_MOMENTUM_sector | 445 | 0.74 | -0.477 | 434.9 | 3/5 | n/a % | 2.21 | 0.43 | ✗ |

**Lecture** : ces lignes ne sont PAS des stratégies tradables (on connaît les winners a posteriori). Elles servent à quantifier la dépendance.

## 8. Best compromise

0 variante(s) sur 16 passent les 4 critères d'acceptation.

**Aucune variante ne passe les 4 critères d'acceptation.**

## 9. Failure modes

Analyse des échecs :

- Variantes avec PF < 1.3 : 6 / 16
- Variantes avec < 4/5 années positives : 7 / 16
- Variantes avec top 5 ≥ 70 % : 14 / 16

**Lecture** : si la majorité des variantes échouent sur le top 5 share, c'est que la concentration est intrinsèque au mécanisme — pas un défaut de configuration. L'edge VIENT des AI winners.

## 10. Final verdict

**EDGE_DEPENDS_ON_AI_WINNERS**

**Aucune variante ne ramène la concentration sous des niveaux acceptables sans détruire l'edge.** L'edge de SECTOR_RS dépend structurellement des stars AI_MOMENTUM 2024-2025. Le setup n'est pas un edge distribué — c'est une stratégie de capture de leaders sectoriels qui tient si les leaders restent les leaders.

**Conséquence pour SETUPS_REGISTRY.md** : statut suggéré `CONDITIONAL_EDGE_AI_DEPENDENT` ou `RESEARCH_CANDIDATE_WITH_CRITICAL_CAVEAT`. Pas un setup live-ready sans :
- Surveillance active de la dispersion sectorielle.
- Mécanisme de fall-back si AI_MOMENTUM perd son leadership.
- Sizing extrêmement prudent (taille réduite, exposition portfolio limitée).

## 11. Recommendation

- Mettre à jour `docs/setups/SECTOR_RELATIVE_STRENGTH.md` avec ce finding : l'edge est AI-dépendant.
- Mettre à jour SETUPS_REGISTRY.md : statut révisé.
- **Pas de passage live** sous quelconque forme.
- Envisager une stratégie de surveillance régime AI (par exemple monitorer la rotation SOXX/SMH/AI_MOMENTUM vs autres secteurs).
- POST_EARNINGS_DRIFT et autres nouveaux setups deviennent prioritaires.

---

**Hypothèses** : friction round-trip 0.30 % + 0.02 %/jour, 5 % = 1R, NEXT_OPEN systématique, indicateurs causaux, paramètres baseline (sauf paramètre testé), filtres concentration causaux.

**Limites** :
- Les tests d'exclusion (sans top N) ne sont PAS causaux par construction — ils mesurent la dépendance, pas une stratégie tradable.
- Le ticker cap est causal mais le %cum est calculé sur tous les trades antérieurs (sans réajustement pondéré).
- Pas de Monte Carlo / bootstrap pour mesurer la variance d'estimation.
- Pas de stress sur d'autres univers (sector groups fixés).