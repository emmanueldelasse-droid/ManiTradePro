# New Setup Discovery Lab v1 — ManiTradePro

> Généré le 2026-05-18T15:51:09.219Z par `tools/backtests/new-setup-discovery-lab-v1.mjs`.

**⚠ Laboratoire offline.** Aucun ordre, aucun broker, aucun endpoint live. Aucun moteur modifié. Tous les tests sont effectués avec exécution réaliste (`entry = open[i+1]`) et friction obligatoire dès le premier essai.

## 1. Scope

4 familles testées :
- **POST_EARNINGS_DRIFT** : test impossible sans données earnings. Voir section dédiée.
- **ETF_MOMENTUM_ROTATION** : rotation par momentum dans des sous-univers d'ETFs.
- **SECTOR_RELATIVE_STRENGTH** : rotation 2-niveaux (secteur → top actifs du secteur).
- **REGIME_SPECIFIC_SETUPS** : mêmes règles, filtrées par régime macro (RISK_ON / RANGE / RISK_OFF / CASH).

## 2. Méthodologie

- **Entry** : `open[i+1]` (NEXT_OPEN) systématique. Pas de SIGNAL_CLOSE, pas de prix théorique.
- **Exit** : `open[exitIdx]` pour fixed hold.
- **Friction obligatoire** : round-trip 0.30 % (spread+slippage+commission) + 0.02 % par jour de hold (overnight gap penalty). Formule : `frictionR = (0.30 + 0.02 × holdDays) / 5`.
- **Conversion R** : 5 % = 1R (convention du robustness lab).
- **Régime** : NO_RISK_OFF par défaut, calculé sur SPY + QQQ + SMH vs EMA200.
- **Classification** : ROBUST_EDGE (PF ≥ 1.3, ≥ 4/5 années positives, decay < ×1.3), CONDITIONAL_EDGE (PF ≥ 1.1, 3+ années positives), FRAGILE, DEAD.

## 3. Famille 1 — POST_EARNINGS_DRIFT

**Status : DATA_MISSING**

Aucune source de dates d'earnings dans le repo. Les fichiers `data/*.json` ne contiennent que des OHLC quotidiens.

### Données nécessaires

- Calendrier des dates d'earnings par symbole (date de publication, type pre-market/post-market)
- Surprise EPS et CA (réel vs consensus analystes) — pour filtrer 'beat' vs 'miss'
- Idéalement : direction du gap d'ouverture le jour après earnings (pour la pré-condition 'gap positif fort')
- Volume relatif d'avant et après publication (pour la pré-condition 'volume anormal')

### Sources possibles

- API Alpha Vantage / Polygon / FMP — earnings_calendar endpoint (souvent gratuit en historique limité)
- EOD Historical Data : `eodhd.com` propose des fichiers earnings batch
- Yahoo Finance (scraping fragile, conditions d'usage à vérifier)
- SEC EDGAR — filings 10-Q/10-K, dates exactes (mais sans estimates analystes)

### Design proposé une fois les données disponibles

- Filtre 1 : earnings positifs (surprise EPS > 0, ou simplement gap d'ouverture > +3 %)
- Filtre 2 : volume relatif jour d'earnings > 2× moyenne 20j
- Filtre 3 : régime de marché NO_RISK_OFF (déjà disponible dans le repo)
- Entry : open[T+1] où T = jour publication earnings
- Exits testés : 5j / 10j / 20j / 40j fixed hold + ATR trailing
- Friction : identique à `frictionRPerTrade(holdDays)` = round-trip 0.30 % + 0.02 %/jour
- Classification : mêmes critères ROBUST/CONDITIONAL/FRAGILE/DEAD

## 4. Famille 2 — ETF_MOMENTUM_ROTATION

Rotation par momentum dans des sous-univers d'ETFs. Configs : `subset × horizon × topN` (45 combinaisons), rebalance fixe à 10j, lookback 90j, régime NO_RISK_OFF.

| Config | Trades | PF | Expectancy R | Max DD R | Sharpe | Years+ | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| subset=etfs_us_index horizon=20 topN=1 rebalance=10 lookback=90 | 87 | 1.09 | 0.031 | 8.7 | 0.25 | 3/5 | 0.55 | **FRAGILE** |
| subset=etfs_us_index horizon=20 topN=3 rebalance=10 lookback=90 | 234 | 1.08 | 0.025 | 19.5 | 0.21 | 2/5 | 0.47 | **FRAGILE** |
| subset=etfs_us_index horizon=60 topN=1 rebalance=10 lookback=90 | 83 | 1.26 | 0.154 | 24.2 | 0.68 | 2/5 | 0.24 | **FRAGILE** |
| subset=etfs_us_index horizon=60 topN=3 rebalance=10 lookback=90 | 222 | 1.23 | 0.128 | 45.9 | 0.62 | 3/5 | 0.29 | **CONDITIONAL_EDGE** |
| subset=etfs_us_index horizon=120 topN=1 rebalance=10 lookback=90 | 77 | 1.48 | 0.403 | 46.6 | 1.16 | 3/5 | 0.04 | **CONDITIONAL_EDGE** |
| subset=etfs_us_index horizon=120 topN=3 rebalance=10 lookback=90 | 204 | 1.35 | 0.272 | 92.1 | 0.89 | 3/5 | 0.10 | **CONDITIONAL_EDGE** |
| subset=etfs_us_tech horizon=20 topN=1 rebalance=10 lookback=90 | 91 | 1.58 | 0.290 | 13.2 | 1.32 | 4/5 | 0.35 | **ROBUST_EDGE** |
| subset=etfs_us_tech horizon=20 topN=3 rebalance=10 lookback=90 | 267 | 1.27 | 0.159 | 36.0 | 0.58 | 4/5 | 0.57 | **CONDITIONAL_EDGE** |
| subset=etfs_us_tech horizon=20 topN=5 rebalance=10 lookback=90 | 438 | 1.32 | 0.167 | 51.4 | 0.69 | 4/5 | 0.55 | **ROBUST_EDGE** |
| subset=etfs_us_tech horizon=60 topN=1 rebalance=10 lookback=90 | 87 | 1.03 | 0.033 | 62.5 | 0.08 | 3/5 | 0.14 | **FRAGILE** |
| subset=etfs_us_tech horizon=60 topN=3 rebalance=10 lookback=90 | 255 | 1.07 | 0.081 | 126.2 | 0.19 | 3/5 | 0.29 | **FRAGILE** |
| subset=etfs_us_tech horizon=60 topN=5 rebalance=10 lookback=90 | 418 | 1.07 | 0.077 | 171.7 | 0.18 | 2/5 | 0.31 | **FRAGILE** |
| subset=etfs_us_tech horizon=120 topN=1 rebalance=10 lookback=90 | 81 | 0.86 | -0.246 | 91.6 | -0.45 | 3/5 | 0.17 | **DEAD** |
| subset=etfs_us_tech horizon=120 topN=3 rebalance=10 lookback=90 | 237 | 0.69 | -0.608 | 226.0 | -0.99 | 2/5 | 0.34 | **DEAD** |
| subset=etfs_us_tech horizon=120 topN=5 rebalance=10 lookback=90 | 388 | 0.70 | -0.581 | 355.1 | -0.93 | 2/5 | 0.31 | **DEAD** |
| subset=etfs_commodities horizon=20 topN=1 rebalance=10 lookback=90 | 81 | 2.11 | 0.234 | 4.7 | 2.11 | 3/5 | 0.13 | **CONDITIONAL_EDGE** |
| subset=etfs_commodities horizon=60 topN=1 rebalance=10 lookback=90 | 77 | 5.24 | 0.898 | 8.1 | 4.47 | 3/5 | 0.02 | **CONDITIONAL_EDGE** |
| subset=etfs_commodities horizon=120 topN=1 rebalance=10 lookback=90 | 71 | 6.65 | 1.567 | 16.0 | 5.45 | 3/5 | 0.00 | **CONDITIONAL_EDGE** |
| subset=etfs_all horizon=20 topN=1 rebalance=10 lookback=90 | 93 | 1.30 | 0.147 | 12.7 | 0.72 | 3/5 | 0.40 | **CONDITIONAL_EDGE** |
| subset=etfs_all horizon=20 topN=3 rebalance=10 lookback=90 | 273 | 1.13 | 0.074 | 33.4 | 0.28 | 2/5 | 0.54 | **FRAGILE** |
| subset=etfs_all horizon=20 topN=5 rebalance=10 lookback=90 | 449 | 1.23 | 0.119 | 51.5 | 0.50 | 3/5 | 0.50 | **CONDITIONAL_EDGE** |
| subset=etfs_all horizon=60 topN=1 rebalance=10 lookback=90 | 89 | 0.83 | -0.193 | 59.9 | -0.49 | 3/5 | 0.06 | **DEAD** |
| subset=etfs_all horizon=60 topN=3 rebalance=10 lookback=90 | 261 | 0.93 | -0.077 | 124.9 | -0.18 | 2/5 | 0.18 | **DEAD** |
| subset=etfs_all horizon=60 topN=5 rebalance=10 lookback=90 | 429 | 1.01 | 0.007 | 171.0 | 0.02 | 2/5 | 0.23 | **FRAGILE** |
| subset=etfs_all horizon=120 topN=1 rebalance=10 lookback=90 | 83 | 0.83 | -0.288 | 92.2 | -0.55 | 3/5 | 0.05 | **DEAD** |
| subset=etfs_all horizon=120 topN=3 rebalance=10 lookback=90 | 243 | 0.64 | -0.688 | 238.4 | -1.15 | 2/5 | 0.14 | **DEAD** |
| subset=etfs_all horizon=120 topN=5 rebalance=10 lookback=90 | 399 | 0.69 | -0.590 | 371.9 | -0.96 | 2/5 | 0.17 | **DEAD** |

## 5. Famille 3 — SECTOR_RELATIVE_STRENGTH

Rotation 2-niveaux : (1) sélection du top N secteur(s) par momentum agrégé sur les composantes, (2) top N' actifs du secteur retenu. Configs : `horizon × topSectors × topAssetsPerSector` (27 combinaisons), rebalance 10j, lookback 90j, NO_RISK_OFF.

| Config | Trades | PF | Expectancy R | Max DD R | Sharpe | Years+ | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| horizon=40 topSectors=1 topAssetsPerSector=3 rebalance=10 lookback=90 | 273 | 1.60 | 1.193 | 146.2 | 1.09 | 4/5 | 1.08 | **ROBUST_EDGE** |
| horizon=40 topSectors=1 topAssetsPerSector=5 rebalance=10 lookback=90 | 455 | 1.95 | 1.678 | 179.0 | 1.50 | 4/5 | 0.63 | **ROBUST_EDGE** |
| horizon=40 topSectors=1 topAssetsPerSector=10 rebalance=10 lookback=90 | 761 | 1.57 | 1.117 | 345.0 | 1.06 | 3/5 | 0.46 | **CONDITIONAL_EDGE** |
| horizon=40 topSectors=2 topAssetsPerSector=3 rebalance=10 lookback=90 | 546 | 1.26 | 0.472 | 315.0 | 0.51 | 4/5 | 1.35 | **CONDITIONAL_EDGE** |
| horizon=40 topSectors=2 topAssetsPerSector=5 rebalance=10 lookback=90 | 910 | 1.54 | 0.853 | 263.6 | 0.94 | 4/5 | 0.90 | **ROBUST_EDGE** |
| horizon=40 topSectors=2 topAssetsPerSector=10 rebalance=10 lookback=90 | 1567 | 1.39 | 0.627 | 515.2 | 0.75 | 3/5 | 0.64 | **CONDITIONAL_EDGE** |
| horizon=40 topSectors=3 topAssetsPerSector=3 rebalance=10 lookback=90 | 819 | 1.24 | 0.395 | 346.5 | 0.48 | 3/5 | 1.00 | **CONDITIONAL_EDGE** |
| horizon=40 topSectors=3 topAssetsPerSector=5 rebalance=10 lookback=90 | 1365 | 1.42 | 0.627 | 461.3 | 0.78 | 4/5 | 0.71 | **ROBUST_EDGE** |
| horizon=40 topSectors=3 topAssetsPerSector=10 rebalance=10 lookback=90 | 2368 | 1.30 | 0.459 | 861.5 | 0.59 | 3/5 | 0.54 | **CONDITIONAL_EDGE** |
| horizon=60 topSectors=1 topAssetsPerSector=3 rebalance=10 lookback=90 | 267 | 1.79 | 1.817 | 236.9 | 1.31 | 4/5 | 1.28 | **ROBUST_EDGE** |
| horizon=60 topSectors=1 topAssetsPerSector=5 rebalance=10 lookback=90 | 445 | 2.16 | 2.300 | 193.0 | 1.64 | 5/5 | 0.68 | **ROBUST_EDGE** |
| horizon=60 topSectors=1 topAssetsPerSector=10 rebalance=10 lookback=90 | 743 | 1.84 | 1.812 | 340.6 | 1.31 | 4/5 | 0.49 | **ROBUST_EDGE** |
| horizon=60 topSectors=2 topAssetsPerSector=3 rebalance=10 lookback=90 | 534 | 1.37 | 0.792 | 384.5 | 0.70 | 5/5 | 1.34 | **CONDITIONAL_EDGE** |
| horizon=60 topSectors=2 topAssetsPerSector=5 rebalance=10 lookback=90 | 890 | 1.68 | 1.265 | 336.5 | 1.09 | 4/5 | 0.80 | **ROBUST_EDGE** |
| horizon=60 topSectors=2 topAssetsPerSector=10 rebalance=10 lookback=90 | 1529 | 1.49 | 0.951 | 670.7 | 0.86 | 3/5 | 0.59 | **CONDITIONAL_EDGE** |
| horizon=60 topSectors=3 topAssetsPerSector=3 rebalance=10 lookback=90 | 801 | 1.34 | 0.668 | 382.5 | 0.67 | 4/5 | 0.96 | **ROBUST_EDGE** |
| horizon=60 topSectors=3 topAssetsPerSector=5 rebalance=10 lookback=90 | 1335 | 1.54 | 0.956 | 609.5 | 0.93 | 4/5 | 0.60 | **ROBUST_EDGE** |
| horizon=60 topSectors=3 topAssetsPerSector=10 rebalance=10 lookback=90 | 2310 | 1.43 | 0.778 | 1109.6 | 0.77 | 3/5 | 0.47 | **CONDITIONAL_EDGE** |
| horizon=120 topSectors=1 topAssetsPerSector=3 rebalance=10 lookback=90 | 249 | 1.64 | 2.265 | 266.0 | 1.17 | 4/5 | 0.40 | **ROBUST_EDGE** |
| horizon=120 topSectors=1 topAssetsPerSector=5 rebalance=10 lookback=90 | 415 | 2.08 | 3.073 | 416.8 | 1.70 | 4/5 | 0.18 | **ROBUST_EDGE** |
| horizon=120 topSectors=1 topAssetsPerSector=10 rebalance=10 lookback=90 | 689 | 2.00 | 2.856 | 748.1 | 1.63 | 4/5 | 0.12 | **ROBUST_EDGE** |
| horizon=120 topSectors=2 topAssetsPerSector=3 rebalance=10 lookback=90 | 498 | 1.34 | 1.075 | 494.4 | 0.68 | 4/5 | 0.36 | **ROBUST_EDGE** |
| horizon=120 topSectors=2 topAssetsPerSector=5 rebalance=10 lookback=90 | 830 | 1.66 | 1.733 | 754.0 | 1.15 | 4/5 | 0.19 | **ROBUST_EDGE** |
| horizon=120 topSectors=2 topAssetsPerSector=10 rebalance=10 lookback=90 | 1415 | 1.65 | 1.646 | 1402.6 | 1.10 | 3/5 | 0.13 | **CONDITIONAL_EDGE** |
| horizon=120 topSectors=3 topAssetsPerSector=3 rebalance=10 lookback=90 | 747 | 1.21 | 0.632 | 776.1 | 0.45 | 2/5 | 0.35 | **FRAGILE** |
| horizon=120 topSectors=3 topAssetsPerSector=5 rebalance=10 lookback=90 | 1245 | 1.43 | 1.093 | 1188.8 | 0.82 | 3/5 | 0.20 | **CONDITIONAL_EDGE** |
| horizon=120 topSectors=3 topAssetsPerSector=10 rebalance=10 lookback=90 | 2136 | 1.43 | 1.083 | 2180.5 | 0.82 | 3/5 | 0.15 | **CONDITIONAL_EDGE** |

## 6. Famille 4 — REGIME_SPECIFIC_SETUPS

Même rotation momentum (univers mixed) mais filtrée pour ne trader QUE dans un régime donné. Compare RISK_ON, RANGE, RISK_OFF (et CASH = aucun trade).

| Config | Trades | PF | Expectancy R | Max DD R | Sharpe | Years+ | Decay | Classification |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| regimeOnly=RISK_ON horizon=20 topN=10 rebalance=10 lookback=90 minMomentum=5 | 530 | 1.28 | 0.459 | 224.9 | 0.58 | 2/5 | 0.27 | **FRAGILE** |
| regimeOnly=RANGE horizon=20 topN=10 rebalance=10 lookback=90 minMomentum=5 | 290 | 1.70 | 0.775 | 81.9 | 1.25 | 2/4 | 0.37 | **FRAGILE** |
| regimeOnly=RISK_OFF horizon=20 topN=10 rebalance=10 lookback=90 minMomentum=5 | 199 | 0.87 | -0.169 | 111.1 | -0.36 | 1/2 | 0.66 | **DEAD** |
| regimeOnly=CASH horizon=20 topN=10 rebalance=10 lookback=90 minMomentum=5 | 0 | n/a | n/a | n/a | n/a | 0/0 | n/a | **DEAD** |

- **CASH** : Stratégie CASH : 0 trade, 0R par construction. Implicite : preserve capital.

**Lecture** : si RISK_ON et RANGE sont rentables individuellement, et RISK_OFF FRAGILE ou DEAD, alors la stratégie naturelle est **NO_RISK_OFF** (ce que confirme déjà le robustness lab RS Rotation, PR #210).

## 7. Classement final

**Verdict global : NEW_ROBUST_SETUP_FOUND**

- Configurations testées : 59
- ROBUST_EDGE : 17
- CONDITIONAL_EDGE : 20
- FRAGILE : 11
- DEAD : 10
- DATA_MISSING : 1 famille (POST_EARNINGS_DRIFT)

### ROBUST_EDGE (17)

| Famille | Config | Trades | PF | Years+ | Decay |
|---|---|---:|---:|---:|---:|
| SECTOR_RELATIVE_STRENGTH | horizon=60 topSectors=1 topAssetsPerSector=5 rebalance=10 lookback=90 | 445 | 2.16 | 5/5 | 0.68 |
| SECTOR_RELATIVE_STRENGTH | horizon=120 topSectors=1 topAssetsPerSector=5 rebalance=10 lookback=90 | 415 | 2.08 | 4/5 | 0.18 |
| SECTOR_RELATIVE_STRENGTH | horizon=120 topSectors=1 topAssetsPerSector=10 rebalance=10 lookback=90 | 689 | 2.00 | 4/5 | 0.12 |
| SECTOR_RELATIVE_STRENGTH | horizon=40 topSectors=1 topAssetsPerSector=5 rebalance=10 lookback=90 | 455 | 1.95 | 4/5 | 0.63 |
| SECTOR_RELATIVE_STRENGTH | horizon=60 topSectors=1 topAssetsPerSector=10 rebalance=10 lookback=90 | 743 | 1.84 | 4/5 | 0.49 |
| SECTOR_RELATIVE_STRENGTH | horizon=60 topSectors=1 topAssetsPerSector=3 rebalance=10 lookback=90 | 267 | 1.79 | 4/5 | 1.28 |
| SECTOR_RELATIVE_STRENGTH | horizon=60 topSectors=2 topAssetsPerSector=5 rebalance=10 lookback=90 | 890 | 1.68 | 4/5 | 0.80 |
| SECTOR_RELATIVE_STRENGTH | horizon=120 topSectors=2 topAssetsPerSector=5 rebalance=10 lookback=90 | 830 | 1.66 | 4/5 | 0.19 |
| SECTOR_RELATIVE_STRENGTH | horizon=120 topSectors=1 topAssetsPerSector=3 rebalance=10 lookback=90 | 249 | 1.64 | 4/5 | 0.40 |
| SECTOR_RELATIVE_STRENGTH | horizon=40 topSectors=1 topAssetsPerSector=3 rebalance=10 lookback=90 | 273 | 1.60 | 4/5 | 1.08 |
_7 configs supplémentaires non affichées_

### CONDITIONAL_EDGE (20)

| Famille | Config | Trades | PF | Years+ | Decay |
|---|---|---:|---:|---:|---:|
| ETF_MOMENTUM_ROTATION | subset=etfs_commodities horizon=120 topN=1 rebalance=10 lookback=90 | 71 | 6.65 | 3/5 | 0.00 |
| ETF_MOMENTUM_ROTATION | subset=etfs_commodities horizon=60 topN=1 rebalance=10 lookback=90 | 77 | 5.24 | 3/5 | 0.02 |
| ETF_MOMENTUM_ROTATION | subset=etfs_commodities horizon=20 topN=1 rebalance=10 lookback=90 | 81 | 2.11 | 3/5 | 0.13 |
| SECTOR_RELATIVE_STRENGTH | horizon=120 topSectors=2 topAssetsPerSector=10 rebalance=10 lookback=90 | 1415 | 1.65 | 3/5 | 0.13 |
| SECTOR_RELATIVE_STRENGTH | horizon=40 topSectors=1 topAssetsPerSector=10 rebalance=10 lookback=90 | 761 | 1.57 | 3/5 | 0.46 |
| SECTOR_RELATIVE_STRENGTH | horizon=60 topSectors=2 topAssetsPerSector=10 rebalance=10 lookback=90 | 1529 | 1.49 | 3/5 | 0.59 |
| ETF_MOMENTUM_ROTATION | subset=etfs_us_index horizon=120 topN=1 rebalance=10 lookback=90 | 77 | 1.48 | 3/5 | 0.04 |
| SECTOR_RELATIVE_STRENGTH | horizon=120 topSectors=3 topAssetsPerSector=10 rebalance=10 lookback=90 | 2136 | 1.43 | 3/5 | 0.15 |
| SECTOR_RELATIVE_STRENGTH | horizon=60 topSectors=3 topAssetsPerSector=10 rebalance=10 lookback=90 | 2310 | 1.43 | 3/5 | 0.47 |
| SECTOR_RELATIVE_STRENGTH | horizon=120 topSectors=3 topAssetsPerSector=5 rebalance=10 lookback=90 | 1245 | 1.43 | 3/5 | 0.20 |
_10 configs supplémentaires non affichées_

### FRAGILE (11)

| Famille | Config | Trades | PF | Years+ | Decay |
|---|---|---:|---:|---:|---:|
| REGIME_SPECIFIC_SETUPS | regimeOnly=RANGE horizon=20 topN=10 rebalance=10 lookback=90 minMomentum=5 | 290 | 1.70 | 2/4 | 0.37 |
| REGIME_SPECIFIC_SETUPS | regimeOnly=RISK_ON horizon=20 topN=10 rebalance=10 lookback=90 minMomentum=5 | 530 | 1.28 | 2/5 | 0.27 |
| ETF_MOMENTUM_ROTATION | subset=etfs_us_index horizon=60 topN=1 rebalance=10 lookback=90 | 83 | 1.26 | 2/5 | 0.24 |
| SECTOR_RELATIVE_STRENGTH | horizon=120 topSectors=3 topAssetsPerSector=3 rebalance=10 lookback=90 | 747 | 1.21 | 2/5 | 0.35 |
| ETF_MOMENTUM_ROTATION | subset=etfs_all horizon=20 topN=3 rebalance=10 lookback=90 | 273 | 1.13 | 2/5 | 0.54 |
| ETF_MOMENTUM_ROTATION | subset=etfs_us_index horizon=20 topN=1 rebalance=10 lookback=90 | 87 | 1.09 | 3/5 | 0.55 |
| ETF_MOMENTUM_ROTATION | subset=etfs_us_index horizon=20 topN=3 rebalance=10 lookback=90 | 234 | 1.08 | 2/5 | 0.47 |
| ETF_MOMENTUM_ROTATION | subset=etfs_us_tech horizon=60 topN=3 rebalance=10 lookback=90 | 255 | 1.07 | 3/5 | 0.29 |
| ETF_MOMENTUM_ROTATION | subset=etfs_us_tech horizon=60 topN=5 rebalance=10 lookback=90 | 418 | 1.07 | 2/5 | 0.31 |
| ETF_MOMENTUM_ROTATION | subset=etfs_us_tech horizon=60 topN=1 rebalance=10 lookback=90 | 87 | 1.03 | 3/5 | 0.14 |
_1 configs supplémentaires non affichées_

### DEAD (10)

| Famille | Config | Trades | PF | Years+ | Decay |
|---|---|---:|---:|---:|---:|
| ETF_MOMENTUM_ROTATION | subset=etfs_all horizon=60 topN=3 rebalance=10 lookback=90 | 261 | 0.93 | 2/5 | 0.18 |
| REGIME_SPECIFIC_SETUPS | regimeOnly=RISK_OFF horizon=20 topN=10 rebalance=10 lookback=90 minMomentum=5 | 199 | 0.87 | 1/2 | 0.66 |
| ETF_MOMENTUM_ROTATION | subset=etfs_us_tech horizon=120 topN=1 rebalance=10 lookback=90 | 81 | 0.86 | 3/5 | 0.17 |
| ETF_MOMENTUM_ROTATION | subset=etfs_all horizon=60 topN=1 rebalance=10 lookback=90 | 89 | 0.83 | 3/5 | 0.06 |
| ETF_MOMENTUM_ROTATION | subset=etfs_all horizon=120 topN=1 rebalance=10 lookback=90 | 83 | 0.83 | 3/5 | 0.05 |
| ETF_MOMENTUM_ROTATION | subset=etfs_us_tech horizon=120 topN=5 rebalance=10 lookback=90 | 388 | 0.70 | 2/5 | 0.31 |
| ETF_MOMENTUM_ROTATION | subset=etfs_all horizon=120 topN=5 rebalance=10 lookback=90 | 399 | 0.69 | 2/5 | 0.17 |
| ETF_MOMENTUM_ROTATION | subset=etfs_us_tech horizon=120 topN=3 rebalance=10 lookback=90 | 237 | 0.69 | 2/5 | 0.34 |
| ETF_MOMENTUM_ROTATION | subset=etfs_all horizon=120 topN=3 rebalance=10 lookback=90 | 243 | 0.64 | 2/5 | 0.14 |
| REGIME_SPECIFIC_SETUPS | regimeOnly=CASH horizon=20 topN=10 rebalance=10 lookback=90 minMomentum=5 | 0 | n/a | 0/0 | n/a |

## 8. Comparaison vs RS Rotation robuste

Référence (PR #210, best ROBUST RS Rotation) :
- horizon 120j + topN 10 + rebalance 10 + NO_RISK_OFF + mixed + fixed_hold
- PF 1.91, expectancy 2.78R, 4/5 années positives, edge decay ×0.72

**Meilleur ROBUST_EDGE de ce labo** : SECTOR_RELATIVE_STRENGTH avec config `horizon=60 topSectors=1 topAssetsPerSector=5 rebalance=10 lookback=90` → PF 2.16, 5/5 années positives, decay ×0.68.

Position vs référence : MIEUX que RS Rotation 120j.

## 9. Réponses aux 7 questions du brief

1. **Y a-t-il un nouveau setup viable ?** OUI, 17 configs ROBUST_EDGE identifiées.

2. **Est-ce qu'un setup bat RS Rotation robuste (PF 1.91) ?** OUI : SECTOR_RELATIVE_STRENGTH avec PF 2.16.

3. **Quel setup survit aux frictions ?** 37 configs sur 58 testées passent au moins CONDITIONAL_EDGE. Friction round-trip 0.30 % + 0.02 %/jour appliquée systématiquement.

4. **Quel setup survit sur plusieurs années ?** 17 configs avec ≥ 4/5 années positives.

5. **Quel setup meurt dès NEXT_OPEN ?** Tous les tests sont en NEXT_OPEN. Les 10 configs DEAD montrent que certaines combinaisons (notamment horizons courts sur ETFs purs, top 1 hyper-concentré) ne tiennent pas même en exécution réaliste.

6. **Quel setup mérite une PR dédiée ?** Best ROBUST : **SECTOR_RELATIVE_STRENGTH** avec config `horizon=60 topSectors=1 topAssetsPerSector=5 rebalance=10 lookback=90` (PF 2.16, 5/5 années positives). Mérite une PR dédiée si l'on souhaite la formaliser comme setup à étudier en complément de RS Rotation.

7. **Quelles données manquent pour Post-Earnings Drift ?** Cf. section 3 : calendrier earnings, surprise EPS, gap d'ouverture, volume relatif. Sources possibles : Alpha Vantage, Polygon, FMP, EOD Historical Data, SEC EDGAR.

## 10. Verdict final

**NEW_ROBUST_SETUP_FOUND**

Le labo a identifié 17 configurations ROBUST_EDGE viables avec exécution réaliste et friction. La meilleure est SECTOR_RELATIVE_STRENGTH avec PF 2.16.

**Elle dépasse même la référence RS Rotation 120j (PF 1.91).** À envisager pour PR dédiée.

**Post-Earnings Drift** non testable sans données externes. Section 3 documente précisément ce qu'il faut.

---

**Hypothèses** : friction round-trip 0.30 % + 0.02 % par jour, 5 % = 1R, NEXT_OPEN systématique, indicateurs causaux, pas de short-side, pas de position sizing dynamique, momentum lookback 90j fixe pour sector RS.

**Limites** :
- Pas de données earnings → POST_EARNINGS_DRIFT non testable.
- Sweeps multivariés partiels (subset × horizon × topN, pas grid complet de chaque dimension).
- Sector RS limité aux groupes UNIVERSE existants (10 groupes), pas vrai ETF sectoriel SPDR (XLK/XLF/etc.) comme proxy.
- Pas de VIX, pas de breadth filter dans cette PR (focus sur découverte de setups, pas sur le filtre régime).
- Pas de comparaison vs buy-and-hold SPY ou benchmark.
