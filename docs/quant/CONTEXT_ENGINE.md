# CONTEXT_ENGINE.md — Context Engine V1 ManiTradePro

> **Statut** : OFFICIAL — livré par PR-CTX-2 `quant: PR-CTX-2 — context engine v1 analytical module` (2026-05-21). Source canonique unique du Context Engine V1.
>
> **Module** : analytique pur, read-only, **non branché en runtime**. Aucune consommation worker.js. Aucun effet de bord. Aucun setup activé. Aucune décision automatique.
>
> **Subordination** :
> - `BOT_OBJECTIVE.md` — constitution produit (autorité dure).
> - `docs/quant/REGIME_RULES.md` — classification 4-état officielle V1.
> - `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md` — gel méthodologique.
>
> **Implémentation technique** : `tools/quant/lib/context-engine-v1.mjs`. Source unique. Aucune duplication tolérée.

---

## 1. Rôle et philosophie

### 1.1 Ce que le Context Engine V1 fait

Le Context Engine V1 produit un **snapshot lisible, déterministe et testable** de l'état présent du marché à partir de bougies daily historiques.

Un snapshot répond à 4 questions :

1. **Quel régime ?** (RISK_ON / RANGE / RISK_OFF / HIGH_VOL) — délégué à `regime-rules-v1.mjs`.
2. **Quelle largeur de marché ?** (breadth — combien d'indices et secteurs sont au-dessus de leur EMA200).
3. **Quels secteurs mènent ou suivent ?** (leadership — top 3 / bottom 3 sur la relative strength 20j et 63j vs SPY).
4. **La structure défensive joue-t-elle son rôle ?** (TLT, GLD vs SPY).

Le snapshot ajoute aussi un **proxy de volatilité** (realized vol SPY 20j annualisée) pour repérer les régimes stressés.

### 1.2 Ce qu'il **n'est pas**

- ❌ **Pas un moteur de décision.** Il ne décide pas d'ouvrir un trade. Il ne valide aucun setup.
- ❌ **Pas une prédiction.** Il décrit l'état présent, pas le futur.
- ❌ **Pas un classifieur opaque.** Pas d'IA, pas de probabilité, pas de scoring obscur.
- ❌ **Pas une couche runtime.** Il n'est pas consommé par `cloudflare-worker/worker.js`. Il n'altère rien côté trading actif.
- ❌ **Pas branché à PR-CTX-3** (Setup authorization matrix). PR-CTX-3 consommera ces snapshots, **plus tard**.

### 1.3 Le snapshot est analytique, jamais live

Le Context Engine V1 respecte strictement `PROJECT_RULES.md` R1 (séparation analytique / live) :

- Toutes les entrées sont des **bougies daily clôturées**.
- Aucune dépendance à un prix live, un freshness, ou `Date.now()`.
- Le snapshot est **déterministe** : mêmes bougies → même JSON byte-à-byte.

---

## 2. Univers contexte V1 (figé)

L'univers de 16 symboles est figé pour V1 :

| Rôle | Symboles |
|---|---|
| Tendance primaire | SPY, QQQ, SMH |
| Breadth sectorielle | XLK, XLF, XLE, XLV, XLI, XLY, XLP, XLU, XLB, XLRE, XLC |
| Confirmation défensive | TLT, GLD |

**Justification rôle par rôle** :

- **SPY** : S&P 500 large — la tendance primaire de référence.
- **QQQ** : Nasdaq 100 — croissance / tech beta.
- **SMH** : semi-conducteurs — risk appetite agressif, leader de cycle.
- **Secteurs SPDR** : breadth sectorielle. Si seulement quelques secteurs portent l'indice, la qualité du marché est mauvaise.
- **TLT** : bons du Trésor long terme. Bouclier défensif structurel / stress taux.
- **GLD** : or. Bouclier défensif macro / fuite vers la qualité.

**Pas d'élargissement automatique** : tout ajout / retrait d'un symbole se fait par PR documentaire dédiée + audit régression.

---

## 3. Inputs V1

### 3.1 Signature de la fonction

```javascript
buildContextSnapshotV1({
  asOf,             // string YYYY-MM-DD optionnel.
                    // Si null/undefined : asOf = dernière date commune
                    // aux symboles évaluables.
  candlesBySymbol,  // { [symbol]: Array<{ time, open, high, low, close, volume }> }
});
```

### 3.2 Format de bougie attendu

```javascript
{
  time: "2024-06-28",   // YYYY-MM-DD, ordre croissant garanti par le caller.
  open: 547.31,
  high: 549.10,
  low: 546.02,
  close: 548.65,
  volume: 50_123_456,
}
```

### 3.3 Pré-requis de fraîcheur / historique

| Calcul | Minimum requis |
|---|---|
| EMA200 (`REGIME_V1_EMA_PERIOD`) | 200 bougies daily |
| Realized vol 20j (`REGIME_V1_HIGH_VOL_RVOL_WINDOW_DAYS`) | 20 bougies + 1 retour |
| Relative strength 63j | 63 bougies |
| Médiane rolling 252j pour `vol.state` | 252 bougies (sinon `UNKNOWN` ou seul seuil 25 % utilisé) |
| **Plancher universel** | **252 bougies par symbole évalué** |

Un symbole sous 252 bougies est listé dans `dataQuality.insufficientHistory`. Le snapshot **est toujours produit** ; il ne lève jamais d'exception silencieuse.

### 3.4 Anti-lookahead

Le Context Engine respecte `docs/research/ANTI_LOOKAHEAD_RULES.md` :

- Tous les indicateurs (EMA, log returns, stddev, RS) utilisent uniquement `slice(0, idx+1)` — la bougie i incluse, jamais i+1.
- `asOf` aligne tous les symboles sur la même date passée. Aucun symbole n'a accès à une bougie postérieure à `asOf`.
- Aucun champ live (prix, freshness, quotedAt) n'entre dans le calcul.

---

## 4. Outputs V1

### 4.1 Forme complète

```javascript
{
  version: "context-engine-v1",
  asOf: "2024-06-28",
  regime: "RISK_ON" | "RANGE" | "RISK_OFF" | "HIGH_VOL" | null,
  regimeConfidence: 0-100,
  regimeSource: {
    primary: "SPY",
    rulesVersion: "regime-rules-v1"
  },
  breadth: {
    riskOnCount,        // # symboles (indices + secteurs) above EMA200
    riskOffCount,       // # below EMA200
    neutralCount,       // # avec EMA200 indisponible
    totalEvaluated,     // riskOnCount + riskOffCount + neutralCount
    pctRiskOn,          // arrondi 1 décimale
    pctRiskOff
  },
  sectorLeadership: {
    leaders: [
      { symbol, score, trendState, relStrength20d, relStrength63d }
    ],            // top 3 par score décroissant
    laggards: [   // bottom 3 par score croissant
      { symbol, score, trendState, relStrength20d, relStrength63d }
    ]
  },
  vol: {
    proxy: "SPY_REALIZED_VOL_20D",
    value,              // realized vol annualisée 20j, ou null
    state: "LOW" | "NORMAL" | "ELEVATED" | "HIGH" | "UNKNOWN"
  },
  defensiveConfirmation: {
    tltState: "CONFIRM_RISK_OFF" | "NEUTRAL" | "RISK_ON_CONTRADICTION" | "UNKNOWN",
    gldState: "CONFIRM_STRESS"   | "NEUTRAL" | "RISK_ON_CONTRADICTION" | "UNKNOWN"
  },
  warnings: [],
  dataQuality: {
    missingSymbols,         // symboles absents de candlesBySymbol ou array vide
    insufficientHistory,    // symboles présents mais < 252 bougies
    evaluatedSymbols        // symboles effectivement utilisés
  }
}
```

### 4.2 Champ par champ

#### regime / regimeSource

Délégation stricte à `tools/quant/lib/regime-rules-v1.mjs` (lib canonique CLEAN-2). Le Context Engine ne définit aucun régime maison.

- Si SPY/QQQ/SMH ont chacun ≥ 200 bougies : régime classifié.
- Si rvol SPY 20j calculable et > 0.25 → HIGH_VOL override.
- Sinon `null` + warning explicite.

#### regimeConfidence (0-100)

Mesure simple et déterministe de la robustesse de la classification :

| Régime | Calcul |
|---|---|
| `HIGH_VOL` | `50 + 50 × clamp((rvol − 0.25) / 0.25, 0, 1)`. Rvol=0.25 → 50. Rvol≥0.50 → 100. |
| `RISK_ON` / `RISK_OFF` | `50 + 50 × (avgAbsDistance / 0.05)` clamp [50,100]. Plus les indices sont éloignés de leur EMA200, plus la confiance est haute. |
| `RANGE` | `80 − 50 × (avgAbsDistance / 0.10)` clamp [30,80]. Plus les indices sont proches de leur EMA200, plus la confiance RANGE est haute. |
| `null` | `0` |

Aucune probabilité pseudo-prédictive. C'est une mesure structurelle de l'écart aux seuils.

#### breadth

Compte le nombre d'indices + secteurs **above / below** EMA200. Pondère sur `totalEvaluated` (max 14 = 3 indices + 11 secteurs SPDR).

#### sectorLeadership

Pour chaque secteur SPDR évalué :

- `relStrength20d = secteur.pctChange20d − SPY.pctChange20d`
- `relStrength63d = secteur.pctChange63d − SPY.pctChange63d`
- `score = 0.5 × relStrength20d + 0.5 × relStrength63d`
- `trendState = ABOVE_EMA200 | BELOW_EMA200 | UNKNOWN`

Tri : `leaders` par score décroissant (top 3), `laggards` par score croissant (top 3).

#### vol

Realized vol annualisée 20j SPY = `stddev(log_returns_20d) × √252`.

`state` :

| Cas | Règle |
|---|---|
| `HIGH` | rvol > 0.25 (= `REGIME_V1_HIGH_VOL_RVOL_THRESHOLD`) |
| `ELEVATED` | rvol > médiane_252j × 1.3 (et ≤ 0.25) |
| `LOW` | rvol < médiane_252j × 0.7 |
| `NORMAL` | entre LOW et ELEVATED |
| `UNKNOWN` | médiane_252j indisponible **et** rvol ≤ 0.25 |

#### defensiveConfirmation

| Cas (SPY, TLT) | tltState |
|---|---|
| SPY < EMA200, TLT > EMA200 | `CONFIRM_RISK_OFF` |
| SPY > EMA200, TLT > EMA200 | `RISK_ON_CONTRADICTION` |
| SPY < EMA200, TLT < EMA200 | `RISK_ON_CONTRADICTION` |
| SPY > EMA200, TLT < EMA200 | `NEUTRAL` |

| Cas (SPY, GLD) | gldState |
|---|---|
| SPY < EMA200, GLD > EMA200 | `CONFIRM_STRESS` |
| SPY < EMA200, GLD < EMA200 | `RISK_ON_CONTRADICTION` |
| autres | `NEUTRAL` |

#### warnings / dataQuality

`warnings` est une liste de strings courtes décrivant les calculs dégradés (médiane vol manquante, EMA200 indisponible, SPY absent, etc.). `dataQuality` détaille quels symboles sont manquants, insuffisamment historisés, ou évalués.

---

## 5. Limites V1 (explicites)

### 5.1 Limites structurelles assumées

- **Univers figé à 16 symboles.** Pas d'extension automatique. Pas de breadth NYSE/Nasdaq complète (advance/decline lines).
- **Pas de VIX externe.** La volatilité est proxiée via realized vol SPY 20j. Si jour de stress soudain (gap matinal violent), le proxy 20j met du temps à monter.
- **Sectoriel = secteurs SPDR uniquement.** Pas de breadth intra-secteur. Pas de leadership intra-industries.
- **Pas de credit spread, pas de yield curve, pas de carry FX.** Tout signal macro non-equity / non-rates basique est hors scope V1.
- **Pas de modulation par classe d'actif.** Le régime US est global. Pas de régime sectoriel ou régional séparé.
- **Pas de tracking historique.** Le snapshot est un instantané. Aucune persistance, aucun versionnage côté DB.

### 5.2 Sensibilité aux données

Le Context Engine est aussi propre que les données qu'il consomme. **Bougies non ajustées des splits / dividendes** produisent des relative strengths fantôme (ex. -50 % vs SPY sur 20j est impossible structurellement). Le moteur **ne corrige pas** ce problème. Voir `docs/monitoring/KNOWN_ISSUES.md` issue #15 pour la dette de qualité données identifiée à la livraison.

### 5.3 Faux positifs possibles

- **regime = RISK_ON avec breadth 50 %** : possible si SPY/QQQ/SMH sont tous above EMA200 mais que les secteurs sont dispersés. Lecture correcte : tendance primaire intacte mais qualité dégradée.
- **HIGH_VOL persistant après un seul jour de panique** : la fenêtre 20j conserve un pic 20 sessions. C'est volontaire (anti-bruit) mais lent.
- **defensiveConfirmation NEUTRAL après une baisse violente** : si SPY bascule sous EMA200 mais TLT n'a pas encore monté, la classification reste NEUTRAL le temps que les défensifs réagissent.

---

## 6. Non-consommation runtime

Le Context Engine V1 est **strictement analytique**.

- ❌ Aucun appel depuis `cloudflare-worker/worker.js`.
- ❌ Aucun appel depuis `assets/app.js`.
- ❌ Aucune table Supabase associée.
- ❌ Aucun secret, aucune clé API, aucun fetch externe.
- ❌ Aucune intégration `validateConfiguration` / `buildWorkerPlan` / `computeTradeSafetyScore`.

Le module vit dans `tools/quant/` — **dossier de recherche analytique**.

Vérifiable par `git diff origin/main..HEAD -- cloudflare-worker/ assets/` = vide.

---

## 7. Relation avec REGIME_RULES.md

Le Context Engine V1 **ne re-définit jamais** un régime. Il importe et appelle :

```javascript
import {
  classifyFourStateRegimeV1,
  REGIME_V1_EMA_PERIOD,
  REGIME_V1_HIGH_VOL_RVOL_THRESHOLD,
  REGIME_V1_HIGH_VOL_RVOL_WINDOW_DAYS,
  REGIME_V1_METADATA,
} from "./regime-rules-v1.mjs";
```

Conséquence : toute modification de régime se fait **dans `regime-rules-v1.mjs` uniquement**, jamais ici. Toute incohérence détectée doit corriger la lib canonique, pas dupliquer ici.

Pendant la classification :

1. Calcul booléens `spyAboveEma200`, `qqqAboveEma200`, `smhAboveEma200`.
2. Calcul `realizedVolAnnualised` (rvol 20j SPY).
3. Appel `classifyFourStateRegimeV1({...})` — un seul appel, une seule source de vérité.

Si `rvol === null` (par manque d'historique) : appel avec `realizedVolAnnualised: 0` → HIGH_VOL ne peut s'activer, on retombe sur la classification 3-état. Comportement déterministe et lisible.

---

## 8. Relation future avec PR-CTX-3

PR-CTX-2 **prépare** PR-CTX-3 mais ne l'implémente pas.

PR-CTX-3 introduira pour chaque setup une déclaration explicite :

```
SETUP X
- allowedMarkets: [...]
- allowedRegimes: ["RISK_ON", "RANGE"]
- blockedRegimes: ["HIGH_VOL", "RISK_OFF"]
- preferredConditions: { breadth.pctRiskOn > 60, defensiveConfirmation.tltState = "NEUTRAL", ... }
```

PR-CTX-3 consommera un `buildContextSnapshotV1(...)` côté décision pour répondre à : **"ce setup est-il autorisé maintenant ?"**

Important : PR-CTX-3 n'est **pas** un binding runtime worker. PR-CTX-5 (escalade créateur séparée) abordera la question runtime vs pure-recherche.

PR-CTX-2 ne touche en aucune façon à cette matrice. Aucun changement de `allowedRegimes` / `blockedRegimes` / `validateConfiguration`. Aucun setup activé. Aucun statut setup modifié (cf. `docs/quant/SETUPS_REGISTRY.md`).

---

## 9. Tests de cohérence

### 9.1 Tests unitaires obligatoires

`tools/quant/test/context-engine-v1.test.mjs` — exécution :

```bash
node --test tools/quant/test/context-engine-v1.test.mjs
```

5 cas obligatoires :

1. **RISK_ON canonique** : tendance positive + vol normale → `regime = RISK_ON`.
2. **HIGH_VOL override** : burst rvol > 25 % → `regime = HIGH_VOL` même tendance positive.
3. **RISK_OFF canonique** : tendance négative → `regime = RISK_OFF`.
4. **Données insuffisantes** : output produit, `warnings` rempli, pas d'exception, pas de valeur inventée (`rvol = null`, `vol.state = "UNKNOWN"`).
5. **Déterminisme** : mêmes inputs → JSON byte-à-byte identique sur 2 appels successifs + égalité avec un asOf explicite recalé sur la dernière bougie.

Un test bonus valide la forme structurelle de l'output (clés top-level, structures breadth / sectorLeadership / vol / defensive).

### 9.2 Smoke script (données réelles)

`tools/quant/context-engine-smoke-v1.mjs` — exécution :

```bash
node tools/quant/context-engine-smoke-v1.mjs
node tools/quant/context-engine-smoke-v1.mjs --asOf 2024-06-28
```

Charge les 16 datasets `data/{SYMBOL}_2025.json`. Produit `tools/quant/output/context-engine-smoke-v1.json` (snapshot + métadonnées smoke).

Sortie reproductible : pour le même dataset + asOf, le JSON est byte-à-byte identique (hors valeurs flottantes intrinsèquement identiques par construction).

### 9.3 Aucune régression CLEAN-1 / CLEAN-2

- Aucun script existant n'est modifié.
- Aucun output existant n'est modifié.
- `tools/backtests/output/*.json` reste intact.
- Le module n'est pas branché dans les backtests existants.

---

## 10. Ce que le module ne fait pas

- ❌ **Pas de scoring prédictif.** Pas de probabilité « 73 % de hausse ».
- ❌ **Pas de moteur de décision.** Pas d'ouverture / fermeture de positions.
- ❌ **Pas de modification de score, de plan, de safetyScore, ou de validation broker.**
- ❌ **Pas d'optimisation ex-post.** Aucun paramètre n'est tuné après lecture des résultats.
- ❌ **Pas de tracking historique en base.** Aucune table, aucun cache KV, aucun secret.
- ❌ **Pas de coordination avec le paper trading.** Aucun signal généré.

Le module est un **observateur passif déterministe**. Il dit ce qu'il voit, point.

---

## 11. Règles d'évolution

### 11.1 Modification de l'univers

- PR documentaire dédiée + justification économique.
- Audit régression : impact sur les tests + relancer le smoke pour mesurer le delta.

### 11.2 Ajout d'un champ de sortie

- Additif uniquement (cf. `PROJECT_RULES.md` R4 sur l'additivité du payload).
- Ne jamais retirer ni renommer un champ existant — casse PR-CTX-3 à venir.
- Mise à jour de cette doc § 4 obligatoire.

### 11.3 Modification du moteur de régime

Interdite ici. Toute modif passe par `regime-rules-v1.mjs` et `docs/quant/REGIME_RULES.md` § 9.

### 11.4 Ajout d'une nouvelle source de volatilité (ex. VIX externe)

- Hors V1. Nécessite PR séparée + audit qualité provider + impact sur `state`.
- V1 reste sur le proxy `SPY_REALIZED_VOL_20D` uniquement.

---

## 12. Sources

- `BOT_OBJECTIVE.md` — constitution produit.
- `docs/quant/REGIME_RULES.md` — classification 4-état officielle.
- `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md` — gel méthodologique.
- `docs/research/ANTI_LOOKAHEAD_RULES.md` — anti-lookahead.
- `tools/quant/lib/regime-rules-v1.mjs` — implémentation régime canonique CLEAN-2.
- `tools/quant/lib/context-engine-v1.mjs` — implémentation Context Engine V1.
- `tools/quant/test/context-engine-v1.test.mjs` — tests unitaires.
- `tools/quant/context-engine-smoke-v1.mjs` — smoke script.

---

> **Conclusion-mémo** : Context Engine V1 = module analytique pur produisant un snapshot lisible et déterministe (régime, breadth, leadership, vol, défensifs) à partir des 16 symboles du contexte V1. Aucun runtime, aucune décision, aucun setup activé. Régime délégué à `regime-rules-v1.mjs`. VIX-proxy via realized vol SPY 20j. 5 tests unitaires + smoke. PR-CTX-3 (matrice setups) consommera ces snapshots — pas implémenté ici.
