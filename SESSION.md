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
