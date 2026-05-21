# SETUP_AUTHORIZATION_MATRIX.md — Setup Authorization Matrix V1 ManiTradePro

> **Statut** : OFFICIAL — livré par PR-CTX-3 `quant: PR-CTX-3 — setup authorization matrix v1` (2026-05-21). Source canonique unique de la matrice d'autorisation déclarative par setup.
>
> **Module** : analytique pur, déclaratif, **non branché en runtime**. Aucun setup activé. Aucun statut `SETUPS_REGISTRY.md` modifié. Aucun setup promu LIVE_READY.
>
> **Subordination** :
> - `BOT_OBJECTIVE.md` — constitution produit (autorité dure).
> - `docs/quant/SETUPS_REGISTRY.md` — source canonique des statuts. La matrice **reflète** ces statuts, ne les **modifie pas**.
> - `docs/quant/REGIME_RULES.md` — classification 4-état officielle.
> - `docs/quant/CONTEXT_ENGINE.md` — fournit le contexte consommé par `explainSetupAuthorizationV1`.
>
> **Implémentation technique** : `tools/quant/lib/setup-authorization-matrix-v1.mjs`. Source unique. Aucune duplication tolérée.

---

## 1. Rôle et philosophie

### 1.1 Ce que la matrice fait

La matrice **déclare**, pour chaque setup analytique du repo, **dans quels régimes il est autorisé, bloqué ou préféré**.

Elle répond à 4 questions par setup :

1. Dans quels régimes ce setup est-il **autorisé** ? (`allowedRegimes`)
2. Dans quels régimes est-il **explicitement bloqué** ? (`blockedRegimes`)
3. Son **statut officiel** lui interdit-il l'activation indépendamment du régime ? (`blockedByStatus`)
4. Quelles conditions de contexte sont **préférables / bloquantes** ? (`preferredConditions` / `blockedConditions`)

### 1.2 Ce qu'elle **n'est pas**

- ❌ **Pas un moteur de décision runtime.** La matrice ne décide pas d'ouvrir un trade. Elle ne valide pas un signal. Elle ne modifie aucun `validateConfiguration`.
- ❌ **Pas un outil de promotion de setup.** Aucun setup ne devient `VALIDATED_RESEARCH_CORE` ou `LIVE_READY` à cause de la matrice. La promotion passe par PR documentaire dédiée sur `docs/quant/SETUPS_REGISTRY.md`.
- ❌ **Pas une source de vérité sur les statuts.** La matrice **reflète** les statuts officiels de `SETUPS_REGISTRY.md`. Toute évolution de statut commence par `SETUPS_REGISTRY.md`.
- ❌ **Pas branchée à `cloudflare-worker/worker.js`.** PR-CTX-5 (escalade créateur séparée) décidera si une couche runtime consomme cette matrice.
- ❌ **Pas en consommatrice de `sectorLeadership.*`** tant que `docs/monitoring/KNOWN_ISSUES.md` issue #15 reste OPEN (splits non ajustés détectés sur XLY/XLE/XLU). Invariant vérifié par tests.

### 1.3 La matrice est analytique, jamais runtime

Cohérent avec `PROJECT_RULES.md` R1 (séparation analytique / live) :

- La matrice est une **constante figée** (`Object.freeze`).
- Les fonctions d'évaluation sont **pures** : pas d'I/O, pas de `Date.now()`, pas d'aléa.
- L'évaluation est **déterministe** : mêmes inputs → même JSON byte-à-byte.

---

## 2. Setups couverts en V1

La V1 couvre **5 setups** explicitement listés dans le brief PR-CTX-3 :

| Setup ID matrice | Statut SETUPS_REGISTRY | Couverture régime |
|---|---|---|
| `RS_ROTATION_SIMPLE` | `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED` | `RANGE`, `RISK_ON` autorisés ; `RISK_OFF`, `HIGH_VOL` bloqués |
| `MEAN_REVERSION` | `EXPERIMENTAL_ONLY / FRICTION_REQUIRED` | `RANGE` seulement |
| `SECTOR_RELATIVE_STRENGTH` | `FRAGILE / CONCENTRATION_EXCESSIVE` | **aucun** régime (blocked by status) |
| `TREND_PULLBACK_DYNAMIC_SUPPORT` | `FRAGILE` | **aucun** régime (blocked by status) |
| `GLD_BREAKOUT_ISOLATED` | `CONDITIONAL_RESEARCH_CANDIDATE` | `RISK_ON`, `RANGE` autorisés ; restreint à `GLD` via `symbolWhitelist` |

**Setups absents de la V1** :

- `PULLBACK_MOMENTUM` — `DEAD / DO_NOT_TRADE` (PR #207 INVALID_BACKTEST).
- `BREAKOUT_EXPANSION` agrégé — `DEAD_AGGREGATED` (PR #208).
- `VOLATILITY_COMPRESSION` — `DEAD / ABANDONED`.

Les setups DEAD ne sont **pas inclus** dans la matrice : ils ne doivent pas être considérés comme analysables, même bloqués. Toute réintroduction passerait par une PR documentaire qui ressuscite le setup dans `SETUPS_REGISTRY.md` d'abord.

---

## 3. Contrat d'API

### 3.1 Constante exportée

```javascript
export const SETUP_AUTHORIZATION_MATRIX_V1 = Object.freeze({
  RS_ROTATION_SIMPLE: {
    statusRef: "RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED",
    registryLink: "docs/quant/SETUPS_REGISTRY.md#setup-3--relative-strength-rotation",
    allowedRegimes: ["RANGE", "RISK_ON"],
    blockedRegimes: ["RISK_OFF", "HIGH_VOL"],
    blockedByStatus: false,
    preferredConditions: [
      { kind: "regime", op: "eq", value: "RANGE" },
      { kind: "vol.state", op: "in", value: ["LOW", "NORMAL"] },
      { kind: "breadth.pctRiskOn", op: ">=", value: 40 },
    ],
    blockedConditions: [
      { kind: "vol.state", op: "eq", value: "HIGH" }, // sécurité défensive
    ],
    symbolWhitelist: null,
    doNotDependOnSectorLeadership: true,
    notes: "Edge propre côté exécution ... pas d'activation paper avant ...",
  },
  // MEAN_REVERSION, SECTOR_RELATIVE_STRENGTH,
  // TREND_PULLBACK_DYNAMIC_SUPPORT, GLD_BREAKOUT_ISOLATED ...
});
```

### 3.2 Fonctions exportées

```javascript
export function listSetupIdsV1(): string[];

export function getSetupAuthorizationV1(setupId: string): SetupEntry | null;

export function isSetupAllowedInRegimeV1(setupId: string, regime: string): {
  allowed: boolean;
  reason: string | null;
  warnings: string[];
};

export function explainSetupAuthorizationV1(
  setupId: string,
  contextSnapshot: ContextSnapshotV1,
): {
  version: "setup-authorization-matrix-v1";
  setupId: string;
  allowed: boolean;
  blockedBy: string[];
  met: string[];
  unmet: string[];
  warnings: string[];
  snapshotRegime: string | null;
  statusRef: string | null;
};

export function validateMatrixInvariantsV1(): {
  ok: boolean;
  violations: string[];
};
```

### 3.3 DSL de conditions

Une condition est un objet :

```javascript
{ kind: <FIELD>, op: <OP>, value: <V>, note?: <STRING> }
```

| `kind` | Lecture dans le snapshot |
|---|---|
| `regime` | `snapshot.regime` |
| `regimeConfidence` | `snapshot.regimeConfidence` |
| `vol.state` | `snapshot.vol.state` |
| `vol.value` | `snapshot.vol.value` |
| `breadth.pctRiskOn` | `snapshot.breadth.pctRiskOn` |
| `breadth.pctRiskOff` | `snapshot.breadth.pctRiskOff` |
| `defensiveConfirmation.tltState` | `snapshot.defensiveConfirmation.tltState` |
| `defensiveConfirmation.gldState` | `snapshot.defensiveConfirmation.gldState` |

| `op` | Sémantique |
|---|---|
| `eq` / `neq` | égalité stricte |
| `in` / `not_in` | appartenance à un tableau |
| `>=` / `<=` / `>` / `<` | comparaison numérique |

Une condition dont la valeur cible est absente du snapshot retourne `value_missing` → ajoutée à `warnings` (jamais bloquante par défaut).

### 3.4 Logique de décision

`explainSetupAuthorizationV1(setupId, snapshot)` :

1. Si `setupId` inconnu → `allowed=false`, `blockedBy=["unknown_setup"]`, warning.
2. Si `blockedByStatus === true` → ajout `status:<statusRef>` à `blockedBy`.
3. Lecture `snapshot.regime` :
   - Absent / invalide → warning, pas de blocage régime.
   - Présent dans `blockedRegimes` → ajout `regime_blocked:<regime>` à `blockedBy`.
   - Absent de `allowedRegimes` → ajout `regime_not_allowed:<regime>` à `blockedBy`.
4. Évaluation des `blockedConditions` : si match → ajout à `blockedBy`.
5. Évaluation des `preferredConditions` : chacune est classée `met` ou `unmet`.
6. `allowed = blockedBy.length === 0`.

---

## 4. Statuts officiels (état figé V1)

Statuts à date 2026-05-21, sources : `docs/quant/SETUPS_REGISTRY.md` (truth-sync 2026-05-19).

### 4.1 RS_ROTATION_SIMPLE

- **Statut** : `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED`
- **Régimes autorisés** : `RANGE` (PF 2.04 Phase 1 hardening, régime optimal), `RISK_ON` (PF 1.28 marginal).
- **Régimes bloqués** : `RISK_OFF` (PF 0.146 en 2022, edge KILLED), `HIGH_VOL` (sample n=10 insuffisant pour conclure).
- **Conditions préférées** : `regime == RANGE`, `vol.state in [LOW, NORMAL]`, `breadth.pctRiskOn >= 40`.
- **Conditions bloquantes** : `vol.state == HIGH` (sécurité défensive doublonnée avec `blockedRegimes`).
- **Note** : edge propre côté exécution (×1.01 inflation PR #208), MAIS 0 ROBUST/STABLE en rolling walk-forward + PF 0.146 en 2022. Friction ×2/×3 survivent. **Pas d'activation paper avant protection bear validée.**

### 4.2 MEAN_REVERSION

- **Statut** : `EXPERIMENTAL_ONLY / FRICTION_REQUIRED`
- **Régimes autorisés** : `RANGE` strict.
- **Régimes bloqués** : `RISK_ON`, `RISK_OFF`, `HIGH_VOL`.
- **Conditions préférées** : `vol.state in [LOW, NORMAL]`.
- **Note** : Test V1 PR-R3B-v3 → n=7 trades sur 5 ans × 15 ETF en RANGE, PF 1.06 marginal, 0/3 walk-forward, friction ×2 PF 0.764. Sample insuffisant pour `DEAD` formel mais indicateurs qualitatifs catastrophiques.

### 4.3 SECTOR_RELATIVE_STRENGTH

- **Statut** : `FRAGILE / CONCENTRATION_EXCESSIVE`
- **Régimes autorisés** : **aucun**.
- **Régimes bloqués** : tous (`RISK_ON`, `RANGE`, `RISK_OFF`, `HIGH_VOL`).
- **`blockedByStatus: true`** — statut bloque indépendamment du régime.
- **Note** : Top 5 tickers = 103 % du PnL, sans eux PF 0.94. Critère Freeze §4 violé. Interdictions explicites `SETUPS_REGISTRY.md` §7. Pas d'activation paper, pas d'activation live, pas de promotion `VALIDATED_RESEARCH_CORE` tant que concentration non corrigée.

### 4.4 TREND_PULLBACK_DYNAMIC_SUPPORT

- **Statut** : `FRAGILE`
- **Régimes autorisés** : **aucun**.
- **Régimes bloqués** : tous.
- **`blockedByStatus: true`** — statut bloque indépendamment du régime.
- **Note** : PF 1.045 sous seuil Freeze §4 (PF post-friction ≥ 1.3). Amélioration marginale vs `PULLBACK_MOMENTUM` (+0.065). Interdictions explicites `SETUPS_REGISTRY.md` §8.

### 4.5 GLD_BREAKOUT_ISOLATED

- **Statut** : `CONDITIONAL_RESEARCH_CANDIDATE`
- **Régimes autorisés** : `RISK_ON`, `RANGE`.
- **Régimes bloqués** : `RISK_OFF`, `HIGH_VOL`.
- **`symbolWhitelist: ["GLD"]`** — restriction explicite, ne s'applique qu'à GLD.
- **Note** : single-symbol edge (n=47 sur 5 ans). NE PAS extrapoler à d'autres actifs (NVDA/SMCI/COIN tier STRONG/OK mais 13-25 trades, encore plus fragile). Découplé du leadership sectoriel par construction (cf. `KNOWN_ISSUES.md` #15).

---

## 5. Invariants vérifiés par tests

`validateMatrixInvariantsV1()` retourne `{ ok: boolean, violations: string[] }` et est appelé par les tests unitaires. Invariants :

1. **Aucune référence à `sectorLeadership`** dans la sérialisation JSON de la matrice (KNOWN_ISSUES #15 OPEN).
2. **Aucune référence aux symboles XLY / XLE / XLU** (datasets non ajustés détectés en PR-CTX-2 smoke).
3. **Tous les setups déclarent `doNotDependOnSectorLeadership: true`**.
4. **Tous les régimes référencés** sont strictement dans `{ RISK_ON, RANGE, RISK_OFF, HIGH_VOL }`.
5. **`allowedRegimes ∩ blockedRegimes = ∅`** pour chaque setup.

Si une PR future viole l'un de ces invariants → test fail → blocage merge.

---

## 6. Tests obligatoires

`tools/quant/test/setup-authorization-matrix-v1.test.mjs` — exécution :

```bash
node --test tools/quant/test/setup-authorization-matrix-v1.test.mjs
```

6 cas obligatoires (brief PR-CTX-3) :

1. **Setup inconnu** → blocked + warning. `getSetupAuthorizationV1` retourne `null`.
2. **RISK_OFF bloque RS Rotation simple** → `reason: "regime_blocked:RISK_OFF"`. RANGE et RISK_ON restent autorisés.
3. **HIGH_VOL bloque setups directionnels fragiles** → RS Rotation, Mean Reversion, GLD Breakout bloqués en HIGH_VOL. `SECTOR_RELATIVE_STRENGTH` et `TREND_PULLBACK_DYNAMIC_SUPPORT` bloqués partout (`blockedByStatus`).
4. **GLD Breakout ne dépend pas du leadership sectoriel** → `symbolWhitelist: ["GLD"]`, `doNotDependOnSectorLeadership: true`, aucune référence textuelle interdite dans la définition. Évaluation sur snapshot avec `sectorLeadership.leaders` ne contenant pas GLD → toujours autorisé.
5. **Aucune règle ne consomme XLY/XLE/XLU tant que KNOWN_ISSUES #15 est OPEN** → invariant 1, 2, 3 vérifiés. Aucune `kind` ne commence par `sectorLeadership`.
6. **Déterminisme JSON** → `JSON.stringify(MATRIX)` stable + `explain(id, snap)` reproductible byte-à-byte.

6 tests bonus :
- forme exhaustive de l'output `explain`
- `preferredConditions` informatives (jamais bloquantes)
- `blockedConditions` bloquantes même en régime autorisé
- regime invalide → handled gracefully
- `snapshot.regime === null` → warning, pas d'exception
- couverture exhaustive des 5 setups attendus

**Résultat livraison PR-CTX-3** : `12 pass / 0 fail / 126 ms`.

---

## 7. Intégration de bout-en-bout (sanity check)

Le module se compose **par construction** avec le Context Engine V1 (PR-CTX-2). Vérifié en sanity check sur le snapshot smoke réel (`tools/quant/output/context-engine-smoke-v1.json`, asOf 2025-12-31, regime=RISK_ON, vol.state=LOW) :

| Setup | allowed | blockedBy |
|---|:---:|---|
| RS_ROTATION_SIMPLE | YES | `[]` |
| MEAN_REVERSION | NO | `["regime_blocked:RISK_ON"]` |
| SECTOR_RELATIVE_STRENGTH | NO | `["status:FRAGILE / CONCENTRATION_EXCESSIVE", "regime_blocked:RISK_ON"]` |
| TREND_PULLBACK_DYNAMIC_SUPPORT | NO | `["status:FRAGILE", "regime_blocked:RISK_ON"]` |
| GLD_BREAKOUT_ISOLATED | YES | `[]` |

Lecture qualitative : sur la fenêtre 2025 fin-2025 (RISK_ON propre, vol LOW), seuls deux setups passent l'autorisation analytique — RS Rotation (cohérent avec son edge backtest) et GLD Breakout (cohérent avec son régime cible). Tous les autres sont bloqués pour de bonnes raisons (régime ou statut).

**Important** : "autorisé par la matrice" ≠ "tradable". Aucun setup n'est `LIVE_READY`. Aucune décision d'ouverture n'est prise par ce module. Le statut `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED` de RS Rotation indique précisément qu'il **n'est pas tradable** malgré son autorisation analytique régime.

---

## 8. Limites V1 (explicites)

### 8.1 Limites assumées

- **5 setups uniquement.** L'élargissement à de nouveaux setups (par exemple PEAD) attend une PR documentaire dédiée + statut officiel dans `SETUPS_REGISTRY.md`.
- **DSL conditions limité** à 8 `kind` (champs du `ContextSnapshotV1`). Pas d'opérateur booléen composite (`AND` / `OR`). Pas de référence croisée entre setups.
- **Pas d'ordering d'autorisation.** Si deux setups sont autorisés simultanément, la matrice ne dit pas lequel privilégier — c'est hors scope V1. PR-CTX-3 ne décide pas d'allocation.
- **Pas de cohabitation `symbolWhitelist` + univers étendu.** GLD_BREAKOUT_ISOLATED est restreint à `["GLD"]` ; le caller doit appliquer cette restriction. La matrice ne filtre pas les symboles d'entrée — elle se contente de déclarer la restriction.
- **Pas de conditionnalité par jour calendaire** (jour férié, FOMC, earnings). Hors scope V1. PR-CTX-3 ne prend pas en charge les filtres temporels.

### 8.2 Limites héritées du Context Engine V1

- Univers contexte V1 figé (16 ETF). Toute décision sectorielle plus fine doit attendre l'extension de `CONTEXT_V1_UNIVERSE`.
- `sectorLeadership` non consommable tant que `KNOWN_ISSUES.md` #15 reste OPEN. Une PR future de re-ingestion ajustée des datasets `data/{SYMBOL}_2025.json` rouvrira la voie.
- Pas de VIX externe. La détection HIGH_VOL repose sur le proxy realized vol SPY 20j.

### 8.3 Limites de la matrice elle-même

- **La matrice peut être en retard** sur `SETUPS_REGISTRY.md`. Si un statut bouge dans le registre sans MAJ ici, la matrice est obsolète. Mitigation : règle d'évolution § 9 + revue ChatGPT systématique.
- **Une condition `value_missing`** est traitée comme warning, pas comme blocage. Volontaire (par construction `preferredConditions` est informatif) mais peut masquer un snapshot dégradé.

---

## 9. Règles d'évolution

### 9.1 Modification d'un statut setup

- **Source** : toute modification de statut commence par **`SETUPS_REGISTRY.md`** (truth-sync).
- **Propagation** : MAJ de `statusRef` + éventuellement `allowedRegimes` / `blockedRegimes` / `blockedByStatus` dans cette matrice, dans la **même PR**.
- **Test** : `bonus F` ré-vérifie la couverture des 5 setups attendus. Adapter si ajout/retrait.

### 9.2 Ajout d'un nouveau setup

- Documenter d'abord dans `SETUPS_REGISTRY.md` avec statut explicite.
- Puis ajouter à la matrice.
- Compléter les tests : couverture du nouveau setup + invariants.

### 9.3 Modification du DSL

- Ajout d'un nouveau `kind` → ajout dans `lookupSnapshotValue` + doc § 3.3.
- Ajout d'un nouvel `op` → ajout dans `evalCondition` + doc § 3.3.
- Modification d'un `kind` existant qui supprime un champ snapshot → casse Context Engine V1 et tous les consommateurs ; PR dédiée + escalade ChatGPT.

### 9.4 Levée de l'interdiction `sectorLeadership`

- Conditionnée à la **fermeture de `KNOWN_ISSUES.md` #15** (re-ingestion ajustée des datasets).
- Une PR future activera des conditions `sectorLeadership.leaders[].symbol` / `laggards[].symbol` après audit qualité données complet.
- Les invariants 1 et 2 (§ 5) seront ajustés en conséquence et le commit sera traçable.

### 9.5 Modification d'un seuil régime / vol

Interdite ici. Les seuils proviennent de :

- `tools/quant/lib/regime-rules-v1.mjs` pour les régimes (CLEAN-2).
- `tools/quant/lib/context-engine-v1.mjs` pour la classification de l'état vol (PR-CTX-2).

Toute modification de ces seuils passe par les PR dédiées sur ces modules.

---

## 10. Relation avec PR-CTX-5 (runtime layer, future)

PR-CTX-5 (escalade créateur séparée) abordera la question : **faut-il brancher cette matrice côté runtime ?**

Cette PR-CTX-3 **prépare** mais ne pré-décide pas :

- ✅ Format de matrice figé, audité, testé.
- ✅ API stable : `getSetupAuthorizationV1`, `isSetupAllowedInRegimeV1`, `explainSetupAuthorizationV1`.
- ✅ Composable avec `buildContextSnapshotV1` (PR-CTX-2).
- ❌ Aucune référence dans `cloudflare-worker/worker.js`.
- ❌ Aucune référence dans `assets/app.js`.
- ❌ Aucune écriture dans `mtp_training_events` ou autre table Supabase.

PR-CTX-5 décidera (a) s'il faut consommer cette matrice côté worker, (b) avec quelle latence, (c) avec quelle priorité vs `validateConfiguration` existant, (d) avec quel garde-fou `evaluateExecutionSafety`.

---

## 11. Sources

- `docs/quant/SETUPS_REGISTRY.md` — source canonique des statuts setup.
- `docs/quant/REGIME_RULES.md` — classification régime 4-état.
- `docs/quant/CONTEXT_ENGINE.md` — contexte consommé.
- `docs/monitoring/KNOWN_ISSUES.md` issue #15 — dette qualité données justifiant l'interdiction `sectorLeadership`.
- `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md` — gel méthodologique.
- `tools/quant/lib/setup-authorization-matrix-v1.mjs` — implémentation.
- `tools/quant/test/setup-authorization-matrix-v1.test.mjs` — 12 tests.
- Brief créateur 2026-05-21 « PR-CTX-3 — Setup Authorization Matrix V1 ».

---

> **Conclusion-mémo** : Matrice **déclarative pure** de 5 setups × 4 régimes officiels, alignée sur les statuts `SETUPS_REGISTRY.md`. `SECTOR_RELATIVE_STRENGTH` et `TREND_PULLBACK_DYNAMIC_SUPPORT` bloqués par statut (FRAGILE). `MEAN_REVERSION` autorisé seulement en RANGE. `RS_ROTATION_SIMPLE` autorisé en RANGE/RISK_ON. `GLD_BREAKOUT_ISOLATED` restreint à GLD via `symbolWhitelist`. Aucune référence à `sectorLeadership` tant que `KNOWN_ISSUES.md` #15 reste OPEN. Aucun branchement runtime — PR-CTX-5 décidera plus tard.
