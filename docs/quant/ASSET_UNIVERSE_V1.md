# ASSET_UNIVERSE_V1.md — Asset Universe staged V1 ManiTradePro

> **Statut** : OFFICIAL — livré par PR-ASSET-UNIVERSE-170-STAGED-V1 (2026-05-21). Source canonique unique de la **taxonomie staged** des actifs (analyse vs live paper execution).
>
> **Module** : taxonomie **read-only**. Le seul effet runtime est un **filtre RESTRICTIF** dans `isTrainingCandidateAllowed` côté worker : auto-open paper limité à `livePaperCore` (~42 actifs). Ne peut **jamais** élargir les ouvertures.
>
> **Subordination** :
> - `BOT_OBJECTIVE.md` — constitution produit.
> - `docs/quant/ASSET_REGISTRY.md` — règles stratégiques (40-120 actifs cible, exclusions par défaut).
> - `docs/quant/UNIVERSE_CORE_V1.md` — liste opérationnelle figée (78 actifs Core V1, PR #241).
> - `docs/quant/SETUPS_REGISTRY.md` — statuts setups.
> - `docs/monitoring/KNOWN_ISSUES.md` #15 — splits non ajustés XLY/XLE/XLU.
>
> **Implémentation** :
> - Source canonique testable : `tools/quant/lib/asset-universe-v1.mjs`.
> - Miroir inline figé dans `cloudflare-worker/worker.js` (bloc `ASSET UNIVERSE V1` situé juste avant `isTrainingCandidateAllowed`). Maintenir synchrones.

---

## 1. Rôle et philosophie

### 1.1 Phase officielle : VÉRITÉ MARCHÉ

> **Scaler l'observation avant de scaler l'exécution.**

Le projet est en phase « VÉRITÉ MARCHÉ » (validation ChatGPT post-PR #250). Cette PR élargit la **capacité d'analyse** à ~170 actifs tout en gardant un **moteur live paper discipliné** (~42 actifs en core).

**Le but n'est PAS** : « plus d'actifs = plus de profit ».

**Le but EST** :
- enrichir la diversité comportementale ;
- enrichir les contextes ;
- enrichir les observations ;
- tester la robustesse des setups sur plus de profils d'actifs ;
- éviter qu'un edge soit sur-concentré sur 5-10 symboles.

### 1.2 Ce que la taxonomie staged fait

Sépare EXPLICITEMENT 4 tiers d'actifs :

| Tier | Cardinalité | Visible UI | Auto-open paper |
|---|---:|:---:|:---:|
| `LIVE_PAPER_CORE` | 42 | ✓ | ✓ |
| `ANALYSIS_ONLY` (= analysisUniverse \ livePaperCore) | ~126 | ✓ | ✗ |
| `EXPERIMENTAL` (data/ ∩ ¬universe-v2) | 19 | ✓ | ✗ |
| `BLOCKED` | 6 | ✗ | ✗ |

### 1.3 Ce qu'elle n'est PAS

- ❌ **Pas une couche de scoring.** Aucun score / sizing / safety gate modifié.
- ❌ **Pas une promotion de setup.** Aucun statut `SETUPS_REGISTRY.md` touché.
- ❌ **Pas un élargissement d'ouvertures.** Le filtre worker est RESTRICTIF par construction (au pire identique au comportement pré-PR, au mieux concentré sur core).
- ❌ **Pas un broker / LIVE_READY / RL / IA opaque / auto-learning.**
- ❌ **Pas une réintroduction de SECTOR_RELATIVE_STRENGTH** tant que KNOWN_ISSUES #15 reste OPEN.

---

## 2. Buckets V1

### 2.1 `livePaperCore` (42 actifs)

Sous-ensemble strict autorisé pour OUVERTURE PAPER AUTOMATIQUE.

**Critères de sélection** (brief créateur) :
- liquidité ;
- spreads propres ;
- stabilité ;
- qualité datasets (data/*_2025.json) ;
- importance macro ;
- diversité régimes / secteurs ;
- actifs déjà observés historiquement (LIGHT_SYMBOLS + Core V1).

**Liste exhaustive** :

| Catégorie | Symboles |
|---|---|
| Indices US (2) | SPY, QQQ |
| Macro defensive (2) | GLD, TLT |
| ETF secteurs PROPRES (3) — XLE/XLU/XLY exclus #15 | XLK, XLF, XLV |
| ETF semis + small cap (2) | SMH, IWM |
| Mega Tech US (10) | NVDA, AAPL, MSFT, META, GOOGL, AMZN, TSLA, NFLX, AVGO, ORCL |
| Semis liquides (4) | AMD, ASML, TSM, ARM |
| Software / cyber leaders (6) | PLTR, CRWD, PANW, NOW, SHOP, CRM |
| Quality defensive (2) | COST, LLY |
| Finance US (4) | JPM, V, MA, AXP |
| Europe (3) | LVMH, SAP, AIR |
| Crypto majeures (3) | BTC, ETH, SOL |
| Complément stratégique (1) | COIN |
| **Total** | **42** |

### 2.2 `analysisUniverse` (168 actifs)

Tous les actifs visibles et analysables — rankings, watchlists, opportunités, analytics. **Inclut livePaperCore.**

**Construction** : `universe-v2.mjs ∩ data/*.json` (171 symboles bidirectionnels) moins `blockedUniverse` (3 actifs #15) = **168 actifs nets**.

**Composition** par bucket de `universe-v2.mjs` (présents dans `data/`) :
- ETFs US INDEX (5), ETFs US TECH (18), ETFs US SECTORS — sans XLE/XLU/XLY (7), ETFs COMMODITIES (1), ETFs BONDS (1), LEVERAGED (3)
- BIG TECH (10), SEMIS (34), CYBER CLOUD (15), SOFTWARE (17), AI MOMENTUM (10), CONSUMER GROWTH (10), QUALITY DEFENSIVE (6), INDUSTRIALS (6), FINANCIALS (6), EUROPE (10), CRYPTO (9)

### 2.3 `experimentalUniverse` (19 actifs)

Actifs présents dans `data/*.json` mais ABSENTS de `universe-v2.mjs`. Visibles, analysables, mais **observabilité prudente** (pas encore validés par le pipeline backtest officiel).

**Liste** :

ANET, CDNS, CFLT, DELL, GEN, HCP, IGM, INTC, PATH, PAYX, RBRK, SENT, SIE, SNPS, SPLK, SPYG, VUG, XSW, ZEN.

**PAS d'auto-open paper.** PAS dans `analysisUniverse` officiel (mais visibles côté UI car présents dans `data/`).

### 2.4 `blockedUniverse` (6 actifs)

Rejet propre. Aucune action analytique ou décisionnelle.

| Symbole | Raison |
|---|---|
| XLY | KNOWN_ISSUES #15 — splits non ajustés |
| XLE | KNOWN_ISSUES #15 |
| XLU | KNOWN_ISSUES #15 |
| EURUSD | FX BLACKLIST (`ASSET_REGISTRY.md` § Exclusions) — non swing-tradable |
| GBPUSD | FX BLACKLIST |
| USDJPY | FX BLACKLIST |

**Réintégration** : conditionnée à la fermeture de #15 (re-ingestion ajustée des datasets) pour XLY/XLE/XLU. Pour FX, PR dédiée nécessitant un setup swing FX validé.

---

## 3. Contrat d'API

### 3.1 Constante exportée

```javascript
export const ASSET_UNIVERSE_V1 = Object.freeze({
  version: "asset-universe-v1",
  livePaperCore:        [...42 symbols...],
  analysisUniverse:     [...168 symbols...],
  experimentalUniverse: [...19 symbols...],
  blockedUniverse:      [...6 symbols...],
});
```

### 3.2 Fonctions exportées

```javascript
export function getAssetTierV1(symbol):
  "LIVE_PAPER_CORE" | "ANALYSIS_ONLY" | "EXPERIMENTAL" | "BLOCKED" | "UNKNOWN"

export function isLivePaperCoreV1(symbol): boolean   // RESTRICTIF
export function isAnalysisAllowedV1(symbol): boolean // visible UI
export function isBlockedV1(symbol): boolean

export function listSymbolsByTierV1(tier): string[]

export function validateAssetUniverseInvariantsV1():
  { ok: boolean, violations: string[] }

export const ASSET_TIERS = Object.freeze({ ... });
export const ASSET_UNIVERSE_V1_METADATA = Object.freeze({ ... });
```

### 3.3 Helpers worker (miroir inline)

Le worker.js contient un mini-bloc miroir inline avec :

```javascript
const AUV_LIVE_PAPER_CORE_V1 = Object.freeze(new Set([...42 symbols...]));
const AUV_BLOCKED_V1 = Object.freeze(new Set([...6 symbols...]));
function auvNormalizeSymbol(s): string|null
function auvIsLivePaperCore(symbol): boolean
```

Seul `auvIsLivePaperCore` est consommé en runtime (filtre dans `isTrainingCandidateAllowed`).

**Maintenance** : changement de `livePaperCore` ou `blockedUniverse` ⇒ mettre à jour les **deux** sources (module pur + worker inline).

---

## 4. Filtre worker (additif RESTRICTIF)

### 4.1 Localisation

Dans `cloudflare-worker/worker.js`, fonction `isTrainingCandidateAllowed`, après le check `riskState.tradingEnabled` et avant `isMarketHoliday` :

```javascript
if (!auvIsLivePaperCore(row.symbol)) return false;
```

### 4.2 Garantie d'innocuité

- **Restrictif uniquement.** Le filtre rejette des candidats — ne peut jamais en accepter un qui aurait été refusé avant.
- **Au pire**, ouvre **autant** que pré-PR (si tous les actifs scannés étaient déjà dans livePaperCore).
- **Au mieux**, ouvre **moins** (les actifs hors core ne déclenchent plus d'auto-open).
- **Aucune** modification de seuil, sizing, allocation, safety gate.
- **Aucune** influence sur le scan opportunités (les actifs hors core restent affichés côté UI — ils ne sont juste pas auto-ouverts).

### 4.3 Impact attendu sur les opérations

Aujourd'hui, le scan `/api/opportunities` parcourt `LIGHT_SYMBOLS` (35 actifs hardcodés) + watchlist utilisateur (jusqu'à 50). Beaucoup de ces actifs sont déjà dans le livePaperCore (overlap LIGHT_SYMBOLS ∩ livePaperCore ≈ 30 actifs). Donc le filtre rejette principalement :
- Les actifs **FX et commodities** de LIGHT_SYMBOLS (EURUSD, GBPUSD, USDJPY, GOLD, SILVER, OIL) — qui étaient déjà difficilement ouvrables (BLACKLIST / pas swing).
- Les actifs **watchlist utilisateur** hors livePaperCore — ces actifs **restent visibles** mais ne déclenchent plus d'auto-open. L'utilisateur peut toujours les analyser.

Le filtre **n'ouvre aucun nouvel actif** par rapport à pré-PR. Conforme directive ChatGPT « ne pas multiplier agressivement les ouvertures ».

---

## 5. Invariants vérifiés par tests

`validateAssetUniverseInvariantsV1()` retourne `{ ok, violations }`. 10 invariants :

1. `livePaperCore ⊆ analysisUniverse`.
2. `livePaperCore ∩ blockedUniverse = ∅`.
3. `analysisUniverse ∩ blockedUniverse = ∅`.
4. `experimentalUniverse ∩ livePaperCore = ∅`.
5. `experimentalUniverse ∩ analysisUniverse = ∅`.
6. `experimentalUniverse ∩ blockedUniverse = ∅`.
7. Pas de doublons à l'intérieur de chaque bucket.
8. `blockedUniverse` contient `XLY, XLE, XLU` (KNOWN_ISSUES #15).
9. `blockedUniverse` contient les 3 FX BLACKLIST.
10. `livePaperCore.length ∈ [30, 50]` (fourchette brief).

Violation d'invariant = test fail = blocage merge.

---

## 6. Tests obligatoires

`tools/quant/test/asset-universe-v1.test.mjs` — exécution :

```bash
node --test tools/quant/test/asset-universe-v1.test.mjs
```

10 tests obligatoires + 4 bonus = **14 tests** :

1. **asset analysis-only** → visible/analysable, PAS auto-open paper.
2. **asset livePaperCore** → auto-open autorisé.
3. **asset blocked** → rejet propre + AUCUNE analyse autorisée.
4. **aucun changement sizing** — module pur ne référence aucun helper sizing/scoring.
5. **aucun drift décisionnel hors univers gating** — les exports retournent uniquement boolean ou tier string.
6. **aucun LIVE_READY** dans la sérialisation.
7. **aucun broker / argent réel** dans la sérialisation.
8. **déterminisme JSON** byte-à-byte.
9. **univers sans doublons** dans chaque bucket.
10. **validation cohérence registry** via `validateAssetUniverseInvariantsV1()`.

Bonus : version + métadonnées, symbole UNKNOWN safe, normalisation casse/trim, taille buckets cohérente.

```
$ node --test tools/quant/test/asset-universe-v1.test.mjs
# tests 14 / pass 14 / fail 0
```

---

## 7. Relation avec les autres docs

```
ASSET_REGISTRY.md (règle stratégique : 40-120 actifs cible, exclusions)
   ↓
UNIVERSE_CORE_V1.md (liste opérationnelle figée 78 actifs Core V1)
   ↓
ASSET_UNIVERSE_V1.md (CE FICHIER — taxonomie staged 4 tiers)
   ↓
worker.js (filtre RESTRICTIF auto-open via auvIsLivePaperCore)
```

`ASSET_UNIVERSE_V1.md` **ne remplace pas** `ASSET_REGISTRY.md` (qui reste la règle stratégique) ni `UNIVERSE_CORE_V1.md` (liste 78 actifs figés). Il **opérationnalise** la séparation analyse vs live execution en ajoutant un filtre runtime explicite.

---

## 8. Règles d'évolution

### 8.1 Ajout / retrait d'un actif dans livePaperCore

- PR documentaire dédiée justifiant le critère (liquidité, dataset propre, importance).
- MAJ simultanée du module pur **ET** du miroir inline worker.js.
- MAJ tests (ajouter le symbole aux exemples du test #2).
- Vérifier que `validateAssetUniverseInvariantsV1` reste OK (taille 30-50).

### 8.2 Ajout d'un actif dans blockedUniverse

- PR documentaire avec raison explicite (cf. table § 2.4).
- MAJ KNOWN_ISSUES.md si dette qualité données.
- MAJ module pur + worker inline + tests.

### 8.3 Levée d'un blocage

- Conditionnée à la résolution de la cause (#15 fermée → XLY/XLE/XLU réintégrables).
- PR dédiée, audit qualité données complet.
- Réintégration en `experimentalUniverse` ou `analysisUniverse` (pas direct en `livePaperCore` avant observation).

### 8.4 Promotion experimental → analysis-only

- Conditionnée à l'intégration officielle dans `universe-v2.mjs`.
- PR documentaire + MAJ ASSET_REGISTRY.md (classification ELITE/CORE/TACTICAL/BLACKLIST).

### 8.5 Promotion analysis-only → livePaperCore

- Conditionnée à l'observation paper sur ≥ 1 mois.
- Critères liquidité / stabilité / qualité datasets confirmés.
- PR documentaire + tests + validation ChatGPT.

---

## 9. Limites V1

### 9.1 Limites assumées

- **42 actifs en livePaperCore** est conservateur. Brief autorise 30-50. Volontairement proche du milieu pour garder marge dans les deux sens.
- **Pas de différenciation par mode bot** (`exploration` vs `core`). Toutes les ouvertures paper utilisent le même livePaperCore.
- **Pas de différenciation par horaire de marché**. Les actifs Europe / US / crypto sont mélangés ; le filtre `auvIsLivePaperCore` est binaire.
- **Pas de filtre par capitalisation dynamique**. La liste est figée — pas de re-calibrage automatique selon liquidité observée.

### 9.2 Limites héritées

- Le scan `/api/opportunities` continue de parcourir LIGHT_SYMBOLS + watchlist. Les actifs hors livePaperCore restent affichés côté UI (volontairement, pour préserver la visibilité analyse).
- KNOWN_ISSUES #15 limite la breadth sectorielle (XLY/XLE/XLU = 3 secteurs sur 11 indisponibles).
- `experimentalUniverse` est non-validé par le pipeline backtest officiel — observabilité prudente.

---

## 10. Sources

- Brief créateur 2026-05-21 « PR-ASSET-UNIVERSE-170-STAGED-V1 ».
- `BOT_OBJECTIVE.md` — règle 10 (chaque modif améliore cohérence/fiabilité/qualité moteur).
- `docs/quant/ASSET_REGISTRY.md` § *Univers cible stratégique 40-120*.
- `docs/quant/UNIVERSE_CORE_V1.md` — 78 actifs figés (PR #241).
- `docs/monitoring/KNOWN_ISSUES.md` #15 — splits non ajustés XLY/XLE/XLU.
- `tools/backtests/universe-v2.mjs` — 191 symboles backtest.
- `tools/quant/lib/asset-universe-v1.mjs` — implémentation pure.
- `cloudflare-worker/worker.js` — miroir inline + filtre RESTRICTIF.

---

> **Conclusion-mémo** : 4 tiers staged (livePaperCore 42, analysisUniverse 168, experimentalUniverse 19, blockedUniverse 6). Auto-open paper RESTREINT à livePaperCore via filtre additif dans `isTrainingCandidateAllowed`. ANALYSE élargie à ~170 actifs sans élargir l'exécution. KNOWN_ISSUES #15 toujours protégée (XLY/XLE/XLU bloqués). Aucun broker, aucun LIVE_READY, aucun apprentissage automatique. Conforme phase VÉRITÉ MARCHÉ : scaler l'observation avant de scaler l'exécution.
