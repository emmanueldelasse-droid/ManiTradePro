# RS Rotation Robustness Lab v1 — ManiTradePro

> Généré le 2026-05-18T14:58:14.184Z par `tools/backtests/rs-rotation-robustness-lab-v1.mjs`.

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
| 10 | 939 | 52.08 % | 0.272 | 1.25 | 144.9 | 0.54 | 187.8 | 4/5 | 0.81 | **CONDITIONAL_EDGE** |
| 20 | 929 | 54.36 % | 0.743 | 1.53 | 226.2 | 1.00 | 185.8 | 4/5 | 0.74 | **ROBUST_EDGE** |
| 40 | 909 | 51.93 % | 1.352 | 1.72 | 366.6 | 1.27 | 181.8 | 4/5 | 0.70 | **ROBUST_EDGE** |
| 60 | 889 | 54.11 % | 1.773 | 1.83 | 456.5 | 1.42 | 177.8 | 4/5 | 0.82 | **ROBUST_EDGE** |
| 120 | 829 | 53.80 % | 2.776 | 1.91 | 746.7 | 1.48 | 165.8 | 4/5 | 0.72 | **ROBUST_EDGE** |

## 7. Concentration sweep (topN)

| topN | Trades | Winrate | Expectancy (R) | PF | Max DD (R) | Sharpe | Turnover/an | Years positive | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 93 | 47.31 % | 0.129 | 1.05 | 65.8 | 0.14 | 18.6 | 3/5 | 1.07 | **FRAGILE** |
| 3 | 279 | 53.76 % | 0.929 | 1.52 | 72.4 | 1.05 | 55.8 | 4/5 | 1.16 | **ROBUST_EDGE** |
| 5 | 465 | 54.41 % | 0.884 | 1.53 | 121.8 | 1.08 | 93.0 | 4/5 | 0.98 | **ROBUST_EDGE** |
| 10 | 929 | 54.36 % | 0.743 | 1.53 | 226.2 | 1.00 | 185.8 | 4/5 | 0.74 | **ROBUST_EDGE** |
| 20 | 1814 | 53.20 % | 0.435 | 1.36 | 361.8 | 0.71 | 362.8 | 4/5 | 0.83 | **ROBUST_EDGE** |

## 8. Rebalance sweep

| rebalance | Trades | Winrate | Expectancy (R) | PF | Max DD (R) | Sharpe | Turnover/an | Years positive | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 9061 | 52.14 % | 0.611 | 1.43 | 2364.8 | 0.84 | 1812.2 | 4/5 | 0.72 | **ROBUST_EDGE** |
| 5 | 1821 | 53.43 % | 0.665 | 1.47 | 485.0 | 0.92 | 364.2 | 4/5 | 0.68 | **ROBUST_EDGE** |
| 10 | 929 | 54.36 % | 0.743 | 1.53 | 226.2 | 1.00 | 185.8 | 4/5 | 0.74 | **ROBUST_EDGE** |
| 20 | 479 | 54.07 % | 0.801 | 1.57 | 112.6 | 1.05 | 95.8 | 4/5 | 0.60 | **ROBUST_EDGE** |

## 9. Regime analysis

| regime | Trades | Winrate | Expectancy (R) | PF | Max DD (R) | Sharpe | Turnover/an | Years positive | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| ALL | 1091 | 52.80 % | 0.596 | 1.43 | 311.7 | 0.84 | 218.2 | 4/5 | 0.66 | **ROBUST_EDGE** |
| NO_RISK_OFF | 929 | 54.36 % | 0.743 | 1.53 | 226.2 | 1.00 | 185.8 | 4/5 | 0.74 | **ROBUST_EDGE** |
| RISK_ON_ONLY | 529 | 47.83 % | 0.465 | 1.28 | 222.1 | 0.59 | 105.8 | 2/5 | 0.27 | **FRAGILE** |
| SPY_EMA200 | 759 | 49.41 % | 0.437 | 1.28 | 261.1 | 0.59 | 151.8 | 3/5 | 0.27 | **CONDITIONAL_EDGE** |
| QQQ_EMA200 | 749 | 51.40 % | 0.592 | 1.39 | 220.3 | 0.79 | 149.8 | 3/5 | 0.29 | **CONDITIONAL_EDGE** |
| BREADTH_50 | 775 | 53.81 % | 0.663 | 1.46 | 191.7 | 0.91 | 155.0 | 4/5 | 0.72 | **ROBUST_EDGE** |

## 10. Universe analysis

| universe | Trades | Winrate | Expectancy (R) | PF | Max DD (R) | Sharpe | Turnover/an | Years positive | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| mixed | 929 | 54.36 % | 0.743 | 1.53 | 226.2 | 1.00 | 185.8 | 4/5 | 0.74 | **ROBUST_EDGE** |
| etfs | 542 | 57.75 % | -0.102 | 0.84 | 120.5 | -0.38 | 135.5 | 2/4 | 0.76 | **DEAD** |
| semis | 751 | 51.80 % | 0.263 | 1.27 | 163.1 | 0.63 | 150.2 | 3/5 | 0.98 | **CONDITIONAL_EDGE** |
| ai_software | 827 | 54.29 % | 0.642 | 1.52 | 194.9 | 0.96 | 165.4 | 4/5 | 0.68 | **ROBUST_EDGE** |
| megacaps | 809 | 54.02 % | 0.126 | 1.20 | 97.1 | 0.39 | 161.8 | 3/5 | 0.75 | **CONDITIONAL_EDGE** |
| commodities | 26 | 50.00 % | 0.033 | 1.12 | 3.0 | 0.31 | 8.7 | 1/3 | n/a | **DEAD** |

## 11. Exit model analysis

| exit | Trades | Winrate | Expectancy (R) | PF | Max DD (R) | Sharpe | Turnover/an | Years positive | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| fixed_hold | 929 | 54.36 % | 0.743 | 1.53 | 226.2 | 1.00 | 185.8 | 4/5 | 0.74 | **ROBUST_EDGE** |
| atr_trailing | 929 | 41.33 % | 0.036 | 1.04 | 109.9 | 0.10 | 185.8 | 3/5 | 1.00 | **FRAGILE** |
| ema_trailing | 929 | 37.03 % | 0.376 | 1.44 | 80.9 | 0.70 | 185.8 | 4/5 | 1.15 | **ROBUST_EDGE** |
| momentum_decay | 929 | 43.81 % | 0.401 | 1.46 | 85.6 | 0.77 | 185.8 | 4/5 | 1.03 | **ROBUST_EDGE** |
| time_stop | 929 | 44.03 % | 0.680 | 1.63 | 143.8 | 1.11 | 185.8 | 4/5 | 0.81 | **ROBUST_EDGE** |

## 12. Rolling robustness — yearly PF par config testée

Pour chaque config, PF mesuré par année (2021-2025) :

| Config | 2021 | 2022 | 2023 | 2024 | 2025 | Classification |
|---|---:|---:|---:|---:|---:|---|
| h20/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 1.54 | 0.14 | 2.05 | 1.68 | 1.39 | **ROBUST_EDGE** |
| h10/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 1.46 | 0.13 | 1.69 | 1.33 | 1.12 | **CONDITIONAL_EDGE** |
| h20/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 1.54 | 0.14 | 2.05 | 1.68 | 1.39 | **ROBUST_EDGE** |
| h40/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 1.55 | 0.36 | 2.30 | 2.12 | 1.39 | **ROBUST_EDGE** |
| h20/top10/reb10/ALL/mixed/fixed_hold | 1.54 | 0.55 | 2.05 | 1.68 | 1.37 | **ROBUST_EDGE** |
| h20/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 1.54 | 0.14 | 2.05 | 1.68 | 1.39 | **ROBUST_EDGE** |
| h20/top10/reb10/RISK_ON_ONLY/mixed/fixed_hold | 0.59 | 0.04 | 0.90 | 1.62 | 1.76 | **FRAGILE** |
| h20/top10/reb10/SPY_EMA200/mixed/fixed_hold | 0.59 | 0.14 | 1.64 | 1.68 | 1.35 | **CONDITIONAL_EDGE** |
| h20/top10/reb10/QQQ_EMA200/mixed/fixed_hold | 0.59 | 0.04 | 1.85 | 1.68 | 1.39 | **CONDITIONAL_EDGE** |
| h20/top10/reb10/BREADTH_50/mixed/fixed_hold | 1.28 | 0.54 | 1.90 | 1.69 | 1.29 | **ROBUST_EDGE** |
| h20/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 1.54 | 0.14 | 2.05 | 1.68 | 1.39 | **ROBUST_EDGE** |
| h20/top10/reb10/NO_RISK_OFF/etfs/fixed_hold | 0.58 | n/a | 1.36 | 0.47 | 1.45 | **DEAD** |
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
| h120/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 829 | 1.91 | 2.776 | 746.7 | 1.48 | 4/5 | 0.72 |
| h60/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 889 | 1.83 | 1.773 | 456.5 | 1.42 | 4/5 | 0.82 |
| h40/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 909 | 1.72 | 1.352 | 366.6 | 1.27 | 4/5 | 0.70 |
| h20/top10/reb10/NO_RISK_OFF/mixed/time_stop | 929 | 1.63 | 0.680 | 143.8 | 1.11 | 4/5 | 0.81 |
| h20/top10/reb20/NO_RISK_OFF/mixed/fixed_hold | 479 | 1.57 | 0.801 | 112.6 | 1.05 | 4/5 | 0.60 |
| h20/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 929 | 1.53 | 0.743 | 226.2 | 1.00 | 4/5 | 0.74 |
| h20/top5/reb10/NO_RISK_OFF/mixed/fixed_hold | 465 | 1.53 | 0.884 | 121.8 | 1.08 | 4/5 | 0.98 |
| h20/top10/reb10/NO_RISK_OFF/ai_software/fixed_hold | 827 | 1.52 | 0.642 | 194.9 | 0.96 | 4/5 | 0.68 |
_8 configs supplémentaires non affichées_

### CONDITIONAL_EDGE (5)

| Config | Trades | PF | Expectancy R | Max DD R | Sharpe | Years+ | Decay |
|---|---:|---:|---:|---:|---:|---:|---:|
| h20/top10/reb10/QQQ_EMA200/mixed/fixed_hold | 749 | 1.39 | 0.592 | 220.3 | 0.79 | 3/5 | 0.29 |
| h20/top10/reb10/SPY_EMA200/mixed/fixed_hold | 759 | 1.28 | 0.437 | 261.1 | 0.59 | 3/5 | 0.27 |
| h20/top10/reb10/NO_RISK_OFF/semis/fixed_hold | 751 | 1.27 | 0.263 | 163.1 | 0.63 | 3/5 | 0.98 |
| h10/top10/reb10/NO_RISK_OFF/mixed/fixed_hold | 939 | 1.25 | 0.272 | 144.9 | 0.54 | 4/5 | 0.81 |
| h20/top10/reb10/NO_RISK_OFF/megacaps/fixed_hold | 809 | 1.20 | 0.126 | 97.1 | 0.39 | 3/5 | 0.75 |

### FRAGILE (3)

| Config | Trades | PF | Expectancy R | Max DD R | Sharpe | Years+ | Decay |
|---|---:|---:|---:|---:|---:|---:|---:|
| h20/top10/reb10/RISK_ON_ONLY/mixed/fixed_hold | 529 | 1.28 | 0.465 | 222.1 | 0.59 | 2/5 | 0.27 |
| h20/top1/reb10/NO_RISK_OFF/mixed/fixed_hold | 93 | 1.05 | 0.129 | 65.8 | 0.14 | 3/5 | 1.07 |
| h20/top10/reb10/NO_RISK_OFF/mixed/atr_trailing | 929 | 1.04 | 0.036 | 109.9 | 0.10 | 3/5 | 1.00 |

### DEAD (2)

| Config | Trades | PF | Expectancy R | Max DD R | Sharpe | Years+ | Decay |
|---|---:|---:|---:|---:|---:|---:|---:|
| h20/top10/reb10/NO_RISK_OFF/commodities/fixed_hold | 26 | 1.12 | 0.033 | 3.0 | 0.31 | 1/3 | n/a |
| h20/top10/reb10/NO_RISK_OFF/etfs/fixed_hold | 542 | 0.84 | -0.102 | 120.5 | -0.38 | 2/4 | 0.76 |

## 14. Final verdict

**Status : ROBUST_CORE_FOUND**

Réponses aux 7 questions du brief :

1. **Quand RS Rotation fonctionne réellement ?** Selon les sweeps : meilleur univers = **mixed** (PF 1.53), meilleur régime = **NO_RISK_OFF** (PF 1.53).

2. **Quand il échoue ?** Pire univers = **etfs** (PF 0.84), pire régime = **RISK_ON_ONLY** (PF 1.28).

3. **Quel régime détruit le setup ?** RISK_OFF (cf. backtest source : PF 0.96 dans ce régime). En filtrant ALL_REGIMES (incluant RISK_OFF), la baseline donne PF 1.43 avec 1091 trades.

4. **Quel univers est le plus robuste ?** mixed (PF 1.53, 4/5 années positives, decay ×0.74).

5. **Quel horizon est le plus stable ?** 10j (PF 1.25, 4/5 années positives).

6. **Quel niveau de friction tue l'edge ?** Friction par trade pour horizon 20j = 0.140R, horizon 120j = 0.540R. Si l'expectancy brute est < 0.140R sur horizon 20j, l'edge est consommé. Comparaison aux résultats : baseline expectancy = 0.743R (après friction), soit POSITIF.

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