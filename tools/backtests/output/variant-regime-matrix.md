# Variant × Regime Matrix — ManiTradePro

> Généré le 2026-05-17T22:51:36.396Z par `tools/backtests/variant-regime-matrix-v1.mjs`.

## 1. Synthèse globale

**Limite résiduelle** : la dimension régime n'est exposée que par `results-relative-strength-rotation-regime-v1.json`. Seules **2 variantes RS** ont un breakdown régime complet (`rs_90d_top10_hold20`, `rs_120d_top10_hold20`). Les autres setups (Pullback, Breakout, etc.) ne sont **pas couverts** par cette matrice tant que leurs scripts de backtest n'auront pas été étendus.

**Breakdown per-(symbol × variant × regimeMode × regime) disponible** depuis l'ajout de `bySymbolByRegime[]` à la source RS regime. La matrice per-symbol expose `888` cellules sur `108` actifs × `2` variantes (cf. sections 7 et 7-bis).

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

### SOXL

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
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

### AVGO

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_OFF | AVOID | 13 | 1 | 100.0% | 0.45 | n/a | 0.45 | 0.00 | échantillon < 5 trades |
| rs_120d_top10_hold20 | ALL_REGIMES | RISK_ON | OK | 72 | 5 | 60.0% | 0.64 | 5.82 | 3.23 | 2.30 | — |
| rs_120d_top10_hold20 | NO_RISK_OFF | RISK_ON | OK | 72 | 5 | 60.0% | 0.64 | 5.82 | 3.23 | 2.30 | — |
| rs_120d_top10_hold20 | RISK_ON_ONLY | RISK_ON | OK | 72 | 5 | 60.0% | 0.64 | 5.82 | 3.23 | 2.30 | — |
| rs_90d_top10_hold20 | ALL_REGIMES | RANGE | AVOID | 23 | 1 | 100.0% | 0.98 | n/a | 0.98 | 0.00 | échantillon < 5 trades |
| rs_90d_top10_hold20 | ALL_REGIMES | RISK_ON | AVOID | 6 | 1 | 100.0% | 0.03 | n/a | 0.03 | 0.00 | échantillon < 5 trades |
| rs_90d_top10_hold20 | NO_RISK_OFF | RANGE | AVOID | 23 | 1 | 100.0% | 0.98 | n/a | 0.98 | 0.00 | échantillon < 5 trades |
| rs_90d_top10_hold20 | NO_RISK_OFF | RISK_ON | AVOID | 6 | 1 | 100.0% | 0.03 | n/a | 0.03 | 0.00 | échantillon < 5 trades |
| rs_90d_top10_hold20 | RISK_ON_ONLY | RISK_ON | AVOID | 6 | 1 | 100.0% | 0.03 | n/a | 0.03 | 0.00 | échantillon < 5 trades |

### PLTR

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
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

### APP

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
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

### SMCI

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
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

### BTC

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
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

### SOL

| Variante | Mode | Régime | Tier | Score | Trades | Winrate | Exp | PF | TotalR | DD | Raison |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
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

## 7-bis. Matrice per-symbol (synthèse globale)

- Cellules per-(symbol × variant × regimeMode × regime) : **888**
- Actifs couverts : 108
- Variantes couvertes : 2

Répartition par tier :

| Tier | Nombre |
|---|---:|
| STRONG | 103 |
| OK | 66 |
| WEAK | 77 |
| AVOID | 642 |

## 8. Recommandations moteur

Sur la base de cette matrice :

- **Mode opérationnel cible : NO_RISK_OFF**. La cellule (variant, RANGE) est systématiquement plus rentable que la cellule (variant, RISK_ON) pour les deux variantes RS couvertes. RANGE est l'environnement le plus favorable pour la rotation momentum.
- **Interdire les variantes RS quand le régime macro est RISK_OFF**. Les cellules ALL_REGIMES × RISK_OFF sortent AVOID ou expectancy ≤ 0 pour `rs_90d_top10_hold20` (`rs_120d` est plus résilient).
- **Allouer plus en RANGE qu'en RISK_ON** pour les variantes STRONG en RANGE.
- **Filtrer par actif × variante × régime** : avec la matrice per-symbol, on peut maintenant interdire un actif sur une combinaison précise (ex. NVDA × rs_90d × RISK_ON sort AVOID per-cell) même si la combinaison globale est OK.
- **Ne pas conclure pour les autres setups** (Pullback, Breakout, etc.) tant qu'un breakdown régime n'est pas ajouté à leurs JSON de backtest.
