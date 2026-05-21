# RS Rotation Robustness Lab v1 — ManiTradePro

> Généré le 2026-05-21T13:34:40.639Z par `tools/backtests/rs-rotation-robustness-lab-v1.mjs`.

**⚠ Laboratoire offline.** Aucun ordre, aucun broker, aucun endpoint live. Aucun moteur modifié. Modèles d'exécution UNIQUEMENT réalistes (NEXT_OPEN + friction obligatoire).

## 1. Scope

RELATIVE_STRENGTH_ROTATION est le seul setup CLEAN côté exécution après les audits PR #207 et #208 (inflation PF ×1.01 entre CURRENT et NEXT_OPEN_BOTH).

Mais le rolling walk-forward (PR #203) montre **0 cellule ROBUST/STABLE** sur 420 cellules évaluées — fragilité temporelle indépendante du bias d'exécution.

Objectif de ce labo : identifier s'il existe un **noyau exploitable** dans RS Rotation, en variant les dimensions clés et en mesurant à chaque fois la robustesse (PF, stabilité annuelle, edge decay, max DD, turnover).

## 2. Sources analysées

- tools/backtests/backtest-relative-strength-rotation-regime-v1.mjs
- tools/backtests/output/rolling-walkforward-validator.json
- tools/backtests/output/setup-performance-summary-v1.json
- tools/backtests/output/setup-execution-bias-audit-v1.json
- tools/backtests/universe-v2.mjs
- data/*.json (OHLC 2021-2025)

## 3. Méthodologie

**Baseline** :

```json
{
  "horizon": 20,
  "topN": 10,
  "rebalance": 10,
  "regime": "NO_RISK_OFF",
  "universe": "mixed",
  "exit": "fixed_hold",
  "lookback": 90,
  "minMomentum": 12
}
```

6 sweeps univariés autour de cette baseline. Pour chaque config :
- Simulation rotation avec entry = open[i+1], exit = open[exitIdx] (ou close pour trailing déclenchés).
- Friction appliquée : round-trip 0.30 % + 0.02 % par jour de hold (cf. section 5).
- Calcul : trades, winrate, expectancy R, profit factor, max DD R, Sharpe simplifié, turnover/an.
- Stabilité annuelle : PF par année 2021-2025, comptage des années PF ≥ 1.0 et ≥ 1.3.
- Edge decay : ratio PF(2021-2022) / PF(2024-2025).
- Classification : ROBUST_EDGE / CONDITIONAL_EDGE / FRAGILE / DEAD selon règles ci-dessous.

**Règles de classification** :
- `DEAD` : < 30 trades OU PF < 1.0
- `FRAGILE` : PF < 1.1, OU années positives < 3/5, OU edge decay > ×1.5
- `ROBUST_EDGE` : PF ≥ 1.3 ET années positives ≥ 4/5 ET edge decay < ×1.3
- `CONDITIONAL_EDGE` : reste (PF ≥ 1.1, 3+ années positives, decay raisonnable)

## 4. Execution model

- **Entry** : `open[i+1]` (NEXT_OPEN). Le signal est généré en fin de jour i (close[i] pour le momentum), exécution à l'ouverture du jour suivant.
- **Exit fixed_hold** : `open[i+1+horizon]` (exécution à l'ouverture du jour de sortie).
- **Exit ATR trailing** : `highest_since_entry - 2 × ATR(14 à l'entrée)`. Exit si low atteint le trail.
- **Exit EMA trailing** : exit si close < EMA20 (calculée sur la série du symbole, causale).
- **Exit momentum decay** : exit si rendement 5j devient négatif.
- **Exit time stop** : exit fixe à horizon, MAIS stop si pnl < -10 %.
- **Aucun usage d'EMA[i], swingHigh[i] ou autre fenêtre incluant la bougie signal pour le prix d'entrée**. Conforme aux recommandations des audits précédents.

## 5. Friction model

**OBLIGATOIRE et appliquée à chaque trade.**

| Composante | One-way (%) |
|---|---:|
| Spread | 0.05 |
| Slippage | 0.05 |
| Commission | 0.05 |
| **Total round-trip** | **0.30** |

**Overnight gap penalty** : 0.02 % par jour de hold (proxy pour gap risk overnight, non négligeable sur 20-60 jours).

**Conversion en R** : 5 % = 1R (convention du backtest RS Rotation v1).

**Formule** : `frictionR = (0.30 + 0.02 × holdDays) / 5`

Friction par trade selon horizon :

| Horizon | Friction (% total) | Friction (R) |
|---|---:|---:|
| 10j | 0.50 % | 0.100 R |
| 20j | 0.70 % | 0.140 R |
| 40j | 1.10 % | 0.220 R |
| 60j | 1.50 % | 0.300 R |
| 120j | 2.70 % | 0.540 R |

## 6. Horizon sweep

| horizon | Trades | Winrate | Expectancy (R) | PF | Max DD (R) | Sharpe | Turnover/an | Years positive | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 10 | 940 | 52.02 % | 0.275 | 1.26 | 140.9 | 0.55 | 188.0 | 4/5 | 0.82 | **CONDITIONAL_EDGE** |
| 20 | 930 | 54.30 % | 0.741 | 1.53 | 222.8 | 1.00 | 186.0 | 4/5 | 0.74 | **ROBUST_EDGE** |
| 40 | 910 | 51.98 % | 1.353 | 1.72 | 360.4 | 1.27 | 182.0 | 4/5 | 0.70 | **ROBUST_EDGE** |
| 60 | 890 | 54.16 % | 1.772 | 1.83 | 447.5 | 1.42 | 178.0 | 4/5 | 0.82 | **ROBUST_EDGE** |
| 120 | 830 | 53.98 % | 2.775 | 1.91 | 742.3 | 1.48 | 166.0 | 4/5 | 0.71 | **ROBUST_EDGE** |

## 7. Concentration sweep (topN)

| topN | Trades | Winrate | Expectancy (R) | PF | Max DD (R) | Sharpe | Turnover/an | Years positive | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 93 | 48.39 % | 0.159 | 1.07 | 63.1 | 0.18 | 18.6 | 3/5 | 1.11 | **FRAGILE** |
| 3 | 279 | 53.76 % | 0.958 | 1.54 | 72.3 | 1.09 | 55.8 | 4/5 | 1.22 | **ROBUST_EDGE** |
| 5 | 465 | 54.62 % | 0.892 | 1.54 | 118.2 | 1.09 | 93.0 | 4/5 | 1.00 | **ROBUST_EDGE** |
| 10 | 930 | 54.30 % | 0.741 | 1.53 | 222.8 | 1.00 | 186.0 | 4/5 | 0.74 | **ROBUST_EDGE** |
| 20 | 1818 | 53.19 % | 0.434 | 1.36 | 355.4 | 0.71 | 363.6 | 4/5 | 0.83 | **ROBUST_EDGE** |

## 8. Rebalance sweep

| rebalance | Trades | Winrate | Expectancy (R) | PF | Max DD (R) | Sharpe | Turnover/an | Years positive | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 9080 | 52.27 % | 0.615 | 1.43 | 2309.9 | 0.85 | 1816.0 | 4/5 | 0.73 | **ROBUST_EDGE** |
| 5 | 1824 | 53.56 % | 0.669 | 1.47 | 471.6 | 0.93 | 364.8 | 4/5 | 0.68 | **ROBUST_EDGE** |
| 10 | 930 | 54.30 % | 0.741 | 1.53 | 222.8 | 1.00 | 186.0 | 4/5 | 0.74 | **ROBUST_EDGE** |
| 20 | 480 | 53.75 % | 0.793 | 1.56 | 111.6 | 1.04 | 96.0 | 4/5 | 0.59 | **ROBUST_EDGE** |

## 9. Regime analysis

| regime | Trades | Winrate | Expectancy (R) | PF | Max DD (R) | Sharpe | Turnover/an | Years positive | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| ALL | 1097 | 52.69 % | 0.593 | 1.42 | 305.4 | 0.83 | 219.4 | 4/5 | 0.66 | **ROBUST_EDGE** |
| NO_RISK_OFF | 930 | 54.30 % | 0.741 | 1.53 | 222.8 | 1.00 | 186.0 | 4/5 | 0.74 | **ROBUST_EDGE** |
| RISK_ON_ONLY | 530 | 47.74 % | 0.464 | 1.28 | 222.5 | 0.59 | 106.0 | 2/5 | 0.27 | **FRAGILE** |
| SPY_EMA200 | 760 | 49.47 % | 0.438 | 1.28 | 259.3 | 0.59 | 152.0 | 3/5 | 0.27 | **CONDITIONAL_EDGE** |
| QQQ_EMA200 | 750 | 51.33 % | 0.590 | 1.39 | 220.7 | 0.79 | 150.0 | 3/5 | 0.29 | **CONDITIONAL_EDGE** |
| BREADTH_50 | 776 | 52.71 % | 0.607 | 1.42 | 192.7 | 0.83 | 155.2 | 4/5 | 0.74 | **ROBUST_EDGE** |

## 10. Universe analysis

| universe | Trades | Winrate | Expectancy (R) | PF | Max DD (R) | Sharpe | Turnover/an | Years positive | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| mixed | 930 | 54.30 % | 0.741 | 1.53 | 222.8 | 1.00 | 186.0 | 4/5 | 0.74 | **ROBUST_EDGE** |
| etfs | 614 | 55.21 % | -0.110 | 0.82 | 127.1 | -0.43 | 122.8 | 3/5 | 0.94 | **DEAD** |
| semis | 751 | 51.80 % | 0.263 | 1.27 | 163.1 | 0.63 | 150.2 | 3/5 | 0.98 | **CONDITIONAL_EDGE** |
| ai_software | 827 | 54.29 % | 0.642 | 1.52 | 194.9 | 0.96 | 165.4 | 4/5 | 0.68 | **ROBUST_EDGE** |
| megacaps | 809 | 54.02 % | 0.126 | 1.20 | 97.1 | 0.39 | 161.8 | 3/5 | 0.75 | **CONDITIONAL_EDGE** |
| commodities | 26 | 50.00 % | 0.033 | 1.12 | 3.0 | 0.31 | 8.7 | 1/3 | n/a | **DEAD** |

## 11. Exit model analysis

| exit | Trades | Winrate | Expectancy (R) | PF | Max DD (R) | Sharpe | Turnover/an | Years positive | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| fixed_hold | 930 | 54.30 % | 0.741 | 1.53 | 222.8 | 1.00 | 186.0 | 4/5 | 0.74 | **ROBUST_EDGE** |
| atr_trailing | 930 | 41.40 % | 0.034 | 1.04 | 109.4 | 0.10 | 186.0 | 3/5 | 1.00 | **FRAGILE** |
| ema_trailing | 930 | 37.10 % | 0.376 | 1.44 | 80.2 | 0.70 | 186.0 | 4/5 | 1.15 | **ROBUST_EDGE** |
| momentum_decay | 930 | 43.76 % | 0.400 | 1.46 | 85.7 | 0.77 | 186.0 | 4/5 | 1.02 | **ROBUST_EDGE** |
| time_stop | 930 | 44.09 % | 0.683 | 1.64 | 137.8 | 1.12 | 186.0 | 4/5 | 0.82 | **ROBUST_EDGE** |

## 12. Rolling robustness — yearly PF par config testée

Pour chaque config, PF mesuré par année (2021-2025) :

| Config | 2021 | 2022 | 2023 | 2024 | 2025 | Classification |
|---|---:|---:|---:|---:|---:|---|
| h20/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 1.53 | 0.15 | 2.05 | 1.68 | 1.39 | **ROBUST_EDGE** |
| h10/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 1.46 | 0.15 | 1.69 | 1.33 | 1.12 | **CONDITIONAL_EDGE** |
| h20/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 1.53 | 0.15 | 2.05 | 1.68 | 1.39 | **ROBUST_EDGE** |
| h40/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 1.53 | 0.41 | 2.30 | 2.12 | 1.39 | **ROBUST_EDGE** |
| h20/top10/reb10/ALL/mixed/fixed_hold | 1.53 | 0.56 | 2.05 | 1.68 | 1.37 | **ROBUST_EDGE** |
| h20/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 1.53 | 0.15 | 2.05 | 1.68 | 1.39 | **ROBUST_EDGE** |
| h20/top10/reb10/RISK_ON_ONLY/mixed/fixed_hold | 0.59 | 0.04 | 0.90 | 1.62 | 1.76 | **FRAGILE** |
| h20/top10/reb10/SPY_EMA200/mixed/fixed_hold | 0.59 | 0.15 | 1.64 | 1.68 | 1.35 | **CONDITIONAL_EDGE** |
| h20/top10/reb10/QQQ_EMA200/mixed/fixed_hold | 0.59 | 0.04 | 1.85 | 1.68 | 1.39 | **CONDITIONAL_EDGE** |
| h20/top10/reb10/BREADTH_50/mixed/fixed_hold | 1.27 | 0.51 | 1.84 | 1.58 | 1.29 | **ROBUST_EDGE** |
| h20/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 1.53 | 0.15 | 2.05 | 1.68 | 1.39 | **ROBUST_EDGE** |
| h20/top10/reb10/NO_RISK_OFF/etfs/fixed_hold | 0.65 | 12.39 | 1.17 | 0.49 | 1.35 | **DEAD** |
| h20/top10/reb10/NO_RISK_OFF/semis/fixed_hold | 1.85 | 0.15 | 1.33 | 0.95 | 1.71 | **CONDITIONAL_EDGE** |
| h20/top10/reb10/NO_RISK_OFF/ai_software/fixed_hold | 1.26 | 0.02 | 1.99 | 1.72 | 1.36 | **ROBUST_EDGE** |
| h20/top10/reb10/NO_RISK_OFF/megacaps/fixed_hold | 0.91 | 0.27 | 2.16 | 1.06 | 1.13 | **CONDITIONAL_EDGE** |
| h20/top10/reb10/NO_RISK_OFF/commodities/fixed_hold | n/a | n/a | 0.47 | 0.46 | 3.47 | **DEAD** |

## 13. Final ranking

**Verdict global : ROBUST_CORE_FOUND**

- Configurations testées (uniques) : 26
- ROBUST_EDGE : 16
- CONDITIONAL_EDGE : 5
- FRAGILE : 3
- DEAD : 2

### ROBUST_EDGE (16)

| Config | Trades | PF | Expectancy R | Max DD R | Sharpe | Years+ | Decay |
|---|---:|---:|---:|---:|---:|---:|---:|
| h120/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 830 | 1.91 | 2.775 | 742.3 | 1.48 | 4/5 | 0.71 |
| h60/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 890 | 1.83 | 1.772 | 447.5 | 1.42 | 4/5 | 0.82 |
| h40/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 910 | 1.72 | 1.353 | 360.4 | 1.27 | 4/5 | 0.70 |
| h20/top10/reb10/NO_RISK_OFF/mixed/time_stop | 930 | 1.64 | 0.683 | 137.8 | 1.12 | 4/5 | 0.82 |
| h20/top10/reb20/NO_RISK_OFF/mixed/fixed_hold | 480 | 1.56 | 0.793 | 111.6 | 1.04 | 4/5 | 0.59 |
| h20/top3/reb10/NO_RISK_OFF/mixed/fixed_hold | 279 | 1.54 | 0.958 | 72.3 | 1.09 | 4/5 | 1.22 |
| h20/top5/reb10/NO_RISK_OFF/mixed/fixed_hold | 465 | 1.54 | 0.892 | 118.2 | 1.09 | 4/5 | 1.00 |
| h20/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 930 | 1.53 | 0.741 | 222.8 | 1.00 | 4/5 | 0.74 |
_8 configs supplémentaires non affichées_

### CONDITIONAL_EDGE (5)

| Config | Trades | PF | Expectancy R | Max DD R | Sharpe | Years+ | Decay |
|---|---:|---:|---:|---:|---:|---:|---:|
| h20/top10/reb10/QQQ_EMA200/mixed/fixed_hold | 750 | 1.39 | 0.590 | 220.7 | 0.79 | 3/5 | 0.29 |
| h20/top10/reb10/SPY_EMA200/mixed/fixed_hold | 760 | 1.28 | 0.438 | 259.3 | 0.59 | 3/5 | 0.27 |
| h20/top10/reb10/NO_RISK_OFF/semis/fixed_hold | 751 | 1.27 | 0.263 | 163.1 | 0.63 | 3/5 | 0.98 |
| h10/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 940 | 1.26 | 0.275 | 140.9 | 0.55 | 4/5 | 0.82 |
| h20/top10/reb10/NO_RISK_OFF/megacaps/fixed_hold | 809 | 1.20 | 0.126 | 97.1 | 0.39 | 3/5 | 0.75 |

### FRAGILE (3)

| Config | Trades | PF | Expectancy R | Max DD R | Sharpe | Years+ | Decay |
|---|---:|---:|---:|---:|---:|---:|---:|
| h20/top10/reb10/RISK_ON_ONLY/mixed/fixed_hold | 530 | 1.28 | 0.464 | 222.5 | 0.59 | 2/5 | 0.27 |
| h20/top1/reb10/NO_RISK_OFF/mixed/fixed_hold | 93 | 1.07 | 0.159 | 63.1 | 0.18 | 3/5 | 1.11 |
| h20/top10/reb10/NO_RISK_OFF/mixed/atr_trailing | 930 | 1.04 | 0.034 | 109.4 | 0.10 | 3/5 | 1.00 |

### DEAD (2)

| Config | Trades | PF | Expectancy R | Max DD R | Sharpe | Years+ | Decay |
|---|---:|---:|---:|---:|---:|---:|---:|
| h20/top10/reb10/NO_RISK_OFF/commodities/fixed_hold | 26 | 1.12 | 0.033 | 3.0 | 0.31 | 1/3 | n/a |
| h20/top10/reb10/NO_RISK_OFF/etfs/fixed_hold | 614 | 0.82 | -0.110 | 127.1 | -0.43 | 3/5 | 0.94 |

## 14. Final verdict

**Status : ROBUST_CORE_FOUND**

Réponses aux 7 questions du brief :

1. **Quand RS Rotation fonctionne réellement ?** Selon les sweeps : meilleur univers = **mixed** (PF 1.53), meilleur régime = **NO_RISK_OFF** (PF 1.53).

2. **Quand il échoue ?** Pire univers = **etfs** (PF 0.82), pire régime = **RISK_ON_ONLY** (PF 1.28).

3. **Quel régime détruit le setup ?** RISK_OFF (cf. backtest source : PF 0.96 dans ce régime). En filtrant ALL_REGIMES (incluant RISK_OFF), la baseline donne PF 1.42 avec 1097 trades.

4. **Quel univers est le plus robuste ?** mixed (PF 1.53, 4/5 années positives, decay ×0.74).

5. **Quel horizon est le plus stable ?** 10j (PF 1.26, 4/5 années positives).

6. **Quel niveau de friction tue l'edge ?** Friction par trade pour horizon 20j = 0.140R, horizon 120j = 0.540R. Si l'expectancy brute est < 0.140R sur horizon 20j, l'edge est consommé. Comparaison aux résultats : baseline expectancy = 0.741R (après friction), soit POSITIF.

7. **Existe-t-il un noyau réellement exploitable ?** OUI. 16 configurations ROBUST_EDGE identifiées. Meilleure : {"horizon":120,"topN":10,"rebalance":10,"regime":"NO_RISK_OFF","universe":"mixed","exit":"fixed_hold","lookback":90,"minMomentum":12} (PF 1.91). Voir section 13.

---

**Hypothèses** : friction round-trip 0.30 % + 0.02 % par jour, conversion 5% = 1R, indicateurs causaux par construction, NEXT_OPEN exclusivement, lookback fixe à 90j sauf indication, minMomentum 12 %. Pas de VIX (données non disponibles dans le repo).

**Limites** :
- Sweeps **univariés**, pas de grid complet (33 configs uniques au lieu de 25 000+).
- Pas de rebalance vraiment journalier en mode efficace : `rebalance=1` testé mais lourd (33 % du volume baseline en plus de trades).
- Pas de short-side testé (le moteur source est long-only).
- Pas de modélisation de position sizing (taille fixe = 1 unité par position).
- Friction simplifiée : pas de modélisation par actif (crypto vs ETF a des frictions très différentes).
- Rolling robustness limitée à PF annuel ; pas de walk-forward conditionnel régime (à faire dans PR séparée).