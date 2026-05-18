# Pullback Look-Ahead Audit v1 — ManiTradePro

> Généré le 2026-05-18T13:54:17.471Z par `tools/backtests/pullback-lookahead-audit-v1.mjs`.

**⚠ Audit offline uniquement.** Aucun ordre, aucun broker, aucun endpoint live. Lecture seule des données existantes. L'objectif est de détecter un faux edge, pas de sauver le setup.

## 1. Scope

Audit du setup PULLBACK_MOMENTUM tel qu'implémenté dans :

- `tools/backtests/backtest-multi-setup-grid.mjs` (5 variantes)
- `tools/backtests/backtest-pullback-yearly-walkforward.mjs` (10 variantes, même logique de signal)

Objectif : détecter look-ahead bias, temporal leakage, execution bias, survivorship bias et mesurer leur impact réel par re-simulation avec plusieurs modèles d'entrée.

## 2. Sources analysées

- tools/backtests/backtest-multi-setup-grid.mjs
- tools/backtests/backtest-pullback-yearly-walkforward.mjs
- tools/backtests/universe-v2.mjs
- data/*.json (OHLC quotidiens 2021-2025)
- tools/backtests/output/setup-performance-summary-v1.json (référence)
- tools/backtests/output/rolling-walkforward-validator.json (référence)
- tools/backtests/output/setup-variant-matrix.json (référence)

## 3. Méthodologie

1. **Audit statique** : lecture line-by-line du code Pullback. Identification des composantes utilisant potentiellement de l'information future (EMA20 incluant le close de la bougie signal, swingHigh20/swingLow10 sur fenêtres incluant la bougie signal).

2. **Re-simulation** sur les mêmes données OHLC quotidiens (`data/*.json`, 2021-2025, 182 symboles) avec **6 modèles d'entrée** :

   | Modèle | Entrée | Stop/TP fenêtre | Description |
   |---|---|---|---|
   | CURRENT | EMA20[i] | inclut bougie i | Code actuel — baseline |
   | CURRENT_NO_LEAK | EMA20[i] | exclut bougie i | Isole le look-ahead stop/TP |
   | SIGNAL_CLOSE | close[i] | exclut bougie i | Réaliste : on paie le close |
   | NEXT_OPEN | open[i+1] | exclut bougie i | Réaliste : entrée à l'open suivant |
   | RETOUCH_EMA20 | EMA20[i] (si touché dans 3 bars) | exclut bougie i | Conserve l'entrée EMA20 mais conditionnée à un retouch réel |
   | MID_NEXT_BAR | (open[i+1]+close[i+1])/2 | exclut bougie i | Hypothèse d'exécution moyenne |

3. **Pour chaque modèle**, calcul de : trades, wins, losses, winrate, expectancy (R), profit factor, max drawdown (R), inflation vs CURRENT.

## 4. Signal timing audit

- Le signal Pullback est généré en utilisant `candles.slice(0, i + 1)` — donc inclut la bougie i. Le close de la bougie i est nécessaire pour calculer EMA20[i] et RSI[i].
- **Conclusion** : le signal n'est utilisable qu'EN FIN de bougie i (après son close, daily = ~16h ET). Toute exécution intraday pendant la bougie i est impossible sauf à recalculer le signal à chaque tick — ce qui n'est PAS fait dans le code.
- **Daily close only** : le signal devrait être utilisé pour une décision d'entrée à `i+1`, pas pendant `i`.

## 5. Indicator audit

| Indicateur | Calcul causal ? | Verdict |
|---|---|---|
| EMA20, EMA50 | Oui (récurrence avant) | SAFE |
| RSI14 | Oui (récurrence avant) | SAFE |
| ATR14 | Oui (TR sur bougies passées) | SAFE |
| chg5, chg20 | Oui (close[i] vs close[i-5/20]) | SAFE |
| swingHigh20 | Oui MAIS inclut high[i] | **RISKY** (cf. F1) |
| swingLow10 | Oui MAIS inclut low[i] | **RISKY** (cf. F2) |

Aucun indicateur n'utilise candle N+1 ou future. Les indicateurs eux-mêmes sont causaux. Le problème est l'USAGE de l'EMA20[i] comme prix d'entrée et les fenêtres incluant la bougie i pour le stop/TP.

## 6. Entry realism audit (point central)

Re-simulation par variant et modèle d'entrée, agrégée sur tous les symboles et toutes les années :

### pullback_rsi42_58_chg20_5_stop0.1

| Modèle | Trades | Wins | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation PF vs CURRENT |
|---|---:|---:|---:|---:|---:|---:|---:|
| CURRENT | 3 173 | 856 | 26.98 % | 0.621 | 2.06 | 89.6 | — |
| CURRENT_NO_LEAK | 2 876 | 775 | 26.95 % | 0.972 | 2.69 | 89.6 | ×0.77 |
| SIGNAL_CLOSE | 2 201 | 491 | 22.31 % | 0.152 | 1.24 | 99.3 | ×1.66 |
| NEXT_OPEN | 1 929 | 391 | 20.27 % | -0.021 | 0.97 | 163.2 | ×2.13 |
| RETOUCH_EMA20 | 2 205 | 367 | 16.64 % | -0.189 | 0.73 | 478.4 | ×2.81 |
| MID_NEXT_BAR | 1 838 | 365 | 19.86 % | 0.107 | 1.16 | 148.5 | ×1.78 |

### pullback_rsi42_58_chg20_3_stop0.1

| Modèle | Trades | Wins | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation PF vs CURRENT |
|---|---:|---:|---:|---:|---:|---:|---:|
| CURRENT | 4 688 | 1305 | 27.84 % | 0.526 | 1.88 | 93.3 | — |
| CURRENT_NO_LEAK | 4 239 | 1173 | 27.67 % | 0.791 | 2.35 | 91.8 | ×0.80 |
| SIGNAL_CLOSE | 3 222 | 757 | 23.49 % | 0.143 | 1.23 | 91.2 | ×1.54 |
| NEXT_OPEN | 2 838 | 597 | 21.04 % | 0.005 | 1.01 | 116.2 | ×1.87 |
| RETOUCH_EMA20 | 3 301 | 588 | 17.81 % | -0.177 | 0.75 | 637.1 | ×2.51 |
| MID_NEXT_BAR | 2 724 | 551 | 20.23 % | 0.159 | 1.23 | 148.0 | ×1.53 |

### pullback_base_rsi42_58_chg20_0_stop0.1

| Modèle | Trades | Wins | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation PF vs CURRENT |
|---|---:|---:|---:|---:|---:|---:|---:|
| CURRENT | 6 847 | 1878 | 27.43 % | 0.385 | 1.63 | 74.8 | — |
| CURRENT_NO_LEAK | 6 207 | 1671 | 26.92 % | 0.561 | 1.93 | 74.2 | ×0.85 |
| SIGNAL_CLOSE | 5 027 | 1173 | 23.33 % | 0.136 | 1.21 | 121.2 | ×1.35 |
| NEXT_OPEN | 4 523 | 957 | 21.16 % | 0.012 | 1.02 | 148.9 | ×1.60 |
| RETOUCH_EMA20 | 5 003 | 898 | 17.95 % | -0.205 | 0.71 | 1027.4 | ×2.29 |
| MID_NEXT_BAR | 4 331 | 885 | 20.43 % | 0.225 | 1.33 | 122.3 | ×1.23 |

### pullback_rsi42_58_chg20_5_stop0.5

| Modèle | Trades | Wins | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation PF vs CURRENT |
|---|---:|---:|---:|---:|---:|---:|---:|
| CURRENT | 2 505 | 722 | 28.82 % | 0.282 | 1.57 | 72.3 | — |
| CURRENT_NO_LEAK | 2 230 | 630 | 28.25 % | 0.262 | 1.52 | 71.8 | ×1.03 |
| SIGNAL_CLOSE | 1 632 | 381 | 23.35 % | 0.015 | 1.03 | 97.9 | ×1.53 |
| NEXT_OPEN | 1 519 | 305 | 20.08 % | -0.048 | 0.92 | 88.9 | ×1.71 |
| RETOUCH_EMA20 | 1 720 | 324 | 18.84 % | -0.147 | 0.76 | 257.2 | ×2.06 |
| MID_NEXT_BAR | 1 500 | 273 | 18.20 % | -0.147 | 0.77 | 223.3 | ×2.04 |

### pullback_rsi42_58_chg20_3_stop0.5

| Modèle | Trades | Wins | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation PF vs CURRENT |
|---|---:|---:|---:|---:|---:|---:|---:|
| CURRENT | 3 470 | 1024 | 29.51 % | 0.254 | 1.50 | 74.9 | — |
| CURRENT_NO_LEAK | 3 101 | 884 | 28.51 % | 0.218 | 1.42 | 75.3 | ×1.06 |
| SIGNAL_CLOSE | 2 312 | 552 | 23.88 % | 0.034 | 1.06 | 74.4 | ×1.41 |
| NEXT_OPEN | 2 189 | 451 | 20.60 % | -0.050 | 0.92 | 131.7 | ×1.64 |
| RETOUCH_EMA20 | 2 423 | 472 | 19.48 % | -0.157 | 0.75 | 381.1 | ×2.00 |
| MID_NEXT_BAR | 2 169 | 406 | 18.72 % | -0.154 | 0.76 | 334.5 | ×1.97 |

**Lecture** : `Inflation PF vs CURRENT = PF_CURRENT / PF_modele` quantifie de combien le PF du modèle CURRENT est gonflé par rapport à ce modèle plus réaliste. Une inflation ×1.5 signifie que CURRENT affiche 50 % de profit factor en trop.

### Synthèse globale (somme des trades de tous variants)

| Modèle | Trades | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation vs CURRENT |
|---|---:|---:|---:|---:|---:|---:|
| CURRENT | 20 683 | 27.97 % | 0.419 | 1.73 | 93.3 | — |
| CURRENT_NO_LEAK | 18 653 | 27.52 % | 0.584 | 2.02 | 91.8 | ×0.86 |
| SIGNAL_CLOSE | 14 394 | 23.30 % | 0.110 | 1.18 | 133.0 | ×1.47 |
| NEXT_OPEN | 12 998 | 20.78 % | -0.012 | 0.98 | 334.7 | ×1.77 |
| RETOUCH_EMA20 | 14 652 | 18.08 % | -0.182 | 0.73 | 2722.7 | ×2.36 |
| MID_NEXT_BAR | 12 562 | 19.74 % | 0.084 | 1.13 | 677.0 | ×1.54 |

## 7. Intraday impossibility audit

Hypothèses de la simulation actuelle :
- Stop et TP testés à partir de la bougie `i+1` (la bougie de signal n'est PAS testée).
- Si stop ET TP sont touchés dans la même bougie post-signal, on assume LOSS (conservateur).

Cas problématiques détectés :
- **Entry à EMA20[i]** alors qu'aucune vérification `low[i] ≤ EMA20[i]` n'est faite. Si le prix n'est jamais redescendu à EMA20 pendant la bougie i, l'entrée est impossible — pourtant le code la valide.
- **TP = swingHigh20 incluant high[i]** : si high[i] est le plus haut de la fenêtre, le TP a déjà été touché pendant la bougie i, avant même d'avoir pu prendre la position.
- **Stop = swingLow10 incluant low[i] - atr*x** : symétrique. Si low[i] est le plus bas, le stop est sous un niveau déjà visité ce jour-là.

Le modèle CURRENT du backtest n'audite aucune de ces incohérences intraday.

## 8. Survivorship audit

- Univers déclaré (`universe-v2.mjs`) : **191** symboles uniques.
- Fichiers OHLC disponibles dans `data/` : **182**.
- Symboles déclarés SANS fichier OHLC : **31** (DIA, XLE, XLF, XLV, XLI, XLP, XLY, XLB, XLU, XLRE, XLC, EWJ…).
- Fichiers OHLC pour symboles HORS univers : **22** (potentiels survivants à inclure ou résidus à nettoyer).

**Limites de l'audit survivorship** :
- Aucune liste de tickers delistés 2021-2025 n'est disponible dans le repo. L'audit ne peut détecter QUE les symboles dans `UNIVERSE` sans fichier OHLC. Les actifs disparus AVANT entrée dans `UNIVERSE` ne sont pas comptés.
- Les ETFs fermés (ARKK clones, thématiques arrêtées) ne sont pas dans la liste. Risque de biais positif modéré.

## 9. Findings détaillés

### F1 — swingHigh20 (TP) (future_candle_leakage)

- Severity : **MEDIUM** · Verdict : **RISKY**
- Réf. code : `detectPullback : candles.slice(-20).map(c => c.high)`
- Description : swingHigh20 inclut la bougie signal elle-même (candles[i]). Si le high de la bougie i = swingHigh20, le TP est égal au high réalisé pendant la bougie i — un niveau qui peut avoir été touché AVANT que le trader puisse réagir.
- Preuve : Ligne `swingHigh20 = Math.max(...recent20.map(c => c.high))` avec recent20 = candles.slice(-20).

### F2 — swingLow10 (stop) (future_candle_leakage)

- Severity : **MEDIUM** · Verdict : **RISKY**
- Réf. code : `detectPullback : candles.slice(-10).map(c => c.low)`
- Description : swingLow10 inclut la bougie signal. Si le low de la bougie i fait un nouveau bas dans la fenêtre, le stop calculé est sous ce low — stop potentiellement déjà touché pendant la bougie i.
- Preuve : Ligne `swingLow10 = Math.min(...recent10.map(c => c.low))` avec recent10 = candles.slice(-10).

### F3 — entry = ema20 (execution_bias)

- Severity : **HIGH** · Verdict : **RISKY**
- Réf. code : `detectPullback : const entry = ema20`
- Description : L'entrée est l'EMA20 calculée EN INCLUANT la close de la bougie signal. Or à la fin de la bougie i, le close peut être différent de l'EMA20. Le moteur suppose qu'on a réussi à acheter à EMA20 pendant la bougie i, sans vérifier que le low de la bougie i a touché EMA20.
- Preuve : Lignes `const ema20 = ema20Series.at(-1)` puis `const entry = ema20`. Aucun check `low[i] <= ema20`.

### F4 — EMA20, EMA50, RSI14 (indicator_recomputation)

- Severity : **LOW** · Verdict : **RISKY**
- Réf. code : `detectPullback : ema(closes, 20) etc.`
- Description : Les indicateurs sont recalculés sur la fenêtre incluant la bougie i. C'est nécessaire pour générer le signal en fin de jour, mais utiliser EMA20[i] comme PRIX d'entrée pose problème car cette EMA20 ne pouvait être connue qu'à 16h.
- Preuve : Le calcul EMA est correct (causal). Le problème n'est pas le calcul, mais l'usage comme prix d'entrée.

### F5 — TP / stop sur même bougie (intraday_impossibility)

- Severity : **LOW** · Verdict : **SAFE (conservateur côté simulation, mais incohérent avec entry intraday)**
- Réf. code : `simulateTrade : `if (stopHit && tpHit) return LOSS``
- Description : Si stop et TP sont touchés dans la même bougie, on assume LOSS (worst case). C'est CONSERVATEUR — bon point. Mais si l'entrée à EMA20 a eu lieu pendant la bougie i, et que stop/tp ont aussi pu être touchés pendant cette même bougie i, l'analyse n'en tient pas compte (simulation commence à i+1).
- Preuve : Simulation `simulateTrade(candles.slice(i + 1, i + 11), setup)` commence à i+1.

### F6 — timing du signal (timestamp_alignment)

- Severity : **HIGH** · Verdict : **RISKY**
- Réf. code : `boucle for(i=220; i<candles.length-11; i++) puis slice(0, i+1)`
- Description : Le signal est généré en utilisant TOUTES les données jusqu'à i inclus (close de la bougie i compris). Donc le signal n'est utilisable qu'EN FIN de bougie i. L'entrée à EMA20[i] (potentiellement < close[i]) suppose qu'on a pu se positionner à un prix vu plus tôt dans la journée — c'est de l'INTRADAY déguisé en daily.
- Preuve : Pas de séparation explicite entre `signal time` et `entry time` dans le code. Le rapport recommande de distinguer.

### F7 — univers fixé via universe-v2.mjs (survivorship_bias)

- Severity : **MEDIUM** · Verdict : **UNKNOWN (à mesurer)**
- Réf. code : `import { UNIVERSE } from './universe-v2.mjs'`
- Description : L'univers testé est celui actuellement défini dans universe-v2. Les actifs delistés ou ETFs retirés entre 2021 et 2025 ne sont pas dans le set. Risque de survivorship bias, à quantifier par audit séparé des sources data/*.json.
- Preuve : Le moteur ne charge que les symboles existant en `data/SYMBOL_2025.json`. Pas de liste de delistés.

### F8 — rr (risk/reward) (execution_bias)

- Severity : **HIGH** · Verdict : **RISKY**
- Réf. code : `const rr = (tp - entry) / (entry - stop)`
- Description : Le rr est calculé avec entry = ema20 (potentiellement < close). Si l'entry réelle est au close (modèle SIGNAL_CLOSE), le rr s'effondre car (tp - close) est plus petit et (close - stop) est plus grand. L'edge mesuré est donc tributaire de cette hypothèse d'entrée optimiste.
- Preuve : Aucune mesure de sensibilité du rr selon le modèle d'entrée dans le code source.

### F9 — data/*.json (data_completeness)

- Severity : **LOW** · Verdict : **UNKNOWN (à mesurer)**
- Réf. code : `loadCandles : fs.readFileSync(`./data/${symbol}_2025.json`)`
- Description : Les fichiers data/ semblent complets (1255 candles par symbole sur 2021-2025). À vérifier en croisant avec la liste UNIVERSE — chaque symbole de UNIVERSE doit avoir son fichier OHLC. Symboles manquants signalent un possible biais (univers déclaré ≠ univers testé).
- Preuve : Vérification dynamique faite par le moteur d'audit, voir section 8.

## 10. Severity grading

Échelle : **CLEAN**, **LOW_RISK**, **MEDIUM_RISK**, **HIGH_RISK**, **INVALID_BACKTEST**.

Verdict global : **INVALID_BACKTEST**

Décomposition :

| Source de risque | Severity | Justification |
|---|---|---|
| Entry execution bias (entry=ema20) | INVALID_BACKTEST | PF CURRENT 1.73 / PF NEXT_OPEN 0.98 = inflation ×1.77 |
| Stop/TP look-ahead (fenêtres incluant bougie signal) | LOW_RISK | PF CURRENT 1.73 / PF CURRENT_NO_LEAK 2.02 = inflation ×0.86 |
| Survivorship bias | HIGH_RISK | 31 symboles UNIVERSE sans OHLC, 22 fichiers OHLC hors univers. Pas de liste de delistés pour audit complet. |
| Indicator recomputation / future leakage | LOW_RISK | Tous les indicateurs (EMA, RSI, ATR, chg) sont causaux. Aucun usage de candle N+1 détecté. Le risque vient de l'USAGE (entry=EMA20[i]) pas du calcul. |

## 11. Estimated performance inflation

Comparaison du PF agrégé CURRENT vs chaque modèle réaliste :

| Modèle réaliste | PF CURRENT | PF modèle | Inflation PF | Expectancy CURRENT | Expectancy modèle | Inflation E |
|---|---:|---:|---:|---:|---:|---:|
| CURRENT_NO_LEAK | 1.73 | 2.02 | ×0.86 | 0.419 | 0.584 | 0.72 |
| SIGNAL_CLOSE | 1.73 | 1.18 | ×1.47 | 0.419 | 0.110 | 3.81 |
| NEXT_OPEN | 1.73 | 0.98 | ×1.77 | 0.419 | -0.012 | -34.92 |
| RETOUCH_EMA20 | 1.73 | 0.73 | ×2.36 | 0.419 | -0.182 | -2.30 |
| MID_NEXT_BAR | 1.73 | 1.13 | ×1.54 | 0.419 | 0.084 | 4.99 |

**Inflation PF estimée** : entre ×0.86 (CURRENT_NO_LEAK) et ×2.36 (RETOUCH_EMA20).

**Lecture pratique** :
- Si CURRENT affiche PF 1.72, le PF réel après suppression du look-ahead est probablement entre 0.73 et 2.02 selon le modèle d'exécution choisi.

## 12. Final verdict

**Severity globale : INVALID_BACKTEST**

- Le modèle CURRENT (code en place) affiche un profit factor agrégé de **1.73** sur 20 683 trades.
- Avec un modèle d'entrée réaliste (NEXT_OPEN, exécution à l'open de la bougie suivante), le PF tombe à **0.98** — inflation ×1.77.
- Avec SIGNAL_CLOSE (entrée au close de la bougie signal), le PF tombe à **1.18** — inflation ×1.47.
- Avec RETOUCH_EMA20 (entrée à EMA20 seulement si le low des 3 jours suivants y revient), 29 % des trades CURRENT sont éliminés. Le PF restant est 0.73 sur 14 652 trades.
- Le code utilise EMA20[i], swingHigh20 et swingLow10 calculés sur une fenêtre INCLUANT la bougie signal — donc en partie postérieure au moment où le signal est censé être généré.
- Severity globale : **INVALID_BACKTEST**. 4 sources de risque identifiées, dont 2 en HIGH_RISK ou pire.

### Recommandations

- **Corriger l'entrée** : utiliser `entry = open[i+1]` (NEXT_OPEN) ou conditionner `entry = ema20[i]` à un retouch explicite (`low[i+1..i+3] ≤ ema20[i]`).
- **Corriger stop/TP** : calculer swingHigh20 sur `candles[i-20..i-1]` et swingLow10 sur `candles[i-10..i-1]` — exclure la bougie signal de la fenêtre.
- **Recalculer toute la pipeline aval** : `tradable-universe-v1`, `rolling-walkforward-validator`, `tradable-universe-v2`, `allocation-engine-v3`, `setup-performance-summary` consomment toutes le PF gonflé. Les grades B actuels peuvent passer à C ou D après correction.
- **Audit symétrique sur Breakout, RS Rotation, Mean Reversion** : la même logique d'entrée intraday-déguisée-en-daily peut affecter d'autres setups (à vérifier par PR séparée).
- **Friction** : appliquer `friction-model-v1` sur le modèle réaliste pour mesurer l'edge effectif après coûts. Si PF post-friction < 1.1, le setup n'a plus d'edge.
- **Ne pas trader Pullback Momentum en réel** tant que la correction du code source et la re-validation rolling walk-forward n'ont pas été faites.
- **Audit survivorship** complémentaire : liste des tickers delistés 2021-2025 à recouper avec UNIVERSE pour quantifier le biais de survie.

---

**Hypothèses** : tous les indicateurs sont causaux, l'OHLC daily est utilisé tel quel, pas de friction modélisée dans la simulation, simulation 10 bougies max, LOSS prioritaire si stop+TP même bougie. La simulation n'inclut PAS de slippage ni de fees.

**Limites** : audit statique sur code source actuel uniquement, simulation limitée à 5 variantes principales de Pullback (les 5 de `backtest-multi-setup-grid.mjs`). Le moteur n'audite pas les versions différentes (`backtest-pullback-2025.mjs`, `backtest-pullback-grid-2025.mjs`) — mais elles partagent la même logique signal/entry et héritent donc des mêmes biais.