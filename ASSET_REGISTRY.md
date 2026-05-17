# ASSET_REGISTRY — Classification des actifs

## Rôle du fichier

Ce fichier centralise la qualité et la compatibilité observée des actifs.

Le but n'est PAS d'avoir le plus d'actifs possible.

Le but est :

```text
trouver les actifs compatibles avec les setups validés.
```

---

# Statut du fichier

Classification générée automatiquement par :

```text
tools/backtests/asset-quality-engine-v1.mjs
```

à partir des résultats JSON des backtests présents dans `tools/backtests/` :

- `results-multi-setup-grid.json`
- `results-pullback-2025.json`
- `results-pullback-grid-2025.json`
- `results-pullback-yearly-walkforward.json`
- `results-relative-strength-rotation-regime-v1.json`
- `results-relative-strength-rotation-v1.json`

Pour mettre à jour cette classification :

```text
node tools/backtests/asset-quality-engine-v1.mjs
```

Le rapport complet (avec métriques par actif, forces et risques) est écrit dans :

- `tools/backtests/output/asset-quality-report.json`
- `tools/backtests/output/asset-quality-report.md`

## Granularité actif × setup

La classification ci-dessous est un tier **global** par actif. Une vue plus fine (compatibilité par couple actif × setup) est produite par :

```text
tools/backtests/asset-setup-matrix-v1.mjs
```

Sortie : `tools/backtests/output/asset-setup-matrix.{json,md}`.

Cette matrice permet d'identifier les actifs ELITE qui sont en réalité mauvais sur un setup donné (et inversement les actifs BLACKLIST exploitables sur un setup précis). À consulter avant toute décision d'autoriser un trade actif × setup.

## Granularité actif × setup × variante

Une vue encore plus fine (compatibilité par couple actif × setup × variante précise) est produite par :

```text
tools/backtests/setup-variant-matrix-v1.mjs
```

Sortie : `tools/backtests/output/setup-variant-matrix.{json,md}`.

Utile pour repérer les cas où **un setup est moyen globalement mais une variante précise est excellente** (ex. SOXL × RS sort AVOID en agrégé, mais `rs_20d_top5_hold5` ressort STRONG). À consulter avant de figer une combinaison actif × setup × variante.

## Granularité variant × régime (global)

Une matrice supplémentaire compare les variantes selon le régime de marché :

```text
tools/backtests/variant-regime-matrix-v1.mjs
```

Sortie : `tools/backtests/output/variant-regime-matrix.{json,md}`.

**Limite à connaître** : la dimension régime n'est exposée que par un seul fichier de backtest (RS rotation regime), et uniquement à un niveau global (pas per-symbol-per-regime individuel). La matrice livre la classification (variant × regime) globale et la comparaison (symbol × variant × ALL_REGIMES vs NO_RISK_OFF) par actif. Pour la décision per-actif-par-régime exacte, un breakdown `bySymbolByRegime` dans les scripts de backtest sera nécessaire.

---

# Catégories

| Niveau | Signification | Profil d'allocation |
|---|---|---|
| ELITE | actifs majeurs du moteur | strong |
| CORE | actifs fiables et réguliers | normal |
| TACTICAL | actifs opportunistes / plus risqués | reduced |
| WATCHLIST | surveillance | — |
| BLACKLIST | actifs incompatibles ou trop destructeurs | none |

Règles d'affectation (cf. moteur) :
- **ELITE** : score ≥ 80, profit factor ≥ 1.4, expectancy positive, stabilité multi-années ou multi-setups, drawdown raisonnable.
- **CORE** : score ≥ 65, profit factor ≥ 1.1, expectancy positive.
- **TACTICAL** : score ≥ 50, conditions ELITE/CORE non remplies.
- **BLACKLIST** : score < 50, ou profit factor < 1, ou expectancy ≤ 0 avec ≥ 30 trades.

---

# Synthèse

- Actifs analysés : **181**
- ELITE : **29**
- CORE : **60**
- TACTICAL : **38**
- BLACKLIST : **54**

---

# ELITE (29)

SOXL, APP, VRNS, PLTR, SOXQ, SOXX, CRWD, FTNT, META, PH, PSI, BNB, NBIS, SMCI, SOL, ANET, AVAX, CAMT, XSD, FICO, ACLS, AEHR, UPST, BTC, LRCX, ALGM, NFLX, SMH, GOOGL

Mises en évidence :
- Crypto majeures : BTC, SOL, AVAX, BNB.
- Leaders IA / momentum : PLTR, APP, SMCI, NBIS, AEHR.
- Semiconducteurs / ETF semi : SOXX, SOXQ, SMH, XSD, LRCX, ALGM, ACLS, CAMT, FICO.
- Cybersécurité / cloud : CRWD, FTNT, VRNS.

Avertissement : **SOXL** est un ETF à effet de levier 3×. Le moteur le classe ELITE sur ses métriques brutes, mais l'allocation réelle doit tenir compte de son profil de risque non-linéaire.

---

# CORE (60)

ORCL, MCHP, KLAC, ROKU, SPY, STM, TSM, TTWO, WCLD, IYW, APLD, RMBS, AMZN, DELL, MA, SENT, SLAB, TER, GLD, LINK, PANW, IGM, LIN, NVMI, NXPI, SPYG, VUG, MSTR, SIE, AXP, ETN, HACK, IGV, JPM, MU, TENB, AIR, AMAT, CYBR, GTLB, MPWR, NVDA, ROM, TYL, CIBR, PDD, ASML, BKNG, CLOU, EA, ETH, FTEC, MELI, SAP, SHOP, VGT, XLK, MSFT, PATH, USD

---

# TACTICAL (38)

COIN, HUBS, ABNB, DDOG, ENTG, PAYC, ADBE, ARM, BBAI, CHKP, COST, DSY, AKAM, CFLT, DT, ON, SNPS, AMKR, TT, AMD, DOCN, QQQ, SWKS, BUG, WM, AVGO, AI, CDNS, VRTX, NOW, GEN, AAPL, ADI, BOTZ, LLY, SYNA, XSW, SPGI

---

# WATCHLIST

Catégorie non encore alimentée par le moteur (à ajouter via une heuristique de promotion / rétrogradation lors d'un rerun).

---

# BLACKLIST (54)

SKYY, ASX, MSCI, ADSK, ZEN, ESTC, QRVO, RMS, USDJPY, ZS, CRM, V, GBPUSD, IPGP, MDB, NET, PAYX, FORM, IWM, MDY, TSLA, FDN, NESN, TXN, TTD, PD, QCOM, LSCC, ONTO, TEAM, ROP, DUOL, IBIT, S, CRWV, CAP, HUBB, INTU, MRVL, OKTA, SPLK, WDAY, SE, ELV, SOUN, RBRK, HCP, INTC, SNOW, EURUSD, LVMH, TLT, UBER, TTE

Règle : un actif doit être blacklisté s'il :
- dégrade durablement le profit factor,
- augmente trop le drawdown,
- n'est compatible avec aucun setup validé,
- produit trop de faux signaux,
- fonctionne seulement sur un échantillon trop faible.

---

# Critères de scoring (moteur asset-quality-engine-v1)

Score sur 100, agrégé à partir de :
- expectancy du meilleur setup (0-25 pts),
- profit factor du meilleur setup (0-20 pts),
- winrate (0-15 pts),
- nombre de trades total (0-10 pts),
- drawdown vs gain cumulé (0-10 pts),
- série de pertes la plus longue (0-5 pts),
- stabilité multi-années (0-10 pts),
- nombre de familles de setup compatibles (0-5 pts).

Pénalités :
- échantillon < 15 trades → -15,
- une seule période observée → -10,
- performance fortement dégradée en RISK_OFF (totalR ALL_REGIMES nettement inférieur à NO_RISK_OFF) → -10.

Confiance :
- HIGH : ≥ 100 trades et ≥ 3 années observées.
- MEDIUM : ≥ 30 trades et ≥ 2 années observées.
- LOW : sinon.

---

# Règle stratégique

Le moteur doit éviter de grossir artificiellement l'univers.

Ajouter des actifs est utile seulement si cela permet de trouver plus d'actifs compatibles avec les setups.

Conclusion :

```text
Qualité structurelle > quantité d'actifs.
```
