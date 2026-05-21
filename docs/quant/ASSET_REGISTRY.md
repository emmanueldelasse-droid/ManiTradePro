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

## Classification thématique fine (v2)

Une classification multi-tags par sous-thème (22 catégories : `semis_pure`, `ai_hypergrowth`, `software_saas`, `cybersecurity`, `crypto_layer1`, `us_growth_etf`, etc.) est maintenue par :

```text
tools/backtests/theme-classification-v2.mjs
```

Sortie : `tools/backtests/output/theme-classification-v2.{json,md}`.

Utile pour révéler la concentration cachée que les caps larges du moteur d'allocation (tech_ai 60 %, crypto 25 %, etc.) ne détectent pas. Exemple actuel : 3 ETF `us_growth_etf` totalisent 39 % du portefeuille, masqués sous le tag tech_ai.

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

---

# Univers cible stratégique — 40 à 120 actifs liquides (PR-VISION, 2026-05-19)

> Cette section formalise l'**univers cible produit** pour ManiTradePro. Elle vit en complément de la classification technique ELITE/CORE/TACTICAL/BLACKLIST ci-dessus (qui est calculée automatiquement par `asset-quality-engine-v1.mjs` sur les backtests existants). L'univers cible est une **couche stratégique** au-dessus de la classification technique — il définit **quels actifs ont le droit d'entrer dans le moteur**, indépendamment de leur tier individuel.
>
> Source officielle de l'architecture produit : `docs/project/TRADING_PHILOSOPHY.md` § 5.

## Principe

> **Qualité structurelle > quantité d'actifs.** Le moteur opère sur **40 à 120 actifs maximum**, sélectionnés sur liquidité, couverture sectorielle, historique disponible, et compatibilité avec les setups prioritaires.

## Composition cible

| Catégorie | Cible | Source actuelle (univers v2) |
|---|---:|---|
| **ETF US indices** | 5-10 | SPY, QQQ, IWM, DIA, MDY |
| **ETF sectoriels** | 10-15 | XLE, XLF, XLV, XLI, XLP, XLY, XLB, XLU, XLRE, XLC |
| **ETF thématiques** (semis, cyber, AI) | 5-10 | SMH, SOXX, SOXQ, XSD, PSI, CIBR, BOTZ, IGV, IGM, IYW, XLK, FTEC, VGT |
| **Leaders US grandes capitalisations** | 10-20 | NVDA, AAPL, MSFT, AMZN, GOOGL, META, AVGO, ASML, TSM, NFLX, ORCL, et autres `ELITE`/`CORE` |
| **Quality / defensive** | 5-10 | COST, LLY, JNJ, PG, KO, MSCI, SPGI, WM, ELV, VRTX |
| **Crypto majeures uniquement** | 3-5 | BTC, ETH, SOL (BNB, AVAX optionnels selon liquidité) |
| **Total cible** | **40-70** (extension max 120 si justification stricte) |

## Exclusions par défaut

- **Penny stocks** (< 5 USD ou < 50 M USD volume jour).
- **Small caps spéculatives** sans historique stable (AEHR, ACLS, BBAI, SOUN, WOLF, etc. — à réintégrer uniquement si setup les justifie).
- **Crypto altcoins illiquides** ou récentes (CRWV, IBIT en dehors de la liquidité majeure).
- **FX exotiques** (EURUSD, GBPUSD, USDJPY — actuellement `BLACKLIST` car non backtestés sur swing).
- **ETF à effet de levier** par défaut (SOXL, TQQQ, USD, ROM) — réintégration possible si setup le justifie, mais avec friction et risque ajustés (cf. `friction-model-v1.mjs` profil `high`).
- **Actifs `BLACKLIST`** de la classification technique ci-dessus (54 actifs au 2026-05-19) — sauf réhabilitation explicite par un setup dédié.

## Pourquoi pas scanner « tout le marché »

Détail dans `docs/project/TRADING_PHILOSOPHY.md` § 5.3. Synthèse :

1. **Bruit statistique** : sur 5000 tickers US, la probabilité d'observer un faux signal "par chance" explose.
2. **Friction / liquidité** : 80 % des tickers US ont une liquidité inexploitable pour du swing.
3. **Survivorship aggravé** : un univers très large maximise le biais survivors-only.
4. **Coût d'observation** : scanner 5000 tickers en daily est possible, en 1h/4h sur providers actuels c'est inutilisable (quotas).
5. **Cohérence stratégique** : contradiction directe avec la logique contextuelle en 5 couches.

## Articulation avec la classification technique ELITE/CORE/TACTICAL/BLACKLIST

L'univers cible stratégique (40-120) **filtre l'entrée du moteur**. La classification technique **filtre l'allocation à l'intérieur de l'univers cible**.

```
Univers global (5000+ tickers US)
   ↓ filtre liquidité, secteur, historique, refus FX/penny/altcoins
Univers cible produit (40-120 actifs)
   ↓ classification technique sur backtests
ELITE (29) → strong allocation
CORE  (60) → normal allocation
TACTICAL (38) → reduced allocation
WATCHLIST → observation
BLACKLIST (54) → none
   ↓ contexte + setup détecté + timing + risk
Trade paper
```

**Conséquence** : la classification automatique ci-dessus opère actuellement sur **181 actifs** (l'univers `universe-v2.mjs`). L'univers cible produit (40-120) est un **sous-ensemble** de cet univers, à formaliser dans une PR future (sélection explicite des symboles, exclusions documentées par actif). Cette PR-VISION pose la **règle stratégique** ; la **liste opérationnelle exacte** sera produite séparément (futur `docs/quant/UNIVERSE_TARGET_V1.md` ou équivalent).

### Univers Core V1 — liste opérationnelle figée (PR-CTX-1, 2026-05-19)

La **liste exacte** de l'univers Core V1 (78 actifs : 27 ETF + 35 leaders US + 10 Europe + 6 crypto) est figée dans le document canonique dédié :

> **`docs/quant/UNIVERSE_CORE_V1.md`** — source canonique de la liste opérationnelle.

Cette section `ASSET_REGISTRY.md` § *Univers cible stratégique* reste la **règle stratégique** (fourchette 40-120, principes d'exclusion, articulation avec la classification ELITE/CORE/TACTICAL/BLACKLIST). `UNIVERSE_CORE_V1.md` est la **liste opérationnelle figée** consommée par les futurs scripts Phase 2 (Context Engine), Phase 3 (Exposure Control), Phase 4 (Quality Metrics).

Toute évolution de la liste opérationnelle = PR documentaire dédiée (`docs(universe-core): add/remove <symbol> to/from V1`).

### Asset Universe staged V1 — taxonomie runtime (PR-ASSET-UNIVERSE-170-STAGED-V1, 2026-05-21)

Au-dessus de `ASSET_REGISTRY` (règle stratégique) et `UNIVERSE_CORE_V1` (liste figée), une **taxonomie staged** RUNTIME a été ajoutée pour séparer EXPLICITEMENT l'univers d'analyse de l'univers d'exécution paper :

> **`docs/quant/ASSET_UNIVERSE_V1.md`** — source canonique de la taxonomie staged.
> **`tools/quant/lib/asset-universe-v1.mjs`** — implémentation pure testable.

4 buckets :

| Tier | Cardinalité | Visible UI | Auto-open paper |
|---|---:|:---:|:---:|
| `LIVE_PAPER_CORE` | 42 | ✓ | ✓ |
| `ANALYSIS_ONLY` (analysisUniverse \ livePaperCore) | ~126 | ✓ | ✗ |
| `EXPERIMENTAL` (data/ ∩ ¬universe-v2) | 19 | ✓ | ✗ |
| `BLOCKED` | 6 (XLY, XLE, XLU + 3 FX) | ✗ | ✗ |

Le filtre `auvIsLivePaperCore(symbol)` est appelé dans `isTrainingCandidateAllowed` côté worker comme garde-fou RESTRICTIF — il ne peut JAMAIS élargir les ouvertures (au pire identique au pré-PR, au mieux concentré sur core). Phase officielle : **« scaler l'observation avant de scaler l'exécution »**.

Évolution : toute modification du `livePaperCore` ou `blockedUniverse` doit MAJ simultanément le module pur ET le miroir inline dans `cloudflare-worker/worker.js` (cf. `ASSET_UNIVERSE_V1.md` § 8).

## Refus explicites (rappel)

- Pas de scalping → univers ne comprend pas les tickers ultra-volatils utilisés pour ça (penny stocks, altcoins illiquides).
- Pas de HFT → univers ne dépend pas d'une couverture exhaustive temps réel.
- Pas de patterns de bougies seuls → univers ne contient pas de tickers sélectionnés pour leur seul comportement de bougie historique.
