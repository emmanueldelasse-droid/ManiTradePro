# Variant × Regime Matrix — ManiTradePro

> Généré le 2026-05-17T22:40:43.014Z par `tools/backtests/variant-regime-matrix-v1.mjs`.

## 1. Synthèse globale

**Limite importante** : la dimension régime n'est exposée que par `results-relative-strength-rotation-regime-v1.json`. Seules **2 variantes RS** ont un breakdown régime complet (`rs_90d_top10_hold20`, `rs_120d_top10_hold20`). Les autres setups (Pullback, Breakout, etc.) ne sont **pas couverts** par cette matrice.

**Limite supplémentaire** : il n'existe **aucune donnée per-(symbol × variant × regime individuel)** dans les JSON disponibles. La matrice globale (`byRegime`) est aggregate (tous symboles confondus). Pour les analyses par actif, la matrice expose uniquement la comparaison (symbol × variant × regimeMode = ALL_REGIMES vs NO_RISK_OFF), ce qui mesure la dépendance RISK_OFF d'un actif sans dire ce qu'il fait précisément en RISK_ON / RANGE / RISK_OFF séparément. Cette dimension est marquée comme non disponible dans le rapport.

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

**Rappel** : la dimension (symbol × variant × regime individuel) n'est pas disponible. Ce qui suit est la comparaison ALL_REGIMES vs NO_RISK_OFF par actif et par variante RS, pour quantifier l'impact RISK_OFF.

### NVDA

| Variante | Mode | Trades | Winrate | Exp | PF | TotalR | DD |
|---|---|---:|---:|---:|---:|---:|---:|
| rs_90d_top10_hold20 | ALL_REGIMES | 28 | 57.1% | -1.00 | 5.76 | -28.16 | 35.20 |
| rs_90d_top10_hold20 | NO_RISK_OFF | 28 | 57.1% | -1.00 | 5.76 | -28.16 | 35.20 |
| rs_120d_top10_hold20 | ALL_REGIMES | 26 | 61.5% | -1.13 | 6.34 | -29.35 | 35.20 |
| rs_120d_top10_hold20 | NO_RISK_OFF | 26 | 61.5% | -1.13 | 6.34 | -29.35 | 35.20 |
> rs_90d_top10_hold20 : RISK_OFF contribue +0.00 totalR (filtrer le retire)
> rs_120d_top10_hold20 : RISK_OFF contribue +0.00 totalR (filtrer le retire)

### SOXL

| Variante | Mode | Trades | Winrate | Exp | PF | TotalR | DD |
|---|---|---:|---:|---:|---:|---:|---:|
| rs_90d_top10_hold20 | ALL_REGIMES | 22 | 54.5% | 0.16 | 2.32 | 3.38 | 17.61 |
| rs_90d_top10_hold20 | NO_RISK_OFF | 22 | 54.5% | 0.16 | 2.32 | 3.38 | 17.61 |
| rs_120d_top10_hold20 | ALL_REGIMES | 20 | 50.0% | -0.11 | 1.61 | -2.23 | 14.69 |
| rs_120d_top10_hold20 | NO_RISK_OFF | 20 | 50.0% | -0.11 | 1.61 | -2.23 | 14.69 |
> rs_90d_top10_hold20 : RISK_OFF contribue +0.00 totalR (filtrer le retire)
> rs_120d_top10_hold20 : RISK_OFF contribue +0.00 totalR (filtrer le retire)

### AVGO

| Variante | Mode | Trades | Winrate | Exp | PF | TotalR | DD |
|---|---|---:|---:|---:|---:|---:|---:|
| rs_90d_top10_hold20 | ALL_REGIMES | 2 | 100.0% | 0.51 | n/a | 1.01 | 0.00 |
| rs_90d_top10_hold20 | NO_RISK_OFF | 2 | 100.0% | 0.51 | n/a | 1.01 | 0.00 |
| rs_120d_top10_hold20 | ALL_REGIMES | 6 | 66.7% | 0.61 | 4.92 | 3.68 | 2.30 |
| rs_120d_top10_hold20 | NO_RISK_OFF | 5 | 60.0% | 0.64 | 5.82 | 3.23 | 2.30 |
> rs_90d_top10_hold20 : RISK_OFF contribue +0.00 totalR (filtrer le retire)
> rs_120d_top10_hold20 : RISK_OFF contribue +0.45 totalR (filtrer le retire)

### PLTR

| Variante | Mode | Trades | Winrate | Exp | PF | TotalR | DD |
|---|---|---:|---:|---:|---:|---:|---:|
| rs_120d_top10_hold20 | ALL_REGIMES | 37 | 78.4% | 2.53 | 8.13 | 93.89 | 6.62 |
| rs_120d_top10_hold20 | NO_RISK_OFF | 34 | 79.4% | 2.40 | 7.49 | 81.58 | 6.62 |
| rs_90d_top10_hold20 | ALL_REGIMES | 34 | 76.5% | 2.53 | 7.74 | 85.86 | 6.62 |
| rs_90d_top10_hold20 | NO_RISK_OFF | 31 | 77.4% | 2.37 | 7.30 | 73.55 | 6.62 |
> rs_120d_top10_hold20 : RISK_OFF contribue +12.31 totalR (filtrer le retire)
> rs_90d_top10_hold20 : RISK_OFF contribue +12.31 totalR (filtrer le retire)

### APP

| Variante | Mode | Trades | Winrate | Exp | PF | TotalR | DD |
|---|---|---:|---:|---:|---:|---:|---:|
| rs_90d_top10_hold20 | ALL_REGIMES | 42 | 61.9% | 2.25 | 5.74 | 94.49 | 9.96 |
| rs_90d_top10_hold20 | NO_RISK_OFF | 41 | 63.4% | 2.35 | 5.89 | 96.23 | 8.22 |
| rs_120d_top10_hold20 | ALL_REGIMES | 46 | 67.4% | 2.41 | 7.31 | 110.85 | 15.39 |
| rs_120d_top10_hold20 | NO_RISK_OFF | 43 | 67.4% | 2.29 | 7.57 | 98.39 | 13.65 |
> rs_90d_top10_hold20 : NO_RISK_OFF apporte +1.74 totalR (RISK_OFF dégrade)
> rs_120d_top10_hold20 : RISK_OFF contribue +12.46 totalR (filtrer le retire)

### SMCI

| Variante | Mode | Trades | Winrate | Exp | PF | TotalR | DD |
|---|---|---:|---:|---:|---:|---:|---:|
| rs_120d_top10_hold20 | ALL_REGIMES | 47 | 57.4% | 1.15 | 2.27 | 54.24 | 17.91 |
| rs_120d_top10_hold20 | NO_RISK_OFF | 35 | 57.1% | 0.96 | 2.31 | 33.74 | 17.91 |
| rs_90d_top10_hold20 | ALL_REGIMES | 35 | 60.0% | 1.29 | 2.21 | 45.13 | 10.53 |
| rs_90d_top10_hold20 | NO_RISK_OFF | 26 | 61.5% | 1.44 | 2.50 | 37.58 | 10.53 |
> rs_120d_top10_hold20 : RISK_OFF contribue +20.50 totalR (filtrer le retire)
> rs_90d_top10_hold20 : RISK_OFF contribue +7.55 totalR (filtrer le retire)

### BTC

| Variante | Mode | Trades | Winrate | Exp | PF | TotalR | DD |
|---|---|---:|---:|---:|---:|---:|---:|
| rs_90d_top10_hold20 | ALL_REGIMES | 10 | 70.0% | 1.21 | 2.90 | 12.08 | 2.69 |
| rs_90d_top10_hold20 | NO_RISK_OFF | 10 | 70.0% | 1.21 | 2.90 | 12.08 | 2.69 |
| rs_120d_top10_hold20 | ALL_REGIMES | 7 | 57.1% | 0.74 | 1.82 | 5.20 | 1.63 |
| rs_120d_top10_hold20 | NO_RISK_OFF | 7 | 57.1% | 0.74 | 1.82 | 5.20 | 1.63 |
> rs_90d_top10_hold20 : RISK_OFF contribue +0.00 totalR (filtrer le retire)
> rs_120d_top10_hold20 : RISK_OFF contribue +0.00 totalR (filtrer le retire)

### SOL

| Variante | Mode | Trades | Winrate | Exp | PF | TotalR | DD |
|---|---|---:|---:|---:|---:|---:|---:|
| rs_120d_top10_hold20 | ALL_REGIMES | 28 | 57.1% | 4.09 | 6.95 | 114.67 | 10.17 |
| rs_120d_top10_hold20 | NO_RISK_OFF | 28 | 57.1% | 4.09 | 6.95 | 114.67 | 10.17 |
| rs_90d_top10_hold20 | ALL_REGIMES | 29 | 58.6% | 3.87 | 9.31 | 112.04 | 7.02 |
| rs_90d_top10_hold20 | NO_RISK_OFF | 29 | 58.6% | 3.87 | 9.31 | 112.04 | 7.02 |
> rs_120d_top10_hold20 : RISK_OFF contribue +0.00 totalR (filtrer le retire)
> rs_90d_top10_hold20 : RISK_OFF contribue +0.00 totalR (filtrer le retire)

## 8. Recommandations moteur

Sur la base de cette matrice (et compte tenu des limites de couverture) :

- **Mode opérationnel cible : NO_RISK_OFF**. La cellule (variant, RANGE) est systématiquement plus rentable que la cellule (variant, RISK_ON) pour les deux variantes RS couvertes. RANGE est l'environnement le plus favorable pour la rotation momentum.
- **Interdire les variantes RS quand le régime macro est RISK_OFF**. Les cellules ALL_REGIMES × RISK_OFF sortent AVOID ou expectancy ≤ 0 pour `rs_90d_top10_hold20` (`rs_120d` est plus résilient mais marginalement).
- **Allouer plus en RANGE qu'en RISK_ON** pour les variantes STRONG en RANGE — c'est là que l'expectancy est ~2× supérieure.
- **Ne pas conclure pour les autres setups** (Pullback, Breakout, etc.) tant qu'un breakdown régime n'est pas ajouté à leurs JSON de backtest. La matrice setup-variant et la matrice asset-quality restent les sources de vérité pour eux, sans dimension régime.
- **Priorité quant à ajouter** : un breakdown `bySymbolByRegime` dans les scripts de backtest. Sans ça, on ne pourra jamais répondre rigoureusement à la question "NVDA × Pullback en RANGE ?".
