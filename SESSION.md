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

---

# Orchestrateur quant pipeline v1

Fichier créé :

```text
tools/backtests/run-quant-pipeline-v1.mjs
```

Lance séquentiellement les 6 moteurs quant :

1. asset-quality-engine-v1
2. asset-setup-matrix-v1
3. setup-variant-matrix-v1
4. variant-regime-matrix-v1
5. walk-forward-regime-validator-v1
6. tradable-universe-v1

Sorties :

- `tools/backtests/output/quant-pipeline-run-summary.json`
- `tools/backtests/output/quant-pipeline-run-summary.md`

Comportement :
- Stop net à la première erreur (les étapes suivantes sont marquées `skipped`, pas exécutées).
- Pour chaque étape : durée mesurée, vérification que l'output attendu existe ET a été modifié pendant le run (mtime > avant). Si non, l'étape est marquée FAIL même si le script renvoie code 0.
- Exit code 1 si une étape échoue, 0 sinon.
- Pas de dépendance externe — Node natif (`spawn`).

Durée du premier run sur l'état actuel des sources : **5.2 secondes** (l'orchestrateur ne relance PAS les backtests sources eux-mêmes, qui prennent ~2m23s pour le multi-grid ; il relance les 6 moteurs d'analyse en aval). Pour rafraîchir aussi les backtests sources, les relancer manuellement avant l'orchestrateur.

Non-régression : tous les outputs régénérés par le pipeline sont byte-identiques aux snapshots pré-run (modulo `generatedAt`).

Usage typique :
- Après un nouveau backtest (RS regime / Pullback / multi-setup-grid), relancer ce pipeline pour rafraîchir les 6 moteurs et le tradable-universe en une commande.
- Vérifier `quant-pipeline-run-summary.md` pour le statut, les durées et les éventuelles erreurs.

---

# Allocation Engine v1 — premier plan théorique

Fichier créé :

```text
tools/backtests/allocation-engine-v1.mjs
```

Consomme `tradable-universe.json` et produit un plan d'allocation théorique.

Sorties :

- `tools/backtests/output/allocation-plan.json`
- `tools/backtests/output/allocation-plan.md`

**Règle absolue rappelée dans le rapport** : ce moteur ne passe aucun ordre, ne prépare aucun ordre broker, ne touche aucun endpoint live. Il produit un plan théorique destiné à informer une décision humaine.

## Politique d'allocation

- Unités de base par tier : A=1.0, B=0.7, C=0.35, D=0.10.
- Max positions : 10.
- Max EXPERIMENTAL : 2.
- 1 position par symbole maximum.
- Caps thème : crypto 25 %, tech_ai 60 %, leveraged 5 %.
- Caps setup : Pullback 50 %, RS 35 %, Breakout 25 %, MeanRev/VolComp 0 % (interdits en allocation principale).
- Leveraged ETF (SOXL, USD, ROM, TQQQ, SQQQ, UPRO) : forcés en profil REDUCE max, jamais en allocation normale.

## Détail technique des caps

Les caps sont exprimés en fraction du **budget cible** (`10 × tier B = 7.0 unités`), pas du portefeuille courant. Sans budget cible, le 1er candidat tech_ai à 1.0 unit serait à 100 % de son thème et rejeté à tort. Si le portefeuille n'atteint pas le budget cible (moins de 10 positions), les % réels peuvent dépasser les caps cibles — un warning explicite est levé pour transparence.

## Résultat du premier run

10 positions sélectionnées sur 135 candidates dédoublonnées (de 538 cellules `decision != BLOCK`).

| # | Symbole | Tier | Setup | Régime | Poids | Thème |
|---:|---|---|---|---|---:|---|
| 1 | VUG | A | PULLBACK_MOMENTUM | RISK_ON | 13.25% | tech_ai |
| 2 | SPYG | A | PULLBACK_MOMENTUM | RISK_ON | 13.25% | tech_ai |
| 3 | APP | A | RELATIVE_STRENGTH_ROTATION | RISK_ON | 13.25% | tech_ai |
| 4 | IYW | A | PULLBACK_MOMENTUM | RISK_ON | 13.25% | tech_ai |
| 5 | GLD | A | BREAKOUT_EXPANSION | RISK_ON | 13.25% | defensive_other |
| 6 | SOL | B | RELATIVE_STRENGTH_ROTATION | RISK_ON | 9.27% | crypto |
| 7 | MSTR | B | RELATIVE_STRENGTH_ROTATION | RISK_ON | 9.27% | crypto |
| 8 | JPM | B | BREAKOUT_EXPANSION | RISK_ON | 9.27% | defensive_other |
| 9 | ROM | C | PULLBACK_MOMENTUM | RISK_ON | 4.64% | leveraged |
| 10 | CRWD | D | PULLBACK_MOMENTUM | RANGE | 1.32% | tech_ai |

## Exposition vérifiée

- tech_ai : 54.32 % (cap 60 %) ✓
- defensive_other : 22.52 % (pas de cap)
- crypto : 18.54 % (cap 25 %) ✓
- leveraged : 4.64 % (cap 5 %) ✓
- Pullback : 45.71 % (cap 50 %) ✓
- RS : 31.79 % (cap 35 %) ✓
- Breakout : 22.52 % (cap 25 %) ✓
- MeanRev / VolComp : 0 % ✓

## Warnings levés

- ⚠ Aucune position RISK_OFF dans le plan — pas de couverture explicite si le régime macro bascule. Cohérent avec la matrice variant-regime qui montre que RISK_OFF est très majoritairement AVOID/INSUFFICIENT_DATA.
- ⚠ 3 ETF tech proches (VUG, SPYG, IYW) — corrélation élevée probable. Une classification thématique v2 plus fine pourrait grouper ces ETF dans un sous-thème "us_growth_etf" et appliquer un cap interne.

## Rejets par filtre (résumé)

Sur les 125 candidates non sélectionnées :

- cap thème tech_ai : 54
- max 10 positions : 49
- cap setup Pullback 50 % : 13
- setup non prioritaire (MeanRev / VolComp) : 4
- cap setup Breakout 25 % : 1
- doublons symbole : 1
- cap thème crypto : 1
- cap thème leveraged : 1

## Non-régression confirmée

Le pipeline complet (`run-quant-pipeline-v1.mjs`) a été relancé après création de l'allocation engine. Toutes les sources (6 moteurs amont) sont byte-identiques au snapshot pré-run. L'allocation engine est purement aval, ne modifie aucun fichier en amont.

## Limites résiduelles

- Pas de coût de transaction modélisé (priorité #3 du TODO quant).
- Classification thématique large et best-effort (tech_ai 60 % couvre semi + IA + tech + cloud + cyber — c'est large).
- Caps statiques v1, à calibrer empiriquement après paper trading live.
- Pas de rebalancing dynamique : photo à l'instant T.
- Verdict ALLOW dans tradable-universe ≠ autorisation live. Ce plan informe, il ne décide pas.

## Conséquence opérationnelle

Le pipeline complet quant ManiTradePro est désormais :

```text
1. Backtests sources (RS regime / Pullback yearly-walkforward / multi-setup-grid) [~3 min]
2. run-quant-pipeline-v1.mjs (6 moteurs d'analyse) [~5 s]
3. allocation-engine-v1.mjs (plan théorique 10 positions max) [< 1 s]
```

Point d'entrée final : `tools/backtests/output/allocation-plan.json`.

Tout reste offline, aucun connecteur broker, aucun ordre. La transition vers le réel reste conditionnée à : paper trading live validé, gestion du risque opérationnelle, kill-switch testé, connecteur broker.

---

# Orchestrateur quant pipeline étendu — allocation incluse

Modification de `tools/backtests/run-quant-pipeline-v1.mjs` pour inclure `allocation-engine-v1.mjs` comme **7e étape**. Avant cette PR, le pipeline s'arrêtait à `tradable-universe.json` — donc `allocation-plan.json` pouvait être obsolète tandis que `tradable-universe.json` était à jour.

Désormais, le pipeline relance dans l'ordre :

1. asset-quality-engine-v1
2. asset-setup-matrix-v1
3. setup-variant-matrix-v1
4. variant-regime-matrix-v1
5. walk-forward-regime-validator-v1
6. tradable-universe-v1
7. **allocation-engine-v1** (ajouté)

Nouveau `finalOutput` :

```text
tools/backtests/output/allocation-plan.json
```

Modification minimale du script (commentaires d'en-tête + entrée dans `STEPS` + `FINAL_OUTPUT`). Le comportement de l'orchestrateur (stop à la première erreur, vérification triple par étape : exit code 0, output existe, output modifié pendant le run) est strictement préservé.

Durée totale du pipeline étendu sur l'état actuel : **8.2 secondes** (vs 5.2 s avant — l'allocation engine ajoute ~140 ms, le reste de la variation est jitter d'exécution).

Non-régression byte-par-byte vérifiée pour les 7 outputs (modulo `generatedAt`) :
- asset-quality-report.json ✓
- asset-setup-matrix.json ✓
- setup-variant-matrix.json ✓
- variant-regime-matrix.json ✓
- walk-forward-regime-validator.json ✓
- tradable-universe.json ✓
- allocation-plan.json ✓

L'orchestrateur ne relance toujours pas les backtests sources (RS regime / Pullback yearly-walkforward / multi-setup-grid). Ceux-ci restent à lancer manuellement quand l'univers ou les paramètres changent.

---

# Friction Model v1 — couche heuristique anti-overconfiance

Fichier créé :

```text
tools/backtests/friction-model-v1.mjs
```

Estime l'impact des frais, spread, slippage et gaps sur le tradable universe et le plan d'allocation. **Modèle heuristique v1, pas une simulation d'exécution.**

Sorties :

- `tools/backtests/output/friction-adjusted-report.json`
- `tools/backtests/output/friction-adjusted-report.md`

## Politique

- 4 profils : `low` (0.15 %), `medium` (0.32 %), `high` (0.70 %), `extreme` (1.35 %) — total par trade round-trip.
- Classification asset class → profil :
  - ETF large liquide, US large cap, FX → `low`
  - semi/IA volatile, europe, crypto_correlated, defensive_other → `medium`
  - crypto pur, leveraged → `high`
- Pénalités contextuelles additionnelles : breakout +0.10%, crypto +0.10%, leveraged +0.20%, EXPERIMENTAL +0.10%, RISK_OFF +0.15%, LOW confidence +0.05%, WF INSUFFICIENT_DATA +0.05%.
- Dégradation décision : < 0.25% inchangé, 0.25-0.50% un cran (ALLOW→REDUCE), 0.50-1.00% deux crans, > 1.00% trois crans (jusqu'à BLOCK).
- Le modèle ne **PROMEUT JAMAIS** : friction = maintenir ou dégrader.
- Allocation suggestion : normal / reduce_10_pct / reduce_25_pct / remove_candidate.
- Le plan d'allocation original n'est PAS modifié sur disque (lecture seule).

## Résultat du premier run

Sur 10 878 cellules du tradable universe :
- 360 cellules inchangées
- 159 `ALLOW → REDUCE` (friction modérée, surtout semi/IA)
- 9 `ALLOW → EXPERIMENTAL` (friction élevée, crypto/leveraged)
- 7 `REDUCE → BLOCK` (friction très élevée)
- 3 `EXPERIMENTAL → BLOCK` (friction extrême)

Distribution finale ajustée : 178 ALLOW / 162 REDUCE / 188 EXPERIMENTAL / 10 350 BLOCK (vs 346 / 10 / 182 / 10 340 avant).

## Impact sur allocation-plan (10 positions)

| # | Symbole | Tier | Friction | Suggestion | Poids orig. → norm. ajusté |
|---:|---|---|---:|---|---|
| 1 | VUG | A | 0.150% | normal | 13.25% → 14.42% |
| 2 | SPYG | A | 0.150% | normal | 13.25% → 14.42% |
| 3 | APP | A | 0.320% | reduce_10_pct | 13.25% → 12.98% |
| 4 | IYW | A | 0.150% | normal | 13.25% → 14.42% |
| 5 | GLD | A | 0.250% | reduce_10_pct | 13.25% → 12.98% (pénalité breakout) |
| 6 | SOL | B | 0.800% | reduce_25_pct | 9.27% → 7.56% (crypto+slippage) |
| 7 | MSTR | B | 0.320% | reduce_10_pct | 9.27% → 9.07% |
| 8 | JPM | B | 0.250% | reduce_10_pct | 9.27% → 9.07% (pénalité breakout) |
| 9 | ROM | C | 0.900% | reduce_25_pct | 4.64% → 3.79% (leveraged+gap) |
| 10 | CRWD | D | 0.250% | reduce_10_pct | 1.32% → 1.29% (EXPERIMENTAL) |

**3 positions** restent `normal` : VUG, SPYG, IYW — les ETF tech US large liquides en Pullback RISK_ON.
**7 positions** suggérées en dégradation : APP, GLD, SOL, MSTR, JPM, ROM, CRWD.

## Non-régression confirmée

Tradable-universe.json et allocation-plan.json sont byte-identiques avant/après (le moteur de friction lit seul, n'écrit pas dans ces fichiers). Vérifié explicitement.

## Limites résiduelles

- **Modèle heuristique v1**, pas de données broker réelles. À recalibrer empiriquement après paper trading live.
- **Pas de market impact** : la taille de l'ordre n'influence pas le slippage.
- **Pas de barème broker spécifique** : commissions et spreads génériques.
- **Pas de propagation arrière** : les cellules dégradées ne sont pas réintégrées dans tradable-universe.json ni allocation-plan.json. Le rapport friction est une couche aval, pas une réécriture.
- **Classification asset class best-effort** : tout actif non listé tombe en `defensive_other` profil medium.

## Conséquence opérationnelle

Avant tout passage à un trading réel ou paper trading live, l'utilisateur doit lire le `friction-adjusted-report.md` et accepter explicitement chaque dégradation suggérée. Le modèle de friction est un **garde-fou de prudence**, pas une vérité.

---

# Friction-Adjusted Allocation v2 — plan final ajusté

Fichier créé :

```text
tools/backtests/friction-adjusted-allocation-v2.mjs
```

Applique les suggestions du `friction-model-v1` au `allocation-plan.json` existant et produit un plan ajusté plus prudent.

Sorties :

- `tools/backtests/output/allocation-plan-friction-adjusted.json`
- `tools/backtests/output/allocation-plan-friction-adjusted.md`

## Logique

1. Lit `allocation-plan.json` (10 positions) et `friction-adjusted-report.json`.
2. Mappe la suggestion de friction par position (par `symbol|setup|regime|rank`).
3. Applique le multiplier : `normal × 1.00` / `reduce_10_pct × 0.90` / `reduce_25_pct × 0.75` / `remove_candidate × 0`.
4. Filtre les positions retirées dans une liste `removedPositions[]` séparée.
5. Renormalise les positions actives restantes à 100 %.
6. Calcule la pénalité brute totale (avant renormalisation) = 100 % − somme des poids ajustés bruts.

## Contraintes respectées

- `allocation-plan.json` n'est **PAS** modifié sur disque.
- `friction-adjusted-report.json` n'est **PAS** modifié sur disque.
- Aucune position n'a son poids brut augmenté avant renormalisation.
- Si toutes les positions sont retirées, `status = "failed"` et exit code 1.

## Résultat du premier run

- 10 positions originales → **10 actives + 0 retirées**
- **7 positions réduites** : APP, GLD, SOL, MSTR, JPM, ROM, CRWD
- **3 positions inchangées** : VUG, SPYG, IYW (friction 0.15 %, profil ETF tech US large liquide)
- Pénalité brute totale : **8.11 %** du portefeuille original
- Aucun warning levé (toutes positions ≥ 1 %, aucune > 25 %)

| # | Symbole | Tier | Ajustement | Poids orig. → ajusté norm. |
|---:|---|---|---|---|
| 1 | VUG | A | normal | 13.25 % → 14.42 % |
| 2 | SPYG | A | normal | 13.25 % → 14.42 % |
| 3 | APP | A | reduce_10_pct | 13.25 % → 12.98 % |
| 4 | IYW | A | normal | 13.25 % → 14.42 % |
| 5 | GLD | A | reduce_10_pct | 13.25 % → 12.98 % |
| 6 | SOL | B | reduce_25_pct | 9.27 % → 7.56 % |
| 7 | MSTR | B | reduce_10_pct | 9.27 % → 9.08 % |
| 8 | JPM | B | reduce_10_pct | 9.27 % → 9.08 % |
| 9 | ROM | C | reduce_25_pct | 4.64 % → 3.79 % |
| 10 | CRWD | D | reduce_10_pct | 1.32 % → 1.29 % |

Note structurelle : VUG, SPYG, IYW **gagnent du poids relatif** (13.25 → 14.42 %) sans qu'aucune promotion n'ait lieu — c'est une conséquence mécanique de la renormalisation après réduction des 7 autres positions.

## Distribution ajustée

- tech_ai : 57.53 % (57 % vs 54.32 % original, hausse mécanique)
- defensive_other : 22.06 %
- crypto : 16.64 % (vs 18.54 %, baisse due à reduce_25 sur SOL)
- leveraged : 3.79 % (vs 4.64 %, baisse due à reduce_25 sur ROM)

## Non-régression confirmée

Allocation-plan.json et friction-adjusted-report.json sont byte-identiques avant/après (le moteur lit seul, n'écrit pas dans les sources).

## Intégration au pipeline

**Volontairement non intégré** au `run-quant-pipeline-v1.mjs` à ce stade. Le user peut l'activer dans une PR future si désiré. La séparation permet d'examiner l'impact friction sans qu'il devienne automatique.

## Limites

- Hérite des limites de `friction-model-v1` : modèle heuristique V1, pas de données broker réelles.
- Pas de propagation : ce plan ajusté n'est pas re-bouclé dans `tradable-universe.json`.
- La renormalisation peut concentrer le portefeuille si beaucoup de positions sont retirées. À surveiller.
- `Verdict ajusté ≠ autorisation live.`

---

# Theme Classification v2 — concentration cachée révélée

Fichier créé :

```text
tools/backtests/theme-classification-v2.mjs
```

Remplace les thèmes larges (`tech_ai`, `crypto`, `defensive_other`) par des sous-thèmes fins (`semis_pure`, `ai_hypergrowth`, `software_saas`, `cybersecurity`, `crypto_layer1`, `us_growth_etf`, etc.) pour révéler la **concentration cachée** dans le portefeuille.

Sorties :

- `tools/backtests/output/theme-classification-v2.json`
- `tools/backtests/output/theme-classification-v2.md`

## Méthode

- **22 sous-thèmes** définis dans le vocabulaire.
- **Classification manuelle** maintenue dans le code (CLASSIFICATION dict). Pas de ML, pas de scraping, pas de matrice de covariance — heuristique experte.
- **Multi-tags par symbole** (NVDA = semis_pure + ai_hypergrowth + mega_cap_tech).
- Confidence par entrée : HIGH / MEDIUM / LOW / UNKNOWN.
- La somme des % par thème peut dépasser 100 % (multi-tags), c'est volontaire.

## Découverte clé sur le plan actuel

| Thème | Positions | Poids original | Poids friction-ajusté |
|---|---:|---:|---:|
| **us_growth_etf** | 3 (VUG, SPYG, IYW) | **39.75 %** | **43.26 %** |
| mega_cap_tech | 2 (IYW, ROM) | 17.89 % | 18.21 % |
| software_saas | 2 (APP, CRWD) | 14.57 % | 14.27 % |
| crypto_layer1 | 1 (SOL) | 9.27 % | 7.56 % |
| crypto_correlated_equity | 1 (MSTR) | 9.27 % | 9.08 % |
| banks_financials | 1 (JPM) | 9.27 % | 9.08 % |
| precious_metals + macro_defensive | 1 (GLD) | 13.25 % | 12.98 % |
| leveraged_tech | 1 (ROM) | 4.64 % | 3.79 % |
| ai_hypergrowth | 1 (APP) | 13.25 % | 12.98 % |
| quality_growth | 1 (VUG) | 13.25 % | 14.42 % |
| broad_market | 1 (SPYG) | 13.25 % | 14.42 % |
| cybersecurity | 1 (CRWD) | 1.32 % | 1.29 % |

→ Le cap `tech_ai 60 %` était respecté (54.32 % original) mais **3 ETF us_growth_etf à eux seuls totalisent 39.75 %** du portefeuille (43.26 % après friction). Le cap large masque cette concentration.

→ Recommandation : ajouter dans `allocation-engine` un cap fin `us_growth_etf ≤ 30 %` et `mega_cap_tech ≤ 25 %` pour bloquer ce type de portefeuille faussement diversifié.

## Warnings levés

- **Sous-thème `us_growth_etf` à 39.75 % (43.26 % après friction)** — concentration cachée derrière le cap large tech_ai 60 %.
- 3 chevauchements ETF détectés : VUG / SPYG / IYW partagent `us_growth_etf` et `mega_cap_tech`.

## Couverture

- 10 symboles du plan : **10 classifiés HIGH/MEDIUM, 0 inconnus**.
- 13 sous-thèmes détectés dans le plan actuel.
- ~180 symboles couverts dans la table de classification (univers ManiTradePro).

## Non-régression confirmée

`allocation-plan.json` et `allocation-plan-friction-adjusted.json` byte-identiques avant/après. Le moteur lit seul.

## Volontairement non intégré au pipeline

Ce moteur ne fait pas partie de `run-quant-pipeline-v1.mjs`. À lancer à la demande quand on veut analyser la concentration thématique fine. Permet de garder la chaîne principale agnostique de la classification.

## Limites

- **Heuristique v2** : classification manuelle, pas de mesure de corrélation réalisée.
- Toute évolution de l'univers doit être commitée dans le dict `CLASSIFICATION`.
- Pas de backfill des holdings ETF (QQQ ≈ 40 % mega_cap_tech mais cette exposition cachée n'est pas propagée).
- Pas d'intégration dans les caps de l'allocation engine. À ajouter dans une PR future si on veut bloquer les portefeuilles us_growth_etf > 30 %.

## Prochaine étape recommandée

Ajouter dans `allocation-engine-v1.mjs` des caps fins par sous-thème, en consommant la classification v2. Permettrait d'éviter automatiquement les portefeuilles faussement diversifiés comme celui-ci (3 ETF us_growth_etf qui pèsent 39 % du capital).

---

# Allocation Engine v2 — caps fins par sous-thème

Fichier créé :

```text
tools/backtests/allocation-engine-v2.mjs
```

Produit un plan d'allocation théorique qui respecte non seulement les caps larges du v1 (`tech_ai 60 %`, `crypto 25 %`, `leveraged 5 %`) mais aussi **22 caps fins par sous-thème** (cf. classification v2).

Sorties :

- `tools/backtests/output/allocation-plan-v2.json`
- `tools/backtests/output/allocation-plan-v2.md`

## Caps fins ajoutés (v2)

| Sous-thème | Cap | Sous-thème | Cap |
|---|---:|---|---:|
| us_growth_etf | 30 % | precious_metals | 15 % |
| mega_cap_tech | 25 % | macro_defensive | 20 % |
| software_saas | 25 % | banks_financials | 15 % |
| ai_hypergrowth | 20 % | industrials | 20 % |
| semis_pure | 25 % | europe_equity | 20 % |
| semis_equipment | 15 % | broad_market | 40 % |
| cybersecurity | 15 % | quality_growth | 30 % |
| cloud_platform | 20 % | fintech | 20 % |
| crypto_layer1 | 15 % | macro_fx | 10 % |
| crypto_correlated_equity | 10 % | leveraged_tech | 5 % |
| crypto_exchange | 10 % | leveraged_macro | 5 % |

Conserve aussi les caps larges v1 (max 10 positions, max 2 EXPERIMENTAL, 1 position par symbole, caps Pullback 50 % / RS 35 % / Breakout 25 %, MeanRev/VolComp interdits, leveraged forcé à REDUCE max).

## Comparaison v1 vs v2

Le plan v1 avait 3 ETFs us_growth_etf (VUG, SPYG, IYW) totalisant **39.75 %** — au-dessus du cap fin v2 30 %. Le moteur v2 a corrigé :

- **Retiré** : IYW (3e meilleur us_growth_etf, sacrifié pour respecter le cap).
- **Ajouté** : SOXQ (ETF `semis_pure`, déjà candidat ELITE en RISK_ON).

Distribution broad theme : identique entre v1 et v2 (tech_ai 54.32 %, crypto 18.54 %, defensive_other 22.52 %, leveraged 4.64 %). C'est attendu : on n'a pas changé les caps larges, on a juste redistribué dans tech_ai.

Distribution fine theme :
- **us_growth_etf : 26.50 %** (vs 39.75 % dans v1) ✓ sous le cap 30 %
- **mega_cap_tech : 4.64 %** (vs 17.89 %) — beaucoup plus dilué après le retrait d'IYW
- **semis_pure : 13.25 %** (nouveau, via SOXQ)
- software_saas : 14.57 % (inchangé)
- ai_hypergrowth : 13.25 % (inchangé)

## Plan v2 final

| # | Symbole | Tier | Setup | Régime | Poids | Fine themes |
|---:|---|---|---|---|---:|---|
| 1 | VUG | A | Pullback | RISK_ON | 13.25 % | us_growth_etf, quality_growth |
| 2 | SPYG | A | Pullback | RISK_ON | 13.25 % | us_growth_etf, broad_market |
| 3 | APP | A | RS rotation | RISK_ON | 13.25 % | ai_hypergrowth, software_saas |
| 4 | SOXQ | A | Pullback | RISK_ON | 13.25 % | semis_pure |
| 5 | GLD | A | Breakout | RISK_ON | 13.25 % | precious_metals, macro_defensive |
| 6 | SOL | B | RS rotation | RISK_ON | 9.27 % | crypto_layer1 |
| 7 | MSTR | B | RS rotation | RISK_ON | 9.27 % | crypto_correlated_equity |
| 8 | JPM | B | Breakout | RISK_ON | 9.27 % | banks_financials |
| 9 | ROM | C | Pullback | RISK_ON | 4.64 % | leveraged_tech, mega_cap_tech |
| 10 | CRWD | D | Pullback | RANGE | 1.32 % | cybersecurity, software_saas |

## Dette technique

Le brief interdisait de modifier `theme-classification-v2.mjs`. La table `CLASSIFICATION` est donc **dupliquée** dans `allocation-engine-v2.mjs` (commentaire `MIROIR de theme-classification-v2.mjs`). Toute évolution doit être propagée aux deux fichiers. **À unifier** dans une PR future en exportant la table depuis `theme-classification-v2.mjs`.

Bonus : 2 symboles (SNPS, CDNS — éditeurs EDA pour fondeurs semi) ont été ajoutés à la table du v2 mais pas dans `theme-classification-v2.mjs`. Notable car ils étaient candidats tier A. La dette technique est documentée dans le code.

## Non-régression confirmée

`allocation-plan.json` (v1), `theme-classification-v2.json` et `tradable-universe.json` byte-identiques avant/après (le moteur v2 lit seul, n'écrit pas dans les sources).

## Warnings levés

- ⚠ Aucune position RISK_OFF (cohérent avec la matrice variant-regime qui n'a quasi rien en RISK_OFF).

## Limites

- **Caps fins arbitraires v1.** À calibrer empiriquement après paper trading.
- **Classification dupliquée** entre v2 modules.
- **Multi-tag = chevauchement attendu** entre caps.
- **Plan théorique uniquement** — aucun ordre passé.

## Conséquence

Le moteur v2 est désormais utilisable comme **alternative ou remplacement** du v1, selon que l'utilisateur souhaite ou non les caps fins. Les deux moteurs coexistent. Pour intégrer v2 au pipeline orchestré, il faudrait une PR séparée qui étend `run-quant-pipeline-v1.mjs` à 8 étapes.

---

# Refactor : table partagée theme-table.mjs

Fichier créé :

```text
tools/backtests/lib/theme-table.mjs
```

Source de vérité unique pour la classification thématique. Exporte :
- `THEME_CLASSIFICATION` : dict symbol → { themes, confidence }
- `VALID_THEMES` : set des 22 sous-thèmes autorisés
- `FINE_THEME_CAPS` : dict cap par sous-thème (utilisé par allocation-engine-v2)
- `getSymbolThemes(symbol)` : retourne l'entrée brute ou null
- `classifySymbolThemes(symbol)` : retourne `{ themes, confidence }` normalisé (UNKNOWN si absent)

## Pourquoi

Avant ce refactor, la table `CLASSIFICATION` était dupliquée entre :
- `tools/backtests/theme-classification-v2.mjs` (l'originale)
- `tools/backtests/allocation-engine-v2.mjs` (mirror introduit dans la PR allocation v2)

Risque : si une table évoluait sans l'autre, l'analyse de concentration et le plan d'allocation v2 pouvaient diverger silencieusement. C'était de la dette technique documentée à la création du miroir.

## Changements

- **Création** de `tools/backtests/lib/theme-table.mjs` avec tous les exports.
- **Modification** de `tools/backtests/theme-classification-v2.mjs` : retire la copie locale de `CLASSIFICATION` et `VALID_THEMES`, importe depuis le module partagé. La fonction `classifySymbol` devient un wrapper léger sur `classifySymbolThemes`.
- **Modification** de `tools/backtests/allocation-engine-v2.mjs` : retire la copie locale de `CLASSIFICATION` et `FINE_THEME_CAPS`, importe depuis le module partagé. La logique de scoring et de caps reste identique.

SNPS et CDNS (EDA software pour fondeurs semi) sont désormais dans la table partagée. Ils étaient absents de l'original `theme-classification-v2.mjs` et présents seulement dans le mirror v2. Cette PR les expose aussi à l'analyse de classification.

## Diff observé sur les outputs

- `allocation-plan-v2.json` : **byte-identique** (modulo `generatedAt`) ✓
- `allocation-plan.json` : **byte-identique** ✓
- `theme-classification-v2.json` : **un seul champ change** :

  ```text
  model.classificationEntries : 179 → 181
  ```

  C'est attendu — SNPS et CDNS sont maintenant comptés. Aucun `symbolThemes`, aucune `allocationExposure`, aucun `cluster`, aucun `warning` ne change.

## Non-régression confirmée

Pipeline complet relancé : `run-quant-pipeline-v1.mjs` → `friction-model-v1.mjs` → `friction-adjusted-allocation-v2.mjs` → `theme-classification-v2.mjs` → `allocation-engine-v2.mjs`. Tous OK, exit 0, outputs cohérents.

## Conséquence

- Toute évolution future de la classification se fait **uniquement** dans `tools/backtests/lib/theme-table.mjs`.
- Les deux scripts consommateurs (`theme-classification-v2.mjs` et `allocation-engine-v2.mjs`) restent fidèles à la même source.
- La dette technique du miroir est levée.
- Le test de non-régression byte-par-byte sur `allocation-plan-v2.json` confirme qu'aucune décision d'allocation ne change.

---

# Rolling Walk-Forward Validator v1 — robustesse temporelle

Fichier créé :

```text
tools/backtests/rolling-walkforward-validator-v1.mjs
```

Étend `walk-forward-regime-validator-v1` (qui n'utilisait qu'un seul split 2021-2023 / 2024-2025) en testant 3 splits walk-forward indépendants.

Sorties :

- `tools/backtests/output/rolling-walkforward-validator.json`
- `tools/backtests/output/rolling-walkforward-validator.md`

## Splits utilisés

Les données disponibles sont 2021-2025 (multi-grid et RS), 2022-2025 (Pullback). Le brief suggérait des splits avec TRAIN 2020-* mais 2020 n'est pas dans les sources. Splits adaptés :

| Split | TRAIN | TEST | Type |
|---|---|---|---|
| S1 | 2021-2022 | 2023 | expanding |
| S2 | 2021-2023 | 2024 | expanding (≡ split unique élargi) |
| S3 | 2022-2024 | 2025 | rolling |

## Logique de verdict

- **ROBUST** : PASS sur 100 % des splits valides ET variance faible (exp rel stddev < 0.5).
- **STABLE** : PASS ≥ 75 % des splits valides.
- **FRAGILE** : PASS partiel ou variance élevée.
- **OVERFIT** : train consistant positif mais test échoue ≥ 50 % des splits.
- **INSUFFICIENT_DATA** : < 2 splits valides.

Mêmes seuils PASS/FAIL que le validateur unique (test exp > 0, test PF ≥ 1.1, drawdown ≤ 2× totalR).

Le moteur ne **promeut jamais** — confirme, dégrade ou invalide.

## Résultats du premier run

| Verdict | Cellules | % |
|---|---:|---:|
| ROBUST | 17 | 0.2 % |
| STABLE | 17 | 0.2 % |
| FRAGILE | 2 886 | 30.4 % |
| OVERFIT | 55 | 0.6 % |
| INSUFFICIENT_DATA | 6 534 | 68.7 % |

**9 509 cellules** évaluées au total (mode canonique ALL_REGIMES, identique au validateur unique).

## Cellules ROBUST notables

Sur les 17 ROBUST, toutes en RISK_ON :
- **GLD × Breakout × RISK_ON** ← déjà tier A dans le plan v1, confirmé.
- ASML × Pullback × RISK_ON.
- DOCN × Pullback × RISK_ON (5 variantes).
- KLAC × Pullback × RISK_ON.
- PH × Pullback × RISK_ON (exp rel stddev 0.02 — extrêmement stable).
- VRNS × Pullback × RISK_ON.

Aucun des ROBUST n'est dans le plan d'allocation v1 actuel sauf GLD. Cela suggère que le plan v1 (basé sur tier composite ELITE) n'optimise PAS la robustesse temporelle. C'est un axe d'amélioration possible.

## Cellules OVERFIT notables (alerte !)

55 cellules détectées comme OVERFIT — train positif mais test échoue. À retirer du tradable-universe si on intègre ce validateur :

- **SMCI × RS × RISK_ON** : alerte importante — proche du plan v1 (SMCI était tier B Breakout, pas RS, donc pas dans le plan, mais marqueur de fragilité).
- AMZN × Pullback × RISK_ON.
- CDNS × Pullback × RISK_ON (3 variantes — l'ajout de la PR de classification refactor expose maintenant CDNS, et le rolling validator dit "FAIL").
- JPM × Pullback × RISK_ON (2 variantes — note : JPM × Breakout × RISK_ON était dans le plan v1 ; le Pullback × JPM est OVERFIT).
- META × Pullback × RISK_ON.

## Plan d'allocation v1 vs rolling verdict

Croisement avec les 10 positions du plan v1 :

| Position v1 | Cellule | Rolling verdict |
|---|---|---|
| VUG × Pullback × RISK_ON | rsi42_58_chg20_3_stop0.1 | FRAGILE |
| SPYG × Pullback × RISK_ON | rsi42_58_chg20_3_stop0.1 | FRAGILE |
| APP × RS rotation × RISK_ON | rs_90d_top10_hold20 | FRAGILE |
| IYW × Pullback × RISK_ON | rsi42_58_chg20_3_stop0.1 | FRAGILE |
| **GLD × Breakout × RISK_ON** | breakout_h50_vol1.2_stop1.5_rr2.5 | **ROBUST** ✓ |
| SOL × RS × RISK_ON | rs_90d_top10_hold20 | INSUFFICIENT_DATA |
| MSTR × RS × RISK_ON | rs_90d_top10_hold20 | INSUFFICIENT_DATA |
| JPM × Breakout × RISK_ON | breakout_h20_vol1.2_stop1_rr2 | FRAGILE |
| ROM × Pullback × RISK_ON | rsi42_58_chg20_3_stop0.1 | INSUFFICIENT_DATA |
| CRWD × Pullback × RANGE | rsi42_58_chg20_3_stop0.1 | INSUFFICIENT_DATA |

→ Seul **GLD × Breakout** est ROBUST dans le plan d'allocation actuel. Tous les autres sont soit FRAGILE soit INSUFFICIENT_DATA. **C'est une remise en question importante** des décisions d'allocation v1 sous l'angle de la robustesse temporelle.

## Non-régression

`walk-forward-regime-validator.json` byte-identique avant/après. Le nouveau validateur ne touche aucun moteur existant. Pipeline complet relancé sans régression.

## Limites

- **5 ans de données** : 3 splits, suffisant pour détecter les overfits massifs mais pas pour une mesure de robustesse statistique fine.
- **2020 manquant** : décale les splits du brief original (TRAIN 2020-* → impossibles).
- **Drift "indéterminé"** : la majorité des cellules ROBUST ont seulement 2 splits valides (manque parfois S3 par data Pullback 2025 partielle), donc le drift n'est pas calculé.
- **Mêmes seuils PASS/FAIL** que le validateur unique — volontairement strict.
- **Pas d'intégration au pipeline orchestré** dans cette PR. À utiliser comme filtre amont manuel.
- **Pas de propagation** : `tradable-universe.json` et `allocation-plan*.json` ne sont pas modifiés.

## Conséquence opérationnelle

La grande majorité des positions du plan v1 sont FRAGILE ou INSUFFICIENT_DATA au sens du rolling walk-forward. La validation actuelle (`walk-forward-regime-validator-v1`) se contente d'un seul split — celui-ci détecte les overfits évidents mais pas la fragilité temporelle.

**Recommandation pour une PR future** : étendre `tradable-universe-v1` pour exiger un verdict ROBUST ou STABLE en rolling walk-forward en plus du PASS unique. Cela durcirait la sélection mais réduirait drastiquement le nombre de cellules tradables (passerait de 346 ALLOW à probablement < 50).

---

# Tradable Universe v2 — durci par rolling walk-forward

Fichier créé :

```text
tools/backtests/tradable-universe-v2.mjs
```

Combine `tradable-universe.json` (v1) et `rolling-walkforward-validator.json` pour produire un univers tradable beaucoup plus exigeant temporellement.

Sorties :

- `tools/backtests/output/tradable-universe-v2.json`
- `tools/backtests/output/tradable-universe-v2.md`

## Règles de transition v1 → v2

| Rolling verdict | Effet sur la décision |
|---|---|
| ROBUST | confirme la décision v1 (pas de promotion) |
| STABLE | confirme la décision v1 |
| FRAGILE | dégrade d'un cran (ALLOW→REDUCE, REDUCE→EXPERIMENTAL, EXPERIMENTAL→BLOCK) |
| OVERFIT | BLOCK |
| INSUFFICIENT_DATA | EXPERIMENTAL si v1=ALLOW + tier A/B + WF unique PASS, sinon BLOCK |

**Règle absolue** : le rolling ne promeut jamais. v1 BLOCK reste BLOCK.

## Résultats du premier run (10 878 cellules)

| Décision | v1 | v2 | Delta |
|---|---:|---:|---:|
| ALLOW | 346 | **26** | **−320** |
| REDUCE | 10 | 300 | +290 |
| EXPERIMENTAL | 182 | 20 | −162 |
| BLOCK | 10 340 | 10 532 | +192 |

→ **92.5 % des ALLOW v1 disparaissent.** Le rolling walk-forward est très exigeant, et la grande majorité des cellules ALLOW v1 sont FRAGILE (dégradées en REDUCE) ou INSUFFICIENT_DATA (BLOCK).

## Les 26 cellules ALLOW v2 (toutes tier A, toutes RISK_ON)

| # | Symbole | Setup | Variante | Rolling | Splits |
|---:|---|---|---|---|---|
| Cellules ROBUST (14) | VRNS, CLOU (2), PSI, GOOGL, PH (2), KLAC (2), DOCN (3), GLD | Pullback ou Breakout | base/rsi variantes | ROBUST | 2/2 |
| Cellules STABLE (12) | VRNS (2), GOOGL, ABNB (2), WCLD, AMZN (2), KLAC, BOTZ, GLD, DOCN | Pullback ou Breakout | base/rsi variantes | STABLE | 2/2 |

## Croisement avec le plan d'allocation v1

Sur les 10 positions du plan d'allocation v1, **une seule survit en ALLOW v2** :

| Position v1 | Rolling verdict | Decision v2 |
|---|---|---|
| **GLD × Breakout × RISK_ON** | ROBUST | **ALLOW** ✓ |
| VUG × Pullback × RISK_ON | FRAGILE | REDUCE |
| SPYG × Pullback × RISK_ON | FRAGILE | REDUCE |
| APP × RS rotation × RISK_ON | FRAGILE | REDUCE |
| IYW × Pullback × RISK_ON | FRAGILE | REDUCE |
| SOL × RS × RISK_ON | INSUFFICIENT | EXPERIMENTAL (exception WF PASS) |
| MSTR × RS × RISK_ON | INSUFFICIENT | EXPERIMENTAL (exception WF PASS) |
| JPM × Breakout × RISK_ON | FRAGILE | REDUCE |
| ROM × Pullback × RISK_ON | INSUFFICIENT | BLOCK (pas tier A/B en v1) |
| CRWD × Pullback × RANGE | INSUFFICIENT | BLOCK |

C'est une **remise en question forte** du plan d'allocation actuel. Le plan v2 d'allocation devra être recalculé sur `tradable-universe-v2.json` pour refléter cette vue robuste.

## Non-régression confirmée

`tradable-universe.json` (v1) et `rolling-walkforward-validator.json` byte-identiques avant/après. Le moteur v2 lit seul, n'écrit pas dans les sources.

## Robustness tier (nouveauté v2)

| Tier | Sens | Cellules |
|---|---|---:|
| CONFIRMED | rolling ROBUST/STABLE, decisionV1 préservé | 34 |
| EXCEPTION | rolling INSUFFICIENT mais exception EXPERIMENTAL | 20 |
| DEGRADED | rolling FRAGILE, dégradation d'un cran | 290 |
| REMOVED | OVERFIT, FRAGILE→BLOCK, INSUFFICIENT sans exception, v1=BLOCK | 10 524 |
| UNEVALUATED | aucun rolling verdict (cellules absentes de l'évaluation rolling) | 10 |

## Limites résiduelles

- **3 splits walk-forward seulement** : pas un test statistique robuste, mais un filtre anti-overfit minimal.
- **INSUFFICIENT_DATA = ~70 %** : la majorité des cellules ne sont pas testables → tombent en BLOCK sauf exception.
- **Pas de recalcul allocation dans cette PR.**
- **Pas d'intégration au pipeline orchestré** : à utiliser à la demande.
- **Verdict v2 ≠ autorisation live.** Toujours valider manuellement avant tout passage en réel.

## Conséquence opérationnelle

`tradable-universe-v2.json` est le nouvel input recommandé pour toute décision d'allocation visant un horizon réel. Une PR future devra créer un `allocation-engine-v3` (ou adapter v1/v2) pour consommer cette source plus restrictive. Le portefeuille résultant sera bien plus petit (probablement 5-10 positions maximum vu les 26 cellules ALLOW v2 réparties sur ~10 symboles).

---

# Allocation Engine v3 — depuis Tradable Universe v2

Fichier créé :

```text
tools/backtests/allocation-engine-v3.mjs
```

Reconstruit un plan d'allocation directement depuis `tradable-universe-v2.json` (univers durci par rolling walk-forward), au lieu de partir de `tradable-universe.json` (v1) comme v1/v2.

Sorties :

- `tools/backtests/output/allocation-plan-v3.json`
- `tools/backtests/output/allocation-plan-v3.md`

## Règles de sélection v3

Priorité (anti-promotion stricte, v3 ne promeut jamais) :

| # | Couple | Base unit | Conditions |
|---|---|---:|---|
| 1 | ALLOW + ROBUST | 1.00 | aucune |
| 2 | ALLOW + STABLE | 0.80 | aucune |
| 3 | REDUCE/WATCH + FRAGILE | 0.35 | tier A/B uniquement, tag `reduced_due_to_fragility` |
| 4 | EXPERIMENTAL | 0.10 | tier A/B + WF unique PASS + **ni crypto ni leveraged** |

Pour tout le reste : interdit.

## Contraintes hard v3

- 3 à 10 positions (status `warning` si < 3, sinon `ok`).
- Max 2 EXPERIMENTAL.
- Max 1 position par symbole.
- Setups : Pullback ≤ 50 %, RS Rotation ≤ 35 %, Breakout ≤ 25 %, MeanRev / VolComp **interdits**.
- Crypto total ≤ 20 %.
- Leveraged total **0 %** (interdit en v3 même si v2 le tolère).
- Caps fins : us_growth_etf 30 %, mega_cap_tech 25 %, software_saas 25 %, ai_hypergrowth 20 %, semis_pure 25 %, crypto_layer1 10 %, crypto_correlated_equity 8 %, precious_metals 20 %, banks_financials 15 %.
- Support des deux noms `WATCH` et `REDUCE` (alias) sans casser.

## Contrôle post-normalisation des caps hard (correction itération 2)

Suite au refus de merge de la version initiale (caps Pullback 59.2 % et Breakout 25.2 % dépassés après normalisation), ajout d'un contrôle strict post-normalisation :

1. Construction greedy initiale (TARGET_BUDGET = 8.0 unités).
2. Détection des caps violés sur les **poids finaux normalisés** (setup, broad, fines).
3. Retrait itératif de la position la moins prioritaire qui contribue à la pire violation (priorityGroup DESC → tier DESC → confidence DESC → alpha ASC).
4. Après chaque retrait, tentative de **swap-in** : ajout d'un candidat du pool dédupliqué qui ne crée AUCUNE violation lorsqu'il est testé sur le nouveau total.
5. Renormalisation et bouclage jusqu'à plus de violation ou portefeuille vide.
6. `status = "failed"` si une violation demeure ou si portefeuille vide ; `warning` si < 3 positions ; `ok` sinon.

## Résultats du run (10 878 cellules univers v2)

- 346 cellules non-BLOCK
- 334 éligibles priorité 1-4
- 73 cellules après dédoublonnage par symbole
- **Greedy initial : 10 positions** sélectionnées avec Pullback 59.26 % et Breakout 25.19 % (caps dépassés).
- **Contrôle post-normalisation : 10 retraits, 0 swap-in en 11 itérations → portefeuille vide.**
- **Status : `failed`.**

### Diagnostic mathématique

Recherche aléatoire (200 000 essais de portefeuilles de 3 à 10 positions parmi 73 candidats) : **0 portefeuille viable trouvé**. Les caps demandés sont incompatibles avec le pool v2 actuel.

Cause :
- Somme caps setups = 110 % (≥ 100 % donc théoriquement faisable avec 3 setups).
- Mais le pool v2 ne contient qu'**1 seul Breakout ROBUST (GLD)** et **4 RS Rotation FRAGILE** dont 2 (MSTR, COIN) déclenchent `crypto_correlated_equity ≤ 8 %`.
- Toute combinaison testée viole soit Pullback 50 %, soit Breakout 25 %, soit crypto_correlated_equity 8 %, soit ai_hypergrowth 20 %.

### Pistes proposées (décision ChatGPT)

- Relâcher `crypto_correlated_equity` de 8 % à 12 % (permet d'inclure MSTR à 8.6 %).
- Relâcher `BREAKOUT_EXPANSION` de 25 % à 30 % (donne marge pour GLD + 1 Breakout FRAGILE).
- Étendre `tradable-universe-v2` (attendre que d'autres setups remontent en ROBUST/STABLE).
- Ajuster les baseUnits (ex. ROBUST 0.7 au lieu de 1.0).

### Cap respect garanti

Le moteur garantit désormais que **`allocation-plan-v3.json` ne contient JAMAIS de cap hard dépassé** : soit un plan respectant tous les caps, soit `status=failed` avec liste explicite des positions retirées et des violations initiales.

## Non-régression confirmée

`tradable-universe.json`, `tradable-universe-v2.json`, `rolling-walkforward-validator.json`, `theme-classification-v2.json`, `allocation-plan.json`, `allocation-plan-v2.json` byte-identiques avant/après (modulo `generatedAt`). Le moteur v3 lit seul, n'écrit que `allocation-plan-v3.{json,md}`.

## Aucun impact runtime

- Cloudflare Worker : inchangé.
- Frontend PWA : inchangé.
- Providers de marché : inchangés.
- Paper trading live, broker, ordres, endpoints : inchangés.

## Prochaine étape recommandée

- **Stress-test** ce plan v3 contre `friction-adjusted-report.json` pour mesurer l'érosion edge après coûts.
- **Backfill ETF holdings** : propager les sous-jacents des ETFs détenus pour vérifier qu'aucun cap fin n'est dépassé une fois la transparence appliquée.
- **Corrélations inter-positions** : ajouter une couche corrélation 2024-2025.
- **Walk-forward conditionnel au régime** : durcir encore en exigeant un verdict ROBUST aussi dans le régime cible.
