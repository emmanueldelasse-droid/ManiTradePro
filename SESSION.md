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

---

# Asset Quality Engine v1 — première livraison

Fichier créé :

```text
tools/backtests/asset-quality-engine-v1.mjs
```

Sources lues (depuis `tools/backtests/`) :

- `results-multi-setup-grid.json`
- `results-pullback-2025.json`
- `results-pullback-grid-2025.json`
- `results-pullback-yearly-walkforward.json`
- `results-relative-strength-rotation-regime-v1.json`
- `results-relative-strength-rotation-v1.json`

Sorties écrites (dans `tools/backtests/output/`) :

- `asset-quality-report.json`
- `asset-quality-report.md`

Comment le relancer :

```text
node tools/backtests/asset-quality-engine-v1.mjs
```

## Résultat du premier run

- Actifs analysés : **181**
- ELITE : **29**
- CORE : **60**
- TACTICAL : **38**
- BLACKLIST : **54**

## Décisions techniques importantes

- Le moteur déduplique les enregistrements : quand une source expose à la fois un niveau `overall` et un niveau `yearly`, seul le niveau `yearly` est conservé (overall = somme des yearly).
- Pour les sources avec modes régime (ALL_REGIMES vs NO_RISK_OFF), le mode NO_RISK_OFF est canonique pour l'agrégation principale ; ALL_REGIMES reste capté à part pour la comparaison.
- Le scoring s'appuie sur le **meilleur setup** de l'actif (argmax expectancy) pour éviter qu'un setup perdant dégrade la note d'un actif globalement rentable.
- Pénalité forte si la performance dépend de RISK_OFF (totalR ALL_REGIMES nettement inférieur à NO_RISK_OFF).

## Points à surveiller

- **SOXL** sort ELITE (score 100) sur ses chiffres bruts. C'est un ETF à effet de levier 3× — l'allocation doit tenir compte de son risque non-linéaire, le moteur ne le sait pas.
- **NVDA** sort en CORE (et non ELITE). Son setup PULLBACK est solide (exp 0.73, PF 2.41) mais sa variante Relative Strength Rotation a une expectancy négative (-1.38) qui tire l'agrégat vers le bas. À ré-évaluer si le bot exclut le setup RS pour NVDA.
- **QQQ** et **AVGO** sortent TACTICAL/CORE plutôt qu'ELITE — leur expectancy globale est plus faible que les vraies stars momentum.

## Lien avec ASSET_REGISTRY.md

`ASSET_REGISTRY.md` est désormais peuplé par les listes générées par ce moteur. Pour rafraîchir la classification après de nouveaux backtests : relancer le moteur puis vérifier le diff sur `ASSET_REGISTRY.md`.

---

# Asset × Setup Matrix v1 — deuxième livraison quant

Fichier créé :

```text
tools/backtests/asset-setup-matrix-v1.mjs
```

Module partagé (extrait à cette occasion pour éviter la duplication) :

```text
tools/backtests/lib/backtest-records.mjs
```

`asset-quality-engine-v1.mjs` a été refactoré pour utiliser ce module. Le rapport généré est **strictement identique** au précédent (vérification par diff JSON byte par byte hors `generatedAt`).

Sorties écrites :

- `tools/backtests/output/asset-setup-matrix.json`
- `tools/backtests/output/asset-setup-matrix.md`

Comment le relancer :

```text
node tools/backtests/asset-setup-matrix-v1.mjs
```

## Résultat du premier run

- 181 actifs × 5 setups = **744 cellules**
- STRONG : **70**
- OK : **104**
- WEAK : **109**
- AVOID : **461**

Par setup :

| Setup | STRONG | OK | WEAK | AVOID |
|---|---:|---:|---:|---:|
| PULLBACK_MOMENTUM | 48 | 46 | 26 | 61 |
| RELATIVE_STRENGTH_ROTATION | 21 | 12 | 15 | 76 |
| BREAKOUT_EXPANSION | 0 | 14 | 31 | 113 |
| MEAN_REVERSION (non prioritaire) | 0 | 26 | 26 | 105 |
| VOLATILITY_COMPRESSION (non prioritaire) | 1 | 6 | 11 | 106 |

## Cross-check avec asset-quality-report.json

- **103 cellules** actifs ELITE/CORE × tier setup WEAK/AVOID : ces couples sont à exclure du moteur même si l'actif est globalement bon.
- **5 cellules** actifs BLACKLIST × tier setup STRONG/OK : ces couples mériteraient un usage strictement ciblé.

## Cas démonstratif

NVDA — exactement le problème évoqué :

| Setup | Tier | Score | Trades | Expectancy | PF |
|---|---|---:|---:|---:|---:|
| PULLBACK_MOMENTUM | STRONG | 78 | 555 | 0.72 | 2.41 |
| BREAKOUT_EXPANSION | OK | 60 | 74 | 0.53 | 3.78 |
| RELATIVE_STRENGTH_ROTATION | AVOID | 50 | 133 | -1.38 | 5.47 |
| MEAN_REVERSION | AVOID | 10 | 57 | -0.08 | 0.80 |

Conclusion concrète pour le moteur : trader NVDA en Pullback uniquement, jamais en Relative Strength Rotation.

## BLACKLIST mais exploitables identifiés (5)

PAYX, ZEN, ONTO, DUOL, GBPUSD — tous sur PULLBACK ou BREAKOUT en tier OK, jamais STRONG. Usage ciblé seulement.

## Décisions techniques importantes

- Module partagé `lib/backtest-records.mjs` : les adaptateurs JSON, la normalisation et le dédoublonnage par mode régime sont désormais centralisés. Les deux moteurs (quality + matrix) consomment la même source.
- La matrice utilise un scoring par cellule (et non plus par actif) : expectancy 30, PF 25, winrate 15, sample size 15, drawdown 10, stabilité 5, pénalités sur échantillon faible et dépendance RISK_OFF.
- Pour Relative Strength Rotation, la pénalité RISK_OFF est calculée par cellule (ALL_REGIMES vs NO_RISK_OFF) si les deux modes sont présents.

## Limites restantes

- **MEAN_REVERSION et VOLATILITY_COMPRESSION** sont marqués `nonPriority` dans la matrice (cohérent avec SETUPS_REGISTRY.md). Aucune cellule MEAN_REVERSION ne sort STRONG, ce qui confirme leur statut.
- **BREAKOUT_EXPANSION** sort 0 cellule STRONG — ce setup est plus fragile que PULLBACK et RS dans les backtests actuels. À investiguer : variant `breakout_h20_vol13` vs `breakout_h10_vol12` pour voir si une variante précise est meilleure (non décomposé dans la matrice actuelle, qui agrège toutes les variantes d'un setup).
- La matrice ne décompose pas par variante (pullback_rsi42_58_chg20_5 vs pullback_rsi42_58_chg20_3). Une v2 future pourrait ajouter ce niveau de granularité.
- L'effet de levier (SOXL) reste invisible au moteur : SOXL × PULLBACK sort STRONG 100, le risque non-linéaire doit être pris en compte côté allocation.

---

# Setup × Variant Matrix v1 — troisième livraison quant

Fichier créé :

```text
tools/backtests/setup-variant-matrix-v1.mjs
```

Le moteur réutilise `tools/backtests/lib/backtest-records.mjs` (aucune duplication).

Sorties écrites :

- `tools/backtests/output/setup-variant-matrix.json`
- `tools/backtests/output/setup-variant-matrix.md`

Comment le relancer :

```text
node tools/backtests/setup-variant-matrix-v1.mjs
```

## Résultat du premier run

- 181 actifs × 30 variantes distinctes = **4 301 cellules**
- STRONG : **389**
- OK : **676**
- WEAK : **667**
- AVOID : **2 569**

## Découvertes notables grâce à la granularité variante

### Cas SOXL — RS débloqué via une variante précise

La matrice (actif × setup) classait **SOXL × RELATIVE_STRENGTH_ROTATION** en AVOID (45). En décomposant par variante :

| Setup | Variante | Tier | Score | Trades | Exp | PF |
|---|---|---|---:|---:|---:|---:|
| RELATIVE_STRENGTH_ROTATION | rs_20d_top5_hold5 | STRONG | 80 | 29 | 0.55 | 2.36 |
| RELATIVE_STRENGTH_ROTATION | rs_120d_top10_hold20 | (moins bon) | — | — | — | — |

Donc SOXL est compatible avec **une seule variante** de RS (la 20d top5), pas avec les autres. Sans cette granularité, on perdait du signal exploitable.

### Cas NVDA — confirmé robuste sur Pullback, multi-variantes

NVDA a au moins **8 variantes Pullback STRONG ou OK** avec scores 72-80 :
- `base_rsi42_58_chg20_0_stop0.1` STRONG (80)
- `rsi42_58_chg20_3_stop0.1` STRONG (80)
- `rsi42_58_chg20_5_stop0.5` STRONG (78)
- `rsi42_58_chg20_3_stop0.5` STRONG (75)
- etc.

C'est cohérent : NVDA × Pullback est un setup solide quelle que soit la variante précise (signe de robustesse, pas d'overfit). À l'inverse, NVDA × RS reste AVOID toutes variantes confondues.

### Cas PLTR — multi-variantes STRONG sur RS ET Pullback

PLTR sort STRONG 100 sur `rs_120d_top10_hold20` ET `rs_90d_top10_hold20`, et STRONG 95 sur plusieurs Pullback. Actif particulièrement versatile.

## Variantes à abandonner (7 identifiées)

Critères : ≥ 10 actifs testés, aucune cellule STRONG, ratio AVOID > 70 %.

| Setup | Variante | AVOID / total |
|---|---|---:|
| VOLATILITY_COMPRESSION | compression_40_ratio0.7_break30_stop1.5_rr2.5 | 100 % (69/69) |
| MEAN_REVERSION | meanrev_rsi30_dist7_stop1.5_rr1.5 | 92 % |
| MEAN_REVERSION | meanrev_rsi30_dist5_stop1_rr1.2 | 89 % |
| BREAKOUT_EXPANSION | breakout_h50_vol1.5_stop1.5_rr2.5 | 88 % |
| VOLATILITY_COMPRESSION | compression_20_ratio0.65_break20_stop1_rr2 | 87 % |
| VOLATILITY_COMPRESSION | compression_20_ratio0.75_break20_stop1_rr2 | 85 % |
| BREAKOUT_EXPANSION | breakout_h50_vol1.2_stop1.5_rr2.5 | 85 % |

Lecture : les variantes BREAKOUT longues fenêtres (h50) sont systématiquement perdantes. Les variantes BREAKOUT h20 sont plus prometteuses (quelques cellules OK). Pour MEAN_REVERSION, seule `meanrev_rsi35_dist4_stop1_rr1.2` survit avec 27 cellules OK.

## Inventaire des nommages variantes (limite documentée)

Le même Pullback existe sous plusieurs noms selon la source :
- `pullback_rsi42_58_chg20_5_stop0.1` (multi-setup-grid)
- `rsi42_58_chg20_5_stop0.1` (pullback-grid + walk-forward)

Ils sont **traités comme deux variantes distinctes** dans la matrice — aucune fusion automatique pour ne pas inventer une équivalence non vérifiée. Une normalisation explicite des noms est à prévoir dans une future passe (idéalement côté source de backtest, pour ne pas ajouter de couche fragile dans l'agrégateur).

## Non-régression vérifiée

Cette PR ne modifie ni `asset-quality-engine-v1.mjs` ni `asset-setup-matrix-v1.mjs`. Les deux ont tout de même été relancés et leurs JSON outputs comparés byte-par-byte (hors `generatedAt`) avec les versions actuelles : **strictement identiques**.

## Limites restantes

- Pas de walk-forward strict par variante. Une variante peut paraître STRONG sur l'historique tout en surajustant. C'est exactement ce que la priorité #2 du TODO quant adresse (Walk-forward réel).
- Les variantes UNKNOWN_VARIANT (8 records issus de `results-pullback-2025.json`) sont préservées mais exclues des sections "meilleures variantes" et "à abandonner".
- Le moteur d'allocation n'est pas encore implémenté — la matrice variante dit quoi trader, pas combien.
- Pas de gestion explicite des familles de variantes (ex. tous les `rsi42_58_chg20_5_*` partagent un noyau commun mais sont traités indépendamment).

---

# Variant × Regime Matrix v1 — quatrième livraison quant

Fichier créé :

```text
tools/backtests/variant-regime-matrix-v1.mjs
```

Réutilise `tools/backtests/lib/backtest-records.mjs` (aucune duplication).

Sorties écrites :

- `tools/backtests/output/variant-regime-matrix.json`
- `tools/backtests/output/variant-regime-matrix.md`

Comment le relancer :

```text
node tools/backtests/variant-regime-matrix-v1.mjs
```

## Limite majeure documentée

La dimension régime n'est exposée que par **un seul fichier de backtest** : `results-relative-strength-rotation-regime-v1.json`. Et même dans ce fichier, le breakdown est **global** (variant × regimeMode × regime, agrégé sur tous les symboles). Aucune source ne fournit de breakdown **per-(symbol × variant × regime individuel)**.

Conséquence : on ne peut PAS répondre rigoureusement à "NVDA × Pullback en RANGE ?" ou "PLTR × RS en RISK_OFF ?". Cette matrice livre :

1. **La matrice globale** (variant × regimeMode × regime) sur les 2 variantes RS pour lesquelles le breakdown existe (`rs_90d_top10_hold20`, `rs_120d_top10_hold20`).
2. **La comparaison per-(symbol × variant × regimeMode)** : on peut comparer ALL_REGIMES vs NO_RISK_OFF pour chaque actif, ce qui mesure indirectement la dépendance RISK_OFF par actif.

**Action recommandée** : ajouter un breakdown `bySymbolByRegime` dans les scripts de backtest (priorité quant à insérer dans le TODO). Sans ça, la décision per-actif-par-régime restera approximative.

## Résultat du premier run

- 12 cellules globales (sur 18 possibles ; 6 sont vides par construction du regimeMode)
- 8 STRONG / 3 OK / 0 WEAK / 1 AVOID

## Découvertes notables

### rs_90d_top10_hold20

| Régime | Tier | Score | Trades | Exp | PF | TotalR |
|---|---|---:|---:|---:|---:|---:|
| RANGE | STRONG | 100 | 400 | 1.21 | 2.54 | 482.62 |
| RISK_ON | STRONG | 77 | 529 | 0.66 | 1.60 | 348.40 |
| RISK_OFF | **AVOID** | 7 | 162 | **-0.05** | 0.99 | -8.38 |

→ Variant **robuste multi-régimes** (STRONG en RISK_ON ET RANGE) mais **dangereuse en RISK_OFF**. C'est exactement la situation qui justifie le filtre NO_RISK_OFF.

### rs_120d_top10_hold20

| Régime | Tier | Score | Trades | Exp | PF | TotalR |
|---|---|---:|---:|---:|---:|---:|
| RANGE | STRONG | 100 | 367 | 1.34 | 2.77 | 492.27 |
| RISK_OFF | **STRONG** | 84 | 152 | **1.00** | 2.03 | 151.78 |
| RISK_ON | OK | 56 | 530 | 0.35 | 1.34 | 183.45 |

→ Variant **bien plus résiliente en RISK_OFF** que `rs_90d` (exp 1.00 vs -0.05). Découverte importante : la fenêtre plus longue (120d vs 90d) absorbe mieux les phases bear. Ça pourrait justifier d'utiliser `rs_120d` quand le régime macro bascule en RISK_OFF, plutôt que de tout couper.

### Cas NVDA (per-symbol)

NVDA × `rs_90d_top10_hold20` et NVDA × `rs_120d_top10_hold20` ont une **expectancy négative** (-1.00 et -1.13) sur 28 et 26 trades respectivement. ALL_REGIMES et NO_RISK_OFF donnent les mêmes chiffres → NVDA n'a probablement pas eu de trade pendant les périodes RISK_OFF (cohérent avec sa nature high-beta : sort du top 10 en bear).

→ Confirme que **NVDA × RS rotation est à éviter** au niveau actif, même si la variante est globalement bonne. Cohérent avec la matrice setup et la matrice variante précédentes.

## Variantes à blacklister

Aucune sur ce critère (AVOID dans tous les régimes ALL_REGIMES).

## Variantes RANGE-only

Aucune. Les deux variantes RS qui fonctionnent en RANGE fonctionnent aussi (au moins en OK) en RISK_ON.

## Variantes dangereuses RISK_OFF

1 détectée : `rs_90d_top10_hold20`. À filtrer obligatoirement quand le régime macro est RISK_OFF.

## Variantes robustes multi-régimes

1 détectée : `rs_90d_top10_hold20` (STRONG en RISK_ON + RANGE). Avec la résilience surprise de `rs_120d` en RISK_OFF, on a en fait deux variantes RS exploitables — chacune avec son régime favori.

## Non-régression vérifiée

`asset-quality-engine-v1.mjs`, `asset-setup-matrix-v1.mjs` et `setup-variant-matrix-v1.mjs` ont été relancés et leurs JSON outputs comparés byte-par-byte (hors `generatedAt`) : **strictement identiques**.

## Limites restantes (à inscrire dans le TODO quant)

- **Manque crucial** : un breakdown `bySymbolByRegime` dans les JSON de backtest. Sans ça, la décision per-actif-par-régime reste basée sur l'agrégat global, pas sur le comportement vrai de l'actif dans le régime.
- **Couverture variant** : seules 2 variantes RS ont un breakdown régime. Les autres setups (Pullback, Breakout, MEAN_REVERSION, VOLATILITY_COMPRESSION) ne sont pas couverts.
- **Walk-forward** : aucune validation walk-forward par régime. Une variante peut sembler robuste sur l'historique tout en surajustant aux conditions passées.
- **Allocation** : la matrice dit quoi autoriser/interdire selon le régime, pas combien allouer.

---

# bySymbolByRegime + variant-regime-matrix v2 — verrou data levé

## Ce qui a été fait

1. Ajout d'un champ `bySymbolByRegime[]` au script `tools/backtests/backtest-relative-strength-rotation-regime-v1.mjs`. Strictement additif — aucun champ existant modifié, vérifié byte-par-byte (les anciens `rows`, `byRegime`, `bySymbol` sont identiques avant/après).
2. Mise à jour de `tools/backtests/variant-regime-matrix-v1.mjs` pour consommer `bySymbolByRegime[]` quand disponible. Le moteur retombe proprement en mode legacy (matrice globale seule) si le champ est absent.
3. Le rapport `variant-regime-matrix.md` expose désormais une **vraie section per-actif** (symbol × variant × regimeMode × regime) avec tier par cellule.

## Résultat

- Avant : 12 cellules globales agrégées (toutes symboles confondus).
- Après : 12 cellules globales **+ 888 cellules per-(symbol × variant × regimeMode × regime)** sur 108 actifs × 2 variantes RS.
- Répartition per-symbol : 103 STRONG / 66 OK / 77 WEAK / 642 AVOID.

## Découvertes validées par la nouvelle granularité

### NVDA × RS — interdiction confirmée par 10 cellules sur 10

| Variante | Mode | Régime | Tier | Trades | Exp | PF |
|---|---|---|---|---:|---:|---:|
| rs_90d | ALL_REGIMES | RANGE | AVOID (50) | 15 | -0.46 | 6.06 |
| rs_90d | ALL_REGIMES | RISK_ON | AVOID (17) | 13 | -1.63 | 0.23 |
| rs_120d | ALL_REGIMES | RANGE | AVOID (50) | 19 | -0.11 | 6.78 |
| rs_120d | ALL_REGIMES | RISK_ON | AVOID (13) | 7 | -3.89 | 0.23 |

→ **Toutes** les combinaisons NVDA × RS × régime observées sortent AVOID. La conclusion intuitive ("NVDA n'est pas pour RS") est désormais rigoureusement étayée par les chiffres per-cellule, pas seulement par l'agrégé.

### SOL × RS — STRONG dans tous les régimes observés

| Variante | Mode | Régime | Tier | Trades | Exp | PF |
|---|---|---|---|---:|---:|---:|
| rs_90d | ALL_REGIMES | RANGE | STRONG (92) | 13 | 5.52 | 4.17 |
| rs_90d | ALL_REGIMES | RISK_ON | STRONG (90) | 16 | 2.52 | 5.72 |
| rs_120d | ALL_REGIMES | RANGE | STRONG (92) | 12 | 7.32 | 12.62 |
| rs_120d | ALL_REGIMES | RISK_ON | STRONG (77) | 16 | 1.67 | 2.08 |

→ SOL est exploitable en RS **quelle que soit la combinaison**. Pas de filtre régime nécessaire pour cet actif.

### PLTR × RS — STRONG dans RISK_ON ET RANGE

| Variante | Mode | Régime | Tier | Trades | Exp |
|---|---|---|---|---:|---:|
| rs_90d | ALL_REGIMES | RANGE | STRONG (89) | 13 | 1.32 |
| rs_90d | ALL_REGIMES | RISK_ON | STRONG (95) | 18 | 3.13 |
| rs_120d | ALL_REGIMES | RANGE | STRONG (89) | 13 | 1.44 |
| rs_120d | ALL_REGIMES | RISK_ON | STRONG (95) | 21 | 2.99 |

→ PLTR confirme son rang ELITE : STRONG partout, exp > 1 dans tous les régimes.

## Non-régression confirmée

Les 3 autres moteurs (asset-quality, asset-setup-matrix, setup-variant-matrix) ont été relancés et leurs JSON outputs comparés byte-par-byte (hors `generatedAt`) : **strictement identiques**. Le re-run du backtest source produit aussi des `rows`, `byRegime`, `bySymbol` identiques aux anciens.

## Conséquences pour le moteur opérationnel

Le moteur peut maintenant raisonner en quatre niveaux complémentaires :
1. **Tier global par actif** (ELITE/CORE/TACTICAL/BLACKLIST) — décide quel univers tradable.
2. **Tier par (actif × setup)** — décide quel setup utiliser pour chaque actif.
3. **Tier par (actif × setup × variante)** — décide quelle variante utiliser.
4. **Tier par (actif × variante × régime)** — décide d'autoriser ou non un trade dans le régime courant.

Exemple complet : "Aujourd'hui, le bot a une opportunité NVDA. Le tier global NVDA est CORE (autorisé). Le tier NVDA × RS rotation est AVOID (interdit). On passe. Si demain l'opportunité est SOL × RS rotation en RANGE → tier STRONG (autorisé)."

## Limites restantes

- **Couverture variant** : `bySymbolByRegime[]` n'existe que pour `rs_90d_top10_hold20` et `rs_120d_top10_hold20`. Les autres variantes RS et tous les autres setups (Pullback, Breakout, MEAN_REVERSION, VOLATILITY_COMPRESSION) restent sans dimension régime per-symbol.
- **Symboles couverts** : 108 actifs (sur 181 du total). Les actifs jamais sélectionnés par les variantes RS (faute de momentum suffisant sur la période) n'apparaissent pas dans la matrice per-symbol.
- **Walk-forward** : toujours pas de validation walk-forward par régime. Une cellule STRONG sur l'historique reste susceptible de surajustement.
- **Allocation** : décide oui/non, pas le sizing.

## Prochaine étape recommandée

Étendre `bySymbolByRegime[]` aux autres scripts de backtest (Pullback, Breakout) — même pattern, déclaration locale + boucle inside-loop dans le script générateur. Une fois fait, la matrice per-actif-par-régime couvrira tous les setups, et la priorité #4 du TODO quant (Allocation dynamique) deviendra accessible avec la vraie granularité.

---

# bySymbolByRegime étendu à Pullback — couverture régime per-symbol passe de 2 à 12 variants

## Ce qui a été fait

1. **`tools/backtests/backtest-pullback-yearly-walkforward.mjs`** — addition pure :
   - Fonction `buildRegimeByDate()` ajoutée (même logique que RS regime : SPY/QQQ/SMH EMA200, RANGE par défaut).
   - Chaque trade généré reçoit un champ `regime` à la date d'entrée (additif, pas de filtre à l'ouverture).
   - `summarizeVariantForYears` produit un nouvel agrégat `bySymbolByRegime[]` par variant block (modes `ALL_REGIMES` et `NO_RISK_OFF` = filtre post hoc des trades dont régime ≠ RISK_OFF).
   - Cellules avec 0 trade omises (cohérent avec le script RS regime).
2. **`tools/backtests/variant-regime-matrix-v1.mjs`** — fix walker :
   - Les deux extracteurs (`extractRegimeRecords` et `extractSymbolRegimeRecords`) ne descendaient pas dans les arrays non-reconnus. Pullback expose `overall` comme un array de variant blocks (différent de RS regime qui a `overall` comme objet). Fix : recurse into array elements quand le format n'est pas reconnu.
   - Non-régression vérifiée avant/après le fix sur les données RS regime (output JSON byte-identique).

## Résultat

| Niveau | Avant | Après |
|---|---:|---:|
| Cellules globales | 12 | 12 (inchangé) |
| Cellules per-symbol | 888 | **8 835** |
| Actifs couverts | 108 | **180** |
| Variants couverts | 2 (RS) | **12** (2 RS + 10 Pullback) |
| Setups couverts | 1 | **2** (RS + Pullback) |
| STRONG | 103 | **811** |
| OK | 66 | **1 038** |

## NVDA × Pullback — verrou enfin levé pour ce cas emblématique

Avant : on savait que NVDA × Pullback était STRONG globalement (matrice setup-variant), mais on ne savait pas si c'était spécifiquement bon en RANGE ou si RISK_ON tirait l'agrégat.

Après — extrait des 48 cellules NVDA × Pullback × régime :

| Variante | Régime | Tier | Score | Trades | Exp | PF |
|---|---|---|---:|---:|---:|---:|
| `rsi42_58_chg20_3_stop0.1` | RANGE | STRONG | 77 | 19 | 1.03 | 2.77 |
| `base_rsi42_58_chg20_0_stop0.1` | RANGE | STRONG | 72 | 22 | 0.85 | 2.57 |
| `rsi42_58_chg20_5_stop0.1` | RANGE | STRONG | 72 | 17 | 1.11 | 2.64 |
| `base_rsi42_58_chg20_0_stop0.1` | RISK_ON | STRONG | 72 | 10 | 0.93 | 2.66 |
| `rsi42_58_chg20_5_stop0.1` | RISK_ON | AVOID | 4 | 4 | 0.68 | 0 |
| `rsi45_55_chg20_0_stop0.1` | RANGE | AVOID | 7 | 12 | -0.22 | 0.80 |

→ Décision possible : autoriser NVDA × Pullback avec stop 0.1 ATR (variantes les plus serrées) en RANGE, plus prudent en RISK_ON, interdire la variante `rsi45_55` qui est trop laxiste.

## Non-régression confirmée

- `results-pullback-yearly-walkforward.json` : tous les champs existants (rows, bySymbol, walkForward, etc.) byte-identiques (modulo `generatedAt`) avant/après. Seul `bySymbolByRegime` est ajouté par variant block.
- `asset-quality-report`, `asset-setup-matrix`, `setup-variant-matrix` : JSON outputs byte-identiques après re-run.
- Walker fix sur `variant-regime-matrix-v1.mjs` : vérifié non-régressif sur les données RS regime existantes avant d'avoir le nouveau data Pullback.

## Choix de design documentés

- **Pas de `RISK_ON_ONLY` pour Pullback** : la stratégie Pullback ne filtre pas par régime à l'ouverture, donc ce mode (qui n'aurait gardé que les trades RISK_ON) ne représente pas une variante opérationnelle distincte de `ALL_REGIMES × RISK_ON`. On émet seulement `ALL_REGIMES` (tous les trades) et `NO_RISK_OFF` (trades dont régime ≠ RISK_OFF, dérivé post hoc).
- **Cellules vides omises** : si `(symbol, variant, regimeMode, regime)` n'a aucun trade, la cellule n'est pas écrite dans le JSON. Évite de polluer le rapport et reste cohérent avec le script RS regime.
- **Modification chirurgicale** : seul `backtest-pullback-yearly-walkforward.mjs` est modifié. `backtest-pullback-2025.mjs` (8 symboles seulement) et `backtest-pullback-grid-2025.mjs` (pas de breakdown yearly) restent inchangés. Le yearly-walkforward suffit largement à couvrir la dimension régime per-symbol pour Pullback.

## Limites restantes

- **Breakout** et **MEAN_REVERSION** restent sans dimension régime per-symbol. Même pattern à appliquer à `backtest-breakout-v2.mjs` / `backtest-breakout-global.mjs` / `backtest-meanrev-v1.mjs` / `backtest-multi-setup-grid.mjs` quand on aura besoin.
- Walk-forward strict par régime n'est pas implémenté (priorité #2 du TODO quant).
- L'effet de levier (SOXL) reste invisible — la matrice ne sait toujours pas qu'un ETF 3× a un profil de risque non-linéaire.
- 180 actifs couverts pour Pullback (vs 108 pour RS — Pullback est plus inclusif car il ouvre sur tout symbole avec le pattern, alors que RS sélectionne top-N).

---

# bySymbolByRegime étendu à Breakout + autres setups du grid — couverture régime per-symbol complète

## Ce qui a été fait

Modification additive de `tools/backtests/backtest-multi-setup-grid.mjs` (le seul script du grid qui écrit un JSON, les autres font console.log). Le grid couvre 4 setups : `PULLBACK_MOMENTUM`, `BREAKOUT_EXPANSION`, `MEAN_REVERSION`, `VOLATILITY_COMPRESSION`. L'ajout profite donc à Breakout (objectif principal) et bonus aux 2 setups non-prioritaires (utile pour les blacklister rigoureusement régime par régime).

- `buildRegimeByDate()` ajoutée (logique identique aux 2 précédents scripts : SPY/QQQ/SMH EMA200, RANGE par défaut). Adaptée à la structure `c.time` du script.
- Champ `regime` tagué à chaque trade dans `runSetupVariantOnSymbol`.
- `runAll` produit un nouvel agrégat `bySymbolByRegime[]` dans `overall` et `yearly[year]`, modes `ALL_REGIMES` et `NO_RISK_OFF` (post-hoc). Pas de `RISK_ON_ONLY` car aucun setup du grid ne filtre par régime à l'ouverture.
- Cellules avec 0 trade omises.
- Walker `variant-regime-matrix-v1.mjs` non modifié — le fix de la PR #190 suffit pour la structure overall-as-object du grid.

## Résultat global

| Niveau | PR #189 | PR #190 | **Maintenant** |
|---|---:|---:|---:|
| Cellules globales | 12 | 12 | 12 |
| Cellules per-symbol | 888 | 8 835 | **17 088** |
| Actifs couverts | 108 | 180 | **181** |
| Variants couverts | 2 | 12 | **27** |
| Setups couverts | 1 (RS) | 2 (+ Pullback) | **5** (+ Breakout + MeanRev + VolComp) |
| STRONG per-symbol | 103 | 811 | **1 128** |
| OK per-symbol | 66 | 1 038 | **2 003** |

## Analyse Breakout par régime

### Distribution NO_RISK_OFF (RANGE vs RISK_ON)

| Régime | STRONG | OK | WEAK | AVOID | Total | % exploitable |
|---|---:|---:|---:|---:|---:|---:|
| RANGE | 3 | 44 | 64 | 413 | 524 | **9 %** |
| RISK_ON | 9 | 53 | 72 | 490 | 624 | **10 %** |

→ **Surprise** : Breakout n'est **pas particulièrement meilleur en RANGE qu'en RISK_ON** (contrairement à RS rotation où RANGE > RISK_ON). Les deux régimes ont un taux similaire de cellules exploitables (~10 %). Cette découverte invalide l'intuition initiale.

### Toxicité RISK_OFF confirmée

| Régime | STRONG | OK | WEAK | AVOID | Cellules | Exp pondérée |
|---|---:|---:|---:|---:|---:|---:|
| RISK_OFF (mode ALL_REGIMES) | 0 | 7 | 4 | 107 | 118 | 0.10 |

→ **90 % des cellules Breakout en RISK_OFF sont AVOID**. Seules 7 cellules OK (toutes avec peu de trades). Breakout doit être bloqué macro en RISK_OFF — confirme l'hypothèse.

### Comparaison h20 vs h50

| Famille | STRONG | OK | Total cellules | % STRONG+OK |
|---|---:|---:|---:|---:|
| breakout_h20 | 9 | 63 | 581 | **12 %** |
| breakout_h50 | 3 | 34 | 567 | **7 %** |

→ **h20 nettement supérieur à h50**. Cohérent avec la matrice setup-variant qui listait toutes les variantes h50 dans les "variantes à abandonner".

## Cas notables des actifs focus

### NVDA × Breakout — 4 cellules STRONG/OK toutes en RISK_ON

| Variante | Régime | Tier | Trades | Exp | PF |
|---|---|---|---:|---:|---:|
| breakout_h20_vol1.2_stop1_rr2 | RISK_ON | STRONG (70) | 18 | 0.50 | 3.25 |
| breakout_h50_vol1.2_stop1.5_rr2.5 | RISK_ON | STRONG (70) | 18 | 0.86 | 4.06 |
| breakout_h50_vol1.5_stop1.5_rr2.5 | RISK_ON | OK (68) | 9 | 1.06 | 8.33 |

→ **NVDA × Breakout fonctionne en RISK_ON, pas en RANGE**. Comportement opposé à NVDA × Pullback (qui fonctionne en RANGE). Le moteur peut maintenant orchestrer : NVDA → Pullback si RANGE, Breakout si RISK_ON.

### SOL × Breakout — 5 cellules STRONG/OK, 3 en RANGE

| Variante | Régime | Tier | Trades | Exp |
|---|---|---|---:|---:|
| breakout_h50_vol1.5_stop1.5_rr2.5 | RANGE | STRONG (70) | 22 | 0.87 |
| breakout_h20_vol1.5_stop1_rr2 | RANGE | STRONG (70) | 23 | 0.70 |
| breakout_h50_vol1.2_stop1.5_rr2.5 | RANGE | OK (65) | 26 | 0.79 |
| breakout_h20_vol1.2_stop1_rr2 | RANGE | OK (65) | 27 | 0.63 |
| breakout_h20_vol1.2_stop1_rr2 | RISK_ON | OK (55) | 33 | 0.30 |

→ SOL × Breakout est plus polyvalent que NVDA — exploitable dans plusieurs régimes.

### COIN, MSTR × Breakout — exclusivement RISK_ON

Similaire à NVDA : leurs cellules STRONG/OK sont concentrées en RISK_ON. Cohérent (crypto-correlated, leveraged stocks).

### ASML × Breakout — aucune cellule exploitable

ASML est listé dans SETUPS_REGISTRY comme actif Breakout-compatible, mais la matrice per-régime ne retrouve **aucune cellule STRONG/OK** pour ASML × Breakout, quel que soit le régime. **L'intuition initiale est invalidée par les chiffres.** ASML reste exploitable en Pullback (cf. matrices précédentes) mais pas en Breakout.

### BTC × Breakout — 1 cellule OK seulement

Une seule cellule (breakout_h50 × RANGE, exp 0.21, PF 1.84). BTC × Breakout est marginal. À privilégier sur d'autres setups.

### SMH × Breakout — 2 cellules OK en RISK_ON (échantillons très petits)

SMH × Breakout n'a pas assez d'échantillon pour conclure. Pullback reste le setup de référence pour SMH.

## Non-régression confirmée

- `results-multi-setup-grid.json` : tous les champs existants byte-identiques (modulo `createdAt`). Seul `bySymbolByRegime` ajouté.
- `asset-quality-report`, `asset-setup-matrix`, `setup-variant-matrix` : JSON outputs byte-identiques après re-run.
- Walker `variant-regime-matrix-v1.mjs` non modifié — le fix de la PR #190 suffit.

## Limites résiduelles

- **MEAN_REVERSION et VOLATILITY_COMPRESSION** sont maintenant couverts par hasard (le multi-grid les inclut). Utile pour les blacklister rigoureusement, pas pour les promouvoir.
- **Walk-forward strict par régime** : toujours pas implémenté (priorité #2 du TODO quant). Une cellule STRONG sur l'historique reste susceptible de surajustement, surtout pour Breakout dont certaines variantes ont des PF = 999 (zéro pertes sur petit échantillon).
- **Effet de levier (SOXL)** : reste invisible au moteur.
- **Échantillons petits** : beaucoup de cellules Breakout × Régime ont < 20 trades. La confiance HIGH/MEDIUM/LOW dans le scoring est utile mais ne remplace pas un walk-forward.

## Conséquence opérationnelle

Le moteur peut maintenant orchestrer une décision per-(actif × setup × variante × régime) pour les 2 setups validés (Pullback, RS, et désormais Breakout). Exemple complet :

> Opportunité NVDA aujourd'hui. Régime macro actuel : RANGE.
> - NVDA × Pullback × RANGE : STRONG (plusieurs variantes) → autorisé
> - NVDA × Breakout × RANGE : AVOID → bloqué (les STRONG NVDA × Breakout sont en RISK_ON)
> - NVDA × RS × RANGE : AVOID → bloqué
> Décision : ouvrir en Pullback uniquement.

> Opportunité NVDA demain. Régime macro bascule en RISK_ON.
> - NVDA × Pullback × RISK_ON : 1 STRONG, 1 AVOID, 1 WEAK selon variante → choisir variante STRONG
> - NVDA × Breakout × RISK_ON : 4 STRONG/OK → AUTORISÉ
> Décision : ouvrir en Pullback ET surveiller Breakout pour second signal.

C'est exactement le niveau de granularité que l'allocation dynamique (priorité #4 du TODO quant) attendra pour fonctionner.

---

# Walk-Forward Regime Validator v1 — verrou anti-surajustement

Fichier créé :

```text
tools/backtests/walk-forward-regime-validator-v1.mjs
```

Réutilise `tools/backtests/lib/backtest-records.mjs` (emptyBucket, pushToBucket, summarizeBucket, listJsonFiles, toNumberOrNull, inferSetupFamily). Walker bySymbolByRegime local au script (parcours yearly tagué).

Sorties écrites :

- `tools/backtests/output/walk-forward-regime-validator.json`
- `tools/backtests/output/walk-forward-regime-validator.md`

Comment le relancer :

```text
node tools/backtests/walk-forward-regime-validator-v1.mjs
```

## Méthode

- **Split fixe** : TRAIN = 2021-2023 (3 ans) | TEST = 2024-2025 (2 ans).
- **Mode régime canonique** : ALL_REGIMES (le champ `regime` est la dimension étudiée, regimeMode est redondant pour ce validateur).
- Pour chaque cellule `(symbol, setup, variant, regime)`, agrégation séparée des records yearly train et test, puis classification en :
  - **PASS** : test trades ≥ 10, exp > 0, PF ≥ 1.1.
  - **WATCH** : test positif mais PF marginal (1.0-1.1) OU score drop > 50 %.
  - **FAIL** : test exp ≤ 0 avec ≥ 10 trades, OU PF < 1.0, OU drawdown > 2× totalR.
  - **INSUFFICIENT_DATA** : < 10 trades en test, ou observed years < 2, ou aucune donnée train/test.

## Résultat du premier run

- **9 509 cellules** analysées (symbol × setup × variant × regime, mode canonique ALL_REGIMES).
- **729 PASS** (7.7 %) — cellules dont le test confirme le train.
- **46 WATCH** (0.5 %) — positives mais marginales.
- **575 FAIL** (6.0 %) — surajustement détecté, à exclure du tradable-universe.
- **8 159 INSUFFICIENT_DATA** (85.8 %) — pas assez de signal en test pour conclure.

## Cross-check baseTier (variant-regime-matrix) × walkForwardTier

| Base | PASS | WATCH | FAIL | INSUFFICIENT_DATA |
|---|---:|---:|---:|---:|
| STRONG | **304** | 0 | **7** | 246 |
| OK | 216 | 4 | 16 | 814 |
| WEAK | 134 | 26 | 31 | 926 |
| AVOID | 75 | 16 | 521 | 6 173 |

Lecture :
- **98 % des STRONG-base avec verdict tranché passent le walk-forward** (304 / 311). Bonne cohérence de la matrice base.
- **7 cellules STRONG → FAIL** : verrou anti-surajustement qui retire ces cellules du tradable-universe.
- **75 cellules AVOID → PASS** : la matrice base écartait ces couples, mais le test 2024-2025 les valide. Échantillons à examiner — pourrait être du signal redécouvert ou du bruit.

## Les 7 STRONG → FAIL

| Symbole | Setup | Variante | Régime | Train (exp/PF) | Test (exp/PF) | Raison |
|---|---|---|---|---|---|---|
| BTC | PULLBACK | `base_rsi42_58_chg20_0_stop0.1` | RANGE | 1.20 / 5.07 | **-0.05** / 1.07 | test expectancy ≤ 0 |
| BTC | PULLBACK | `pullback_base_rsi42_58_chg20_0_stop0.1` | RANGE | 1.48 / 5.07 | **-0.05** / 1.07 | test expectancy ≤ 0 |
| BTC | PULLBACK | `rsi42_58_chg20_3_stop0.1` | RANGE | 1.82 / 16.32 | 0.14 / 1.42 | drawdown 4.00 > 2× totalR |
| APP | RS_ROTATION | `rs_120d_top10_hold20` | RANGE | 1.74 / 3.76 | 0.49 / 0.28 | drawdown excessif (4 trades test) |
| APP | RS_ROTATION | `rs_90d_top10_hold20` | RANGE | 1.62 / 3.21 | 0.18 / 1.21 | drawdown excessif (2 trades test) |
| TTWO | PULLBACK | `rsi42_58_chg20_0_stop0.5` | RANGE | 1.62 / 10.73 | 0.07 / 2.02 | drawdown 1.00 > 2× totalR |
| USDJPY | PULLBACK | `base_rsi42_58_chg20_0_stop0.1` | RANGE | 1.08 / 5.03 | 0.02 / 1.47 | drawdown excessif |

→ **BTC × Pullback × RANGE** est le cas le plus net : 3 variantes différentes du même setup tombent en FAIL avec test exp ≤ 0. Le STRONG sur l'historique 2021-2023 était probablement de la chance ou du sur-ajustement. À retirer du tradable-universe BTC × Pullback × RANGE.

## Distribution par setup

| Setup | PASS | WATCH | FAIL | INSUFF. | Ratio PASS/FAIL |
|---|---:|---:|---:|---:|---:|
| PULLBACK_MOMENTUM | 631 | 41 | 455 | 5 393 | 1.4 |
| BREAKOUT_EXPANSION | 75 | 3 | 98 | 1 090 | **0.77** |
| RELATIVE_STRENGTH_ROTATION | 14 | 0 | 9 | 397 | 1.6 |
| MEAN_REVERSION | 7 | 0 | 11 | 970 | 0.6 |
| VOLATILITY_COMPRESSION | 2 | 2 | 2 | 309 | 1.0 |

→ **Breakout est le seul setup validé où FAIL > PASS**. Confirme sa fragilité (consistante avec PR #191 qui montrait beaucoup de cellules avec PF=999 sur petit échantillon). Le walk-forward filtre ces cas.

→ **MEAN_REVERSION** confirme son statut FAILED dans SETUPS_REGISTRY : plus de FAIL que de PASS.

## Cas notables des actifs focus (verdicts tranchés)

### NVDA — 1 FAIL, 2 PASS
- `rsi45_55_chg20_0_stop0.1` × RISK_ON : WEAK → FAIL — variante trop laxiste, déjà identifiée précédemment.
- `breakout_h20_vol1.2_stop1_rr2` × RISK_ON : STRONG → PASS (test 16 trades, exp 0.69, PF 3.66).
- `breakout_h50_vol1.2_stop1.5_rr2.5` × RISK_ON : STRONG → PASS (test 16 trades, exp 1.03, PF 4.57).

→ NVDA × Breakout × RISK_ON est rigoureusement validé par le walk-forward, malgré le score STRONG basé sur seulement 2 trades de train. Le test 2024-2025 confirme.

### SOXL — surprise positive
- `pullback_base_rsi42_58_chg20_0_stop0.1` × RISK_ON : WEAK → FAIL (PF 0.70 malgré exp 1.87 — quelques grosses pertes).
- `rs_120d_top10_hold20` × RISK_ON : **AVOID → PASS** (test 15 trades, exp 1.13, PF 2.08).
- `rs_90d_top10_hold20` × RISK_ON : **OK → PASS** (test 16 trades, exp 0.97, PF 2.98).

→ Le walk-forward **promeut SOXL × RS × RISK_ON** au-dessus de la matrice base. Cas où la matrice base était trop pessimiste car les vieux trades étaient mauvais, mais 2024-2025 confirme. À surveiller (effet de levier 3× toujours invisible au moteur).

### PLTR — 5 cellules base OK toutes en PASS
- 5 variantes Pullback × RISK_ON validées (toutes avec train=1 trade — exp 4.40 — et test ≥ 10 trades, exp 0.28-0.43, PF 1.48-1.89).

→ PLTR est consistant : la matrice base le classait OK sur des chiffres maigres en train (1 trade), mais le test 2024-2025 confirme avec 10-13 trades à exp positive. Verdict robuste.

## Non-régression confirmée

Les 4 moteurs précédents (asset-quality, asset-setup-matrix, setup-variant-matrix, variant-regime-matrix) ont été ré-exécutés et leurs JSON outputs comparés byte-par-byte (modulo `generatedAt`) : **strictement identiques**. Le nouveau validateur ne touche aucun script existant.

## Conséquence opérationnelle — 5 niveaux de filtre

Le tradable-universe final pour un trade (symbol × variant × régime macro courant) doit passer les 5 filtres :

1. **asset-quality** : tier global ≠ BLACKLIST.
2. **asset-setup-matrix** : (asset × setup) tier ≥ OK.
3. **setup-variant-matrix** : (asset × setup × variant) tier ≥ OK.
4. **variant-regime-matrix** : (asset × variant × régime macro courant) tier ≥ OK.
5. **walk-forward-regime-validator** : verdict = PASS (ou WATCH avec allocation réduite).

Une cellule qui passe les 4 premiers mais FAIL au 5e doit être **exclue**. C'est exactement le cas des 7 STRONG → FAIL identifiés ici.

## Limites résiduelles

- **Split unique** : un seul split (3/2). Un split roulant donnerait une vue plus robuste mais avec des échantillons encore plus petits. À considérer en v2.
- **85.8 % INSUFFICIENT_DATA** : la grande majorité des cellules ne peut pas être validée par manque de données 2024-2025. Le tradable-universe filtré reste donc largement basé sur les 4 niveaux précédents.
- **Pas de frictions** : ce walk-forward suppose des coûts de transaction nuls. Une cellule PASS peut redevenir FAIL avec slippage/spread/frais réels. Priorité #3 du TODO quant.
- **Pas de validation régime cross-period** : si le régime macro 2024-2025 ne ressemble pas à celui de 2021-2023, les verdicts peuvent être trompeurs. Idéalement, faire le walk-forward CONDITIONNELLEMENT au régime (mais les samples deviennent triviaux).
- **Effet de levier (SOXL) toujours invisible** : SOXL × RS × RISK_ON sort PASS sur les chiffres bruts mais reste un instrument à risque non-linéaire.
- **Verdict ≠ autorisation live** : un PASS dit "le passé récent confirme le passé long". Cela ne garantit pas le futur. Toujours combiner avec gestion du risque et observation live.

---

# Tradable Universe v1 — consolidateur officiel des 5 moteurs

Fichier créé :

```text
tools/backtests/tradable-universe-v1.mjs
```

Combine les 5 moteurs précédents en une décision finale par cellule `(symbol × setup × variant × regime)`. Mode régime canonique : `ALL_REGIMES`.

Sorties écrites :

- `tools/backtests/output/tradable-universe.json`
- `tools/backtests/output/tradable-universe.md`

Comment le relancer :

```text
node tools/backtests/tradable-universe-v1.mjs
```

## Logique de décision

Une cellule traverse séquentiellement les 5 filtres. Le premier échec déclenche BLOCK.

1. **asset-quality** : BLACKLIST → BLOCK.
2. **asset-setup-matrix** : AVOID ou WEAK → BLOCK.
3. **setup-variant-matrix** : AVOID ou WEAK → BLOCK.
4. **variant-regime-matrix** : AVOID ou WEAK → BLOCK.
5. **walk-forward** : FAIL → BLOCK.

Décision finale parmi celles ayant passé les 5 filtres :
- **WF PASS** → ALLOW.
- **WF WATCH** → REDUCE.
- **WF INSUFFICIENT_DATA** → EXPERIMENTAL si variant-regime STRONG ET asset-quality ELITE/CORE ET confiance ≥ MEDIUM. Sinon BLOCK.

Caps de politique :
- **Setup non-prioritaire** (MEAN_REVERSION, VOLATILITY_COMPRESSION) → jamais ALLOW. Au mieux EXPERIMENTAL.
- **ETF leveragé** (SOXL, USD ProShares 2× semis, ROM) → jamais ALLOW. Au mieux REDUCE.

Composite tier :
- **A** : ALLOW + HIGH confidence + setup prioritaire + non leveragé.
- **B** : ALLOW autre.
- **C** : REDUCE.
- **D** : EXPERIMENTAL.
- **BLOCKED** : BLOCK.

Allocation profile : A/B → `normal`, C → `reduced`, D → `micro`, BLOCKED → `none`.

## Résultat du premier run

- **10 878 cellules** évaluées (symbol × setup × variant × regime).
- **346 ALLOW** (3.2 %) — 183 tier A + 163 tier B.
- **10 REDUCE** (0.1 %).
- **182 EXPERIMENTAL** (1.7 %).
- **10 340 BLOCK** (95.0 %).

Rejets par filtre :

| Filtre | Cellules rejetées |
|---|---:|
| asset-quality BLACKLIST | 3 006 |
| asset-setup AVOID/WEAK | 3 582 |
| setup-variant AVOID/WEAK | 1 908 |
| variant-regime AVOID/WEAK | 1 396 |
| walk-forward FAIL ou INSUFF sans base très forte | 448 |
| Total BLOCK | **10 340** |

## STRONG-base bloqués par walk-forward (5 cellules)

C'est exactement le verrou anti-surajustement attendu — ces cellules étaient STRONG dans la matrice variant-regime mais BLOCK ici via WF FAIL :

- BTC × PULLBACK_MOMENTUM × RANGE × 3 variantes (`base_rsi42_58_chg20_0_stop0.1`, `pullback_base_rsi42_58_chg20_0_stop0.1`, `rsi42_58_chg20_3_stop0.1`).
- APP × RELATIVE_STRENGTH_ROTATION × RANGE × 2 variantes (`rs_90d_top10_hold20`, `rs_120d_top10_hold20`).

→ APP × RS × **RISK_ON** reste ALLOW (tier A même), c'est le couple RANGE qui est éjecté.

## Top 5 cellules tier A (ALLOW + HIGH + priority + non-leveraged)

| Symbole | Setup | Variante | Régime | Score VR | WF test trades | WF test exp |
|---|---|---|---|---:|---:|---:|
| VUG | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RISK_ON | 95 | 26 | 1.79 |
| SPYG | PULLBACK_MOMENTUM | rsi42_58_chg20_0_stop0.5 | RISK_ON | 95 | 23 | 1.37 |
| APP | RELATIVE_STRENGTH_ROTATION | rs_90d_top10_hold20 | RISK_ON | 95 | 25 | 2.65 |
| IYW | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RISK_ON | 95 | 28 | 1.71 |
| SOXQ | PULLBACK_MOMENTUM | base_rsi42_58_chg20_0_stop0.1 | RISK_ON | 95 | 30 | 1.87 |

Toutes en RISK_ON, tous avec test 2024-2025 robuste (≥ 23 trades, exp > 1.3, PF élevé). C'est exactement le profil de cellule à privilégier dans l'allocation.

## Cas focus

| Actif | Total | ALLOW | REDUCE | EXP | BLOCK | Note |
|---|---:|---:|---:|---:|---:|---|
| NVDA | 69 | 1 | 0 | 5 | 63 | ALLOW B sur Breakout h50 RISK_ON. EXP sur Pullback RANGE. |
| PLTR | 60 | 5 | 0 | 11 | 44 | 5 ALLOW B sur Pullback RISK_ON. Actif riche. |
| APP | 66 | 1 | 0 | 1 | 64 | ALLOW **A** sur RS rs_90d RISK_ON. APP × RANGE bloqué par WF FAIL. |
| SMCI | 83 | 2 | 0 | 5 | 76 | 2 ALLOW B sur Breakout h20/h50 RISK_ON. |
| AVGO | 73 | 0 | 0 | 0 | 73 | **Aucune cellule tradable**. Filtres setup-variant ou variant-regime éliminent toutes les combinaisons. |
| SOXL | 65 | 0 | 0 | 0 | 65 | **Aucune cellule tradable**. Cap leveraged + filtres en amont. |
| BTC | 72 | 0 | 0 | 1 | 71 | 1 EXP D seulement. BTC × Pullback × RANGE éjecté par WF FAIL. |
| SOL | 66 | 2 | 0 | 5 | 59 | 2 ALLOW dont 1 tier A (Breakout h20 RISK_ON), 1 tier B (RS RISK_ON). |
| COIN | 54 | 1 | 0 | 0 | 53 | 1 ALLOW B sur RS RISK_ON. |
| MSTR | 66 | 4 | 0 | 0 | 62 | 4 ALLOW B (RS + Breakout RISK_ON). |

## Non-régression confirmée

Les 5 moteurs sources (asset-quality, asset-setup-matrix, setup-variant-matrix, variant-regime-matrix, walk-forward-regime-validator) ont été ré-exécutés et leurs JSON outputs comparés byte-par-byte (modulo `generatedAt`) : **strictement identiques**. Le consolidateur ne modifie aucun moteur amont, il lit seulement.

## Conséquence opérationnelle

Le moteur dispose désormais d'un **point d'entrée unique** pour la décision tradable :

```text
tools/backtests/output/tradable-universe.json
```

L'allocation-engine futur n'a plus à lire les 5 fichiers — il consomme `cells[]` filtré par `decision !== "BLOCK"` et trie par `compositeTier`. Les politiques (non-prioritaire, leveraged) sont déjà appliquées en amont.

## Limites résiduelles

- **Dépend de la fraîcheur des 5 sources** : si l'une est obsolète, des cellules entières peuvent être incorrectes. Toujours rerun les 5 moteurs avant ce consolidateur. À automatiser via un orchestrator script (non fait dans cette PR).
- **Mode régime canonique unique** : seul `ALL_REGIMES` est évalué. Les modes `NO_RISK_OFF` et `RISK_ON_ONLY` du backtest RS regime donnent par construction les mêmes cellules par régime individuel, donc non évalués séparément.
- **Cap leveraged sur 3 symboles seulement** : SOXL, USD, ROM. Liste à étendre si TQQQ, SQQQ, UPRO etc. arrivent dans l'univers.
- **Aucun coût de transaction** : ALLOW ≠ rentable avec slippage/spread/frais réels. Priorité #3 du TODO quant.
- **Walk-forward unique** : un seul split. INSUFFICIENT_DATA promu EXPERIMENTAL doit être manipulé prudemment.
- **Verdict ALLOW ≠ autorisation live** : ce JSON alimente un futur allocation-engine. Le passage à l'argent réel reste conditionné à : paper trading live validé, gestion du risque opérationnelle, kill-switch testé, connecteur broker.

## Prochaine étape recommandée

**Allocation engine v1** (priorité #4 du TODO quant). Maintenant que les 5 niveaux et leur consolidation produisent un tradable universe rigoureux, le moteur d'allocation peut prendre :

```text
tools/backtests/output/tradable-universe.json
```

et émettre des positions pondérées par tier (A/B/C/D) en respectant des contraintes globales (max N positions simultanées, max exposition par secteur/crypto, max exposition leveraged, etc.). C'est l'étape qui transforme la recherche quant en décisions de sizing concrètes.

---

# Documentation gouvernance agents Claude Code

Documentation ajoutée dans :
- `GPT_ROLE.md` : section *Claude Code Agents & Skills Governance* + sous-section *Quantitative Governance*. Liste les 7 agents (bug-hunter, claude, claude-code-guide, Explore, general-purpose, Plan, statusline-setup) et les skills, avec rôle, limites, outils, cas d'usage interdits.
- `CLAUDE.md` : rappel court pointant vers `GPT_ROLE.md` + règle de déclaration en PR.
- `CHECKLIST_MERGE.md` : nouvelle section *Transparence agents Claude Code* avec checklist obligatoire.

But : que ChatGPT (validateur) sache exactement ce que Claude peut déléguer en arrière-plan et ce qui reste sous responsabilité directe. Empêche qu'une délégation invisible influence un merge quant.

Règles posées :
- Les agents ne valident jamais les décisions quant.
- Les agents ne peuvent pas auto-merger.
- Toute utilisation d'agent dans une PR doit être déclarée.
- Les moteurs quant restent implémentés directement par Claude, pas par un agent isolé.
- Aucun merge important sans `GO MERGE` explicite ChatGPT.

Aucun impact runtime. Aucun impact quant. Documentation uniquement.
