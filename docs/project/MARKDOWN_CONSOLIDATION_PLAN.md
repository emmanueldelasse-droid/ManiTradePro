# MARKDOWN_CONSOLIDATION_PLAN.md — ManiTradePro

> Plan d'audit et de consolidation de la documentation Markdown du repo.
>
> Cette PR fait l'**audit** et propose un **plan d'exécution par PR successives**. Elle **ne déplace** et **ne supprime aucun fichier**.

## Objectif

Clarifier la structure documentaire Markdown du repo sans casser les sources canoniques, en alignant progressivement la réalité du repo avec la `STRUCTURE DOSSIERS OBLIGATOIRE` définie dans `GOVERNANCE.md`.

## État actuel

### Mode hybride en vigueur (cf. `GOVERNANCE.md` § *Document canonical sources*)

- Les **sources canoniques** vivantes restent à la racine du repo.
- Les fichiers correspondants sous `/docs/*` sont des **stubs lecture seule** ou des **squelettes** créés lors de la PR setup-governance (2026-05-19), qui ne servent qu'à préparer la migration physique.
- Toute modification de fond doit être faite **uniquement** sur la source canonique racine.

### Risques actuels

- **Doublons potentiels** : après les migrations `docs/project/` (PR #227), `docs/quant/` (PR #228), `docs/monitoring/` (PR #229), le split `TRADING_LOGIC.md` (PR #230), la création de `docs/decisions/` (PR #231) et le **nettoyage final** (PR en cours `claude/final-doc-stub-cleanup`), il reste 6 sources canoniques racine vivantes : `GOVERNANCE.md`, `BOT_OBJECTIVE.md`, `PROJECT_RULES.md`, `SESSION.md`, `CLAUDE.md`, `CHECKLIST_MERGE.md`. Aucun stub de transition ne subsiste à la racine. `GPT_ROLE.md` a été supprimé (historique conservé dans `docs/decisions/DECISION-001`). Le contenu de l'ancien `TRADING_LOGIC.md` est canonique sous `docs/quant/TRADING_LOGIC.md` (scoring / setups / régimes / modulateurs / apprentissage) et `docs/project/TRADING_ENGINE.md` (pipeline / safety gate / sizing / règles ouverture / fermeture / garde-fou devise / paper trading).
- **Confusion possible** : un contributeur peut écrire dans un squelette `/docs/*` au lieu de la source canonique racine.
- **Lecture excessive** : la matrice d'impact documentaire pointe à la fois vers racine et `/docs/`, et le protocole de reprise de session liste explicitement les sources racine.
- **Fichiers semi-actifs** : plusieurs squelettes `/docs/project/` et `/docs/quant/` contiennent des rôles + métadonnées sans contenu métier réel, ce qui peut donner une fausse impression de couverture documentaire.
- **Outputs de backtest** : 24 fichiers `.md` dans `tools/backtests/output/` (~7 000 lignes au total) ne sont jamais consolidés ni archivés, et flottent dans la matrice de lecture.

## Inventaire résumé

### Sources canoniques racine (vivantes)

| Fichier | Lignes | Rôle actuel | Statut | Action recommandée |
|---|---|---|---|---|
| `GOVERNANCE.md` | 1028 | Gouvernance projet | Canonique | Garder à la racine (statut "priorité absolue") |
| `BOT_OBJECTIVE.md` | 332 | Constitution / vision | Canonique | À consolider plus tard vers `docs/project/PROJECT_VISION.md` |
| `PROJECT_RULES.md` | 203 | Règles techniques structurelles | Canonique | À consolider plus tard vers `docs/project/` |
| `SESSION.md` | 127 | Carnet de bord | Canonique vivant | Garder à la racine (reste à la racine selon GOVERNANCE) |
| `CLAUDE.md` | 183 | Manuel opérationnel Claude | Canonique | Garder à la racine (lecture quotidienne Claude Code) |
| `CHECKLIST_MERGE.md` | 182 | Checklist merge | Canonique | À consolider plus tard vers `docs/project/MERGE_PROTOCOL.md` |
| ~~`ARCHITECTURE.md`~~ | — | **Stub supprimé** (PR nettoyage final) | — | Source canonique vit dans `docs/project/ARCHITECTURE.md`. |
| ~~`DATA_PIPELINE.md`~~ | — | **Stub supprimé** (PR nettoyage final) | — | Source canonique vit dans `docs/project/DATA_PIPELINE.md`. |
| ~~`TRADING_LOGIC.md`~~ | — | **Stub supprimé** (PR nettoyage final) | — | Contenu splitté entre `docs/quant/TRADING_LOGIC.md` et `docs/project/TRADING_ENGINE.md`. |
| `docs/quant/TRADING_LOGIC.md` | 262 | **Canonique** *(extrait du split)* | Canonique | Garder, source officielle de la logique quant |
| `docs/project/TRADING_ENGINE.md` | 307 | **Canonique** *(extrait du split)* | Canonique | Garder, source officielle de la logique moteur / exécution |
| ~~`SETUPS_REGISTRY.md`~~ | — | **Stub supprimé** (PR nettoyage final) | — | Source canonique vit dans `docs/quant/SETUPS_REGISTRY.md`. |
| ~~`ASSET_REGISTRY.md`~~ | — | **Stub supprimé** (PR nettoyage final) | — | Source canonique vit dans `docs/quant/ASSET_REGISTRY.md`. |
| ~~`PROVIDERS_MATRIX.md`~~ | — | **Stub supprimé** (PR nettoyage final) | — | Source canonique vit dans `docs/monitoring/PROVIDERS_MATRIX.md`. |
| ~~`KNOWN_ISSUES.md`~~ | — | **Stub supprimé** (PR nettoyage final) | — | Source canonique vit dans `docs/monitoring/KNOWN_ISSUES.md`. |

### Stubs et squelettes `/docs/*`

| Fichier | Lignes | Type | Source canonique | Action recommandée |
|---|---|---|---|---|
| `docs/project/PROJECT_VISION.md` | 42 | Squelette | `BOT_OBJECTIVE.md` | À transformer en stub pur ou à fusionner lors de la migration project |
| `docs/project/ARCHITECTURE.md` | 344 | **Canonique** *(migré depuis la racine)* | Canonique | Garder, source officielle de l'architecture |
| `docs/project/DATA_PIPELINE.md` | 640 | **Canonique** *(migré depuis la racine)* | Canonique | Garder, source officielle du pipeline de données |
| `docs/project/AI_WORKFLOW.md` | 57 | Squelette | (intégré dans `GOVERNANCE.md`) | À transformer en stub ou à supprimer plus tard (cas couvert par GOVERNANCE) |
| `docs/project/MERGE_PROTOCOL.md` | 83 | Squelette | `CHECKLIST_MERGE.md` | À fusionner lors de la migration project |
| `docs/project/CALIBRATION_RULES.md` | 67 | Squelette | Aucune source canonique racine | À enrichir plus tard quand un sujet calibration émerge |
| `docs/project/PROD_SAFETY_RULES.md` | 74 | Squelette | Aucune source canonique racine | À enrichir plus tard |
| `docs/project/EXPERIMENTAL_FEATURES.md` | 50 | Squelette | Aucune source canonique racine | À enrichir plus tard |
| `docs/project/DOC_IMPACT_MATRIX.md` | 90 | **Canonique vivant** | (créé PR #224) | **Garder en place, déjà à son emplacement final** |
| `docs/quant/SETUPS_REGISTRY.md` | 529 | **Canonique** *(migré depuis la racine)* | Canonique | Garder, source officielle des setups |
| `docs/quant/ASSET_REGISTRY.md` | 202 | **Canonique** *(migré depuis la racine)* | Canonique | Garder, source officielle des actifs |
| `docs/quant/ALLOCATION_RULES.md` | 65 | Squelette | Aucune source canonique racine | À enrichir plus tard |
| `docs/quant/BACKTEST_RULES.md` | 75 | Squelette | Aucune (couverture partielle dans `docs/research/`) | À fusionner avec docs/research/ plus tard |
| `docs/quant/FRICTION_MODEL.md` | 82 | Squelette | Aucune source canonique racine | À enrichir plus tard |
| `docs/quant/REGIME_RULES.md` | 59 | Squelette | Aucune source canonique racine | À enrichir plus tard |
| `docs/quant/RISK_ENGINE_RULES.md` | 79 | Squelette | Aucune source canonique racine | À enrichir plus tard |
| `docs/quant/WALK_FORWARD_RULES.md` | 65 | Squelette | (couvert par `docs/research/`) | À fusionner avec docs/research/ plus tard |
| `docs/monitoring/KNOWN_ISSUES.md` | 331 | **Canonique** *(migré depuis la racine)* | Canonique | Garder, source officielle des bugs / dette |
| `docs/monitoring/PROVIDERS_MATRIX.md` | 125 | **Canonique** *(migré depuis la racine)* | Canonique | Garder, source officielle des providers |
| `docs/monitoring/DATA_QUALITY.md` | 53 | Squelette | Aucune source canonique racine | À enrichir plus tard |
| `docs/decisions/README.md` | 39 | **Canonique** *(réécrit PR `claude/add-decision-records`)* | Canonique | Garder, format officiel des décisions structurantes |
| `docs/decisions/DECISION-001-gpt-role-merged-into-governance.md` | 90 | **Décision historique** *(ACTIVE)* | Canonique | Garder, ne pas réécrire ; archiver via `SUPERSEDED` si la règle change |

### Recherche quant (canoniques `/docs/research/`)

| Fichier | Lignes | Statut | Action |
|---|---|---|---|
| `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md` | 283 | Canonique | Garder en place |
| `docs/research/SETUP_VALIDATION_CHECKLIST.md` | 179 | Canonique | Garder en place |
| `docs/research/ANTI_LOOKAHEAD_RULES.md` | 250 | Canonique | Garder en place |
| `docs/research/DATASET_GOVERNANCE.md` | 220 | Canonique | Garder en place |
| `docs/research/PEAD_DATA_REQUIREMENTS.md` | 275 | Canonique recherche | Garder en place |
| `docs/research/POST_EARNINGS_DRIFT_FOUNDATION.md` | 273 | Canonique recherche | Garder en place |

### Documentation par setup (canoniques `/docs/setups/`)

| Fichier | Lignes | Statut | Action |
|---|---|---|---|
| `docs/setups/SECTOR_RELATIVE_STRENGTH.md` | 271 | Canonique setup | Garder en place |

### Stub déprécié

| Fichier | Lignes | Statut | Action |
|---|---|---|---|
| ~~`GPT_ROLE.md`~~ | — | **Stub supprimé** (PR nettoyage final, conformément à `DECISION-001` § *Suite éventuelle*) | — | Historique conservé dans `docs/decisions/DECISION-001-gpt-role-merged-into-governance.md`. |

### Outputs de backtest (historiques)

| Dossier | Nombre de fichiers | Lignes totales | Statut | Action |
|---|---|---|---|---|
| `tools/backtests/output/` | 24 | ~7 800 | Rapports horodatés générés par les scripts de backtest | À ne **pas** consolider. À archiver/dater par version dans une PR ultérieure si nécessaire. Hors périmètre de la consolidation gouvernance. |

### Fichiers à ne pas toucher

| Fichier | Raison |
|---|---|
| `.claude/agents/bug-hunter.md` | Outillage Claude Code, géré par le harness |
| `.claude/skills/ui-ux-pro-max/SKILL.md` | Skill Claude Code, géré par le harness |
| `cloudflare-worker/README.md` | README technique du dossier worker, hors gouvernance documentaire |

## Structure cible proposée

Racine du repo (5 fichiers) :

- `GOVERNANCE.md`
- `SESSION.md`
- `CLAUDE.md`
- `BOT_OBJECTIVE.md` *(ou déplacé vers `docs/project/PROJECT_VISION.md`, décision à prendre)*
- `PROJECT_RULES.md` *(ou déplacé vers `docs/project/`, décision à prendre)*

`docs/project/` :

- `ARCHITECTURE.md` (déplacé depuis la racine)
- `DATA_PIPELINE.md` (déplacé depuis la racine, ou intégré dans `ARCHITECTURE.md`)
- `AI_WORKFLOW.md` *(à transformer en stub pointant `GOVERNANCE.md` ou à supprimer après confirmation)*
- `MERGE_PROTOCOL.md` (à fusionner avec `CHECKLIST_MERGE.md`)
- `DOC_IMPACT_MATRIX.md` *(déjà en place)*
- `MARKDOWN_CONSOLIDATION_PLAN.md` *(ce fichier)*
- `PROD_SAFETY_RULES.md`, `CALIBRATION_RULES.md`, `EXPERIMENTAL_FEATURES.md` *(squelettes à enrichir au besoin, sinon laisser)*

`docs/quant/` :

- `SETUPS_REGISTRY.md` (déplacé depuis la racine)
- `ASSET_REGISTRY.md` (déplacé depuis la racine)
- `docs/quant/TRADING_LOGIC.md` (logique scoring / setups / régimes) et `docs/project/TRADING_ENGINE.md` (logique moteur / exécution / safety / sizing) *(éclatement réalisé)*
- `ALLOCATION_RULES.md`, `BACKTEST_RULES.md`, `FRICTION_MODEL.md`, `REGIME_RULES.md`, `RISK_ENGINE_RULES.md`, `WALK_FORWARD_RULES.md` *(squelettes à enrichir au besoin)*

`docs/research/` (inchangé, déjà canonique) :

- `RESEARCH_FRAMEWORK_FREEZE_V1.md`
- `SETUP_VALIDATION_CHECKLIST.md`
- `ANTI_LOOKAHEAD_RULES.md`
- `DATASET_GOVERNANCE.md`
- `PEAD_DATA_REQUIREMENTS.md`
- `POST_EARNINGS_DRIFT_FOUNDATION.md`

`docs/monitoring/` :

- `PROVIDERS_MATRIX.md` (déplacé depuis la racine)
- `KNOWN_ISSUES.md` (déplacé depuis la racine)
- `DATA_QUALITY.md` *(squelette à enrichir)*

`docs/decisions/` :

- `README.md` *(déjà en place)*
- `DECISION-XXX-*.md` *(à alimenter quand une décision majeure sera archivée)*

`docs/setups/` (inchangé) :

- `SECTOR_RELATIVE_STRENGTH.md`

## Règles de migration future

- Une PR de migration ne déplace qu'**un groupe cohérent** de fichiers (project, quant, monitoring, decisions). Une PR = un objectif.
- Chaque déplacement doit **mettre à jour tous les liens internes** (références dans `GOVERNANCE.md`, `CHECKLIST_MERGE.md`, `CLAUDE.md`, `DOC_IMPACT_MATRIX.md`, `SESSION.md`, fichiers de recherche, `package.json` si concerné).
- Les anciens chemins racine deviennent des **stubs lecture seule** pendant une période de transition (minimum 1 PR complète) avant suppression définitive dans une PR de nettoyage final.
- **Aucun fichier canonique ne disparaît sans période de transition.**
- `SESSION.md` est mis à jour à chaque PR (cf. `GOVERNANCE.md` § *Règles synchronisation mémoire*).
- `DOC_IMPACT_MATRIX.md` est consultée et respectée à chaque PR (cf. ligne *Consolidation Markdown future*).
- ChatGPT valide chaque migration avec `GO MERGE` **+ résumé simple** (cf. `GOVERNANCE.md` § *Résumé simple obligatoire avec chaque `GO MERGE`*).
- Aucune migration ne mélange déplacement de fichier et modification de fond. Le diff doit être lisible : déplacement pur OU modification de fond, jamais les deux dans la même PR.

## Ordre recommandé des futures PR

1. **PR migration `docs/project/`** *(partiellement réalisée — PR en cours `claude/migrate-docs-project-architecture`)*
   - Déplace `ARCHITECTURE.md` → `docs/project/ARCHITECTURE.md`. **Fait.**
   - Déplace `DATA_PIPELINE.md` → `docs/project/DATA_PIPELINE.md`. **Fait** (déplacement bloc, sans consolidation dans `ARCHITECTURE.md`).
   - Remplace les squelettes par les sources canoniques. **Fait** pour `ARCHITECTURE.md` ; `DATA_PIPELINE.md` n'avait pas de squelette préexistant.
   - Crée des stubs racine pendant la transition. **Fait** pour `ARCHITECTURE.md` et `DATA_PIPELINE.md`.
   - Met à jour `GOVERNANCE.md`, `CHECKLIST_MERGE.md`, `CLAUDE.md`, `DOC_IMPACT_MATRIX.md`, `SESSION.md`. **Fait**.
   - Reste pour cette ligne : aucune autre action prévue. La consolidation `AI_WORKFLOW.md` / `MERGE_PROTOCOL.md` / squelettes prod safety / calibration / experimental est traitée dans une PR séparée si elle devient nécessaire.

2. **PR migration `docs/quant/`** *(partiellement réalisée — PR en cours `claude/migrate-docs-quant-registries`)*
   - Déplace `SETUPS_REGISTRY.md` → `docs/quant/SETUPS_REGISTRY.md`. **Fait** (déplacement bloc 529 lignes).
   - Déplace `ASSET_REGISTRY.md` → `docs/quant/ASSET_REGISTRY.md`. **Fait** (déplacement bloc 202 lignes).
   - Décide du sort de `TRADING_LOGIC.md`. **Fait** : reste racine pour la PR #228 (contenu transversal), **split exécuté** dans la PR `claude/split-trading-logic` (création de `docs/quant/TRADING_LOGIC.md` et `docs/project/TRADING_ENGINE.md`, stub racine de redirection).
   - Crée des stubs racine pendant la transition. **Fait** pour `SETUPS_REGISTRY.md` et `ASSET_REGISTRY.md`.
   - Met à jour la matrice et tous les renvois. **Fait**.

3. **PR migration `docs/monitoring/`** *(partiellement réalisée — PR en cours `claude/migrate-docs-monitoring`)*
   - Déplace `PROVIDERS_MATRIX.md` → `docs/monitoring/PROVIDERS_MATRIX.md`. **Fait** (déplacement bloc 125 lignes).
   - Déplace `KNOWN_ISSUES.md` → `docs/monitoring/KNOWN_ISSUES.md`. **Fait** (déplacement bloc 331 lignes).
   - Stubs racine pendant la transition. **Fait**.

4. **PR décisions / historique** *(réalisée — PR #231)*
   - `docs/decisions/README.md` réécrit en format court conforme au plan. **Fait**.
   - Première décision archivée : `docs/decisions/DECISION-001-gpt-role-merged-into-governance.md`. **Fait**.
   - `GOVERNANCE.md` § *Décisions historiques* ajouté. **Fait**.

5. **PR nettoyage final** *(réalisée — PR en cours `claude/final-doc-stub-cleanup`)*
   - Suppression définitive des 7 stubs racine de redirection (`ARCHITECTURE.md`, `DATA_PIPELINE.md`, `SETUPS_REGISTRY.md`, `ASSET_REGISTRY.md`, `PROVIDERS_MATRIX.md`, `KNOWN_ISSUES.md`, `TRADING_LOGIC.md`). **Fait**.
   - Décision finale sur `BOT_OBJECTIVE.md` : **reste à la racine** (`docs/project/PROJECT_VISION.md` est un squelette vide ; migration future sous PR dédiée si nécessaire). **Fait**.
   - Décision finale sur `GPT_ROLE.md` : **supprimé** (aucune référence active dépendante, historique conservé dans `DECISION-001`). **Fait**.
   - Mise à jour des références actives résiduelles dans `PROJECT_RULES.md`, `BOT_OBJECTIVE.md`, `GOVERNANCE.md` (table canoniques, header note GPT_ROLE, ordre de priorité, structure dossiers racine, phrase finale workflow IA), `CLAUDE.md` (retrait des annotations "stub temporaire de redirection"), `docs/decisions/DECISION-001` (note datée de suppression du stub). **Fait**.

6. **PR archivage backtests** (optionnelle, hors gouvernance documentaire stricte)
   - Range `tools/backtests/output/*.md` par dossier daté ou par run, sans toucher au contenu.
   - À décider séparément : ce périmètre touche de l'outillage quant, pas la gouvernance documentaire.

## Ce qui ne doit pas être fait maintenant

- **Pas de suppression massive** de fichiers Markdown.
- **Pas de déplacement massif** de fichiers Markdown.
- **Pas de fusion de fichiers** sans validation ChatGPT explicite par PR.
- **Pas de changement runtime** (worker, front, providers, SQL, config, backtest, setup, score, endpoint).
- **Pas de changement quant** (setups, scores, registres, régimes, moteurs).
- **Pas de modification de la logique trading**.
- **Pas de modification du périmètre de l'agent `bug-hunter`** ni du skill `ui-ux-pro-max`.
