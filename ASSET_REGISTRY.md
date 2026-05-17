# ASSET_REGISTRY — Classification provisoire des actifs

## Rôle du fichier

Ce fichier centralise la qualité et la compatibilité observée des actifs.

Le but n'est PAS d'avoir le plus d'actifs possible.

Le but est :

```text
trouver les actifs compatibles avec les setups validés.
```

---

# Statut du fichier

Cette classification est provisoire.

Elle provient des backtests récents :
- Pullback Momentum,
- Breakout Expansion,
- Relative Strength Rotation,
- filtre NO_RISK_OFF.

Elle doit être automatisée plus tard par :

```text
tools/backtests/asset-quality-engine-v1.mjs
```

---

# Catégories

| Niveau | Signification |
|---|---|
| ELITE | actifs majeurs du moteur |
| CORE | actifs fiables et réguliers |
| TACTICAL | actifs opportunistes / plus risqués |
| WATCHLIST | surveillance |
| BLACKLIST | actifs incompatibles ou trop destructeurs |

---

# ELITE provisoire

## Actions
- NVDA
- PLTR
- APP
- SMCI
- AVGO
- MSTR
- NBIS
- APLD
- AEHR

## Crypto
- BTC
- SOL
- AVAX

## ETF
- SMH
- SOXX
- XLK
- QQQ

---

# CORE provisoire

- ASML
- KLAC
- TSM
- COIN
- META
- AMZN
- MSFT

---

# TACTICAL provisoire

Ces actifs peuvent être intéressants mais doivent garder une allocation plus faible ou être filtrés plus sévèrement.

- TSLA
- AMD
- SOXL
- JPM

---

# WATCHLIST

À alimenter après `asset-quality-engine-v1`.

---

# BLACKLIST

À alimenter automatiquement après `asset-quality-engine-v1`.

Règle : un actif doit être blacklisté s'il :
- dégrade durablement le profit factor,
- augmente trop le drawdown,
- n'est compatible avec aucun setup validé,
- produit trop de faux signaux,
- fonctionne seulement sur un échantillon trop faible.

---

# Critères de scoring futurs

Chaque actif devra être évalué selon :
- expectancy,
- profit factor,
- winrate,
- nombre de trades,
- max drawdown,
- longest loss streak,
- stabilité multi-années,
- compatibilité setup,
- comportement en RANGE,
- comportement en RISK_ON,
- comportement en RISK_OFF.

---

# Règle stratégique

Le moteur doit éviter de grossir artificiellement l'univers.

Ajouter des actifs est utile seulement si cela permet de trouver plus d'actifs compatibles avec les setups.

Conclusion :

```text
Qualité structurelle > quantité d'actifs.
```
