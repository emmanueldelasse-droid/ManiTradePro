# Trend Pullback Dynamic Support v1 — ManiTradePro

> Généré le 2026-05-18T17:01:27.369Z par `tools/backtests/trend-pullback-dynamic-support-v1.mjs`.

**⚠ Setup en test, offline uniquement.** Pas d'optimisation. Le but est de tester honnêtement si "acheter des leaders sur respiration contrôlée" est un edge réel ou non.

## 1. Scope

Nouveau setup `TREND_PULLBACK_DYNAMIC_SUPPORT` v1 — différent fondamentalement de l'ancien `PULLBACK_MOMENTUM` (INVALID_BACKTEST PR #207).

Critères minimum de survie : PF post-friction ≥ 1.3, ≥ 4/5 années positives, walk-forward 2/3+, top 5 < 80 %, edge decay < ×1.5.

## 2. Ancien Pullback recap (pour contraste)

L'ancien `PULLBACK_MOMENTUM` (PR #207 verdict INVALID_BACKTEST) :

| Modèle d'exécution | PF |
|---|---:|
| CURRENT (code source) | 1.73 |
| NEXT_OPEN (réaliste) | **0.98** |
| RETOUCH_EMA20 | 0.73 |

**L'edge tombait sous 1 dès qu'on imposait l'exécution réaliste.**

Problèmes structurels identifiés :
- entry = ema20[i] (théorique, intraday impossible)
- swingLow10/swingHigh20 incluant la bougie signal (look-ahead)
- pas de confirmation de reprise
- entrées "anticipées" sur faux pullbacks

## 3. Nouvelle philosophie

- **NE PAS** acheter une chute libre.
- **NE PAS** acheter un actif faible.
- **UNIQUEMENT** acheter des leaders déjà forts en tendance haussière confirmée.
- **APRÈS** une correction contrôlée (-2 % à -15 %, pas plus).
- **AVEC** reprise confirmée (bougie verte qui dépasse high veille).
- **ENTRY** : `open[i+1]` strictement.

## 4. Trend filter

Conditions cumulées (toutes obligatoires) :
- `close[i] > EMA50[i]`
- `EMA50[i] > EMA100[i]`
- `momentum60j[i] > minMomentum60` (configurable, défaut 5 %)
- Régime de marché ≠ RISK_OFF (config baseline = NO_RISK_OFF)

## 5. Pullback detection

- Sur les 10 derniers jours (`pullbackWindow`), au moins un `low` doit avoir touché une zone proche d'EMA20 (distance entre -1.5 % et +2 %).
- Pullback magnitude : `lowMin(window) / close(start)` entre **-2 % et -15 %**. Refus si correction < -15 % (chute violente non contrôlée).

## 6. Confirmation logic

Bougie i (jour J du signal, exécution J+1) doit valider :
- `close[i] > high[i-1]` (dépasse le haut de la veille)
- `close[i] > open[i]` (bougie verte)
- `close[i] > EMA20[i]` (rejet support dynamique)

Pas d'entrée "anticipée" : la reprise doit être validée AVANT.

## 7. Entry realism

- `entry = open[i+1]` STRICTEMENT. Pas d'EMA théorique. Pas d'intraday impossible.
- Signal généré en fin de jour i (close[i]), exécution à l'ouverture de i+1.
- Le low de la bougie signal n'est pas utilisé pour l'entrée (contrairement à l'ancien Pullback).

## 8. Exit models testés

- `fixed_hold` : exit à `open[entryIdx + horizon]`.
- `trailing_atr` : trail = max_since_entry - 2 × ATR(14 à l'entrée). Exit si close < trail.
- `trailing_ema20` : exit si close < EMA20.
- `trend_break` : exit si close < EMA50 (cassure trend).

## 9. Friction analysis

Friction systématique : `frictionR = (0.30 + 0.02 × holdDays) / 5`. Friction ×2 testée séparément.

Friction pour horizon 20j = 0.14R par trade. Pour x2 friction = 0.28R par trade.

## 10-12. Résultats — variantes complètes

| Variante | Trades | Winrate | PF | Expectancy R | Max DD R | Years+ | Top 5 % | Decay | OK ? |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| baseline | 7334 | 44.52 % | 1.04 | 0.038 | 482.5 | 3/5 | 203.4 % | 0.20 | ✗ |
| exit=trailing_ema20 | 7334 | 29.98 % | 0.97 | -0.017 | 539.4 | 1/5 | n/a % | 0.34 | ✗ |
| exit=trailing_atr | 7334 | 36.08 % | 0.84 | -0.106 | 944.4 | 0/5 | n/a % | 0.27 | ✗ |
| exit=trend_break | 7334 | 40.40 % | 1.08 | 0.059 | 410.8 | 3/5 | 129.7 % | 0.25 | ✗ |
| stop=ema50 | 7324 | 42.60 % | 1.09 | 0.070 | 383.1 | 3/5 | 108.9 % | 0.22 | ✗ |
| stop=atr_2 | 7345 | 37.35 % | 1.02 | 0.012 | 392.0 | 2/5 | 506.0 % | 0.25 | ✗ |
| support=EMA50 | 4818 | 45.60 % | 1.15 | 0.120 | 191.9 | 3/5 | 90.1 % | 0.25 | ✗ |
| horizon=10 | 7475 | 46.73 % | 0.98 | -0.014 | 352.3 | 3/5 | n/a % | 0.31 | ✗ |
| horizon=40 | 7196 | 39.49 % | 1.15 | 0.168 | 584.8 | 3/5 | 99.1 % | 0.15 | ✗ |
| universe=ai_software | 1705 | 46.86 % | 1.19 | 0.193 | 158.1 | 2/5 | 120.5 % | 0.08 | ✗ |
| universe=semis | 2032 | 41.83 % | 0.83 | -0.162 | 412.6 | 2/5 | n/a % | 0.22 | ✗ |
| universe=megacaps | 1375 | 45.53 % | 1.07 | 0.040 | 115.8 | 2/5 | 419.5 % | 0.10 | ✗ |
| universe=etfs | 1164 | 44.33 % | 0.74 | -0.159 | 186.0 | 1/5 | n/a % | 0.05 | ✗ |
| regime=ALL | 7722 | 44.60 % | 1.06 | 0.047 | 409.0 | 3/5 | 155.2 % | 0.28 | ✗ |
| regime=RISK_ON_ONLY | 5490 | 44.03 % | 1.02 | 0.016 | 477.8 | 2/5 | 543.6 % | 0.22 | ✗ |
| minMomentum60=0 | 8372 | 44.43 % | 1.04 | 0.034 | 522.6 | 3/5 | 207.9 % | 0.22 | ✗ |
| minMomentum60=10 | 5913 | 44.43 % | 1.04 | 0.032 | 577.8 | 2/5 | 269.2 % | 0.17 | ✗ |
| minMomentum60=20 | 3399 | 42.95 % | 1.02 | 0.017 | 623.3 | 2/5 | 778.2 % | 0.24 | ✗ |
| friction_x2 | 7334 | 41.91 % | 0.90 | -0.088 | 1024.1 | 1/5 | n/a % | 0.21 | ✗ |

**Critère ✓** = PF ≥ 1.3 ET ≥ 4/5 années positives ET top 5 < 80 % ET edge decay < ×1.5.

## 13. Walk-forward simple (baseline)

| Split | Trades | PF | Expectancy R | Max DD R | Passed |
|---|---:|---:|---:|---:|---|
| S1 → test 2023 | 2257 | 1.02 | 0.019 | 177.3 | ✓ |
| S2 → test 2024 | 2569 | 1.57 | 0.389 | 93.3 | ✓ |
| S3 → test 2025 | 1729 | 1.05 | 0.048 | 136.8 | ✓ |

**3/3 splits passent.**

## 14. Comparison vs ancien Pullback

| Critère | Ancien Pullback (NEXT_OPEN) | Trend Pullback (baseline) |
|---|---:|---:|
| Trades | 12 998 | 7334 |
| Winrate | 20.78 % | 44.52 % |
| PF | 0.98 | **1.04** |
| Expectancy | -0.012 | 0.038 |
| Verdict | INVALID_BACKTEST | **FRAGILE** |

→ Le nouveau setup améliore légèrement les résultats mais reste fragile. Le concept "Pullback" reste structurellement difficile sous exécution réaliste.

## 15. Failure modes

Critères minimum :

| Critère | Résultat | OK ? |
|---|---|---|
| PF baseline ≥ 1.3 | 1.04 | ✗ |
| Années positives ≥ 4/5 | 3/5 | ✗ |
| Walk-forward ≥ 2/3 | 3/3 | ✓ |
| Top 5 < 80 % | 203.4 % | ✗ |
| Edge decay < ×1.5 | 0.20 | ✓ |

## 16. Final verdict

**FRAGILE**

Le setup ne passe pas les critères minimum. Même avec une implémentation propre et confirmation, le "Pullback Momentum" reste structurellement difficile.

**Hypothèse** : sur 2021-2025, l'environnement bull AI a fait que la majorité des leaders SOIT continuaient sans pullback significatif, SOIT corrigent violemment. La fenêtre de "respiration contrôlée" est rare.

---

**Hypothèses** : friction round-trip 0.30 % + 0.02 %/jour, 5 % = 1R, NEXT_OPEN systématique, indicateurs causaux (EMA20/50/100 standard), pas de short side.

**Limites** :
- Paramètres baseline arbitraires (à fine-tuner si edge confirmé).
- Pas de Monte Carlo / bootstrap sur les trades.
- Walk-forward simple (3 splits annuels), pas walk-forward conditionnel par régime.
- Pas de stress sur les frictions extrêmes (×3, slippage variable par actif).
- Pas de comparaison fine corrélation vs SECTOR_RS ou RS Rotation.