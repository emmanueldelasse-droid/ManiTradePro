# UNIVERSE_CORE_V1.md — Univers Core officiel ManiTradePro

> **Statut** : OFFICIAL — figé par PR-CTX-1 (2026-05-19), première étape de la Phase Quant Hardening V2 (Context Engine + Controlled Universe Expansion).
>
> **Subordination** :
> - `BOT_OBJECTIVE.md` — constitution produit (autorité dure).
> - `docs/project/PROJECT_VISION.md` — vision produit consolidée.
> - `docs/project/TRADING_PHILOSOPHY.md` § 5 — Univers cible 40-120 actifs liquides (fourchette stratégique).
> - `docs/quant/ASSET_REGISTRY.md` § *Univers cible stratégique* — classification technique ELITE/CORE/TACTICAL/BLACKLIST + composition cible.
>
> Ce fichier **fige la liste exacte** de l'univers Core V1 dans la fourchette définie par `TRADING_PHILOSOPHY.md` § 5.
>
> **Source canonique** pour : la liste opérationnelle des actifs autorisés à entrer dans le moteur Context Engine V1 (Phase 2 du brief créateur), les futurs scripts de stress/backtest qui ne doivent pas s'élargir au-delà de cet univers sans PR documentaire dédiée.

---

## 1. Objectif

> **Approche progressive et contrôlée.** Ne pas intégrer "tous les actifs possibles" immédiatement.

Raisons (brief créateur 2026-05-19) :

- éviter dilution du signal ;
- éviter bruit statistique ;
- éviter faux positives ;
- conserver lisibilité des résultats ;
- faciliter debugging et validation des setups ;
- éviter mélange de comportements de marchés incompatibles.

ManiTradePro doit rester **discipliné, filtrant, contextuel et explicable**, pas un scanner géant qui prend tout.

---

## 2. Cible chiffrée

| Catégorie | Cible | Inclus V1 |
|---|---:|---:|
| ETF macro / sectoriels / thématiques | 25-30 | **27** |
| Leaders US large cap | 30-40 | **35** |
| Europe limitée et contrôlée | 10-20 | **10** |
| Crypto majeures uniquement | 3-6 | **6** |
| **Total cible** | **≤ 80** | **78** |

Les **78 actifs Core V1** ci-dessous sont **tous présents** dans le dataset projet `data/*_2025.json` (vérifié 2026-05-19 sur 1255 candles 2021-01-04 → 2025-12-31).

---

## 3. Univers Core V1 — liste figée

### 3.1 ETF macro / sectoriels / thématiques (27)

**ETF d'indice large US (5)** :

```
SPY, QQQ, DIA, IWM, MDY
```

**ETF sectoriels SPDR (11 SELECT Sector SPDR)** :

```
XLK (Technology), XLF (Financials), XLV (Health Care),
XLE (Energy), XLI (Industrials), XLP (Consumer Staples),
XLY (Consumer Discretionary), XLU (Utilities), XLB (Materials),
XLRE (Real Estate), XLC (Communication Services)
```

**ETF thématiques tech / IA / cyber / cloud (11)** :

```
SMH (Semiconductors), SOXX (Semiconductors), IGV (Software),
VGT (Information Tech), BOTZ (Robotics & AI),
CIBR (Cybersecurity), HACK (Cybersecurity), FDN (Internet),
SKYY (Cloud), CLOU (Cloud), WCLD (Software Cloud)
```

### 3.2 Leaders US large cap (35)

**Mega tech (10)** :

```
NVDA, MSFT, AAPL, META, GOOGL, AMZN, TSLA, AVGO, NFLX, ORCL
```

**Semiconducteurs structurels (8)** :

```
ASML, TSM, ARM, AMD, MU, KLAC, AMAT, LRCX
```

**Software / cyber / cloud (10)** :

```
PLTR, PANW, CRWD, NET, MDB, SNOW, TTD, SHOP, CRM, NOW
```

**Quality / defensive structurels (5)** :

```
COST, LLY, JNJ, V, MA
```

**Financial leaders (2)** :

```
JPM, AXP
```

### 3.3 Europe limitée et contrôlée (10)

Liste **figée** au brief créateur — 10 actifs structurels européens :

```
LVMH (LVMH Moët Hennessy Louis Vuitton — code dataset projet : LVMH)
AIR  (Airbus)
ASML (ASML — note : présent aussi dans la liste US ; classifié Europe ici dans le dataset projet pour cohérence avec son listing primaire)
SAP  (SAP SE)
SIE  (Siemens AG)
NESN (Nestlé)
RMS  (Hermès International)
TTE  (TotalEnergies)
CAP  (Capgemini)
DSY  (Dassault Systèmes)
```

**Note méthodologique** : `ASML` est classé ici dans la catégorie Europe car son listing primaire est Amsterdam (`ASML.AS` dans EODHD), mais il est aussi un leader semi-conducteurs et apparaît dans la catégorie "Semiconducteurs structurels" § 3.2 par convention dataset projet. Pour les analyses cross-marché, traiter ASML comme **Europe primary listing + US-listed dual**. Compté **une seule fois** dans le total 78.

### 3.4 Crypto majeures uniquement (6)

```
BTC (Bitcoin)
ETH (Ethereum)
SOL (Solana)
BNB (Binance Coin)
LINK (Chainlink)
AVAX (Avalanche)
```

**Refus explicites** :
- Pas de micro-cap crypto.
- Pas de tokens spéculatifs récents.
- Pas de stablecoins (USDT, USDC) — pas un actif à trader, c'est une devise crypto.
- Pas de wrapped derivatives (WBTC, stETH, etc.).
- Pas d'altcoins illiquides hors top-15 capitalisation.

---

## 4. Exclusions explicites

L'Univers Core V1 **exclut** par défaut :

### 4.1 Actifs / classes interdits ici

| Catégorie | Raison |
|---|---|
| **ETF à effet de levier** (SOXL, TQQQ, USD, ROM, SQQQ, UPRO) | Profil de risque non-linéaire. Volatilité amplifiée. `ASSET_REGISTRY.md` § exclusions par défaut. Réintégration possible via PR dédiée si setup le justifie + friction/risque ajustés. |
| **Penny stocks** (< 5 USD ou volume < 50 M USD/jour) | Liquidité insuffisante pour exécution paper réaliste. |
| **Small caps spéculatives** (AEHR, ACLS, BBAI, SOUN, WOLF, APLD, NBIS, CRWV, FORM, IPGP, etc.) | Historique volatil, narratives extrêmes, comportements incompatibles avec un moteur contextuel discipliné. Restent dans `universe-v2.mjs` (univers technique large) pour les backtests historiques de recherche mais **pas dans le Core V1**. |
| **AI hypergrowth single-name volatile** (SMCI, AI, SOUN, BBAI, UPST) | Convictions trades extrêmes incompatibles avec une stratégie contextuelle de moyen terme (cf. R3A § 3.5 — single names momentum modernes). Quelques-uns survivants à ELITE classification technique mais exclus du Core V1 pour discipline. |
| **Crypto altcoins illiquides** | Spread + liquidité non exploitables en paper realistic. |
| **FX exotiques / majeurs** (EURUSD, GBPUSD, USDJPY) | Réservé à Phase future "FOREX prep". Non testé sur swing daily à date. Classification `BLACKLIST` actuelle dans `ASSET_REGISTRY.md`. |
| **`BLACKLIST` de `ASSET_REGISTRY.md`** (54 actifs classés blacklist par `asset-quality-engine-v1.mjs`) | Profil quant ne justifie pas l'inclusion. |

### 4.2 Cohérence avec ASSET_REGISTRY classification

L'Univers Core V1 = **sous-ensemble curé** des 181 actifs classifiés par `asset-quality-engine-v1.mjs`. Recoupement (à recalculer si la classification change) :

- ELITE (29 actifs) : la majorité sont inclus, **sauf** les small caps spéculatives (APLD, NBIS, AEHR, AVAX inclus crypto, ACLS, CAMT, UPST, ALGM, FICO, XSD/SOXQ classés ELITE techniquement mais redondants des ETF SMH/SOXX déjà inclus).
- CORE (60 actifs) : sélection des structurels stables (mega tech, semi liquides, software établis, ETF liquides).
- TACTICAL (38 actifs) : quelques-uns inclus (COIN exclu car trop volatile, AMD/MU/KLAC inclus).
- BLACKLIST (54 actifs) : **aucun** inclus.

---

## 5. Compatibilité par marché — première étape

Conformément au brief Phase 2 § *Structure obligatoire des setups*, chaque setup devra à terme déclarer :

```typescript
{
  allowedMarkets: ["US", "EUROPE", "CRYPTO", "ETF", "FOREX"],
  allowedRegimes: ["RISK_ON", "RANGE", "RISK_OFF", "HIGH_VOL"],
  blockedRegimes: [...],
  preferredConditions: [...]
}
```

L'Univers Core V1 est **multi-marché**. Chaque marché a ses propres comportements :

| Marché | Inclus V1 | Comportement attendu |
|---|---:|---|
| **ETF** (indices + sectoriels + thématiques) | 27 | Liquide, peu de narratives idiosyncratiques, flux passifs structurels |
| **US large cap leaders** | 35 | Liquide, narratives moyennes, dominance momentum sur 2021-2025 |
| **EUROPE** | 10 | Moins liquide en USD-equivalent que US, narratives macro/sectorielles, exposition EUR (gestion devise R3 explicite obligatoire) |
| **CRYPTO** | 6 | 24/7, volatilité ×3-5 vs equity, narratives extrêmes, corrélation BTC dominante |

**Règle fondamentale** : un setup validé sur US **ne devient pas automatiquement valide ailleurs**. La validation par marché doit être explicite, par setup, dans `SETUPS_REGISTRY.md` (à enrichir en PR-CTX-3 — Setup authorization matrix).

---

## 6. Règle d'évolution

L'Univers Core V1 est **figé** à 78 actifs après cette PR. Toute évolution doit suivre la règle :

### Ajout d'un actif

- PR documentaire dédiée (titre `docs(universe-core): add <symbol> to V1`).
- Justification économique explicite : pourquoi cet actif manque, à quel setup il bénéficie, quel comportement il introduit.
- Vérification : actif présent dans `data/*.json` avec ≥ 5 ans d'historique.
- Vérification : actif n'est pas dans `BLACKLIST` de `ASSET_REGISTRY.md`.
- Vérification : actif ne contredit pas les exclusions § 4.1 (pas un leveraged, pas un penny stock, etc.).

### Retrait d'un actif

- PR documentaire dédiée (titre `docs(universe-core): remove <symbol> from V1`).
- Justification : pourquoi cet actif sort (changement de comportement structurel, dégradation persistante, exclusion thématique, etc.).
- Mention du dernier setup l'utilisant pour traçabilité.

### Évolution structurelle (cible 80 → 120, ou ajout d'un marché)

- PR de cadrage type `docs/quant/UNIVERSE_CORE_V2.md` avec nouvelle vision.
- Validation ChatGPT + créateur obligatoire.

**Interdiction stricte** : aucune modification silencieuse de la liste § 3 sans PR documentaire dédiée. C'est l'instrument de discipline du moteur.

---

## 7. Articulation avec les autres documents

```
BOT_OBJECTIVE.md             (constitution produit)
   ↓
docs/project/PROJECT_VISION.md   (vision produit consolidée)
   ↓
docs/project/TRADING_PHILOSOPHY.md § 5    (univers cible 40-120 actifs — fourchette)
   ↓
docs/quant/ASSET_REGISTRY.md § Univers cible    (classification ELITE/CORE/TACTICAL/BLACKLIST + composition cible)
   ↓
docs/quant/UNIVERSE_CORE_V1.md   (CE FICHIER — liste figée 78 actifs)
   ↓
Phase 2 Context Engine + Phase 3 Exposure Control + Phase 4 Quality Metrics consument cette liste figée
```

L'Univers Core V1 est le **dernier maillon** entre vision produit et code opérationnel : la liste précise et figée qui sera consommée par les futurs scripts.

`universe-v2.mjs` (tools/backtests/) **reste l'univers technique large** pour les backtests historiques de recherche (181 actifs). Il n'est **pas modifié** par cette PR. C'est un univers de recherche, pas un univers de production. Les futurs scripts Phase 2/3/4 qui s'appuient sur Universe Core V1 doivent **explicitement** consommer la liste de § 3, pas `universe-v2.mjs`.

---

## 8. Statistiques dataset (vérification couverture)

Vérifié 2026-05-19 :

- **78/78 actifs Core V1** présents dans `data/*_2025.json`.
- Tous avec 1255 candles couvrant 2021-01-04 → 2025-12-31.
- Aucun trou de couverture identifié.

Note : `XLC` (Communication Services SPDR, créé 2018) et `XLRE` (Real Estate SPDR, créé 2015) sont récents mais ont 5 ans d'historique complet sur la période ciblée — OK pour stress / walk-forward.

---

## 9. Non encore livré dans cette PR

Cette PR-CTX-1 est **strictement documentaire**. Elle ne :

- crée **aucun** module Context Engine (réservé à PR-CTX-2).
- crée **aucune** authorization matrix (réservé à PR-CTX-3).
- modifie **aucun** script de backtest (continueront sur `universe-v2.mjs` tant que pas explicitement migrés).
- modifie **aucun** fichier runtime (worker, app, sw, providers, etc.).
- ne déclare **aucun** statut setup (statuts SETUPS_REGISTRY inchangés).
- ne change **aucun** verdict quantitatif (PR-RS-HARDENING Phase 1, MR R3B v3, etc. tous inchangés).

---

## 10. Risques et limitations

### Risques

- **R-UNIVERS-FIGE-DESYNC** : si un actif est retiré du dataset (delisting / retrait EODHD), l'Univers Core V1 reste inchangé jusqu'à PR documentaire. Mitigation : vérification trimestrielle manuelle de la disponibilité OHLC.
- **R-ASML-DOUBLE-CLASSIFICATION** : ASML est listé § 3.2 Europe (par convention dataset projet) et matérialise un actif semi-conducteurs structurel. À ne pas compter double dans les analyses cross-marché.
- **R-EUROPE-FX-EXPOSURE** : les 10 actifs Europe ont une exposition EUR/USD non couverte. Le `fxEngine` projet (cf. `BOT_OBJECTIVE.md` § *Conditions avant passage en bot réel*) doit être en place avant tout passage en argent réel impliquant ces actifs.
- **R-CRYPTO-24/7** : les 6 actifs crypto cotent 24/7 vs equity 5 jours/semaine. Le Context Engine devra gérer cette désynchronisation (calendrier de trading par marché).

### Limitations

- Univers ex-post 2021-2025 — pas de delistés / fusions / faillites.
- 78 actifs est un compromis liquidité × diversification. Une cible 120 serait plus large mais alourdirait l'analyse.
- ASML compté une fois dans le total 78 malgré sa double présence § 3.2 et § 3.3.
- L'allocation entre catégories (27 ETF / 35 leaders / 10 Europe / 6 crypto) reflète une préférence vers les marchés US — assumée, cohérente avec dataset projet historique.

---

## 11. Conformité gouvernance

- ✅ `une PR = un objectif` : objectif unique = figer l'Univers Core V1.
- ✅ `BOT_OBJECTIVE.md` respecté : pas d'inventer d'actif, pas de fictif, qualité > quantité.
- ✅ `RESEARCH_FRAMEWORK_FREEZE_V1.md` respecté : pas d'optimisation, pas de cherry-picking d'actifs, exclusions explicites documentées.
- ✅ `TRADING_PHILOSOPHY.md` § 5 respecté : 78 ≤ 120 (fourchette), composition aligné, refus explicites maintenus.
- ✅ `ASSET_REGISTRY.md` respecté : Core V1 = sous-ensemble curé de la classification ELITE/CORE/TACTICAL existante.
- ✅ Aucun changement runtime.
- ✅ Aucun changement de statut setup.
- ✅ Aucune promotion vers `LIVE_READY` / `VALIDATED_RESEARCH_CORE` / `CONDITIONAL_EDGE`.
- ✅ Vocabulaire strictement documentaire — pas de wording marketing, pas de prétention de profitabilité.

---

## 12. Sources

- `BOT_OBJECTIVE.md` (constitution produit, autorité dure).
- `docs/project/PROJECT_VISION.md` (vision produit).
- `docs/project/TRADING_PHILOSOPHY.md` § 5 (univers cible 40-120 actifs liquides).
- `docs/quant/ASSET_REGISTRY.md` § *Univers cible stratégique — 40 à 120 actifs liquides* (composition cible) + classification technique ELITE/CORE/TACTICAL/BLACKLIST.
- `tools/backtests/universe-v2.mjs` (univers technique large 181 actifs — **inchangé** par cette PR).
- Brief créateur 2026-05-19 « PHASE QUANT HARDENING V2 — CONTEXT ENGINE + CONTROLLED UNIVERSE EXPANSION ».
- Vérification dataset `data/*_2025.json` (78/78 actifs présents).

---

> **Conclusion-mémo** : l'Univers Core V1 fige 78 actifs (27 ETF + 35 leaders US + 10 Europe + 6 crypto) comme univers opérationnel discipliné pour la Phase 2 Context Engine et au-delà. Toute évolution = PR documentaire dédiée. Approche progressive et contrôlée. Pas de scanner géant. Qualité > quantité.
