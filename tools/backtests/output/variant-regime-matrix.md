# Variant × Regime Matrix — ManiTradePro

> Généré le 2026-05-18T09:21:55.567Z par `tools/backtests/variant-regime-matrix-v1.mjs`.

## 1. Synthèse globale

**Limite résiduelle** : la dimension régime n'est exposée que par `results-relative-strength-rotation-regime-v1.json`. Seules **2 variantes RS** ont un breakdown régime complet (`rs_90d_top10_hold20`, `rs_120d_top10_hold20`). Les autres setups (Pullback, Breakout, etc.) ne sont **pas couverts** par cette matrice tant que leurs scripts de backtest n'auront pas été étendus.

**Breakdown per-(symbol × variant × regimeMode × regime) disponible** depuis l'ajout de `bySymbolByRegime[]` à la source RS regime. La matrice per-symbol expose `17088` cellules sur `181` actifs × `27` variantes (cf. sections 7 et 7-bis).

- Cellules globales (variant × regimeMode × regime) : **12**
- Variantes couvertes : rs_120d_top10_hold20, rs_90d_top10_hold20
- Régimes observés : RANGE, RISK_OFF, RISK_ON
- Modes de filtre : ALL_REGIMES, NO_RISK_OFF, RISK_ON_ONLY

Répartition des cellules par tier :

| Tier | Nombre |
|---|---:|
| STRONG | 8 |
| OK | 3 |
| WEAK | 0 |
| AVOID | 1 |

## 2. Meilleures variantes par régime (mode NO_RISK_OFF)

Cellules STRONG/OK triées par score, filtre NO_RISK_OFF (le mode opérationnel cible).

### RISK_ON

| Variante | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| rs_90d_top10_hold20 | STRONG | 77 | 529 | 49.9% | 0.66 | 1.60 | 348.40 | 124.63 |
| rs_120d_top10_hold20 | OK | 56 | 530 | 49.4% | 0.35 | 1.34 | 183.45 | 121.28 |

### RANGE

| Variante | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| rs_90d_top10_hold20 | STRONG | 100 | 400 | 64.0% | 1.21 | 2.54 | 482.62 | 65.42 |
| rs_120d_top10_hold20 | STRONG | 100 | 367 | 63.5% | 1.34 | 2.77 | 492.27 | 62.76 |

_RISK_OFF n'existe pas dans le mode NO_RISK_OFF — par construction le filtre l'exclut._

## 3. Variantes robustes multi-régimes

Variantes STRONG dans au moins 2 régimes (mode NO_RISK_OFF) :

| Variante | Régimes STRONG | Cellules observées |
|---|---|---:|
| rs_90d_top10_hold20 | RISK_ON, RANGE | 2 |

## 4. Variantes uniquement exploitables en RANGE

Variantes STRONG en RANGE mais WEAK/AVOID en RISK_ON (mode NO_RISK_OFF) :

_aucune variante détectée — toutes les variantes STRONG en RANGE le sont aussi en RISK_ON ou réciproquement_

## 5. Variantes dangereuses en RISK_OFF

Cellule RISK_OFF (mode ALL_REGIMES) classée AVOID ou expectancy ≤ 0 :

| Variante | Tier | Score | Trades | Exp | PF | TotalR |
|---|---|---:|---:|---:|---:|---:|
| rs_90d_top10_hold20 | AVOID | 7 | 162 | -0.05 | 0.99 | -8.38 |

## 6. Variantes à blacklister

Variantes AVOID dans tous les régimes observés (mode ALL_REGIMES) :

_aucune variante à blacklister sur ce critère_

## 7. Cas détaillés par actif

Source : `bySymbolByRegime[]` (vraie matrice symbol × variant × regimeMode × regime). Le tableau ci-dessous montre toutes les cellules disponibles pour chaque actif focus, avec le tier calculé localement par cellule.

### NVDA

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | STRONG | 72 | 22 | 27.3% | 0.85 | 2.57 | n/a | 9.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 3 | 33.3% | 0.61 | 1.92 | n/a | 2.00 | échantillon < 5 trades |
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | STRONG | 72 | 10 | 40.0% | 0.93 | 2.66 | n/a | 2.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 72 | 22 | 27.3% | 0.85 | 2.57 | n/a | 9.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | STRONG | 72 | 10 | 40.0% | 0.93 | 2.66 | n/a | 2.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RANGE | AVOID | 23 | 6 | 33.3% | 0.17 | 1.33 | n/a | 2.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RISK_ON | STRONG | 70 | 18 | 50.0% | 0.50 | 3.25 | n/a | 3.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RANGE | AVOID | 23 | 6 | 33.3% | 0.17 | 1.33 | n/a | 2.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RISK_ON | STRONG | 70 | 18 | 50.0% | 0.50 | 3.25 | n/a | 3.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RANGE | WEAK | 35 | 4 | 50.0% | 0.50 | 2.00 | n/a | 1.00 | échantillon < 5 trades |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RISK_ON | OK | 63 | 9 | 55.6% | 0.67 | 6.67 | n/a | 2.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RANGE | WEAK | 35 | 4 | 50.0% | 0.50 | 2.00 | n/a | 1.00 | échantillon < 5 trades |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RISK_ON | OK | 63 | 9 | 55.6% | 0.67 | 6.67 | n/a | 2.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RANGE | AVOID | 3 | 6 | 0.0% | -0.33 | 0.00 | n/a | 2.00 | exp -0.33 |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | STRONG | 70 | 18 | 50.0% | 0.86 | 4.06 | n/a | 2.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | AVOID | 3 | 6 | 0.0% | -0.33 | 0.00 | n/a | 2.00 | exp -0.33 |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | STRONG | 70 | 18 | 50.0% | 0.86 | 4.06 | n/a | 2.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RANGE | AVOID | 0 | 4 | 0.0% | -0.50 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | OK | 68 | 9 | 55.6% | 1.06 | 8.33 | n/a | 2.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | AVOID | 0 | 4 | 0.0% | -0.50 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | OK | 68 | 9 | 55.6% | 1.06 | 8.33 | n/a | 2.00 | — |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RANGE | AVOID | 20 | 1 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RISK_ON | AVOID | 10 | 15 | 20.0% | -0.16 | 0.60 | n/a | 5.00 | exp -0.16 ; PF 0.60 < 1 |
| meanrev_rsi30_dist5_stop1_rr1.2 | NO_RISK_OFF | RANGE | AVOID | 20 | 1 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 15 | 20.0% | -0.16 | 0.60 | n/a | 5.00 | exp -0.16 ; PF 0.60 < 1 |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RANGE | AVOID | 20 | 1 | 100.0% | 1.50 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 15 | 6.7% | -0.37 | 0.21 | n/a | 7.00 | exp -0.37 ; PF 0.21 < 1 |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | NO_RISK_OFF | RANGE | AVOID | 20 | 1 | 100.0% | 1.50 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 15 | 6.7% | -0.37 | 0.21 | n/a | 7.00 | exp -0.37 ; PF 0.21 < 1 |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RANGE | AVOID | 20 | 2 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 6 | 33.3% | -0.27 | 0.30 | n/a | 3.00 | RISK_OFF destructeur ; exp -0.27 ; PF 0.30 < 1 |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_ON | AVOID | 15 | 17 | 29.4% | 0.00 | 1.00 | n/a | 5.00 | exp 0.00 |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RANGE | AVOID | 20 | 2 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 17 | 29.4% | 0.00 | 1.00 | n/a | 5.00 | exp 0.00 |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | OK | 65 | 22 | 27.3% | 0.85 | 2.57 | n/a | 9.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 3 | 33.3% | 0.61 | 1.92 | n/a | 2.00 | échantillon < 5 trades |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | OK | 62 | 11 | 36.4% | 0.75 | 2.42 | n/a | 2.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | OK | 65 | 22 | 27.3% | 0.85 | 2.57 | n/a | 9.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | OK | 62 | 11 | 36.4% | 0.75 | 2.42 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | STRONG | 70 | 19 | 31.6% | 1.03 | 2.77 | n/a | 9.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_OFF | WEAK | 40 | 2 | 50.0% | 1.42 | 3.83 | n/a | 1.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | OK | 58 | 9 | 33.3% | 0.80 | 2.20 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 70 | 19 | 31.6% | 1.03 | 2.77 | n/a | 9.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | OK | 58 | 9 | 33.3% | 0.80 | 2.20 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | OK | 57 | 10 | 40.0% | 0.74 | 2.79 | n/a | 4.00 | — |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_OFF | WEAK | 35 | 2 | 50.0% | 0.62 | 2.24 | n/a | 1.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 48 | 8 | 50.0% | 1.19 | 0.91 | n/a | 2.00 | PF 0.91 < 1 |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | OK | 57 | 10 | 40.0% | 0.74 | 2.79 | n/a | 4.00 | — |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 48 | 8 | 50.0% | 1.19 | 0.91 | n/a | 2.00 | PF 0.91 < 1 |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | OK | 65 | 17 | 29.4% | 1.11 | 2.64 | n/a | 9.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_OFF | WEAK | 40 | 2 | 50.0% | 1.42 | 3.83 | n/a | 1.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 0 | 4 | 25.0% | 0.68 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | OK | 65 | 17 | 29.4% | 1.11 | 2.64 | n/a | 9.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 0 | 4 | 25.0% | 0.68 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | OK | 57 | 10 | 40.0% | 0.74 | 2.79 | n/a | 4.00 | — |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_OFF | WEAK | 35 | 2 | 50.0% | 0.62 | 2.24 | n/a | 1.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 20 | 4 | 75.0% | 2.45 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | OK | 57 | 10 | 40.0% | 0.74 | 2.79 | n/a | 4.00 | — |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 20 | 4 | 75.0% | 2.45 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| rs_120d_top10_hold20 | ALL_REGIMES | RANGE | AVOID | 50 | 19 | 63.2% | -0.11 | 6.78 | -2.08 | 29.98 | exp -0.11 |
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_ON | AVOID | 13 | 7 | 57.1% | -3.89 | 0.23 | -27.27 | 35.20 | exp -3.89 ; PF 0.23 < 1 |
| rs_120d_top10_hold20 | NO_RISK_OFF | RANGE | AVOID | 50 | 19 | 63.2% | -0.11 | 6.78 | -2.08 | 29.98 | exp -0.11 |
| rs_120d_top10_hold20 | NO_RISK_OFF | RISK_ON | AVOID | 13 | 7 | 57.1% | -3.89 | 0.23 | -27.27 | 35.20 | exp -3.89 ; PF 0.23 < 1 |
| rs_120d_top10_hold20 | RISK_ON_ONLY | RISK_ON | AVOID | 13 | 7 | 57.1% | -3.89 | 0.23 | -27.27 | 35.20 | exp -3.89 ; PF 0.23 < 1 |
| rs_90d_top10_hold20 | ALL_REGIMES | RANGE | AVOID | 50 | 15 | 60.0% | -0.46 | 6.06 | -6.99 | 29.98 | exp -0.46 |
| rs_90d_top10_hold20 | ALL_REGIMES | RISK_ON | AVOID | 17 | 13 | 53.8% | -1.63 | 0.23 | -21.17 | 35.20 | exp -1.63 ; PF 0.23 < 1 |
| rs_90d_top10_hold20 | NO_RISK_OFF | RANGE | AVOID | 50 | 15 | 60.0% | -0.46 | 6.06 | -6.99 | 29.98 | exp -0.46 |
| rs_90d_top10_hold20 | NO_RISK_OFF | RISK_ON | AVOID | 17 | 13 | 53.8% | -1.63 | 0.23 | -21.17 | 35.20 | exp -1.63 ; PF 0.23 < 1 |
| rs_90d_top10_hold20 | RISK_ON_ONLY | RISK_ON | AVOID | 17 | 13 | 53.8% | -1.63 | 0.23 | -21.17 | 35.20 | exp -1.63 ; PF 0.23 < 1 |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RANGE | OK | 69 | 11 | 45.5% | 0.92 | 3.42 | n/a | 4.00 | — |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 3 | 33.3% | 0.08 | 1.12 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 58 | 8 | 50.0% | 1.19 | 0.91 | n/a | 2.00 | PF 0.91 < 1 |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RANGE | OK | 69 | 11 | 45.5% | 0.92 | 3.42 | n/a | 4.00 | — |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 58 | 8 | 50.0% | 1.19 | 0.91 | n/a | 2.00 | PF 0.91 < 1 |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RANGE | AVOID | 16 | 6 | 33.3% | 0.04 | 1.06 | n/a | 4.00 | — |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 1 | 0.0% | -1.00 | 0.00 | n/a | 1.00 | échantillon < 5 trades ; RISK_OFF destructeur |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RISK_ON | OK | 83 | 5 | 80.0% | 1.32 | 1.92 | n/a | 1.00 | — |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 16 | 6 | 33.3% | 0.04 | 1.06 | n/a | 4.00 | — |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RISK_ON | OK | 83 | 5 | 80.0% | 1.32 | 1.92 | n/a | 1.00 | — |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | STRONG | 77 | 19 | 31.6% | 1.03 | 2.77 | n/a | 9.00 | — |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_OFF | WEAK | 47 | 2 | 50.0% | 1.42 | 3.83 | n/a | 1.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | OK | 68 | 9 | 33.3% | 0.80 | 2.20 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 77 | 19 | 31.6% | 1.03 | 2.77 | n/a | 9.00 | — |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | OK | 68 | 9 | 33.3% | 0.80 | 2.20 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | OK | 61 | 10 | 40.0% | 0.74 | 2.79 | n/a | 4.00 | — |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_OFF | WEAK | 39 | 2 | 50.0% | 0.62 | 2.24 | n/a | 1.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 58 | 8 | 50.0% | 1.19 | 0.91 | n/a | 2.00 | PF 0.91 < 1 |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | OK | 61 | 10 | 40.0% | 0.74 | 2.79 | n/a | 4.00 | — |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 58 | 8 | 50.0% | 1.19 | 0.91 | n/a | 2.00 | PF 0.91 < 1 |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RANGE | AVOID | 16 | 6 | 33.3% | 0.04 | 1.06 | n/a | 4.00 | — |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RISK_ON | OK | 83 | 5 | 80.0% | 1.32 | 1.92 | n/a | 1.00 | — |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 16 | 6 | 33.3% | 0.04 | 1.06 | n/a | 4.00 | — |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RISK_ON | OK | 83 | 5 | 80.0% | 1.32 | 1.92 | n/a | 1.00 | — |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | STRONG | 72 | 17 | 29.4% | 1.11 | 2.64 | n/a | 9.00 | — |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_OFF | WEAK | 47 | 2 | 50.0% | 1.42 | 3.83 | n/a | 1.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 4 | 4 | 25.0% | 0.68 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 72 | 17 | 29.4% | 1.11 | 2.64 | n/a | 9.00 | — |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 4 | 4 | 25.0% | 0.68 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | OK | 61 | 10 | 40.0% | 0.74 | 2.79 | n/a | 4.00 | — |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_OFF | WEAK | 39 | 2 | 50.0% | 0.62 | 2.24 | n/a | 1.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | WEAK | 30 | 4 | 75.0% | 2.45 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | OK | 61 | 10 | 40.0% | 0.74 | 2.79 | n/a | 4.00 | — |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | WEAK | 30 | 4 | 75.0% | 2.45 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RANGE | AVOID | 16 | 6 | 33.3% | 0.04 | 1.06 | n/a | 4.00 | — |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 28 | 3 | 100.0% | 1.99 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 16 | 6 | 33.3% | 0.04 | 1.06 | n/a | 4.00 | — |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 28 | 3 | 100.0% | 1.99 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RANGE | AVOID | 7 | 12 | 16.7% | -0.22 | 0.80 | n/a | 6.00 | exp -0.22 ; PF 0.80 < 1 |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades ; RISK_OFF destructeur |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | WEAK | 35 | 5 | 40.0% | 0.22 | 1.45 | n/a | 2.00 | — |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 7 | 12 | 16.7% | -0.22 | 0.80 | n/a | 6.00 | exp -0.22 ; PF 0.80 < 1 |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | WEAK | 35 | 5 | 40.0% | 0.22 | 1.45 | n/a | 2.00 | — |

### SOXL

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | WEAK | 56 | 5 | 80.0% | 2.14 | n/a | n/a | 0.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 2 | 100.0% | 5.19 | n/a | n/a | 0.00 | échantillon < 5 trades |
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 62 | 13 | 69.2% | 1.87 | 0.70 | n/a | 3.00 | PF 0.70 < 1 |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | WEAK | 56 | 5 | 80.0% | 2.14 | n/a | n/a | 0.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 62 | 13 | 69.2% | 1.87 | 0.70 | n/a | 3.00 | PF 0.70 < 1 |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RANGE | AVOID | 20 | 1 | 100.0% | 2.00 | n/a | n/a | 0.00 | échantillon < 5 trades |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RISK_ON | AVOID | 12 | 10 | 30.0% | -0.10 | 1.00 | n/a | 2.00 | exp -0.10 |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RANGE | AVOID | 20 | 1 | 100.0% | 2.00 | n/a | n/a | 0.00 | échantillon < 5 trades |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RISK_ON | AVOID | 12 | 10 | 30.0% | -0.10 | 1.00 | n/a | 2.00 | exp -0.10 |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RANGE | AVOID | 20 | 1 | 100.0% | 2.50 | n/a | n/a | 0.00 | échantillon < 5 trades |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | AVOID | 7 | 10 | 10.0% | -0.35 | 0.30 | n/a | 3.00 | exp -0.35 ; PF 0.30 < 1 |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | AVOID | 20 | 1 | 100.0% | 2.50 | n/a | n/a | 0.00 | échantillon < 5 trades |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | AVOID | 7 | 10 | 10.0% | -0.35 | 0.30 | n/a | 3.00 | exp -0.35 ; PF 0.30 < 1 |
| compression_20_ratio0.75_break20_stop1_rr2 | ALL_REGIMES | RISK_ON | AVOID | 20 | 1 | 100.0% | 2.00 | n/a | n/a | 0.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | NO_RISK_OFF | RISK_ON | AVOID | 20 | 1 | 100.0% | 2.00 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 1 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades ; RISK_OFF destructeur |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RANGE | AVOID | 0 | 4 | 50.0% | 0.10 | 0.80 | n/a | 1.00 | échantillon < 5 trades ; PF 0.80 < 1 |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_OFF | OK | 68 | 5 | 80.0% | 0.76 | 3.60 | n/a | 1.00 | — |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_ON | AVOID | 20 | 1 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RANGE | AVOID | 0 | 4 | 50.0% | 0.10 | 0.80 | n/a | 1.00 | échantillon < 5 trades ; PF 0.80 < 1 |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RISK_ON | AVOID | 20 | 1 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | WEAK | 48 | 5 | 80.0% | 2.14 | n/a | n/a | 0.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 2 | 100.0% | 5.19 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | WEAK | 65 | 15 | 66.7% | 1.67 | 1.00 | n/a | 3.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | WEAK | 48 | 5 | 80.0% | 2.14 | n/a | n/a | 0.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | WEAK | 65 | 15 | 66.7% | 1.67 | 1.00 | n/a | 3.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | AVOID | 20 | 4 | 75.0% | 2.08 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 1 | 100.0% | 7.72 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | WEAK | 62 | 10 | 70.0% | 1.95 | 1.06 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 20 | 4 | 75.0% | 2.08 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | WEAK | 62 | 10 | 70.0% | 1.95 | 1.06 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | AVOID | 15 | 2 | 50.0% | 1.31 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 1 | 100.0% | 3.31 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 48 | 9 | 66.7% | 1.17 | 0.69 | n/a | 2.00 | PF 0.69 < 1 |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 15 | 2 | 50.0% | 1.31 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 48 | 9 | 66.7% | 1.17 | 0.69 | n/a | 2.00 | PF 0.69 < 1 |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | AVOID | 20 | 4 | 75.0% | 2.08 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 1 | 100.0% | 7.72 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | OK | 73 | 8 | 75.0% | 2.36 | 1.87 | n/a | 1.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 20 | 4 | 75.0% | 2.08 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | OK | 73 | 8 | 75.0% | 2.36 | 1.87 | n/a | 1.00 | — |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | AVOID | 15 | 2 | 50.0% | 1.31 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 1 | 100.0% | 3.31 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | OK | 65 | 8 | 75.0% | 1.45 | 1.22 | n/a | 1.00 | — |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 15 | 2 | 50.0% | 1.31 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | OK | 65 | 8 | 75.0% | 1.45 | 1.22 | n/a | 1.00 | — |
| rs_120d_top10_hold20 | ALL_REGIMES | RANGE | AVOID | 28 | 1 | 100.0% | 1.58 | n/a | 1.58 | 0.00 | échantillon < 5 trades |
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_ON | AVOID | 40 | 19 | 47.4% | -0.20 | 1.64 | -3.81 | 14.69 | exp -0.20 |
| rs_120d_top10_hold20 | NO_RISK_OFF | RANGE | AVOID | 28 | 1 | 100.0% | 1.58 | n/a | 1.58 | 0.00 | échantillon < 5 trades |
| rs_120d_top10_hold20 | NO_RISK_OFF | RISK_ON | AVOID | 40 | 19 | 47.4% | -0.20 | 1.64 | -3.81 | 14.69 | exp -0.20 |
| rs_120d_top10_hold20 | RISK_ON_ONLY | RISK_ON | AVOID | 40 | 19 | 47.4% | -0.20 | 1.64 | -3.81 | 14.69 | exp -0.20 |
| rs_90d_top10_hold20 | ALL_REGIMES | RANGE | AVOID | 17 | 3 | 66.7% | 0.44 | 1.34 | 1.32 | 3.83 | échantillon < 5 trades |
| rs_90d_top10_hold20 | ALL_REGIMES | RISK_ON | OK | 53 | 19 | 52.6% | 0.11 | 2.51 | 2.06 | 17.61 | — |
| rs_90d_top10_hold20 | NO_RISK_OFF | RANGE | AVOID | 17 | 3 | 66.7% | 0.44 | 1.34 | 1.32 | 3.83 | échantillon < 5 trades |
| rs_90d_top10_hold20 | NO_RISK_OFF | RISK_ON | OK | 53 | 19 | 52.6% | 0.11 | 2.51 | 2.06 | 17.61 | — |
| rs_90d_top10_hold20 | RISK_ON_ONLY | RISK_ON | OK | 53 | 19 | 52.6% | 0.11 | 2.51 | 2.06 | 17.61 | — |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RANGE | AVOID | 28 | 3 | 66.7% | 1.41 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 2 | 100.0% | 2.56 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 62 | 11 | 63.6% | 1.10 | 0.46 | n/a | 3.00 | PF 0.46 < 1 |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 28 | 3 | 66.7% | 1.41 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 62 | 11 | 63.6% | 1.10 | 0.46 | n/a | 3.00 | PF 0.46 < 1 |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RANGE | AVOID | 18 | 2 | 50.0% | 0.83 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 1 | 100.0% | 1.93 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 28 | 3 | 100.0% | 1.85 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 18 | 2 | 50.0% | 0.83 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 28 | 3 | 100.0% | 1.85 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | AVOID | 28 | 4 | 75.0% | 2.08 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 1 | 100.0% | 7.72 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | OK | 75 | 9 | 77.8% | 2.28 | 1.41 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 28 | 4 | 75.0% | 2.08 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | OK | 75 | 9 | 77.8% | 2.28 | 1.41 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | AVOID | 23 | 2 | 50.0% | 1.31 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 1 | 100.0% | 3.31 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 58 | 8 | 75.0% | 1.45 | 0.92 | n/a | 2.00 | PF 0.92 < 1 |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 23 | 2 | 50.0% | 1.31 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 58 | 8 | 75.0% | 1.45 | 0.92 | n/a | 2.00 | PF 0.92 < 1 |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RANGE | AVOID | 18 | 2 | 50.0% | 0.83 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 1 | 100.0% | 1.93 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 28 | 2 | 100.0% | 1.91 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 18 | 2 | 50.0% | 0.83 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 28 | 2 | 100.0% | 1.91 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | AVOID | 28 | 4 | 75.0% | 2.08 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 1 | 100.0% | 7.72 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | OK | 88 | 7 | 85.7% | 2.84 | 2.81 | n/a | 1.00 | — |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 28 | 4 | 75.0% | 2.08 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | OK | 88 | 7 | 85.7% | 2.84 | 2.81 | n/a | 1.00 | — |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | AVOID | 23 | 2 | 50.0% | 1.31 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 1 | 100.0% | 3.31 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | OK | 83 | 7 | 85.7% | 1.80 | 1.83 | n/a | 1.00 | — |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 23 | 2 | 50.0% | 1.31 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | OK | 83 | 7 | 85.7% | 1.80 | 1.83 | n/a | 1.00 | — |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RANGE | AVOID | 18 | 2 | 50.0% | 0.83 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 1 | 100.0% | 1.93 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 28 | 2 | 100.0% | 1.91 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 18 | 2 | 50.0% | 0.83 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 28 | 2 | 100.0% | 1.91 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RANGE | AVOID | 28 | 4 | 100.0% | 2.68 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 2 | 100.0% | 5.19 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 62 | 12 | 75.0% | 2.11 | 0.94 | n/a | 2.00 | PF 0.94 < 1 |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 28 | 4 | 100.0% | 2.68 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 62 | 12 | 75.0% | 2.11 | 0.94 | n/a | 2.00 | PF 0.94 < 1 |

### AVGO

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | AVOID | 10 | 20 | 25.0% | -0.09 | 0.88 | n/a | 12.00 | exp -0.09 ; PF 0.88 < 1 |
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_OFF | WEAK | 56 | 6 | 66.7% | 5.36 | n/a | n/a | 0.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 15 | 38 | 13.2% | -0.46 | 0.51 | n/a | 9.14 | exp -0.46 ; PF 0.51 < 1 |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 10 | 20 | 25.0% | -0.09 | 0.88 | n/a | 12.00 | exp -0.09 ; PF 0.88 < 1 |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 38 | 13.2% | -0.46 | 0.51 | n/a | 9.14 | exp -0.46 ; PF 0.51 < 1 |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RANGE | OK | 57 | 12 | 41.7% | 0.67 | 4.58 | n/a | 2.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 1 | 0.0% | -1.00 | 0.00 | n/a | 1.00 | échantillon < 5 trades ; RISK_OFF destructeur |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RISK_ON | WEAK | 43 | 20 | 30.0% | 0.10 | 1.50 | n/a | 3.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RANGE | OK | 57 | 12 | 41.7% | 0.67 | 4.58 | n/a | 2.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RISK_ON | WEAK | 43 | 20 | 30.0% | 0.10 | 1.50 | n/a | 3.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RANGE | WEAK | 38 | 9 | 22.2% | 0.22 | 1.78 | n/a | 2.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RISK_ON | OK | 57 | 11 | 45.5% | 0.46 | 2.27 | n/a | 1.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RANGE | WEAK | 38 | 9 | 22.2% | 0.22 | 1.78 | n/a | 2.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RISK_ON | OK | 57 | 11 | 45.5% | 0.46 | 2.27 | n/a | 1.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RANGE | WEAK | 43 | 9 | 55.6% | 1.39 | n/a | n/a | 0.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 1 | 0.0% | -1.00 | 0.00 | n/a | 1.00 | échantillon < 5 trades ; RISK_OFF destructeur |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 20 | 15.0% | -0.07 | 0.56 | n/a | 3.00 | exp -0.07 ; PF 0.56 < 1 |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | WEAK | 43 | 9 | 55.6% | 1.39 | n/a | n/a | 0.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 20 | 15.0% | -0.07 | 0.56 | n/a | 3.00 | exp -0.07 ; PF 0.56 < 1 |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RANGE | AVOID | 28 | 6 | 33.3% | 0.83 | n/a | n/a | 0.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | AVOID | 15 | 11 | 18.2% | 0.00 | 0.55 | n/a | 2.00 | PF 0.55 < 1 |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | AVOID | 28 | 6 | 33.3% | 0.83 | n/a | n/a | 0.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 11 | 18.2% | 0.00 | 0.55 | n/a | 2.00 | PF 0.55 < 1 |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RANGE | AVOID | 20 | 4 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RISK_ON | AVOID | 7 | 14 | 28.6% | -0.09 | 0.80 | n/a | 6.00 | exp -0.09 ; PF 0.80 < 1 |
| meanrev_rsi30_dist5_stop1_rr1.2 | NO_RISK_OFF | RANGE | AVOID | 20 | 4 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | NO_RISK_OFF | RISK_ON | AVOID | 7 | 14 | 28.6% | -0.09 | 0.80 | n/a | 6.00 | exp -0.09 ; PF 0.80 < 1 |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RANGE | AVOID | 20 | 4 | 100.0% | 1.50 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RISK_ON | AVOID | 7 | 14 | 21.4% | -0.04 | 0.90 | n/a | 5.00 | exp -0.04 ; PF 0.90 < 1 |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | NO_RISK_OFF | RANGE | AVOID | 20 | 4 | 100.0% | 1.50 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | NO_RISK_OFF | RISK_ON | AVOID | 7 | 14 | 21.4% | -0.04 | 0.90 | n/a | 5.00 | exp -0.04 ; PF 0.90 < 1 |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RANGE | AVOID | 20 | 4 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 5 | 40.0% | -0.12 | 0.84 | n/a | 1.00 | RISK_OFF destructeur ; exp -0.12 ; PF 0.84 < 1 |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_ON | WEAK | 30 | 16 | 37.5% | 0.08 | 1.20 | n/a | 6.00 | — |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RANGE | AVOID | 20 | 4 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RISK_ON | WEAK | 30 | 16 | 37.5% | 0.08 | 1.20 | n/a | 6.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | AVOID | 10 | 20 | 25.0% | -0.09 | 0.88 | n/a | 12.00 | exp -0.09 ; PF 0.88 < 1 |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_OFF | WEAK | 48 | 6 | 66.7% | 5.36 | n/a | n/a | 0.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 20 | 43 | 18.6% | -0.27 | 0.90 | n/a | 9.14 | exp -0.27 ; PF 0.90 < 1 |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 10 | 20 | 25.0% | -0.09 | 0.88 | n/a | 12.00 | exp -0.09 ; PF 0.88 < 1 |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 20 | 43 | 18.6% | -0.27 | 0.90 | n/a | 9.14 | exp -0.27 ; PF 0.90 < 1 |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | AVOID | 10 | 16 | 25.0% | -0.08 | 0.91 | n/a | 9.00 | exp -0.08 ; PF 0.91 < 1 |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_OFF | WEAK | 48 | 5 | 60.0% | 6.01 | n/a | n/a | 0.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 25 | 31 | 19.4% | -0.21 | 1.02 | n/a | 8.14 | exp -0.21 |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 10 | 16 | 25.0% | -0.08 | 0.91 | n/a | 9.00 | exp -0.08 ; PF 0.91 < 1 |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 25 | 31 | 19.4% | -0.21 | 1.02 | n/a | 8.14 | exp -0.21 |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | AVOID | 3 | 9 | 11.1% | -0.68 | 0.24 | n/a | 7.00 | exp -0.68 ; PF 0.24 < 1 |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 3 | 100.0% | 4.12 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | WEAK | 43 | 26 | 23.1% | 0.03 | 1.81 | n/a | 7.00 | — |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 3 | 9 | 11.1% | -0.68 | 0.24 | n/a | 7.00 | exp -0.68 ; PF 0.24 < 1 |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | WEAK | 43 | 26 | 23.1% | 0.03 | 1.81 | n/a | 7.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | AVOID | 7 | 10 | 20.0% | -0.14 | 0.82 | n/a | 5.00 | exp -0.14 ; PF 0.82 < 1 |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 5 | 3 | 33.3% | 2.38 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 15 | 22 | 13.6% | -0.35 | 1.00 | n/a | 8.00 | exp -0.35 |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 7 | 10 | 20.0% | -0.14 | 0.82 | n/a | 5.00 | exp -0.14 ; PF 0.82 < 1 |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 22 | 13.6% | -0.35 | 1.00 | n/a | 8.00 | exp -0.35 |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | AVOID | 3 | 6 | 16.7% | -0.52 | 0.40 | n/a | 4.00 | exp -0.52 ; PF 0.40 < 1 |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 1 | 100.0% | 3.46 | n/a | n/a | 0.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 22 | 18.2% | -0.04 | 0.81 | n/a | 6.00 | exp -0.04 ; PF 0.81 < 1 |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 3 | 6 | 16.7% | -0.52 | 0.40 | n/a | 4.00 | exp -0.52 ; PF 0.40 < 1 |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 22 | 18.2% | -0.04 | 0.81 | n/a | 6.00 | exp -0.04 ; PF 0.81 < 1 |
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_OFF | AVOID | 13 | 1 | 100.0% | 0.45 | n/a | 0.45 | 0.00 | échantillon < 5 trades |
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_ON | OK | 72 | 5 | 60.0% | 0.64 | 5.82 | 3.23 | 2.30 | — |
| rs_120d_top10_hold20 | NO_RISK_OFF | RISK_ON | OK | 72 | 5 | 60.0% | 0.64 | 5.82 | 3.23 | 2.30 | — |
| rs_120d_top10_hold20 | RISK_ON_ONLY | RISK_ON | OK | 72 | 5 | 60.0% | 0.64 | 5.82 | 3.23 | 2.30 | — |
| rs_90d_top10_hold20 | ALL_REGIMES | RANGE | AVOID | 23 | 1 | 100.0% | 0.98 | n/a | 0.98 | 0.00 | échantillon < 5 trades |
| rs_90d_top10_hold20 | ALL_REGIMES | RISK_ON | AVOID | 6 | 1 | 100.0% | 0.03 | n/a | 0.03 | 0.00 | échantillon < 5 trades |
| rs_90d_top10_hold20 | NO_RISK_OFF | RANGE | AVOID | 23 | 1 | 100.0% | 0.98 | n/a | 0.98 | 0.00 | échantillon < 5 trades |
| rs_90d_top10_hold20 | NO_RISK_OFF | RISK_ON | AVOID | 6 | 1 | 100.0% | 0.03 | n/a | 0.03 | 0.00 | échantillon < 5 trades |
| rs_90d_top10_hold20 | RISK_ON_ONLY | RISK_ON | AVOID | 6 | 1 | 100.0% | 0.03 | n/a | 0.03 | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RANGE | AVOID | 7 | 11 | 18.2% | -0.47 | 0.43 | n/a | 8.00 | exp -0.47 ; PF 0.43 < 1 |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 3 | 100.0% | 4.12 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 29 | 17.2% | -0.23 | 0.66 | n/a | 8.00 | exp -0.23 ; PF 0.66 < 1 |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 7 | 11 | 18.2% | -0.47 | 0.43 | n/a | 8.00 | exp -0.47 ; PF 0.43 < 1 |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 29 | 17.2% | -0.23 | 0.66 | n/a | 8.00 | exp -0.23 ; PF 0.66 < 1 |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RANGE | AVOID | 0 | 4 | 0.0% | -1.00 | 0.00 | n/a | 3.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 3 | 100.0% | 2.39 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 10 | 18 | 16.7% | -0.17 | 0.82 | n/a | 4.00 | exp -0.17 ; PF 0.82 < 1 |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 0 | 4 | 0.0% | -1.00 | 0.00 | n/a | 3.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 18 | 16.7% | -0.17 | 0.82 | n/a | 4.00 | exp -0.17 ; PF 0.82 < 1 |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | AVOID | 10 | 16 | 25.0% | -0.08 | 0.91 | n/a | 9.00 | exp -0.08 ; PF 0.91 < 1 |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_OFF | WEAK | 56 | 5 | 60.0% | 6.01 | n/a | n/a | 0.00 | — |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 10 | 27 | 14.8% | -0.37 | 0.77 | n/a | 8.14 | exp -0.37 ; PF 0.77 < 1 |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 10 | 16 | 25.0% | -0.08 | 0.91 | n/a | 9.00 | exp -0.08 ; PF 0.91 < 1 |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 27 | 14.8% | -0.37 | 0.77 | n/a | 8.14 | exp -0.37 ; PF 0.77 < 1 |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | AVOID | 3 | 9 | 11.1% | -0.68 | 0.24 | n/a | 7.00 | exp -0.68 ; PF 0.24 < 1 |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 3 | 100.0% | 4.12 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 22 | 13.6% | -0.26 | 0.77 | n/a | 7.00 | exp -0.26 ; PF 0.77 < 1 |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 3 | 9 | 11.1% | -0.68 | 0.24 | n/a | 7.00 | exp -0.68 ; PF 0.24 < 1 |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 22 | 13.6% | -0.26 | 0.77 | n/a | 7.00 | exp -0.26 ; PF 0.77 < 1 |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RANGE | AVOID | 0 | 4 | 0.0% | -1.00 | 0.00 | n/a | 3.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 3 | 100.0% | 2.39 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 22 | 17 | 17.6% | -0.12 | 1.46 | n/a | 4.00 | exp -0.12 |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 0 | 4 | 0.0% | -1.00 | 0.00 | n/a | 3.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 22 | 17 | 17.6% | -0.12 | 1.46 | n/a | 4.00 | exp -0.12 |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | AVOID | 7 | 10 | 20.0% | -0.14 | 0.82 | n/a | 5.00 | exp -0.14 ; PF 0.82 < 1 |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 13 | 3 | 33.3% | 2.38 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 15 | 21 | 14.3% | -0.32 | 1.05 | n/a | 8.00 | exp -0.32 |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 7 | 10 | 20.0% | -0.14 | 0.82 | n/a | 5.00 | exp -0.14 ; PF 0.82 < 1 |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 21 | 14.3% | -0.32 | 1.05 | n/a | 8.00 | exp -0.32 |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | AVOID | 3 | 6 | 16.7% | -0.52 | 0.40 | n/a | 4.00 | exp -0.52 ; PF 0.40 < 1 |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 1 | 100.0% | 3.46 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 21 | 14.3% | -0.22 | 0.81 | n/a | 6.00 | exp -0.22 ; PF 0.81 < 1 |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 3 | 6 | 16.7% | -0.52 | 0.40 | n/a | 4.00 | exp -0.52 ; PF 0.40 < 1 |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 21 | 14.3% | -0.22 | 0.81 | n/a | 6.00 | exp -0.22 ; PF 0.81 < 1 |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RANGE | AVOID | 0 | 4 | 0.0% | -1.00 | 0.00 | n/a | 3.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 1 | 100.0% | 2.11 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 30 | 16 | 18.8% | -0.06 | 1.55 | n/a | 3.00 | exp -0.06 |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 0 | 4 | 0.0% | -1.00 | 0.00 | n/a | 3.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 30 | 16 | 18.8% | -0.06 | 1.55 | n/a | 3.00 | exp -0.06 |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RANGE | AVOID | 7 | 13 | 15.4% | -0.35 | 0.56 | n/a | 8.00 | exp -0.35 ; PF 0.56 < 1 |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 28 | 2 | 100.0% | 4.63 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 10 | 21 | 4.8% | -0.78 | 0.13 | n/a | 8.00 | exp -0.78 ; PF 0.13 < 1 |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 7 | 13 | 15.4% | -0.35 | 0.56 | n/a | 8.00 | exp -0.35 ; PF 0.56 < 1 |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 21 | 4.8% | -0.78 | 0.13 | n/a | 8.00 | exp -0.78 ; PF 0.13 < 1 |

### PLTR

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | STRONG | 82 | 10 | 50.0% | 2.87 | 9.80 | n/a | 2.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | OK | 59 | 14 | 42.9% | 0.61 | 1.59 | n/a | 3.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 82 | 10 | 50.0% | 2.87 | 9.80 | n/a | 2.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | OK | 59 | 14 | 42.9% | 0.61 | 1.59 | n/a | 3.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RANGE | AVOID | 7 | 12 | 25.0% | 0.00 | 0.67 | n/a | 5.00 | exp 0.00 ; PF 0.67 < 1 |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RISK_ON | WEAK | 30 | 27 | 29.6% | 0.11 | 1.36 | n/a | 5.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RANGE | AVOID | 7 | 12 | 25.0% | 0.00 | 0.67 | n/a | 5.00 | exp 0.00 ; PF 0.67 < 1 |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RISK_ON | WEAK | 30 | 27 | 29.6% | 0.11 | 1.36 | n/a | 5.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RANGE | WEAK | 35 | 9 | 33.3% | 0.33 | 1.33 | n/a | 2.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RISK_ON | WEAK | 35 | 22 | 31.8% | 0.18 | 1.41 | n/a | 4.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RANGE | WEAK | 35 | 9 | 33.3% | 0.33 | 1.33 | n/a | 2.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RISK_ON | WEAK | 35 | 22 | 31.8% | 0.18 | 1.41 | n/a | 4.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RANGE | AVOID | 7 | 11 | 9.1% | -0.05 | 0.68 | n/a | 3.00 | exp -0.05 ; PF 0.68 < 1 |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | AVOID | 22 | 22 | 18.2% | -0.00 | 1.34 | n/a | 6.00 | exp -0.00 |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | AVOID | 7 | 11 | 9.1% | -0.05 | 0.68 | n/a | 3.00 | exp -0.05 ; PF 0.68 < 1 |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | AVOID | 22 | 22 | 18.2% | -0.00 | 1.34 | n/a | 6.00 | exp -0.00 |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RANGE | WEAK | 31 | 8 | 12.5% | 0.19 | 1.88 | n/a | 1.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | WEAK | 38 | 17 | 23.5% | 0.18 | 1.63 | n/a | 3.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | WEAK | 31 | 8 | 12.5% | 0.19 | 1.88 | n/a | 1.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | WEAK | 38 | 17 | 23.5% | 0.18 | 1.63 | n/a | 3.00 | — |
| compression_20_ratio0.75_break20_stop1_rr2 | ALL_REGIMES | RISK_ON | WEAK | 45 | 3 | 66.7% | 1.00 | 4.00 | n/a | 1.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | NO_RISK_OFF | RISK_ON | WEAK | 45 | 3 | 66.7% | 1.00 | 4.00 | n/a | 1.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RANGE | AVOID | 20 | 1 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 1 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | NO_RISK_OFF | RANGE | AVOID | 20 | 1 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RANGE | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades ; RISK_OFF destructeur |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | NO_RISK_OFF | RANGE | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RANGE | WEAK | 30 | 3 | 66.7% | 0.47 | 2.40 | n/a | 1.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_OFF | WEAK | 40 | 4 | 75.0% | 0.65 | 3.60 | n/a | 1.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_ON | AVOID | 3 | 6 | 0.0% | -0.83 | 0.00 | n/a | 4.00 | exp -0.83 |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RANGE | WEAK | 30 | 3 | 66.7% | 0.47 | 2.40 | n/a | 1.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RISK_ON | AVOID | 3 | 6 | 0.0% | -0.83 | 0.00 | n/a | 4.00 | exp -0.83 |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | STRONG | 72 | 10 | 50.0% | 2.87 | 9.80 | n/a | 2.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | OK | 52 | 14 | 42.9% | 0.61 | 1.59 | n/a | 3.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 72 | 10 | 50.0% | 2.87 | 9.80 | n/a | 2.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | OK | 52 | 14 | 42.9% | 0.61 | 1.59 | n/a | 3.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | STRONG | 72 | 10 | 50.0% | 2.87 | 9.80 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | OK | 57 | 13 | 46.2% | 0.73 | 1.89 | n/a | 3.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 72 | 10 | 50.0% | 2.87 | 9.80 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | OK | 57 | 13 | 46.2% | 0.73 | 1.89 | n/a | 3.00 | — |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | STRONG | 72 | 10 | 50.0% | 1.34 | 4.90 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | OK | 73 | 8 | 87.5% | 1.80 | 10.92 | n/a | 1.00 | — |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | STRONG | 72 | 10 | 50.0% | 1.34 | 4.90 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | OK | 73 | 8 | 87.5% | 1.80 | 10.92 | n/a | 1.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | OK | 58 | 9 | 44.4% | 2.93 | 9.80 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | OK | 52 | 10 | 40.0% | 0.63 | 1.53 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | OK | 58 | 9 | 44.4% | 2.93 | 9.80 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | OK | 52 | 10 | 40.0% | 0.63 | 1.53 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | OK | 58 | 9 | 44.4% | 1.30 | 4.90 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | OK | 73 | 7 | 85.7% | 1.82 | 10.92 | n/a | 1.00 | — |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | OK | 58 | 9 | 44.4% | 1.30 | 4.90 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | OK | 73 | 7 | 85.7% | 1.82 | 10.92 | n/a | 1.00 | — |
| rs_120d_top10_hold20 | ALL_REGIMES | RANGE | STRONG | 89 | 13 | 76.9% | 1.44 | 2.49 | 18.70 | 5.79 | — |
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_OFF | WEAK | 55 | 3 | 66.7% | 4.10 | 65.79 | 12.31 | 0.19 | échantillon < 5 trades |
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_ON | STRONG | 95 | 21 | 81.0% | 2.99 | 9.35 | 62.88 | 6.62 | — |
| rs_120d_top10_hold20 | NO_RISK_OFF | RANGE | STRONG | 89 | 13 | 76.9% | 1.44 | 2.49 | 18.70 | 5.79 | — |
| rs_120d_top10_hold20 | NO_RISK_OFF | RISK_ON | STRONG | 95 | 21 | 81.0% | 2.99 | 9.35 | 62.88 | 6.62 | — |
| rs_120d_top10_hold20 | RISK_ON_ONLY | RISK_ON | STRONG | 95 | 21 | 81.0% | 2.99 | 9.35 | 62.88 | 6.62 | — |
| rs_90d_top10_hold20 | ALL_REGIMES | RANGE | STRONG | 89 | 13 | 84.6% | 1.32 | 2.60 | 17.16 | 5.79 | — |
| rs_90d_top10_hold20 | ALL_REGIMES | RISK_OFF | WEAK | 55 | 3 | 66.7% | 4.10 | 65.79 | 12.31 | 0.19 | échantillon < 5 trades |
| rs_90d_top10_hold20 | ALL_REGIMES | RISK_ON | STRONG | 95 | 18 | 72.2% | 3.13 | 9.79 | 56.39 | 6.62 | — |
| rs_90d_top10_hold20 | NO_RISK_OFF | RANGE | STRONG | 89 | 13 | 84.6% | 1.32 | 2.60 | 17.16 | 5.79 | — |
| rs_90d_top10_hold20 | NO_RISK_OFF | RISK_ON | STRONG | 95 | 18 | 72.2% | 3.13 | 9.79 | 56.39 | 6.62 | — |
| rs_90d_top10_hold20 | RISK_ON_ONLY | RISK_ON | STRONG | 95 | 18 | 72.2% | 3.13 | 9.79 | 56.39 | 6.62 | — |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RANGE | STRONG | 82 | 10 | 50.0% | 1.34 | 4.90 | n/a | 2.00 | — |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RISK_ON | OK | 83 | 9 | 77.8% | 1.49 | 5.46 | n/a | 2.00 | — |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RANGE | STRONG | 82 | 10 | 50.0% | 1.34 | 4.90 | n/a | 2.00 | — |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RISK_ON | OK | 83 | 9 | 77.8% | 1.49 | 5.46 | n/a | 2.00 | — |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RANGE | OK | 78 | 7 | 57.1% | 1.01 | 4.53 | n/a | 2.00 | — |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 28 | 3 | 100.0% | 1.83 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RANGE | OK | 78 | 7 | 57.1% | 1.01 | 4.53 | n/a | 2.00 | — |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 28 | 3 | 100.0% | 1.83 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | STRONG | 82 | 10 | 50.0% | 2.87 | 9.80 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | OK | 64 | 13 | 46.2% | 0.73 | 1.89 | n/a | 3.00 | — |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 82 | 10 | 50.0% | 2.87 | 9.80 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | OK | 64 | 13 | 46.2% | 0.73 | 1.89 | n/a | 3.00 | — |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | STRONG | 82 | 10 | 50.0% | 1.34 | 4.90 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | OK | 83 | 8 | 87.5% | 1.80 | 10.92 | n/a | 1.00 | — |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | STRONG | 82 | 10 | 50.0% | 1.34 | 4.90 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | OK | 83 | 8 | 87.5% | 1.80 | 10.92 | n/a | 1.00 | — |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RANGE | OK | 78 | 7 | 57.1% | 1.01 | 4.53 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 28 | 3 | 100.0% | 1.83 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RANGE | OK | 78 | 7 | 57.1% | 1.01 | 4.53 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 28 | 3 | 100.0% | 1.83 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | OK | 68 | 9 | 44.4% | 2.93 | 9.80 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | OK | 59 | 10 | 40.0% | 0.63 | 1.53 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | OK | 68 | 9 | 44.4% | 2.93 | 9.80 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | OK | 59 | 10 | 40.0% | 0.63 | 1.53 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | OK | 68 | 9 | 44.4% | 1.30 | 4.90 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | OK | 83 | 7 | 85.7% | 1.82 | 10.92 | n/a | 1.00 | — |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | OK | 68 | 9 | 44.4% | 1.30 | 4.90 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | OK | 83 | 7 | 85.7% | 1.82 | 10.92 | n/a | 1.00 | — |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RANGE | OK | 78 | 7 | 57.1% | 1.01 | 4.53 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 28 | 3 | 100.0% | 1.83 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RANGE | OK | 78 | 7 | 57.1% | 1.01 | 4.53 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 28 | 3 | 100.0% | 1.83 | n/a | n/a | 0.00 | échantillon < 5 trades |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RANGE | OK | 83 | 6 | 66.7% | 3.92 | 22.17 | n/a | 1.00 | — |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | OK | 58 | 11 | 45.5% | 0.65 | 1.48 | n/a | 4.00 | — |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | OK | 83 | 6 | 66.7% | 3.92 | 22.17 | n/a | 1.00 | — |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | OK | 58 | 11 | 45.5% | 0.65 | 1.48 | n/a | 4.00 | — |

### APP

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | OK | 52 | 7 | 42.9% | 0.70 | 1.43 | n/a | 2.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 15 | 25 | 20.0% | -0.27 | 0.66 | n/a | 10.00 | exp -0.27 ; PF 0.66 < 1 |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | OK | 52 | 7 | 42.9% | 0.70 | 1.43 | n/a | 2.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 25 | 20.0% | -0.27 | 0.66 | n/a | 10.00 | exp -0.27 ; PF 0.66 < 1 |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RANGE | AVOID | 0 | 4 | 0.0% | -0.25 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RISK_ON | OK | 55 | 28 | 39.3% | 0.39 | 2.13 | n/a | 5.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RANGE | AVOID | 0 | 4 | 0.0% | -0.25 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RISK_ON | OK | 55 | 28 | 39.3% | 0.39 | 2.13 | n/a | 5.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RANGE | AVOID | 0 | 3 | 0.0% | -0.33 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RISK_ON | OK | 55 | 19 | 36.8% | 0.42 | 2.70 | n/a | 3.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RANGE | AVOID | 0 | 3 | 0.0% | -0.33 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RISK_ON | OK | 55 | 19 | 36.8% | 0.42 | 2.70 | n/a | 3.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RANGE | AVOID | 0 | 3 | 0.0% | -0.33 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | OK | 65 | 25 | 40.0% | 0.76 | 4.38 | n/a | 2.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | AVOID | 0 | 3 | 0.0% | -0.33 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | OK | 65 | 25 | 40.0% | 0.76 | 4.38 | n/a | 2.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RANGE | AVOID | 0 | 2 | 0.0% | -0.50 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | OK | 65 | 17 | 29.4% | 0.50 | 3.90 | n/a | 2.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | AVOID | 0 | 2 | 0.0% | -0.50 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | OK | 65 | 17 | 29.4% | 0.50 | 3.90 | n/a | 2.00 | — |
| compression_20_ratio0.65_break20_stop1_rr2 | ALL_REGIMES | RANGE | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| compression_20_ratio0.65_break20_stop1_rr2 | ALL_REGIMES | RISK_ON | AVOID | 0 | 1 | 0.0% | -1.00 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| compression_20_ratio0.65_break20_stop1_rr2 | NO_RISK_OFF | RANGE | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| compression_20_ratio0.65_break20_stop1_rr2 | NO_RISK_OFF | RISK_ON | AVOID | 0 | 1 | 0.0% | -1.00 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | ALL_REGIMES | RANGE | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | ALL_REGIMES | RISK_ON | AVOID | 0 | 3 | 33.3% | 0.33 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | NO_RISK_OFF | RANGE | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | NO_RISK_OFF | RISK_ON | AVOID | 0 | 3 | 33.3% | 0.33 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| compression_40_ratio0.7_break30_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | AVOID | 15 | 2 | 50.0% | 1.25 | n/a | n/a | 0.00 | échantillon < 5 trades |
| compression_40_ratio0.7_break30_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 2 | 50.0% | 1.25 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RANGE | AVOID | 20 | 1 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 3 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | NO_RISK_OFF | RANGE | AVOID | 20 | 1 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RANGE | AVOID | 0 | 1 | 0.0% | -1.00 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 3 | 33.3% | 0.50 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | NO_RISK_OFF | RANGE | AVOID | 0 | 1 | 0.0% | -1.00 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RANGE | AVOID | 15 | 3 | 66.7% | 0.80 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 15 | 40.0% | -0.12 | 0.67 | n/a | 5.80 | RISK_OFF destructeur ; exp -0.12 ; PF 0.67 < 1 |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RANGE | AVOID | 15 | 3 | 66.7% | 0.80 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | WEAK | 45 | 7 | 42.9% | 0.70 | 1.43 | n/a | 2.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 15 | 25 | 20.0% | -0.27 | 0.66 | n/a | 10.00 | exp -0.27 ; PF 0.66 < 1 |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | WEAK | 45 | 7 | 42.9% | 0.70 | 1.43 | n/a | 2.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 25 | 20.0% | -0.27 | 0.66 | n/a | 10.00 | exp -0.27 ; PF 0.66 < 1 |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | WEAK | 45 | 7 | 42.9% | 0.70 | 1.43 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 15 | 24 | 20.8% | -0.24 | 0.73 | n/a | 10.00 | exp -0.24 ; PF 0.73 < 1 |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | WEAK | 45 | 7 | 42.9% | 0.70 | 1.43 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 24 | 20.8% | -0.24 | 0.73 | n/a | 10.00 | exp -0.24 ; PF 0.73 < 1 |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | AVOID | 0 | 3 | 33.3% | 0.13 | 1.19 | n/a | 2.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 17 | 17.6% | -0.16 | 0.85 | n/a | 4.00 | exp -0.16 ; PF 0.85 < 1 |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 0 | 3 | 33.3% | 0.13 | 1.19 | n/a | 2.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 17 | 17.6% | -0.16 | 0.85 | n/a | 4.00 | exp -0.16 ; PF 0.85 < 1 |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | AVOID | 18 | 5 | 40.0% | 0.32 | 0.00 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 15 | 22 | 22.7% | -0.17 | 0.88 | n/a | 10.00 | exp -0.17 ; PF 0.88 < 1 |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 18 | 5 | 40.0% | 0.32 | 0.00 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 22 | 22.7% | -0.17 | 0.88 | n/a | 10.00 | exp -0.17 ; PF 0.88 < 1 |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 22 | 15 | 20.0% | -0.05 | 1.25 | n/a | 3.00 | exp -0.05 |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 22 | 15 | 20.0% | -0.05 | 1.25 | n/a | 3.00 | exp -0.05 |
| rs_120d_top10_hold20 | ALL_REGIMES | RANGE | STRONG | 90 | 18 | 61.1% | 1.46 | 3.15 | 26.27 | 7.06 | — |
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_OFF | WEAK | 55 | 3 | 66.7% | 4.15 | 8.16 | 12.46 | 1.74 | échantillon < 5 trades |
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_ON | STRONG | 95 | 25 | 72.0% | 2.89 | 9.51 | 72.12 | 6.59 | — |
| rs_120d_top10_hold20 | NO_RISK_OFF | RANGE | STRONG | 90 | 18 | 61.1% | 1.46 | 3.15 | 26.27 | 7.06 | — |
| rs_120d_top10_hold20 | NO_RISK_OFF | RISK_ON | STRONG | 95 | 25 | 72.0% | 2.89 | 9.51 | 72.12 | 6.59 | — |
| rs_120d_top10_hold20 | RISK_ON_ONLY | RISK_ON | STRONG | 95 | 25 | 72.0% | 2.89 | 9.51 | 72.12 | 6.59 | — |
| rs_90d_top10_hold20 | ALL_REGIMES | RANGE | STRONG | 87 | 14 | 57.1% | 1.41 | 2.92 | 19.79 | 5.71 | — |
| rs_90d_top10_hold20 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 1 | 0.0% | -1.74 | 0.00 | -1.74 | 1.74 | échantillon < 5 trades ; RISK_OFF destructeur |
| rs_90d_top10_hold20 | ALL_REGIMES | RISK_ON | STRONG | 95 | 27 | 66.7% | 2.83 | 6.88 | 76.44 | 6.59 | — |
| rs_90d_top10_hold20 | NO_RISK_OFF | RANGE | STRONG | 87 | 14 | 57.1% | 1.41 | 2.92 | 19.79 | 5.71 | — |
| rs_90d_top10_hold20 | NO_RISK_OFF | RISK_ON | STRONG | 95 | 27 | 66.7% | 2.83 | 6.88 | 76.44 | 6.59 | — |
| rs_90d_top10_hold20 | RISK_ON_ONLY | RISK_ON | STRONG | 95 | 27 | 66.7% | 2.83 | 6.88 | 76.44 | 6.59 | — |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RANGE | AVOID | 0 | 3 | 33.3% | 0.13 | 1.19 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 18 | 16.7% | -0.21 | 0.80 | n/a | 5.00 | exp -0.21 ; PF 0.80 < 1 |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 0 | 3 | 33.3% | 0.13 | 1.19 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 18 | 16.7% | -0.21 | 0.80 | n/a | 5.00 | exp -0.21 ; PF 0.80 < 1 |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 3 | 8 | 12.5% | -0.04 | 0.00 | n/a | 2.00 | exp -0.04 |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 3 | 8 | 12.5% | -0.04 | 0.00 | n/a | 2.00 | exp -0.04 |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | OK | 52 | 7 | 42.9% | 0.70 | 1.43 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 15 | 24 | 20.8% | -0.24 | 0.73 | n/a | 10.00 | exp -0.24 ; PF 0.73 < 1 |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | OK | 52 | 7 | 42.9% | 0.70 | 1.43 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 24 | 20.8% | -0.24 | 0.73 | n/a | 10.00 | exp -0.24 ; PF 0.73 < 1 |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | AVOID | 0 | 3 | 33.3% | 0.13 | 1.19 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 17 | 17.6% | -0.16 | 0.85 | n/a | 4.00 | exp -0.16 ; PF 0.85 < 1 |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 0 | 3 | 33.3% | 0.13 | 1.19 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 17 | 17.6% | -0.16 | 0.85 | n/a | 4.00 | exp -0.16 ; PF 0.85 < 1 |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 3 | 8 | 12.5% | -0.04 | 0.00 | n/a | 2.00 | exp -0.04 |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 3 | 8 | 12.5% | -0.04 | 0.00 | n/a | 2.00 | exp -0.04 |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | AVOID | 18 | 5 | 40.0% | 0.32 | 0.00 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 15 | 22 | 22.7% | -0.17 | 0.88 | n/a | 10.00 | exp -0.17 ; PF 0.88 < 1 |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 18 | 5 | 40.0% | 0.32 | 0.00 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 22 | 22.7% | -0.17 | 0.88 | n/a | 10.00 | exp -0.17 ; PF 0.88 < 1 |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 22 | 15 | 20.0% | -0.05 | 1.25 | n/a | 3.00 | exp -0.05 |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 22 | 15 | 20.0% | -0.05 | 1.25 | n/a | 3.00 | exp -0.05 |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 11 | 7 | 14.3% | 0.10 | 0.00 | n/a | 1.00 | — |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 11 | 7 | 14.3% | 0.10 | 0.00 | n/a | 1.00 | — |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RANGE | OK | 52 | 7 | 42.9% | 0.70 | 1.43 | n/a | 2.00 | — |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 15 | 20 | 25.0% | -0.09 | 0.96 | n/a | 7.00 | exp -0.09 ; PF 0.96 < 1 |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | OK | 52 | 7 | 42.9% | 0.70 | 1.43 | n/a | 2.00 | — |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 20 | 25.0% | -0.09 | 0.96 | n/a | 7.00 | exp -0.09 ; PF 0.96 < 1 |

### SMCI

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | AVOID | 32 | 7 | 42.9% | 0.66 | 0.67 | n/a | 4.00 | PF 0.67 < 1 |
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 12 | 0.0% | -0.83 | 0.00 | n/a | 10.00 | RISK_OFF destructeur ; exp -0.83 |
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 27 | 17 | 17.6% | -0.03 | 1.49 | n/a | 4.00 | exp -0.03 |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 32 | 7 | 42.9% | 0.66 | 0.67 | n/a | 4.00 | PF 0.67 < 1 |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 27 | 17 | 17.6% | -0.03 | 1.49 | n/a | 4.00 | exp -0.03 |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RANGE | AVOID | 23 | 17 | 29.4% | 0.00 | 1.09 | n/a | 4.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RISK_OFF | OK | 63 | 6 | 50.0% | 0.83 | 6.00 | n/a | 1.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RISK_ON | STRONG | 72 | 13 | 61.5% | 0.92 | 6.15 | n/a | 1.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RANGE | AVOID | 23 | 17 | 29.4% | 0.00 | 1.09 | n/a | 4.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RISK_ON | STRONG | 72 | 13 | 61.5% | 0.92 | 6.15 | n/a | 1.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RANGE | WEAK | 34 | 10 | 40.0% | 0.20 | 1.47 | n/a | 2.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RISK_OFF | AVOID | 15 | 4 | 50.0% | 1.00 | n/a | n/a | 0.00 | échantillon < 5 trades |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RISK_ON | STRONG | 72 | 11 | 63.6% | 1.00 | 5.73 | n/a | 1.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RANGE | WEAK | 34 | 10 | 40.0% | 0.20 | 1.47 | n/a | 2.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RISK_ON | STRONG | 72 | 11 | 63.6% | 1.00 | 5.73 | n/a | 1.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RANGE | OK | 50 | 15 | 26.7% | 0.27 | 2.22 | n/a | 3.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 3 | 33.3% | 0.83 | n/a | n/a | 0.00 | échantillon < 5 trades |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | OK | 67 | 12 | 50.0% | 0.92 | 4.17 | n/a | 2.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | OK | 50 | 15 | 26.7% | 0.27 | 2.22 | n/a | 3.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | OK | 67 | 12 | 50.0% | 0.92 | 4.17 | n/a | 2.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RANGE | WEAK | 43 | 9 | 33.3% | 0.39 | 4.17 | n/a | 3.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 2 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades ; RISK_OFF destructeur |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | OK | 62 | 11 | 45.5% | 0.78 | 3.41 | n/a | 2.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | WEAK | 43 | 9 | 33.3% | 0.39 | 4.17 | n/a | 3.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | OK | 62 | 11 | 45.5% | 0.78 | 3.41 | n/a | 2.00 | — |
| compression_20_ratio0.65_break20_stop1_rr2 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 1 | 100.0% | 2.00 | n/a | n/a | 0.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | ALL_REGIMES | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 2 | 100.0% | 2.00 | n/a | n/a | 0.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | NO_RISK_OFF | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RANGE | WEAK | 40 | 4 | 75.0% | 0.65 | 2.40 | n/a | 1.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RISK_ON | AVOID | 10 | 21 | 23.8% | -0.19 | 0.60 | n/a | 8.00 | exp -0.19 ; PF 0.60 < 1 |
| meanrev_rsi30_dist5_stop1_rr1.2 | NO_RISK_OFF | RANGE | WEAK | 40 | 4 | 75.0% | 0.65 | 2.40 | n/a | 1.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 21 | 23.8% | -0.19 | 0.60 | n/a | 8.00 | exp -0.19 ; PF 0.60 < 1 |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RANGE | AVOID | 0 | 4 | 25.0% | 0.13 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 21 | 14.3% | -0.12 | 0.64 | n/a | 6.00 | exp -0.12 ; PF 0.64 < 1 |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | NO_RISK_OFF | RANGE | AVOID | 0 | 4 | 25.0% | 0.13 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 21 | 14.3% | -0.12 | 0.64 | n/a | 6.00 | exp -0.12 ; PF 0.64 < 1 |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RANGE | OK | 73 | 5 | 80.0% | 0.76 | 2.40 | n/a | 1.00 | — |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_OFF | AVOID | 20 | 1 | 100.0% | 1.20 | n/a | n/a | 0.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_ON | AVOID | 28 | 29 | 34.5% | 0.04 | 1.10 | n/a | 8.00 | — |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RANGE | OK | 73 | 5 | 80.0% | 0.76 | 2.40 | n/a | 1.00 | — |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RISK_ON | AVOID | 28 | 29 | 34.5% | 0.04 | 1.10 | n/a | 8.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | AVOID | 28 | 7 | 42.9% | 0.66 | 0.67 | n/a | 4.00 | PF 0.67 < 1 |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 12 | 0.0% | -0.83 | 0.00 | n/a | 10.00 | RISK_OFF destructeur ; exp -0.83 |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 27 | 20 | 15.0% | -0.13 | 1.27 | n/a | 4.00 | exp -0.13 |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 28 | 7 | 42.9% | 0.66 | 0.67 | n/a | 4.00 | PF 0.67 < 1 |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 27 | 20 | 15.0% | -0.13 | 1.27 | n/a | 4.00 | exp -0.13 |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | AVOID | 28 | 7 | 42.9% | 0.66 | 0.67 | n/a | 4.00 | PF 0.67 < 1 |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 11 | 0.0% | -0.82 | 0.00 | n/a | 9.00 | RISK_OFF destructeur ; exp -0.82 |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 20 | 19 | 15.8% | -0.08 | 1.18 | n/a | 4.00 | exp -0.08 |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 28 | 7 | 42.9% | 0.66 | 0.67 | n/a | 4.00 | PF 0.67 < 1 |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 20 | 19 | 15.8% | -0.08 | 1.18 | n/a | 4.00 | exp -0.08 |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | AVOID | 28 | 7 | 42.9% | 0.57 | 0.93 | n/a | 2.00 | PF 0.93 < 1 |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 11 | 0.0% | -0.82 | 0.00 | n/a | 9.00 | RISK_OFF destructeur ; exp -0.82 |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 15 | 6.7% | -0.50 | 0.42 | n/a | 4.00 | exp -0.50 ; PF 0.42 < 1 |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 28 | 7 | 42.9% | 0.57 | 0.93 | n/a | 2.00 | PF 0.93 < 1 |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 15 | 6.7% | -0.50 | 0.42 | n/a | 4.00 | exp -0.50 ; PF 0.42 < 1 |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | AVOID | 28 | 7 | 42.9% | 0.66 | 0.67 | n/a | 4.00 | PF 0.67 < 1 |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 10 | 0.0% | -0.80 | 0.00 | n/a | 8.00 | RISK_OFF destructeur ; exp -0.80 |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | WEAK | 35 | 17 | 17.6% | 0.03 | 1.34 | n/a | 3.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 28 | 7 | 42.9% | 0.66 | 0.67 | n/a | 4.00 | PF 0.67 < 1 |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | WEAK | 35 | 17 | 17.6% | 0.03 | 1.34 | n/a | 3.00 | — |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | AVOID | 28 | 7 | 42.9% | 0.57 | 0.93 | n/a | 2.00 | PF 0.93 < 1 |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 10 | 0.0% | -0.80 | 0.00 | n/a | 8.00 | RISK_OFF destructeur ; exp -0.80 |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 7 | 14 | 7.1% | -0.46 | 0.45 | n/a | 4.00 | exp -0.46 ; PF 0.45 < 1 |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 28 | 7 | 42.9% | 0.57 | 0.93 | n/a | 2.00 | PF 0.93 < 1 |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 7 | 14 | 7.1% | -0.46 | 0.45 | n/a | 4.00 | exp -0.46 ; PF 0.45 < 1 |
| rs_120d_top10_hold20 | ALL_REGIMES | RANGE | STRONG | 90 | 20 | 65.0% | 1.54 | 2.59 | 30.87 | 8.91 | — |
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_OFF | STRONG | 82 | 12 | 58.3% | 1.71 | 2.71 | 20.50 | 5.09 | — |
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_ON | AVOID | 23 | 15 | 46.7% | 0.19 | 0.99 | 2.87 | 17.91 | PF 0.99 < 1 |
| rs_120d_top10_hold20 | NO_RISK_OFF | RANGE | STRONG | 90 | 20 | 65.0% | 1.54 | 2.59 | 30.87 | 8.91 | — |
| rs_120d_top10_hold20 | NO_RISK_OFF | RISK_ON | AVOID | 23 | 15 | 46.7% | 0.19 | 0.99 | 2.87 | 17.91 | PF 0.99 < 1 |
| rs_120d_top10_hold20 | RISK_ON_ONLY | RISK_ON | AVOID | 23 | 15 | 46.7% | 0.19 | 0.99 | 2.87 | 17.91 | PF 0.99 < 1 |
| rs_90d_top10_hold20 | ALL_REGIMES | RANGE | STRONG | 71 | 14 | 57.1% | 0.61 | 2.08 | 8.59 | 7.24 | — |
| rs_90d_top10_hold20 | ALL_REGIMES | RISK_OFF | OK | 62 | 9 | 55.6% | 0.84 | 1.67 | 7.55 | 5.09 | — |
| rs_90d_top10_hold20 | ALL_REGIMES | RISK_ON | STRONG | 89 | 12 | 66.7% | 2.42 | 3.20 | 28.99 | 10.53 | — |
| rs_90d_top10_hold20 | NO_RISK_OFF | RANGE | STRONG | 71 | 14 | 57.1% | 0.61 | 2.08 | 8.59 | 7.24 | — |
| rs_90d_top10_hold20 | NO_RISK_OFF | RISK_ON | STRONG | 89 | 12 | 66.7% | 2.42 | 3.20 | 28.99 | 10.53 | — |
| rs_90d_top10_hold20 | RISK_ON_ONLY | RISK_ON | STRONG | 89 | 12 | 66.7% | 2.42 | 3.20 | 28.99 | 10.53 | — |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RANGE | AVOID | 32 | 7 | 42.9% | 0.57 | 0.93 | n/a | 2.00 | PF 0.93 < 1 |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 12 | 0.0% | -0.83 | 0.00 | n/a | 10.00 | RISK_OFF destructeur ; exp -0.83 |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 7 | 11 | 18.2% | -0.13 | 0.63 | n/a | 3.00 | exp -0.13 ; PF 0.63 < 1 |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 32 | 7 | 42.9% | 0.57 | 0.93 | n/a | 2.00 | PF 0.93 < 1 |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 7 | 11 | 18.2% | -0.13 | 0.63 | n/a | 3.00 | exp -0.13 ; PF 0.63 < 1 |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RANGE | AVOID | 0 | 2 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 6 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | RISK_OFF destructeur ; exp 0.00 |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 3 | 4 | 25.0% | 0.15 | 1.61 | n/a | 1.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 0 | 2 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 3 | 4 | 25.0% | 0.15 | 1.61 | n/a | 1.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | AVOID | 32 | 7 | 42.9% | 0.66 | 0.67 | n/a | 4.00 | PF 0.67 < 1 |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 11 | 0.0% | -0.82 | 0.00 | n/a | 9.00 | RISK_OFF destructeur ; exp -0.82 |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | WEAK | 35 | 16 | 18.8% | 0.03 | 1.43 | n/a | 4.00 | — |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 32 | 7 | 42.9% | 0.66 | 0.67 | n/a | 4.00 | PF 0.67 < 1 |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | WEAK | 35 | 16 | 18.8% | 0.03 | 1.43 | n/a | 4.00 | — |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | AVOID | 32 | 7 | 42.9% | 0.57 | 0.93 | n/a | 2.00 | PF 0.93 < 1 |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 11 | 0.0% | -0.82 | 0.00 | n/a | 9.00 | RISK_OFF destructeur ; exp -0.82 |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 7 | 10 | 10.0% | -0.35 | 0.63 | n/a | 3.00 | exp -0.35 ; PF 0.63 < 1 |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 32 | 7 | 42.9% | 0.57 | 0.93 | n/a | 2.00 | PF 0.93 < 1 |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 7 | 10 | 10.0% | -0.35 | 0.63 | n/a | 3.00 | exp -0.35 ; PF 0.63 < 1 |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RANGE | AVOID | 0 | 2 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 6 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | RISK_OFF destructeur ; exp 0.00 |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 3 | 4 | 25.0% | 0.15 | 1.61 | n/a | 1.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 0 | 2 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 3 | 4 | 25.0% | 0.15 | 1.61 | n/a | 1.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | AVOID | 32 | 7 | 42.9% | 0.66 | 0.67 | n/a | 4.00 | PF 0.67 < 1 |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 10 | 0.0% | -0.80 | 0.00 | n/a | 8.00 | RISK_OFF destructeur ; exp -0.80 |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | WEAK | 40 | 14 | 21.4% | 0.18 | 1.67 | n/a | 3.00 | — |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 32 | 7 | 42.9% | 0.66 | 0.67 | n/a | 4.00 | PF 0.67 < 1 |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | WEAK | 40 | 14 | 21.4% | 0.18 | 1.67 | n/a | 3.00 | — |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | AVOID | 32 | 7 | 42.9% | 0.57 | 0.93 | n/a | 2.00 | PF 0.93 < 1 |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 10 | 0.0% | -0.80 | 0.00 | n/a | 8.00 | RISK_OFF destructeur ; exp -0.80 |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 3 | 9 | 11.1% | -0.28 | 0.69 | n/a | 2.00 | exp -0.28 ; PF 0.69 < 1 |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 32 | 7 | 42.9% | 0.57 | 0.93 | n/a | 2.00 | PF 0.93 < 1 |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 3 | 9 | 11.1% | -0.28 | 0.69 | n/a | 2.00 | exp -0.28 ; PF 0.69 < 1 |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RANGE | AVOID | 0 | 2 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 6 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | RISK_OFF destructeur ; exp 0.00 |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 3 | 4 | 25.0% | 0.15 | 1.61 | n/a | 1.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 0 | 2 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 3 | 4 | 25.0% | 0.15 | 1.61 | n/a | 1.00 | échantillon < 5 trades |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RANGE | OK | 72 | 5 | 60.0% | 1.32 | 1.35 | n/a | 2.00 | — |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 10 | 0.0% | -0.80 | 0.00 | n/a | 8.00 | RISK_OFF destructeur ; exp -0.80 |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | WEAK | 44 | 14 | 21.4% | 0.18 | 1.81 | n/a | 2.00 | — |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | OK | 72 | 5 | 60.0% | 1.32 | 1.35 | n/a | 2.00 | — |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | WEAK | 44 | 14 | 21.4% | 0.18 | 1.81 | n/a | 2.00 | — |

### BTC

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | STRONG | 75 | 28 | 35.7% | 0.58 | 3.07 | n/a | 4.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 35 | 18 | 16.7% | -0.01 | 2.19 | n/a | 7.00 | exp -0.01 |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 75 | 28 | 35.7% | 0.58 | 3.07 | n/a | 4.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 35 | 18 | 16.7% | -0.01 | 2.19 | n/a | 7.00 | exp -0.01 |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RANGE | WEAK | 35 | 21 | 23.8% | 0.09 | 1.26 | n/a | 2.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades ; RISK_OFF destructeur |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RISK_ON | AVOID | 28 | 39 | 23.1% | 0.02 | 1.10 | n/a | 7.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RANGE | WEAK | 35 | 21 | 23.8% | 0.09 | 1.26 | n/a | 2.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RISK_ON | AVOID | 28 | 39 | 23.1% | 0.02 | 1.10 | n/a | 7.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RANGE | WEAK | 47 | 14 | 28.6% | 0.28 | 1.86 | n/a | 2.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades ; RISK_OFF destructeur |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RISK_ON | AVOID | 15 | 25 | 20.0% | -0.04 | 1.19 | n/a | 4.00 | exp -0.04 |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RANGE | WEAK | 47 | 14 | 28.6% | 0.28 | 1.86 | n/a | 2.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 25 | 20.0% | -0.04 | 1.19 | n/a | 4.00 | exp -0.04 |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RANGE | OK | 50 | 19 | 21.1% | 0.21 | 1.84 | n/a | 2.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 24 | 12.5% | -0.18 | 0.62 | n/a | 6.00 | exp -0.18 ; PF 0.62 < 1 |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | OK | 50 | 19 | 21.1% | 0.21 | 1.84 | n/a | 2.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 24 | 12.5% | -0.18 | 0.62 | n/a | 6.00 | exp -0.18 ; PF 0.62 < 1 |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RANGE | WEAK | 47 | 12 | 25.0% | 0.29 | 1.67 | n/a | 2.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 18 | 11.1% | -0.11 | 0.72 | n/a | 3.00 | exp -0.11 ; PF 0.72 < 1 |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | WEAK | 47 | 12 | 25.0% | 0.29 | 1.67 | n/a | 2.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 18 | 11.1% | -0.11 | 0.72 | n/a | 3.00 | exp -0.11 ; PF 0.72 < 1 |
| compression_20_ratio0.65_break20_stop1_rr2 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 1 | 0.0% | -1.00 | 0.00 | n/a | 1.00 | échantillon < 5 trades ; RISK_OFF destructeur |
| compression_20_ratio0.65_break20_stop1_rr2 | ALL_REGIMES | RISK_ON | AVOID | 20 | 1 | 100.0% | 2.00 | n/a | n/a | 0.00 | échantillon < 5 trades |
| compression_20_ratio0.65_break20_stop1_rr2 | NO_RISK_OFF | RISK_ON | AVOID | 20 | 1 | 100.0% | 2.00 | n/a | n/a | 0.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | ALL_REGIMES | RANGE | AVOID | 20 | 1 | 100.0% | 2.00 | n/a | n/a | 0.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 1 | 0.0% | -1.00 | 0.00 | n/a | 1.00 | échantillon < 5 trades ; RISK_OFF destructeur |
| compression_20_ratio0.75_break20_stop1_rr2 | ALL_REGIMES | RISK_ON | WEAK | 45 | 4 | 75.0% | 1.25 | 6.00 | n/a | 1.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | NO_RISK_OFF | RANGE | AVOID | 20 | 1 | 100.0% | 2.00 | n/a | n/a | 0.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | NO_RISK_OFF | RISK_ON | WEAK | 45 | 4 | 75.0% | 1.25 | 6.00 | n/a | 1.00 | échantillon < 5 trades |
| compression_40_ratio0.7_break30_stop1.5_rr2.5 | ALL_REGIMES | RANGE | AVOID | 0 | 1 | 0.0% | -1.00 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| compression_40_ratio0.7_break30_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| compression_40_ratio0.7_break30_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | AVOID | 0 | 1 | 0.0% | -1.00 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| compression_40_ratio0.7_break30_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RANGE | OK | 62 | 10 | 50.0% | 0.40 | 2.10 | n/a | 1.00 | — |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 6 | 0.0% | -0.67 | 0.00 | n/a | 4.00 | RISK_OFF destructeur ; exp -0.67 |
| meanrev_rsi30_dist5_stop1_rr1.2 | NO_RISK_OFF | RANGE | OK | 62 | 10 | 50.0% | 0.40 | 2.10 | n/a | 1.00 | — |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RANGE | WEAK | 32 | 10 | 30.0% | 0.25 | 1.13 | n/a | 1.00 | — |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 6 | 0.0% | -0.50 | 0.00 | n/a | 3.00 | RISK_OFF destructeur ; exp -0.50 |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | NO_RISK_OFF | RANGE | WEAK | 32 | 10 | 30.0% | 0.25 | 1.13 | n/a | 1.00 | — |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RANGE | WEAK | 45 | 19 | 52.6% | 0.42 | 1.11 | n/a | 2.00 | — |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_OFF | AVOID | 0 | 10 | 20.0% | -0.36 | 0.40 | n/a | 6.00 | RISK_OFF destructeur ; exp -0.36 ; PF 0.40 < 1 |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_ON | AVOID | 10 | 4 | 50.0% | 0.10 | 1.20 | n/a | 1.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RANGE | WEAK | 45 | 19 | 52.6% | 0.42 | 1.11 | n/a | 2.00 | — |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 4 | 50.0% | 0.10 | 1.20 | n/a | 1.00 | échantillon < 5 trades |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | STRONG | 70 | 30 | 40.0% | 0.77 | 3.07 | n/a | 4.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | WEAK | 48 | 21 | 19.0% | 0.06 | 2.22 | n/a | 7.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 70 | 30 | 40.0% | 0.77 | 3.07 | n/a | 4.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | WEAK | 48 | 21 | 19.0% | 0.06 | 2.22 | n/a | 7.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | STRONG | 75 | 20 | 45.0% | 1.23 | 8.87 | n/a | 4.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 7 | 14 | 7.1% | -0.21 | 0.87 | n/a | 4.00 | exp -0.21 ; PF 0.87 < 1 |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 75 | 20 | 45.0% | 1.23 | 8.87 | n/a | 4.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 7 | 14 | 7.1% | -0.21 | 0.87 | n/a | 4.00 | exp -0.21 ; PF 0.87 < 1 |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | OK | 62 | 11 | 36.4% | 0.66 | 3.77 | n/a | 1.00 | — |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 8 | 9 | 11.1% | -0.09 | 1.19 | n/a | 2.00 | exp -0.09 |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | OK | 62 | 11 | 36.4% | 0.66 | 3.77 | n/a | 1.00 | — |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 8 | 9 | 11.1% | -0.09 | 1.19 | n/a | 2.00 | exp -0.09 |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | OK | 54 | 14 | 42.9% | 1.32 | 1.29 | n/a | 3.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 27 | 12 | 8.3% | -0.08 | 1.69 | n/a | 3.00 | exp -0.08 |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | OK | 54 | 14 | 42.9% | 1.32 | 1.29 | n/a | 3.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 27 | 12 | 8.3% | -0.08 | 1.69 | n/a | 3.00 | exp -0.08 |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | OK | 53 | 9 | 33.3% | 0.66 | 1.57 | n/a | 1.00 | — |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 8 | 9 | 11.1% | -0.09 | 1.19 | n/a | 2.00 | exp -0.09 |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | OK | 53 | 9 | 33.3% | 0.66 | 1.57 | n/a | 1.00 | — |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 8 | 9 | 11.1% | -0.09 | 1.19 | n/a | 2.00 | exp -0.09 |
| rs_120d_top10_hold20 | ALL_REGIMES | RANGE | AVOID | 28 | 3 | 100.0% | 2.29 | n/a | 6.87 | 0.00 | échantillon < 5 trades |
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_ON | AVOID | 0 | 4 | 25.0% | -0.42 | 0.00 | -1.67 | 1.63 | échantillon < 5 trades |
| rs_120d_top10_hold20 | NO_RISK_OFF | RANGE | AVOID | 28 | 3 | 100.0% | 2.29 | n/a | 6.87 | 0.00 | échantillon < 5 trades |
| rs_120d_top10_hold20 | NO_RISK_OFF | RISK_ON | AVOID | 0 | 4 | 25.0% | -0.42 | 0.00 | -1.67 | 1.63 | échantillon < 5 trades |
| rs_120d_top10_hold20 | RISK_ON_ONLY | RISK_ON | AVOID | 0 | 4 | 25.0% | -0.42 | 0.00 | -1.67 | 1.63 | échantillon < 5 trades |
| rs_90d_top10_hold20 | ALL_REGIMES | RANGE | AVOID | 28 | 4 | 100.0% | 2.66 | n/a | 10.65 | 0.00 | échantillon < 5 trades |
| rs_90d_top10_hold20 | ALL_REGIMES | RISK_ON | AVOID | 28 | 6 | 50.0% | 0.24 | 0.00 | 1.43 | 2.69 | — |
| rs_90d_top10_hold20 | NO_RISK_OFF | RANGE | AVOID | 28 | 4 | 100.0% | 2.66 | n/a | 10.65 | 0.00 | échantillon < 5 trades |
| rs_90d_top10_hold20 | NO_RISK_OFF | RISK_ON | AVOID | 28 | 6 | 50.0% | 0.24 | 0.00 | 1.43 | 2.69 | — |
| rs_90d_top10_hold20 | RISK_ON_ONLY | RISK_ON | AVOID | 28 | 6 | 50.0% | 0.24 | 0.00 | 1.43 | 2.69 | — |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RANGE | AVOID | 27 | 15 | 20.0% | -0.01 | 1.45 | n/a | 4.00 | exp -0.01 |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RISK_ON | WEAK | 40 | 13 | 23.1% | 0.00 | 3.25 | n/a | 5.00 | — |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RANGE | AVOID | 27 | 15 | 20.0% | -0.01 | 1.45 | n/a | 4.00 | exp -0.01 |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RISK_ON | WEAK | 40 | 13 | 23.1% | 0.00 | 3.25 | n/a | 5.00 | — |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RANGE | AVOID | 28 | 3 | 66.7% | 1.16 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 28 | 3 | 66.7% | 1.16 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | STRONG | 75 | 18 | 38.9% | 0.98 | 8.87 | n/a | 4.00 | — |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 12 | 12 | 8.3% | -0.16 | 1.01 | n/a | 4.00 | exp -0.16 |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 75 | 18 | 38.9% | 0.98 | 8.87 | n/a | 4.00 | — |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 12 | 12 | 8.3% | -0.16 | 1.01 | n/a | 4.00 | exp -0.16 |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | OK | 62 | 10 | 30.0% | 0.49 | 3.77 | n/a | 1.00 | — |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 15 | 8 | 12.5% | -0.11 | 1.34 | n/a | 2.00 | exp -0.11 |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | OK | 62 | 10 | 30.0% | 0.49 | 3.77 | n/a | 1.00 | — |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 8 | 12.5% | -0.11 | 1.34 | n/a | 2.00 | exp -0.11 |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RANGE | AVOID | 28 | 3 | 66.7% | 1.16 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 28 | 3 | 66.7% | 1.16 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | OK | 64 | 13 | 38.5% | 1.28 | 1.29 | n/a | 3.00 | — |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | WEAK | 40 | 10 | 10.0% | 0.00 | 2.02 | n/a | 3.00 | — |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | OK | 64 | 13 | 38.5% | 1.28 | 1.29 | n/a | 3.00 | — |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | WEAK | 40 | 10 | 10.0% | 0.00 | 2.02 | n/a | 3.00 | — |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | OK | 63 | 9 | 33.3% | 0.66 | 1.57 | n/a | 1.00 | — |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 15 | 8 | 12.5% | -0.11 | 1.34 | n/a | 2.00 | exp -0.11 |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | OK | 63 | 9 | 33.3% | 0.66 | 1.57 | n/a | 1.00 | — |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 15 | 8 | 12.5% | -0.11 | 1.34 | n/a | 2.00 | exp -0.11 |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RANGE | AVOID | 28 | 3 | 66.7% | 1.16 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 28 | 3 | 66.7% | 1.16 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 0 | 1 | 0.0% | 0.00 | 0.00 | n/a | 0.00 | échantillon < 5 trades |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RANGE | AVOID | 10 | 18 | 27.8% | -0.14 | 0.99 | n/a | 4.00 | exp -0.14 ; PF 0.99 < 1 |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 7 | 10 | 10.0% | -0.43 | 0.67 | n/a | 4.00 | exp -0.43 ; PF 0.67 < 1 |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | AVOID | 10 | 18 | 27.8% | -0.14 | 0.99 | n/a | 4.00 | exp -0.14 ; PF 0.99 < 1 |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 7 | 10 | 10.0% | -0.43 | 0.67 | n/a | 4.00 | exp -0.43 ; PF 0.67 < 1 |

### SOL

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | STRONG | 75 | 17 | 41.2% | 0.88 | 4.05 | n/a | 2.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 10 | 21 | 19.0% | -0.31 | 0.84 | n/a | 10.29 | exp -0.31 ; PF 0.84 < 1 |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 75 | 17 | 41.2% | 0.88 | 4.05 | n/a | 2.00 | — |
| base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 21 | 19.0% | -0.31 | 0.84 | n/a | 10.29 | exp -0.31 ; PF 0.84 < 1 |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RANGE | OK | 65 | 27 | 44.4% | 0.63 | 4.59 | n/a | 2.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | ALL_REGIMES | RISK_ON | OK | 55 | 33 | 39.4% | 0.30 | 1.61 | n/a | 4.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RANGE | OK | 65 | 27 | 44.4% | 0.63 | 4.59 | n/a | 2.00 | — |
| breakout_h20_vol1.2_stop1_rr2 | NO_RISK_OFF | RISK_ON | OK | 55 | 33 | 39.4% | 0.30 | 1.61 | n/a | 4.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RANGE | STRONG | 70 | 23 | 47.8% | 0.70 | 4.26 | n/a | 2.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | ALL_REGIMES | RISK_ON | WEAK | 42 | 22 | 36.4% | 0.22 | 1.30 | n/a | 3.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RANGE | STRONG | 70 | 23 | 47.8% | 0.70 | 4.26 | n/a | 2.00 | — |
| breakout_h20_vol1.5_stop1_rr2 | NO_RISK_OFF | RISK_ON | WEAK | 42 | 22 | 36.4% | 0.22 | 1.30 | n/a | 3.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RANGE | OK | 65 | 26 | 42.3% | 0.79 | 5.58 | n/a | 2.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | WEAK | 35 | 18 | 22.2% | 0.11 | 1.29 | n/a | 3.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | OK | 65 | 26 | 42.3% | 0.79 | 5.58 | n/a | 2.00 | — |
| breakout_h50_vol1.2_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | WEAK | 35 | 18 | 22.2% | 0.11 | 1.29 | n/a | 3.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RANGE | STRONG | 70 | 22 | 45.5% | 0.87 | 5.06 | n/a | 2.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | ALL_REGIMES | RISK_ON | AVOID | 20 | 14 | 21.4% | 0.11 | 0.94 | n/a | 2.00 | PF 0.94 < 1 |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | STRONG | 70 | 22 | 45.5% | 0.87 | 5.06 | n/a | 2.00 | — |
| breakout_h50_vol1.5_stop1.5_rr2.5 | NO_RISK_OFF | RISK_ON | AVOID | 20 | 14 | 21.4% | 0.11 | 0.94 | n/a | 2.00 | PF 0.94 < 1 |
| compression_20_ratio0.65_break20_stop1_rr2 | ALL_REGIMES | RANGE | AVOID | 0 | 1 | 0.0% | -1.00 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| compression_20_ratio0.65_break20_stop1_rr2 | ALL_REGIMES | RISK_ON | AVOID | 8 | 6 | 33.3% | 0.00 | 1.11 | n/a | 3.00 | exp 0.00 |
| compression_20_ratio0.65_break20_stop1_rr2 | NO_RISK_OFF | RANGE | AVOID | 0 | 1 | 0.0% | -1.00 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| compression_20_ratio0.65_break20_stop1_rr2 | NO_RISK_OFF | RISK_ON | AVOID | 8 | 6 | 33.3% | 0.00 | 1.11 | n/a | 3.00 | exp 0.00 |
| compression_20_ratio0.75_break20_stop1_rr2 | ALL_REGIMES | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | ALL_REGIMES | RISK_ON | WEAK | 47 | 12 | 41.7% | 0.33 | 1.67 | n/a | 3.00 | — |
| compression_20_ratio0.75_break20_stop1_rr2 | NO_RISK_OFF | RANGE | AVOID | 0 | 2 | 0.0% | -1.00 | 0.00 | n/a | 2.00 | échantillon < 5 trades |
| compression_20_ratio0.75_break20_stop1_rr2 | NO_RISK_OFF | RISK_ON | WEAK | 47 | 12 | 41.7% | 0.33 | 1.67 | n/a | 3.00 | — |
| compression_40_ratio0.7_break30_stop1.5_rr2.5 | ALL_REGIMES | RANGE | WEAK | 48 | 5 | 80.0% | 2.00 | n/a | n/a | 0.00 | — |
| compression_40_ratio0.7_break30_stop1.5_rr2.5 | NO_RISK_OFF | RANGE | WEAK | 48 | 5 | 80.0% | 2.00 | n/a | n/a | 0.00 | — |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RANGE | OK | 73 | 8 | 62.5% | 0.50 | 2.00 | n/a | 1.00 | — |
| meanrev_rsi30_dist5_stop1_rr1.2 | ALL_REGIMES | RISK_OFF | WEAK | 43 | 6 | 33.3% | 0.23 | 2.40 | n/a | 1.00 | — |
| meanrev_rsi30_dist5_stop1_rr1.2 | NO_RISK_OFF | RANGE | OK | 73 | 8 | 62.5% | 0.50 | 2.00 | n/a | 1.00 | — |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RANGE | OK | 68 | 8 | 50.0% | 0.50 | 2.50 | n/a | 1.00 | — |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | ALL_REGIMES | RISK_OFF | WEAK | 31 | 6 | 16.7% | 0.08 | 1.50 | n/a | 1.00 | — |
| meanrev_rsi30_dist7_stop1.5_rr1.5 | NO_RISK_OFF | RANGE | OK | 68 | 8 | 50.0% | 0.50 | 2.50 | n/a | 1.00 | — |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RANGE | OK | 57 | 20 | 60.0% | 0.42 | 1.40 | n/a | 2.00 | — |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_OFF | WEAK | 47 | 11 | 45.5% | 0.27 | 1.60 | n/a | 2.00 | — |
| meanrev_rsi35_dist4_stop1_rr1.2 | ALL_REGIMES | RISK_ON | AVOID | 0 | 3 | 33.3% | -0.27 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RANGE | OK | 57 | 20 | 60.0% | 0.42 | 1.40 | n/a | 2.00 | — |
| meanrev_rsi35_dist4_stop1_rr1.2 | NO_RISK_OFF | RISK_ON | AVOID | 0 | 3 | 33.3% | -0.27 | 0.00 | n/a | 1.00 | échantillon < 5 trades |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RANGE | OK | 65 | 19 | 42.1% | 0.82 | 3.79 | n/a | 2.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 10 | 21 | 19.0% | -0.31 | 0.84 | n/a | 10.29 | exp -0.31 ; PF 0.84 < 1 |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | OK | 65 | 19 | 42.1% | 0.82 | 3.79 | n/a | 2.00 | — |
| pullback_base_rsi42_58_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 21 | 19.0% | -0.31 | 0.84 | n/a | 10.29 | exp -0.31 ; PF 0.84 < 1 |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | OK | 65 | 17 | 41.2% | 0.85 | 4.55 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 10 | 19 | 15.8% | -0.44 | 0.54 | n/a | 9.29 | exp -0.44 ; PF 0.54 < 1 |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | OK | 65 | 17 | 41.2% | 0.85 | 4.55 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 19 | 15.8% | -0.44 | 0.54 | n/a | 9.29 | exp -0.44 ; PF 0.54 < 1 |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | OK | 55 | 15 | 33.3% | 0.31 | 4.64 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 7 | 13 | 7.7% | -0.70 | 0.21 | n/a | 7.00 | exp -0.70 ; PF 0.21 < 1 |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | OK | 55 | 15 | 33.3% | 0.31 | 4.64 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 7 | 13 | 7.7% | -0.70 | 0.21 | n/a | 7.00 | exp -0.70 ; PF 0.21 < 1 |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | OK | 65 | 16 | 37.5% | 0.80 | 4.63 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 10 | 19 | 15.8% | -0.44 | 0.54 | n/a | 9.29 | exp -0.44 ; PF 0.54 < 1 |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | OK | 65 | 16 | 37.5% | 0.80 | 4.63 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 19 | 15.8% | -0.44 | 0.54 | n/a | 9.29 | exp -0.44 ; PF 0.54 < 1 |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | OK | 55 | 15 | 33.3% | 0.31 | 4.64 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 7 | 13 | 7.7% | -0.70 | 0.21 | n/a | 7.00 | exp -0.70 ; PF 0.21 < 1 |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | OK | 55 | 15 | 33.3% | 0.31 | 4.64 | n/a | 2.00 | — |
| pullback_rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 7 | 13 | 7.7% | -0.70 | 0.21 | n/a | 7.00 | exp -0.70 ; PF 0.21 < 1 |
| rs_120d_top10_hold20 | ALL_REGIMES | RANGE | STRONG | 92 | 12 | 83.3% | 7.32 | 12.62 | 87.89 | 4.21 | — |
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_ON | STRONG | 77 | 16 | 37.5% | 1.67 | 2.08 | 26.78 | 10.17 | — |
| rs_120d_top10_hold20 | NO_RISK_OFF | RANGE | STRONG | 92 | 12 | 83.3% | 7.32 | 12.62 | 87.89 | 4.21 | — |
| rs_120d_top10_hold20 | NO_RISK_OFF | RISK_ON | STRONG | 77 | 16 | 37.5% | 1.67 | 2.08 | 26.78 | 10.17 | — |
| rs_120d_top10_hold20 | RISK_ON_ONLY | RISK_ON | STRONG | 77 | 16 | 37.5% | 1.67 | 2.08 | 26.78 | 10.17 | — |
| rs_90d_top10_hold20 | ALL_REGIMES | RANGE | STRONG | 92 | 13 | 69.2% | 5.52 | 4.17 | 71.80 | 4.21 | — |
| rs_90d_top10_hold20 | ALL_REGIMES | RISK_ON | STRONG | 90 | 16 | 50.0% | 2.52 | 5.72 | 40.24 | 7.02 | — |
| rs_90d_top10_hold20 | NO_RISK_OFF | RANGE | STRONG | 92 | 13 | 69.2% | 5.52 | 4.17 | 71.80 | 4.21 | — |
| rs_90d_top10_hold20 | NO_RISK_OFF | RISK_ON | STRONG | 90 | 16 | 50.0% | 2.52 | 5.72 | 40.24 | 7.02 | — |
| rs_90d_top10_hold20 | RISK_ON_ONLY | RISK_ON | STRONG | 90 | 16 | 50.0% | 2.52 | 5.72 | 40.24 | 7.02 | — |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RANGE | OK | 59 | 14 | 35.7% | 0.40 | 4.97 | n/a | 2.00 | — |
| rsi42_58_chg20_0_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 10 | 15 | 13.3% | -0.53 | 0.44 | n/a | 8.00 | exp -0.53 ; PF 0.44 < 1 |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RANGE | OK | 59 | 14 | 35.7% | 0.40 | 4.97 | n/a | 2.00 | — |
| rsi42_58_chg20_0_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 15 | 13.3% | -0.53 | 0.44 | n/a | 8.00 | exp -0.53 ; PF 0.44 < 1 |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RANGE | AVOID | 29 | 10 | 30.0% | 0.25 | 0.00 | n/a | 1.00 | — |
| rsi42_58_chg20_0_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 3 | 8 | 0.0% | -0.88 | 0.00 | n/a | 3.00 | exp -0.88 |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 29 | 10 | 30.0% | 0.25 | 0.00 | n/a | 1.00 | — |
| rsi42_58_chg20_0_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 3 | 8 | 0.0% | -0.88 | 0.00 | n/a | 3.00 | exp -0.88 |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RANGE | STRONG | 75 | 15 | 40.0% | 0.92 | 4.93 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 10 | 19 | 15.8% | -0.44 | 0.54 | n/a | 9.29 | exp -0.44 ; PF 0.54 < 1 |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 75 | 15 | 40.0% | 0.92 | 4.93 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 19 | 15.8% | -0.44 | 0.54 | n/a | 9.29 | exp -0.44 ; PF 0.54 < 1 |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RANGE | OK | 59 | 14 | 35.7% | 0.40 | 4.97 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 7 | 13 | 7.7% | -0.70 | 0.21 | n/a | 7.00 | exp -0.70 ; PF 0.21 < 1 |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RANGE | OK | 59 | 14 | 35.7% | 0.40 | 4.97 | n/a | 2.00 | — |
| rsi42_58_chg20_3_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 7 | 13 | 7.7% | -0.70 | 0.21 | n/a | 7.00 | exp -0.70 ; PF 0.21 < 1 |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RANGE | AVOID | 29 | 10 | 30.0% | 0.25 | 0.00 | n/a | 1.00 | — |
| rsi42_58_chg20_3_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 3 | 7 | 0.0% | -0.86 | 0.00 | n/a | 3.00 | exp -0.86 |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 29 | 10 | 30.0% | 0.25 | 0.00 | n/a | 1.00 | — |
| rsi42_58_chg20_3_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 3 | 7 | 0.0% | -0.86 | 0.00 | n/a | 3.00 | exp -0.86 |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RANGE | STRONG | 75 | 15 | 40.0% | 0.92 | 4.93 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 10 | 19 | 15.8% | -0.44 | 0.54 | n/a | 9.29 | exp -0.44 ; PF 0.54 < 1 |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 75 | 15 | 40.0% | 0.92 | 4.93 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 10 | 19 | 15.8% | -0.44 | 0.54 | n/a | 9.29 | exp -0.44 ; PF 0.54 < 1 |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RANGE | OK | 59 | 14 | 35.7% | 0.40 | 4.97 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop0.5 | ALL_REGIMES | RISK_ON | AVOID | 7 | 13 | 7.7% | -0.70 | 0.21 | n/a | 7.00 | exp -0.70 ; PF 0.21 < 1 |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RANGE | OK | 59 | 14 | 35.7% | 0.40 | 4.97 | n/a | 2.00 | — |
| rsi42_58_chg20_5_stop0.5 | NO_RISK_OFF | RISK_ON | AVOID | 7 | 13 | 7.7% | -0.70 | 0.21 | n/a | 7.00 | exp -0.70 ; PF 0.21 < 1 |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RANGE | AVOID | 29 | 10 | 30.0% | 0.25 | 0.00 | n/a | 1.00 | — |
| rsi42_58_chg20_5_stop1.0 | ALL_REGIMES | RISK_ON | AVOID | 3 | 7 | 0.0% | -0.86 | 0.00 | n/a | 3.00 | exp -0.86 |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RANGE | AVOID | 29 | 10 | 30.0% | 0.25 | 0.00 | n/a | 1.00 | — |
| rsi42_58_chg20_5_stop1.0 | NO_RISK_OFF | RISK_ON | AVOID | 3 | 7 | 0.0% | -0.86 | 0.00 | n/a | 3.00 | exp -0.86 |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RANGE | STRONG | 75 | 16 | 37.5% | 0.83 | 3.68 | n/a | 2.00 | — |
| rsi45_55_chg20_0_stop0.1 | ALL_REGIMES | RISK_ON | AVOID | 22 | 17 | 23.5% | -0.14 | 1.27 | n/a | 7.29 | exp -0.14 |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RANGE | STRONG | 75 | 16 | 37.5% | 0.83 | 3.68 | n/a | 2.00 | — |
| rsi45_55_chg20_0_stop0.1 | NO_RISK_OFF | RISK_ON | AVOID | 22 | 17 | 23.5% | -0.14 | 1.27 | n/a | 7.29 | exp -0.14 |

## 7-bis. Matrice per-symbol (synthèse globale)

- Cellules per-(symbol × variant × regimeMode × regime) : **17088**
- Actifs couverts : 181
- Variantes couvertes : 27

Répartition par tier :

| Tier | Nombre |
|---|---:|
| STRONG | 1128 |
| OK | 2003 |
| WEAK | 2091 |
| AVOID | 11866 |

## 8. Recommandations moteur

Sur la base de cette matrice :

- **Mode opérationnel cible : NO_RISK_OFF**. La cellule (variant, RANGE) est systématiquement plus rentable que la cellule (variant, RISK_ON) pour les deux variantes RS couvertes. RANGE est l'environnement le plus favorable pour la rotation momentum.
- **Interdire les variantes RS quand le régime macro est RISK_OFF**. Les cellules ALL_REGIMES × RISK_OFF sortent AVOID ou expectancy ≤ 0 pour `rs_90d_top10_hold20` (`rs_120d` est plus résilient).
- **Allouer plus en RANGE qu'en RISK_ON** pour les variantes STRONG en RANGE.
- **Filtrer par actif × variante × régime** : avec la matrice per-symbol, on peut maintenant interdire un actif sur une combinaison précise (ex. NVDA × rs_90d × RISK_ON sort AVOID per-cell) même si la combinaison globale est OK.
- **Ne pas conclure pour les autres setups** (Pullback, Breakout, etc.) tant qu'un breakdown régime n'est pas ajouté à leurs JSON de backtest.
