# SECTOR_RS Destruction Tests v1 — ManiTradePro

> Généré le 2026-05-18T16:13:01.932Z par `tools/backtests/sector-rs-destruction-tests-v1.mjs`.

**⚠ Tests offline.** Aucun ordre, aucun broker, aucun endpoint live. Aucun moteur modifié. Objectif : essayer de CASSER SECTOR_RELATIVE_STRENGTH v1, pas l'améliorer.

## 1. Scope

Stress-testing du setup `SECTOR_RELATIVE_STRENGTH v1` (PR #212, classification `VALIDATED_RESEARCH_CORE`).

6 tests de destruction :
1. Friction stress (×1 baseline → ×3 + slippage variations)
2. Bear market isolation (2022 seule, pires drawdowns rolling)
3. Sector collapse stress (retirer chaque secteur)
4. Survivorship / concentration tickers
5. Walk-forward conditionnel strict (3 splits sans réoptimisation)
6. Correlation vs RS Rotation simple

**Paramètres gelés (config v1)** :
```text
{
  "horizon": 60,
  "topSectors": 1,
  "topAssetsPerSector": 5,
  "rebalance": 10,
  "lookback": 90,
  "regime": "NO_RISK_OFF"
}
```

## 2. Sources analysées

- docs/setups/SECTOR_RELATIVE_STRENGTH.md
- tools/backtests/configs/sector-relative-strength-v1.json
- tools/backtests/output/sector-relative-strength-reference-v1.json
- tools/backtests/output/new-setup-discovery-lab-v1.json
- tools/backtests/output/rs-rotation-robustness-lab-v1.json
- tools/backtests/universe-v2.mjs
- data/*.json

## 3. Baseline rappel

| Métrique | Valeur |
|---|---:|
| Trades | 445 |
| Winrate | 54.61 % |
| Expectancy | 2.300 R |
| Profit factor | **2.16** |
| Max DD | 193.0 R |
| Total R | 1023.6 |
| Années positives | 5/5 |

## 4. Friction stress

| Configuration | Trades | PF | Expectancy R | Max DD R | Années + |
|---|---:|---:|---:|---:|---:|
| baseline (x1) | 445 | 2.16 | 2.300 | 193.0 | 5/5 |
| friction x2 | 445 | 1.94 | 2.000 | 206.9 | 4/5 |
| friction x3 | 445 | 1.75 | 1.700 | 236.9 | 4/5 |
| slippage 0.10% one-way (round 0.40%) | 445 | 2.14 | 2.280 | 193.7 | 5/5 |
| slippage 0.20% one-way (round 0.60%) | 445 | 2.11 | 2.240 | 195.0 | 5/5 |
| extreme (round 1.20% + 0.10%/d) | 445 | 1.45 | 1.160 | 381.0 | 4/5 |

**Point de rupture** : 
le setup tient à friction extrême (round-trip 1.20 % + 0.10 %/jour).

## 5. Bear market isolation

PF annuel :

| Année | Trades | Wins | Losses | Winrate | PF | Expectancy R | Max DD R |
|---|---:|---:|---:|---:|---:|---:|---:|
| 2021 | — | — | — | — | 1.87 | — | — |
| 2022 | — | — | — | — | 1.08 | — | — |
| 2023 | — | — | — | — | 1.86 | — | — |
| 2024 | — | — | — | — | 2.90 | — | — |
| 2025 | — | — | — | — | 2.09 | — | — |

**Focus 2022** (year of bear) :

- Trades : 30
- PF : **1.08**
- Expectancy : 0.101 R
- Max DD : 24.4 R

**Top 5 pires fenêtres glissantes (90 trades)** :

| Période | Trades | PF | Expectancy R | Max DD R |
|---|---:|---:|---:|---:|
| 2021-05-14..2022-01-14 | 90 | 1.68 | 1.730 | 193.0 |
| 2021-08-10..2023-01-13 | 90 | 0.94 | -0.165 | 193.0 |
| 2021-11-03..2023-04-12 | 90 | 0.67 | -0.849 | 157.1 |
| 2024-01-12..2024-09-17 | 90 | 1.69 | 1.515 | 110.0 |
| 2024-07-08..2025-03-26 | 90 | 3.72 | 5.421 | 106.4 |

**Par régime de marché** :

| Régime | Trades | PF | Expectancy R |
|---|---:|---:|---:|
| RISK_ON | 245 | 1.94 | 2.346 |
| RANGE | 200 | 2.63 | 2.245 |

## 6. Sector collapse stress

### 6a. Retirer un secteur à la fois

| Secteur retiré | Trades | PF | Expectancy R | Max DD R | Total R |
|---|---:|---:|---:|---:|---:|
| BIG_TECH | 445 | 2.15 | 2.284 | 196.0 | 1016.4 |
| SEMIS | 445 | 2.33 | 2.532 | 177.9 | 1126.8 |
| CYBER_CLOUD | 445 | 2.17 | 2.353 | 179.5 | 1047.2 |
| SOFTWARE | 445 | 2.16 | 2.300 | 193.0 | 1023.6 |
| AI_MOMENTUM | 445 | 0.74 | -0.477 | 434.9 | -212.4 |
| CONSUMER_GROWTH | 445 | 2.30 | 2.491 | 193.0 | 1108.3 |
| QUALITY_DEFENSIVE | 445 | 2.23 | 2.489 | 235.5 | 1107.5 |
| INDUSTRIALS | 445 | 2.19 | 2.360 | 193.0 | 1050.1 |
| FINANCIALS | 445 | 2.16 | 2.300 | 193.0 | 1023.6 |
| EUROPE | 445 | 2.16 | 2.300 | 193.0 | 1023.6 |

### 6b. Univers conservateur (sans tech/IA, sans semis, sans crypto-equity)

Garder uniquement QUALITY_DEFENSIVE, INDUSTRIALS, FINANCIALS, CONSUMER_GROWTH, EUROPE :

| Métrique | Valeur |
|---|---:|
| Trades | 445 |
| PF | **0.97** |
| Expectancy | -0.031 R |
| Max DD | 127.9 R |

## 7. Survivorship / concentration tickers

- Tickers uniques tradés : 65
- Top ticker : **APLD** avec 362.7 R cumulés
- **Top 5 tickers** : 103.3 % du PnL total
- **Top 10 tickers** : 116.8 % du PnL total

Top 5 :

| Symbole | Trades | Total R |
|---|---:|---:|
| APLD | 38 | 362.71 |
| APP | 40 | 272.80 |
| PLTR | 45 | 225.14 |
| NBIS | 19 | 110.54 |
| UPST | 32 | 86.54 |

**Sans les top 5 tickers** :

| Métrique | Valeur |
|---|---:|
| Trades | 271 |
| PF | 0.94 |
| Expectancy | -0.126 R |

## 8. Walk-forward strict (paramètres gelés, pas de réoptim)

| Split | Trades | PF | Expectancy R | Max DD R | Passed |
|---|---:|---:|---:|---:|---|
| S1: train 2021-2022 → test 2023 | 125 | 1.86 | 1.564 | 63.0 | ✓ |
| S2: train 2021-2023 → test 2024 | 125 | 2.90 | 3.672 | 110.0 | ✓ |
| S3: train 2021-2024 → test 2025 | 80 | 2.09 | 2.325 | 77.5 | ✓ |

**3/3 splits passent** (PF ≥ 1.0 et expectancy > 0).

## 9. Correlation vs RS Rotation

| Métrique | SECTOR_RS | RS Rotation simple |
|---|---:|---:|
| Trades total | 445 | 829 |
| Symboles uniques | 65 | 95 |

- **Symbol overlap** : 54 symboles communs (83.1 % du plus petit set)
- **Trade overlap exact** : 257 entries identiques (symbol+date), soit 57.8 %
- **Mois communs** : 43
- **Corrélation des PnL mensuels** : **0.252**

→ Corrélation faible. Les setups sont substantiellement différents — complémentarité possible.

**Top 10 mois de divergence (où les deux setups donnent des résultats opposés ou très différents)** :

| Mois | SECTOR_RS R | RS Rotation R | Diff |
|---|---:|---:|---:|
| 2023-10 | 39.63 | 408.07 | -368.44 |
| 2023-11 | 6.63 | 246.57 | -239.94 |
| 2021-05 | 2.16 | 239.64 | -237.47 |
| 2021-06 | 80.77 | 283.78 | -203.01 |
| 2021-12 | -52.95 | -235.02 | +182.08 |
| 2023-08 | -30.93 | 138.92 | -169.85 |
| 2023-02 | -4.82 | 163.36 | -168.19 |
| 2024-01 | -22.25 | 144.87 | -167.12 |
| 2024-09 | 244.41 | 88.21 | +156.19 |
| 2025-07 | 138.18 | -14.65 | +152.83 |

## 10. Failure modes

Checks de robustesse :

| Check | Critère | Résultat |
|---|---|---|
| PF friction ×2 | ≥ 1.3 | PF = 1.94 → ✓ PASS |
| PF friction ×3 | ≥ 1.1 | PF = 1.75 → ✓ PASS |
| Bear 2022 | PF ≥ 0.95 | PF = 1.08 → ✓ PASS |
| Walk-forward | ≥ 2/3 splits | 3/3 → ✓ PASS |
| Concentration top 5 | < 60 % | 103.3 % → ✗ FAIL |
| Corrélation vs RS Rotation | < 0.85 | 0.252 → ✓ PASS |

**Checks échoués** : no_excessive_concentration

## 11. Verdict

**CONDITIONAL_SURVIVAL**

Le setup résiste à la majorité des tests mais échoue sur 1 check. À documenter et surveiller.

Statut suggéré : **VALIDATED_RESEARCH_CORE avec caveat**. Le check échoué doit être adressé avant tout passage live.

## 12. Next steps

- **Audit anti-look-ahead spécifique** sur le calcul du momentum sectoriel agrégé (cohérence PR #207/#208).
- **Sizing dynamique** : ATR-based ou volatility targeting plutôt que taille fixe = 1R.
- **Live shadow** : 3-6 mois de paper trading parallèle avant tout passage réel.
- **Mise à jour SETUPS_REGISTRY.md** : ajouter Setup 7 SECTOR_RELATIVE_STRENGTH avec statut officiel.
- **Si concentration top 5 élevée** : envisager position sizing inverse (taille réduite sur tickers concentrés).
- **Si corrélation élevée vs RS Rotation** : pas d'allocation multi-setup parallèle (redondance).
- **POST_EARNINGS_DRIFT** : sourcer les données pour test futur (cf. new-setup-discovery-lab section 3).

---

**Hypothèses** : friction modélisée comme `(round + daily × hold) / 5`, paramètres baseline gelés v1, indicateurs causaux, NEXT_OPEN systématique, pas de short side, pas de sizing dynamique.

**Limites** :
- Sector collapse simulé par retrait de secteurs entiers, pas par injection de drawdowns synthétiques.
- Walk-forward sans réoptim (paramètres gelés) — donc test de la généralisation des params v1, pas du potentiel max d'adaptation.
- Correlation mesurée sur PnL mensuel agrégé, pas trade-by-trade (les mois faibles en trades peuvent biaiser).
- Pas de Monte Carlo / bootstrap sur les trades pour mesurer la variance d'estimation du PF.
- Pas de stress sur la qualité des données (manquantes, erronées).