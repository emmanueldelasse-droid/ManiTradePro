# Setup Execution Bias Audit v1 — ManiTradePro

> Généré le 2026-05-18T14:09:11.372Z par `tools/backtests/setup-execution-bias-audit-v1.mjs`.

**⚠ Audit offline uniquement.** Aucun ordre, aucun broker, aucun endpoint live. Aucun moteur existant modifié. Le but est de détecter un faux edge, pas de sauver les setups.

## 1. Scope

Audit des trois setups restants après l'invalidation de PULLBACK_MOMENTUM (PR #207 verdict INVALID_BACKTEST) :
- **BREAKOUT_EXPANSION** (4 variantes)
- **MEAN_REVERSION** (3 variantes)
- **RELATIVE_STRENGTH_ROTATION** (2 variantes)

## 2. Sources analysées

- tools/backtests/backtest-multi-setup-grid.mjs
- tools/backtests/backtest-relative-strength-rotation-regime-v1.mjs
- tools/backtests/universe-v2.mjs
- data/*.json (OHLC quotidiens 2021-2025)
- tools/backtests/output/setup-performance-summary-v1.json (référence)
- tools/backtests/output/pullback-lookahead-audit-v1.json (référence)
- tools/backtests/output/rolling-walkforward-validator.json (référence)
- tools/backtests/output/setup-variant-matrix.json (référence)

## 3. Méthodologie

Pour chaque setup, l'audit combine :
1. **Analyse statique** du code source — identification des composantes utilisant la bougie signal ou des fenêtres incluant la bougie i.
2. **Re-simulation** sur les mêmes OHLC 2021-2025 avec plusieurs modèles d'entrée alternatifs.
3. **Verdict** : CLEAN / LOW_RISK / MEDIUM_RISK / HIGH_RISK / INVALID_BACKTEST en fonction de l'inflation PF observée.

Modèles testés :

| Setup | Modèles |
|---|---|
| BREAKOUT_EXPANSION | CURRENT, NEXT_OPEN, SIGNAL_CLOSE, NO_SIGNAL_CANDLE_LOW_STOP, NEXT_OPEN_NO_SIGNAL_CANDLE_STOP |
| MEAN_REVERSION | CURRENT, NEXT_OPEN, SIGNAL_CLOSE, NO_SIGNAL_CANDLE_LOW_STOP, NEXT_OPEN_NO_SIGNAL_CANDLE_STOP |
| RELATIVE_STRENGTH_ROTATION | CURRENT, NEXT_OPEN_ENTRY_ONLY, NEXT_OPEN_BOTH |

## 4. Résumé exécutif

| Setup | Severity | Justification |
|---|---|---|
| BREAKOUT_EXPANSION | **INVALID_BACKTEST** | PF CURRENT 0.92 / PF réaliste 0.91 = ×1.01 (réaliste sous le break-even) |
| MEAN_REVERSION | **MEDIUM_RISK** | PF CURRENT 1.43 / PF réaliste 1.21 = ×1.19 |
| RELATIVE_STRENGTH_ROTATION | **CLEAN** | PF CURRENT 1.58 / PF réaliste 1.57 = ×1.01 |

Pour mémoire : PULLBACK_MOMENTUM = **INVALID_BACKTEST** (PR #207).

## 5. Breakout audit

### Statique

- **B1** (LOW) — highestHigh (fenêtre lookback). Fenêtre EXCLUT déjà la bougie signal. highestHigh est calculé sur les `lookback` jours strictement antérieurs. (Réf. `candles.slice(-(variant.lookback + 1), -1)`, verdict : SAFE.)
- **B2** (MEDIUM) — entry = lastCandle.close. L'entrée est le close de la bougie signal. Réaliste UNIQUEMENT si on accepte un MOC order (Market On Close) ou si on attend l'open suivant. Si pas de MOC dispo en réel, l'entrée effective est open[i+1]. (Réf. `const entry = lastCandle.close`, verdict : RISKY (selon mode d'exécution).)
- **B3** (LOW) — stop = min(lastCandle.low, entry - atr*x). Le stop utilise low[i] qui est connu en fin de jour. Si l'entrée est intraday (impossible sans tick data), le low[i] serait postérieur. En MOC ou post-close, low[i] est OK. (Réf. `Math.min(lastCandle.low, entry - atr * variant.stopAtr)`, verdict : RISKY (selon mode d'exécution).)
- **B4** (LOW) — ATR calcul. ATR inclut TR de la bougie i (TR utilise high[i], low[i], close[i-1]). Tout est connu en fin de jour, OK. (Réf. `averageRange(candles, 14)`, verdict : SAFE.)
- **B5** (LOW) — volumeMA. Volume MA calculé sur fenêtre EXCLUANT bougie i. Pas de look-ahead. (Réf. `volumeMA(candles.slice(0, -1), 20)`, verdict : SAFE.)

### Re-simulation (agrégée toutes variantes)

| Modèle | Trades | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation vs CURRENT |
|---|---:|---:|---:|---:|---:|---:|
| CURRENT | 9 428 | 20.93 % | -0.038 | 0.92 | 525.0 | — |
| NEXT_OPEN | 9 428 | 18.78 % | -0.073 | 0.85 | 732.5 | ×1.087 |
| SIGNAL_CLOSE | 9 428 | 20.93 % | -0.038 | 0.92 | 525.0 | ×1 |
| NO_SIGNAL_CANDLE_LOW_STOP | 9 428 | 26.26 % | 0.013 | 1.02 | 380.5 | ×0.9 |
| NEXT_OPEN_NO_SIGNAL_CANDLE_STOP | 9 428 | 24.11 % | -0.050 | 0.91 | 553.0 | ×1.011 |

### Focus GLD × breakout_h20_vol1.5_stop1_rr2

La variante phare de Breakout (seule à atteindre tier STRONG dans setup-variant-matrix). Verdict après exécution réaliste :

| Modèle | Trades | Winrate | Expectancy (R) | Profit factor | Max DD (R) |
|---|---:|---:|---:|---:|---:|
| CURRENT | 47 | 53.19 % | 0.617 | 2.38 | 4.0 |
| NEXT_OPEN | 47 | 38.30 % | 0.340 | 1.80 | 5.0 |
| SIGNAL_CLOSE | 47 | 53.19 % | 0.617 | 2.38 | 4.0 |
| NO_SIGNAL_CANDLE_LOW_STOP | 47 | 48.94 % | 0.468 | 1.92 | 4.0 |
| NEXT_OPEN_NO_SIGNAL_CANDLE_STOP | 47 | 51.06 % | 0.596 | 2.40 | 5.0 |

## 6. Mean Reversion audit

### Statique

- **M1** (LOW) — greenReversal. Condition utilise close[i], open[i], close[i-1]. Toutes connues en fin de jour. OK signal post-close. (Réf. `lastCandle.close > lastCandle.open && lastCandle.close > prevCandle.close`, verdict : SAFE.)
- **M2** (MEDIUM) — entry = lastCandle.close. Même remarque que Breakout B2 : réaliste si MOC, sinon NEXT_OPEN. (Réf. `const entry = lastCandle.close`, verdict : RISKY (selon mode d'exécution).)
- **M3** (LOW) — stop = min(lastCandle.low, entry - atr*x). Idem Breakout B3. low[i] connu en fin de jour, OK post-close. (Réf. `Math.min(lastCandle.low, entry - atr * variant.stopAtr)`, verdict : RISKY (selon mode d'exécution).)

### Re-simulation (agrégée toutes variantes)

| Modèle | Trades | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation vs CURRENT |
|---|---:|---:|---:|---:|---:|---:|
| CURRENT | 5 074 | 40.97 % | 0.153 | 1.43 | 26.4 | — |
| NEXT_OPEN | 5 074 | 37.31 % | 0.106 | 1.30 | 38.9 | ×1.104 |
| SIGNAL_CLOSE | 5 074 | 40.97 % | 0.153 | 1.43 | 26.4 | ×1 |
| NO_SIGNAL_CANDLE_LOW_STOP | 5 074 | 40.17 % | 0.130 | 1.35 | 29.4 | ×1.059 |
| NEXT_OPEN_NO_SIGNAL_CANDLE_STOP | 5 074 | 37.56 % | 0.080 | 1.21 | 60.9 | ×1.187 |

## 7. RS Rotation audit

### Statique

- **R1** (LOW) — momentum sur lookback days. Momentum = (close[i] - close[i-lookback]) / close[i-lookback]. Causal. (Réf. `const now = candles[idx].close; const past = candles[idx - variant.lookback].close`, verdict : SAFE.)
- **R2** (MEDIUM) — entry = candles[idx].close, exit = candles[idx + holdDays].close. Entry au close[i] et exit au close[i+holdDays]. Comme Breakout/MeanRev, réaliste si MOC à l'entrée ET à la sortie. En réel, sans MOC, l'exécution est open[i+1] et open[i+1+holdDays]. Risque modéré. (Réf. `const now = candles[idx].close (entry); const exit = candles[idx + variant.holdDays].close`, verdict : RISKY (selon mode d'exécution).)
- **R3** (MEDIUM) — ranking inter-symboles à la date i. Le ranking nécessite le close[i] de TOUS les symboles, donc impossible à exécuter intraday. Doit être fait après cloture du marché, et l'exécution sera open[i+1] en pratique. (Réf. `candidates.sort((a, b) => b.momentum - a.momentum)`, verdict : RISKY (ranking post-close, exécution open suivant).)
- **R4** (LOW) — pnl = pnlPct / 5 (convention R). Conversion arbitraire : 5 % = 1R. Pas de look-ahead mais le rapport R/Risk n'a pas de sens absolu — c'est juste une normalisation. (Réf. `const pnl = c.pnlPct / 5`, verdict : SAFE (convention documentée).)
- **R5** (LOW) — overcounting regimeMode. Les trades sont comptés trois fois dans certaines agrégations downstream (cf. setup-performance-summary). Pas un bias de calcul mais un risque d'interprétation. (Réf. `Le moteur produit 3 regimeModes (ALL_REGIMES, NO_RISK_OFF, RISK_ON_ONLY)`, verdict : SAFE (déjà documenté ailleurs).)

### Re-simulation (agrégée toutes variantes, toutes dates 2021-2025)

| Modèle | Trades | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation vs CURRENT |
|---|---:|---:|---:|---:|---:|---:|
| CURRENT | 2 140 | 54.72 % | 0.771 | 1.58 | 300.6 | — |
| NEXT_OPEN_ENTRY_ONLY | 2 140 | 53.69 % | 0.728 | 1.54 | 300.0 | ×1.028 |
| NEXT_OPEN_BOTH | 2 140 | 54.67 % | 0.771 | 1.57 | 285.2 | ×1.005 |

**Rappel** : rolling walk-forward → 0 cellule ROBUST/STABLE pour RS Rotation, 0 ALLOW v2 (cf. setup-performance-summary-v1). L'edge backtest n'a pas tenu sur les splits temporels même avant cet audit.

## 8. Comparaison des modèles d'entrée — tableau récapitulatif

Synthèse cross-setup : PF agrégé par modèle, pour répondre rapidement à « quel modèle d'exécution fait le moins/le plus de dégâts ».

| Setup | CURRENT | NEXT_OPEN | SIGNAL_CLOSE | NO_SIG_LOW_STOP | NEXT_OPEN_NO_SIG_STOP |
|---|---:|---:|---:|---:|---:|
| Breakout | 0.92 | 0.85 | 0.92 | 1.02 | 0.91 |
| Mean Reversion | 1.43 | 1.30 | 1.43 | 1.35 | 1.21 |

RS Rotation (3 modèles différents) :

| Modèle | PF | Inflation |
|---|---:|---:|
| CURRENT | 1.58 | — |
| NEXT_OPEN_ENTRY_ONLY | 1.54 | ×1.028 |
| NEXT_OPEN_BOTH | 1.57 | ×1.005 |

## 9. Survivorship / data completeness

- Univers déclaré : **191** symboles.
- Fichiers OHLC dispo : **182**.
- Symboles UNIVERSE sans OHLC : **31** (DIA, XLE, XLF, XLV, XLI, XLP, XLY, XLB, XLU, XLRE, XLC, EWJ…).
- Fichiers OHLC hors univers : **22**.

Limites : pas de liste externe de tickers delistés 2021-2025 pour audit complet. Les delistés hors UNIVERSE ne sont pas mesurables.

## 10. Findings détaillés

### BREAKOUT_EXPANSION

- **B1** (severity LOW, verdict SAFE) — highestHigh (fenêtre lookback).
  - Réf. code : `candles.slice(-(variant.lookback + 1), -1)`
  - Fenêtre EXCLUT déjà la bougie signal. highestHigh est calculé sur les `lookback` jours strictement antérieurs.
- **B2** (severity MEDIUM, verdict RISKY (selon mode d'exécution)) — entry = lastCandle.close.
  - Réf. code : `const entry = lastCandle.close`
  - L'entrée est le close de la bougie signal. Réaliste UNIQUEMENT si on accepte un MOC order (Market On Close) ou si on attend l'open suivant. Si pas de MOC dispo en réel, l'entrée effective est open[i+1].
- **B3** (severity LOW, verdict RISKY (selon mode d'exécution)) — stop = min(lastCandle.low, entry - atr*x).
  - Réf. code : `Math.min(lastCandle.low, entry - atr * variant.stopAtr)`
  - Le stop utilise low[i] qui est connu en fin de jour. Si l'entrée est intraday (impossible sans tick data), le low[i] serait postérieur. En MOC ou post-close, low[i] est OK.
- **B4** (severity LOW, verdict SAFE) — ATR calcul.
  - Réf. code : `averageRange(candles, 14)`
  - ATR inclut TR de la bougie i (TR utilise high[i], low[i], close[i-1]). Tout est connu en fin de jour, OK.
- **B5** (severity LOW, verdict SAFE) — volumeMA.
  - Réf. code : `volumeMA(candles.slice(0, -1), 20)`
  - Volume MA calculé sur fenêtre EXCLUANT bougie i. Pas de look-ahead.

### MEAN_REVERSION

- **M1** (severity LOW, verdict SAFE) — greenReversal.
  - Réf. code : `lastCandle.close > lastCandle.open && lastCandle.close > prevCandle.close`
  - Condition utilise close[i], open[i], close[i-1]. Toutes connues en fin de jour. OK signal post-close.
- **M2** (severity MEDIUM, verdict RISKY (selon mode d'exécution)) — entry = lastCandle.close.
  - Réf. code : `const entry = lastCandle.close`
  - Même remarque que Breakout B2 : réaliste si MOC, sinon NEXT_OPEN.
- **M3** (severity LOW, verdict RISKY (selon mode d'exécution)) — stop = min(lastCandle.low, entry - atr*x).
  - Réf. code : `Math.min(lastCandle.low, entry - atr * variant.stopAtr)`
  - Idem Breakout B3. low[i] connu en fin de jour, OK post-close.

### RELATIVE_STRENGTH_ROTATION

- **R1** (severity LOW, verdict SAFE) — momentum sur lookback days.
  - Réf. code : `const now = candles[idx].close; const past = candles[idx - variant.lookback].close`
  - Momentum = (close[i] - close[i-lookback]) / close[i-lookback]. Causal.
- **R2** (severity MEDIUM, verdict RISKY (selon mode d'exécution)) — entry = candles[idx].close, exit = candles[idx + holdDays].close.
  - Réf. code : `const now = candles[idx].close (entry); const exit = candles[idx + variant.holdDays].close`
  - Entry au close[i] et exit au close[i+holdDays]. Comme Breakout/MeanRev, réaliste si MOC à l'entrée ET à la sortie. En réel, sans MOC, l'exécution est open[i+1] et open[i+1+holdDays]. Risque modéré.
- **R3** (severity MEDIUM, verdict RISKY (ranking post-close, exécution open suivant)) — ranking inter-symboles à la date i.
  - Réf. code : `candidates.sort((a, b) => b.momentum - a.momentum)`
  - Le ranking nécessite le close[i] de TOUS les symboles, donc impossible à exécuter intraday. Doit être fait après cloture du marché, et l'exécution sera open[i+1] en pratique.
- **R4** (severity LOW, verdict SAFE (convention documentée)) — pnl = pnlPct / 5 (convention R).
  - Réf. code : `const pnl = c.pnlPct / 5`
  - Conversion arbitraire : 5 % = 1R. Pas de look-ahead mais le rapport R/Risk n'a pas de sens absolu — c'est juste une normalisation.
- **R5** (severity LOW, verdict SAFE (déjà documenté ailleurs)) — overcounting regimeMode.
  - Réf. code : `Le moteur produit 3 regimeModes (ALL_REGIMES, NO_RISK_OFF, RISK_ON_ONLY)`
  - Les trades sont comptés trois fois dans certaines agrégations downstream (cf. setup-performance-summary). Pas un bias de calcul mais un risque d'interprétation.

## 11. Severity grading

Échelle : **CLEAN**, **LOW_RISK**, **MEDIUM_RISK**, **HIGH_RISK**, **INVALID_BACKTEST**.

Méthode : ratio PF CURRENT / PF modèle le plus réaliste (NEXT_OPEN_NO_SIGNAL_CANDLE_STOP pour Breakout/MeanRev, NEXT_OPEN_BOTH pour RS Rotation).

Seuils :
- ratio < 1.05 → CLEAN
- ratio < 1.15 → LOW_RISK
- ratio < 1.30 → MEDIUM_RISK
- ratio < 1.70 → HIGH_RISK
- ratio ≥ 1.70 OU PF réaliste < 1.0 → INVALID_BACKTEST

## 12. Conséquences pipeline aval

Si l'un des setups est noté HIGH_RISK ou INVALID_BACKTEST :
- `tradable-universe-v1`, `tradable-universe-v2` listent des ALLOW potentiellement sur-évalués.
- `rolling-walkforward-validator` calcule la robustesse sur les mêmes données biaisées.
- `allocation-engine-v3` consomme ces verdicts (status actuel = failed, l'écart peut s'aggraver).
- `setup-performance-summary-v1` affiche les grades B/D/FAILED sur la base CURRENT — à reréviser après correction du code source.

## 13. Recommandations

- **Breakout** : corriger `detectBreakout` (entry = open[i+1] et stop = entry - atr*x sans min(low[i], …)).
- **Mean Reversion** : edge marginal résiste à exécution réaliste — décider politique (garder pour diversification ou abandonner).
- **RS Rotation** : PF résiste à exécution open suivant. Mais le rolling walk-forward montre toujours 0 robust/stable — fragilité structurelle indépendante du bias d'exécution.
- **Audit symétrique sur les autres composantes** : friction, slippage, fees, taille de position (déjà partiellement traité par friction-model-v1).
- **Recalcul complet** de la pipeline aval après toute correction de code source.

## 14. Verdict final

- **BREAKOUT_EXPANSION** : INVALID_BACKTEST. PF CURRENT 0.92 / PF réaliste 0.91 = ×1.01 (réaliste sous le break-even)
- **MEAN_REVERSION** : MEDIUM_RISK. PF CURRENT 1.43 / PF réaliste 1.21 = ×1.19
- **RELATIVE_STRENGTH_ROTATION** : CLEAN. PF CURRENT 1.58 / PF réaliste 1.57 = ×1.01

Réponses directes aux questions du brief :

1. **Est-ce que Breakout garde un edge réel ?** NON. PF 0.91 en exécution réaliste, edge détruit.
2. **Est-ce que la variante GLD reste forte après exécution réaliste ?** PF CURRENT 2.38 → PF NEXT_OPEN_NO_SIG_STOP 2.40. OUI, GLD garde un edge substantiel.
3. **Est-ce que Mean Reversion est définitivement mort ?** EDGE TRÈS MARGINAL (PF 1.21), à confirmer après friction.
4. **Est-ce que RS Rotation est un vrai setup à retravailler ou à bloquer ?** À RETRAVAILLER. PF résiste partiellement mais aucune cellule robust/stable en rolling — fragilité indépendante du bias d'exécution.
5. **Doit-on corriger ou repartir de zéro ?** Corrections ciblées suffisantes. Pas besoin de repartir de zéro.

---

**Hypothèses** : indicateurs causaux, OHLC daily, simulation 10 bougies max, LOSS prioritaire si stop+TP même bougie, RS Rotation : pnl = pnlPct / 5. Pas de friction modélisée.

**Limites** : simulation des 4 variants Breakout, 3 variants MeanRev, 2 variants RS ; pas tous les regimeModes RS testés (chaque modèle utilise un regimeMode équivalent à ALL_REGIMES). Pas d'audit anti-look-ahead sur indicateurs eux-mêmes (vérifié causal). Survivorship limité à la diff UNIVERSE vs data/.