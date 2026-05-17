# ManiTradePro — SESSION.md

## Date
2026-05-17

## Statut
Recherche quantitative active — phase de structuration du moteur.

---

# 1. OBJECTIF CENTRAL DU PROJET

Le vrai objectif ManiTradePro n'est PAS un dashboard trading.

Objectif réel : construire un moteur quant capable de :
- détecter les leaders momentum structurels,
- sélectionner les meilleurs actifs,
- éviter les mauvais régimes marché,
- apprendre progressivement,
- devenir un moteur swing/rotation robuste,
- préparer ensuite du paper trading automatique puis éventuellement du réel progressif.

Conclusion actuelle :
Le moteur semble naturellement orienté :
- swing,
- rotation,
- momentum structurel,
- leadership sectoriel,
- multi-jours.

Il ne semble PAS adapté à :
- scalping,
- ultra intraday,
- HFT,
- trading tick-by-tick.

Phrase clé :
ManiTradePro doit devenir un moteur de sélection + allocation + gestion du risque, pas seulement un générateur de signaux.

---

# 2. INFRA/API

## Provider principal

EODHD est confirmé comme provider principal actuel.

Raison :
- adapté au daily,
- adapté au swing,
- adapté aux historiques multi-années,
- adapté aux scans d'univers larges,
- adapté au moteur Relative Strength Rotation.

Quota EODHD déclaré : 100000 requêtes/jour.

Conclusion :
Les APIs ne sont PAS le blocage actuel.

Le vrai blocage actuel :
- qualité de la recherche,
- bruit marché,
- sur-optimisation,
- sélection des actifs,
- classification des régimes,
- allocation du risque.

## Providers secondaires

- Binance : très bon pour crypto live/intraday.
- Yahoo Finance : fallback uniquement.
- Twelve Data : moins central maintenant, surtout fragile pour gros intraday fréquent.

---

# 3. ARCHITECTURE CIBLE VALIDÉE

Architecture recommandée :

Univers large : 150–300 actifs compatibles
↓
Scan daily complet
↓
Top 40 watchlist active
↓
Top 10 surveillance renforcée
↓
Top 3–5 trades max

Fréquences recommandées :

| Niveau | Taille | Fréquence |
|---|---:|---|
| Univers global | 150–300 actifs | daily |
| Watchlist active | 40 actifs | 4h ou 2 fois/jour |
| Focus trading | 10 actifs | 1h |
| Positions ouvertes | 3–5 | 5–15 min |

Principe clé :
- large mais lent,
- petit mais rapide.

Ne PAS scanner tout l'univers en live toutes les minutes.

---

# 4. UNIVERS ACTUEL

## Nombre d'actifs testés récemment

Dernier test Relative Strength Rotation avec régime :
- Symbols tested: 158

Avant universe-v2, un test avait montré :
- 174 actifs testés

Après structuration universe-v2.mjs :
- 158 actifs réellement disponibles/testés.

Conclusion :
158 actifs classifiés, c'est déjà très sérieux.

---

# 5. UNIVERSE V2

Fichier créé :

```text
tools/backtests/universe-v2.mjs
```

Important : il faut utiliser `.mjs`, pas `.js`, sinon erreur module CommonJS / named export.

Erreur rencontrée :

```text
SyntaxError: Named export 'UNIVERSE' not found. The requested module './universe-v2.js' is a CommonJS module
```

Correction :

```powershell
Rename-Item tools\backtests\universe-v2.js universe-v2.mjs
```

Puis dans les scripts :

```js
import { UNIVERSE } from "./universe-v2.mjs";

const SYMBOLS = [
  ...new Set(
    Object.values(UNIVERSE).flat()
  )
];
```

Catégories prévues dans `UNIVERSE` :
- ETFs_US_INDEX
- ETFs_US_TECH
- ETFs_US_SECTORS
- ETFs_WORLD
- ETFs_COMMODITIES
- ETFs_BONDS
- LEVERAGED
- BIG_TECH
- SEMIS
- CYBER_CLOUD
- SOFTWARE
- AI_MOMENTUM
- CONSUMER_GROWTH
- QUALITY_DEFENSIVE
- INDUSTRIALS
- FINANCIALS
- EUROPE
- CRYPTO

But : ne plus gérer une liste plate d'actifs, mais un univers structuré par comportement marché.

---

# 6. SETUPS VALIDÉS / TESTÉS

## Setup 1 — Pullback Momentum

Rôle :
- continuation propre,
- repli dans tendance,
- trend continuation disciplinée.

Conclusion :
Le pullback a été le premier setup robuste découvert.

Actifs/familles compatibles :
- semiconducteurs,
- tech,
- IA,
- cyber/cloud,
- ETF tech propres.

Variantes importantes vues précédemment :
- `pullback_rsi42_58_chg20_5_stop0.1`
- `pullback_rsi42_58_chg20_3_stop0.1`

Lecture métier :
- `chg20_5` = plus sélectif,
- `chg20_3` = plus agressif.

## Setup 2 — Breakout Expansion

Rôle :
- cassure,
- accélération momentum,
- expansion violente.

Variante principale :

```text
breakout_h20_vol13
```

Variante secondaire :

```text
breakout_h10_vol12
```

Conclusion :
Breakout V2 fonctionne réellement sur certains actifs, mais pas partout.

Familles compatibles :
- semiconducteurs explosifs,
- IA,
- crypto momentum,
- actifs à expansion forte.

Actifs qui sont ressortis en breakout :
- NVDA,
- AMD,
- AVGO,
- XLK,
- SMH,
- ASML,
- KLAC,
- SOL,
- BTC,
- GLD,
- JPM surprise,
- COIN,
- TSLA selon variante.

Attention :
Le breakout long/tardif était mauvais.
Conclusion : le moteur préfère les breakouts frais/relativement précoces.

## Setup 3 — Relative Strength Rotation

Rôle :
- détecter les leaders structurels,
- sélectionner les actifs les plus forts du marché,
- moteur plus proche d'un vrai système quant.

C'est probablement le setup le plus important actuellement.

Variante gagnante principale :

```text
rs_90d_top10_hold20
```

Variante secondaire :

```text
rs_120d_top10_hold20
```

Résultats avant filtre régime, sur universe structuré :

```text
Symbols tested: 159
```

Overall :

```text
rs_90d_top10_hold20:
trades 1091
wins 595
losses 496
winrate 54.54%
expectancy 0.77
profitFactor 1.59
totalR 838.81
maxDrawdown 300.62
longestLossStreak 19
```

```text
rs_120d_top10_hold20:
trades 1049
wins 576
losses 472
winrate 54.91%
expectancy 0.77
profitFactor 1.57
totalR 812.27
maxDrawdown 254.70
longestLossStreak 23
```

Années notables :
- 2021 : très bon,
- 2022 : mauvais / fragile,
- 2023 : très bon,
- 2024 : très bon,
- 2025 : bon.

Conclusion :
Relative Strength Rotation est très prometteur mais dépend fortement du régime marché.

---

# 7. MEAN REVERSION TESTÉ ET ÉCARTÉ POUR LE MOMENT

Fichier :

```text
tools/backtests/backtest-meanrev-v1.mjs
```

Résultat : faible.

Constat :
- très peu de trades,
- expectancy souvent négative,
- PF faible,
- pas de robustesse.

Exception faible :
- IWM montrait un petit signe positif mais avec seulement 8 trades.

Conclusion :
Mean Reversion v1 n'est pas compatible avec l'ADN actuel du moteur.

---

# 8. MARKET REGIME FILTER

## Fichier créé

```text
tools/backtests/market-regime-v1.mjs
```

## Version utilisée

Sans VIX.

Le VIX a été tenté avec EODHD :

```text
VIX: "^VIX.INDX"
```

Mais erreur :

```text
Error: VIX HTTP 404
```

Donc VIX abandonné temporairement.

## Régime V1 basé sur :
- SPY > EMA200
- QQQ > EMA200
- SMH > EMA200

Règles :

```text
RISK_ON:
SPY > EMA200
QQQ > EMA200
SMH > EMA200
```

```text
RISK_OFF:
SPY < EMA200
QQQ < EMA200
SMH < EMA200
```

Sinon :

```text
RANGE
```

## Résultat market-regime-v1

Dernier run :

```text
RISK_ON  = 546 jours
RANGE    = 257 jours
RISK_OFF = 232 jours
```

---

# 9. DÉCOUVERTE MAJEURE SUR LES RÉGIMES

Hypothèse initiale :

```text
RISK_ON = meilleur environnement
```

Résultat réel :

```text
RANGE est souvent meilleur que RISK_ON pour la rotation.
```

Très grosse découverte.

## Test avec régime

Fichier :

```text
tools/backtests/backtest-relative-strength-rotation-regime-v1.mjs
```

Résultat global :

```text
NO_RISK_OFF + rs_90d_top10_hold20:
trades 929
wins 520
losses 409
winrate 55.97%
expectancy 0.89
profitFactor 1.69
totalR 831.02
maxDrawdown 212.54
longestLossStreak 19
```

Par régime :

```text
RANGE:
64% WR
expectancy 1.21
PF 2.23
```

```text
RISK_OFF:
expectancy négative
PF < 1
```

Conclusion :
NO_RISK_OFF améliore fortement la robustesse globale.

---

# 10. ACTIFS IMPORTANTS IDENTIFIÉS

## Elite / leaders récurrents

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

## ETF / actifs structurels intéressants

- SMH
- SOXX
- XLK
- QQQ
- AVGO
- TSM

## Actifs à surveiller avec prudence

- TSLA
- SOXL
- AMD

---

# 11. DÉCISION IMPORTANTE : TRADE RÉEL

Réponse actuelle : NON, pas encore.

Il manque encore :
- validation walk-forward,
- frais/spread/slippage,
- sizing réel,
- max exposition,
- perte max/jour,
- kill switch,
- paper trading live,
- connecteur broker.

Chemin recommandé :

```text
Backtest validé
↓
Paper trading automatique
↓
Petit capital réel test
↓
Montée progressive
```

---

# 12. RÈGLES STRATÉGIQUES VALIDÉES

## Règle 1

Le but n'est PAS d'avoir le plus d'actifs possible.

Le but :

```text
Trouver des actifs compatibles avec nos setups.
```

## Règle 2

Les mauvais actifs doivent être blacklistés.

## Règle 3

Le moteur doit favoriser :
- leaders momentum durables,
- IA,
- semiconducteurs,
- crypto leaders,
- tendances propres.

---

# 13. PROCHAINE ÉTAPE EXACTE

Créer :

```text
asset-quality-engine-v1.mjs
```

Objectif : produire :

- ELITE
- CORE
- TACTICAL
- BLACKLIST

à partir des résultats JSON existants.

Critères :
- PF,
- expectancy,
- winrate,
- nombre de trades,
- drawdown,
- stabilité multi-années,
- cohérence setups,
- comportement régime marché.

---

# 14. CONCLUSION STRATÉGIQUE

ManiTradePro doit devenir :

un moteur de sélection de leaders momentum structurels avec allocation adaptative selon le régime marché.

---

# Documentation quantitative créée

Nouveaux fichiers de référence :
- `SETUPS_REGISTRY.md`
- `ASSET_REGISTRY.md`

Le projet dispose maintenant d'une séparation claire entre :
- mémoire session,
- logique moteur,
- recherche quantitative,
- classification actifs.

Rôle des nouveaux fichiers :
- `SETUPS_REGISTRY.md` : source officielle des setups validés, variantes robustes, métriques, régimes compatibles.
- `ASSET_REGISTRY.md` : classification provisoire des actifs compatibles, à automatiser avec `asset-quality-engine-v1.mjs`.

Décision importante :
`ASSET_REGISTRY.md` est provisoire. La vérité définitive devra venir du futur moteur `asset-quality-engine-v1.mjs`.

---

# TODO quant prioritaire

## Priorité 1 — asset-quality-engine-v1

Créer :

`tools/backtests/asset-quality-engine-v1.mjs`

Objectif :
- lire les résultats JSON,
- scorer les actifs,
- produire :
  - ELITE
  - CORE
  - TACTICAL
  - BLACKLIST

---

## Priorité 2 — Walk-forward réel

Mettre en place :
- séparation train/test stricte,
- validation séquentielle,
- anti-overfit,
- robustesse temporelle.

---

## Priorité 3 — Frictions réelles

Ajouter :
- slippage,
- spread,
- gaps,
- frais,
- liquidité.

---

## Priorité 4 — Allocation dynamique

Construire le moteur d'allocation :
- ELITE = allocation forte,
- CORE = allocation normale,
- TACTICAL = allocation réduite,
- RISK_OFF = réduction exposition.

---

## Priorité 5 — Paper trading live automatique

Valider :
- stabilité live,
- fréquence réelle,
- drawdown réel,
- comportement réel des setups.

---

## Priorité 6 — Universe maintenance

Définir :
- quand promouvoir un actif,
- quand blacklist,
- quand retirer un actif,
- fréquence refresh universe.

---

## Priorité 7 — Regime Engine V2

Étudier :
- VIX fiable,
- breadth,
- volatility regime,
- correlations,
- macro risk.

---

## Priorité 8 — Risk Engine réel

Ajouter :
- max perte/jour,
- max drawdown,
- max exposition secteur,
- max exposition crypto,
- kill switch,
- cooldown après pertes.

---

## Priorité 9 — Validation multi-univers

Tester :
- défensif,
- value,
- Europe,
- commodities,
- bonds.

Objectif : déterminer si le moteur est universel ou spécialisé.
