# SETUPS_REGISTRY — Registre officiel des setups quantitatifs

## Rôle du fichier

Ce fichier est la source officielle des setups validés, testés, abandonnés ou en recherche.

Il sert à :
- éviter de perdre les variantes robustes,
- éviter les régressions silencieuses,
- centraliser les métriques réelles,
- documenter les régimes compatibles,
- documenter les actifs compatibles,
- séparer la recherche quantitative de la mémoire session.

---

# Classification des setups

| Statut | Signification |
|---|---|
| VALIDATED | Setup robuste confirmé sur plusieurs tests |
| TESTING | Setup en recherche |
| DEPRECATED | Ancien setup remplacé |
| FAILED | Setup abandonné |

---

# Setup 1 — Pullback Momentum

## Statut
VALIDATED

## Objectif
Acheter des replis propres dans des tendances fortes.

## ADN du setup
- continuation momentum,
- trend following,
- repli contrôlé,
- tendance propre.

## Variantes principales

### Variante principale

```text
pullback_rsi42_58_chg20_5_stop0.1
```

### Variante secondaire

```text
pullback_rsi42_58_chg20_3_stop0.1
```

## Actifs compatibles observés

### Très compatibles
- NVDA
- AVGO
- PLTR
- SMH
- SOXX
- XLK
- APP
- ASML
- KLAC

### Compatibilité moyenne / à surveiller
- TSLA
- AMD
- SOXL

## Régimes compatibles
- RANGE
- RISK_ON

## Régime à éviter
- RISK_OFF

## Forces
- setup relativement stable,
- bon pour leaders IA,
- bon pour ETF tech/semi,
- robuste sur marchés directionnels.

## Faiblesses
- entrées parfois tardives,
- souffre fortement en bear market,
- peut dégrader le portefeuille si utilisé en RISK_OFF.

---

# Setup 2 — Breakout Expansion

## Statut
VALIDATED

## Objectif
Capturer les accélérations violentes après cassure.

## ADN du setup
- cassure,
- volume,
- expansion momentum,
- impulsion forte.

## Variantes principales

### Variante principale

```text
breakout_h20_vol13
```

### Variante secondaire

```text
breakout_h10_vol12
```

## Actifs compatibles observés

### Très compatibles
- NVDA
- AVGO
- SMH
- SOL
- BTC
- COIN
- MSTR
- ASML
- KLAC
- XLK

### Compatibilité moyenne / à surveiller
- TSLA
- AMD
- SOXL
- JPM

## Régimes compatibles
- RANGE
- RISK_ON

## Régime à éviter
- RISK_OFF

## Forces
- très rentable sur phases explosives,
- excellent sur IA + crypto momentum,
- bon pour actifs avec forte expansion.

## Faiblesses
- drawdowns élevés,
- mauvais sur cassures tardives,
- forte dépendance au timing,
- nécessite un filtre régime.

---

# Setup 3 — Relative Strength Rotation

## Statut
VALIDATED

## Objectif
Sélectionner les leaders structurels du marché.

## Description
Le moteur classe les actifs selon leur force relative et conserve les meilleurs leaders pendant une durée fixe.

C'est actuellement le setup le plus important et le plus proche d'un vrai moteur quant.

---

## Variante principale

```text
rs_90d_top10_hold20
```

## Variante secondaire

```text
rs_120d_top10_hold20
```

---

## Résultat principal validé

### NO_RISK_OFF + rs_90d_top10_hold20

| Métrique | Valeur |
|---|---:|
| Trades | 929 |
| Wins | 520 |
| Losses | 409 |
| Winrate | 55.97% |
| Expectancy | 0.89 |
| Profit Factor | 1.69 |
| TotalR | 831.02 |
| Max Drawdown | 212.54 |
| Longest Loss Streak | 19 |

---

## Comparaison importante

### ALL_REGIMES + rs_90d_top10_hold20

| Métrique | Valeur |
|---|---:|
| Trades | 1091 |
| Wins | 593 |
| Losses | 498 |
| Winrate | 54.35% |
| Expectancy | 0.75 |
| Profit Factor | 1.58 |
| TotalR | 822.64 |
| Max Drawdown | 300.62 |
| Longest Loss Streak | 19 |

Conclusion : `NO_RISK_OFF` améliore la qualité globale :
- moins de trades,
- meilleure expectancy,
- meilleur profit factor,
- drawdown fortement réduit,
- totalR quasiment conservé.

---

## Résultats par régime

### RISK_ON

| Métrique | Valeur |
|---|---:|
| Trades | 529 |
| Winrate | 49.91% |
| Expectancy | 0.66 |
| Profit Factor | 1.43 |
| TotalR | 348.40 |
| Max Drawdown | 205.48 |

### RANGE

| Métrique | Valeur |
|---|---:|
| Trades | 400 |
| Winrate | 64.00% |
| Expectancy | 1.21 |
| Profit Factor | 2.23 |
| TotalR | 482.62 |
| Max Drawdown | 65.42 |

### RISK_OFF

| Métrique | Valeur |
|---|---:|
| Trades | 162 |
| Winrate | 45.06% |
| Expectancy | -0.05 |
| Profit Factor | 0.96 |
| TotalR | -8.38 |
| Max Drawdown | 98.15 |

---

## Découverte majeure

L'hypothèse initiale était :

```text
RISK_ON = meilleur environnement
```

Les tests montrent plutôt :

```text
RANGE est souvent meilleur que RISK_ON pour la rotation momentum.
```

Interprétation :
- moins de chaos global,
- leadership plus lisible,
- leaders persistants,
- stock-picking plus efficace,
- moins de rotations violentes.

---

## Actifs les plus compatibles observés

### Elite
- PLTR
- APP
- AVAX
- SOL
- NVDA
- SMCI
- MSTR
- NBIS
- APLD
- AEHR

### ETF / actifs structurels intéressants
- SMH
- SOXX
- XLK
- QQQ
- AVGO
- TSM

## Régimes compatibles
- RANGE
- RISK_ON

## Régime à éviter
- RISK_OFF

## Forces
- setup le plus robuste actuellement,
- excellent pour détecter les leaders IA,
- excellent pour rotation sectorielle,
- compatible avec un univers large,
- adapté au style swing/multi-jours.

## Faiblesses
- dépendance forte au régime,
- souffre dans bear markets,
- nécessite une réduction forte en RISK_OFF.

---

# Setup 4 — Mean Reversion V1

## Statut
FAILED

## Fichier de test

```text
tools/backtests/backtest-meanrev-v1.mjs
```

## Objectif initial
Tester un setup de retour à la moyenne pour compléter les setups momentum.

## Conclusion
Le setup n'est pas compatible avec l'ADN actuel du moteur.

## Problèmes observés
- trop peu de trades,
- expectancy faible,
- faible robustesse,
- mauvais comportement sur leaders momentum,
- pas assez complémentaire pour justifier l'intégration.

## Exception légère
- IWM montrait des signes positifs mais échantillon insuffisant.

## Décision
Ne pas intégrer pour l'instant.
Ne pas supprimer l'idée définitivement, mais ne pas prioriser.

---

# Règle de validation future

Un setup ne peut être marqué `VALIDATED` que si :
- il a été testé sur plusieurs années,
- il a un nombre de trades suffisant,
- son comportement par régime est connu,
- ses actifs compatibles sont identifiés,
- ses faiblesses sont documentées,
- il améliore le moteur global ou apporte une complémentarité claire.

---

# Conclusion stratégique globale

ManiTradePro évolue vers :

```text
un moteur de sélection de leaders momentum structurels
avec allocation adaptative selon le régime marché.
```
