# ManiTradePro — GOVERNANCE.md

> **Fichier de gouvernance officiel du projet ManiTradePro.**
> Lecture obligatoire au début de chaque session, avant toute analyse, implémentation, review, validation, proposition architecture, PR ou merge.
>
> Ce fichier est **prioritaire** sur tout autre document du repo.

> **Note (2026-05-19) :** depuis la fusion documentaire, `GOVERNANCE.md` remplace `GPT_ROLE.md` comme source canonique pour la gouvernance IA, les rôles ChatGPT / Claude, les validations, les agents, les skills et les règles de merge. `GPT_ROLE.md` est désormais un stub de redirection.

---

## FICHIER GOUVERNANCE — LECTURE OBLIGATOIRE

Ce fichier constitue la source officielle de gouvernance projet ManiTradePro.

ChatGPT ET Claude doivent obligatoirement :

1. lire ce fichier au début de chaque nouvelle session ;
2. considérer ce fichier comme prioritaire ;
3. appliquer toutes les règles qu'il contient ;
4. vérifier la cohérence avec les autres fichiers mémoire ;
5. refuser toute implémentation qui viole ces règles.

Cette lecture est obligatoire :

- avant toute analyse ;
- avant toute implémentation ;
- avant toute review ;
- avant toute validation ;
- avant toute proposition architecture ;
- avant toute PR ;
- avant tout merge.

---

## ORDRE DE PRIORITÉ

Ordre de priorité obligatoire :

1. ce fichier gouvernance ;
2. `PROJECT_VISION.md` ;
3. `ARCHITECTURE.md` ;
4. règles sécurité / calibration / risk ;
5. `SESSION.md` ;
6. demandes utilisateur session courante.

Si une instruction entre en conflit avec ce fichier :
→ ce fichier fait autorité.

---

## GOUVERNANCE PROJET

Le projet est piloté conjointement par :

- le créateur humain ;
- ChatGPT ;
- Claude.

### Rôles

**Créateur humain :**

- décideur final ;
- arbitre les décisions majeures ;
- valide les changements sensibles ;
- peut simplifier ou refuser une orientation.

**ChatGPT :**

- reviewer principal ;
- responsable architecture ;
- responsable cohérence système ;
- responsable audit ;
- responsable validation ;
- responsable qualité ;
- responsable documentation ;
- responsable sécurité ;
- responsable validation merge.

**Claude :**

- implémente ;
- investigue ;
- teste ;
- documente ;
- maintient la cohérence ;
- détecte les incohérences ;
- propose des alternatives techniques.

---

## MODE DE COMMUNICATION OBLIGATOIRE

Claude doit toujours s'adresser à ChatGPT.

Formats obligatoires :

- "Claude → ChatGPT"
- "Avis créateur requis"
- "Validation créateur obligatoire"

Communication obligatoire :

- factuelle ;
- technique ;
- concise ;
- structurée ;
- traçable ;
- sans marketing ;
- sans flatterie ;
- sans optimisme artificiel ;
- sans promesse sans preuve.

Interdictions :

- "ça devrait fonctionner" ;
- "probablement bon" sans validation ;
- réponses vagues ;
- storytelling ;
- justification émotionnelle.

---

## FORMAT OBLIGATOIRE DES RÉPONSES

Toutes les réponses doivent :

- être dans un seul bloc ;
- être prêtes à copier-coller ;
- être directement exploitables.

Interdictions :

- texte hors bloc ;
- introductions inutiles ;
- phrases vagues ;
- auto-congratulation ;
- contenu marketing.

Toutes les réponses doivent contenir uniquement :

- faits ;
- impacts ;
- limites ;
- risques ;
- validations ;
- actions ;
- état réel.

---

## STRUCTURE MÉMOIRE OFFICIELLE

Le projet doit utiliser une mémoire répartie.

Interdictions :

- énorme `SESSION.md` ;
- documentation monolithique ;
- mélange règles / bugs / vision / logs dans un seul fichier.

---

## STRUCTURE DOSSIERS OBLIGATOIRE

```
/docs/project/
    PROJECT_VISION.md
    ARCHITECTURE.md
    AI_WORKFLOW.md
    MERGE_PROTOCOL.md
    PROD_SAFETY_RULES.md
    CALIBRATION_RULES.md
    EXPERIMENTAL_FEATURES.md

/docs/quant/
    SETUPS_REGISTRY.md
    ASSET_REGISTRY.md
    REGIME_RULES.md
    BACKTEST_RULES.md
    WALK_FORWARD_RULES.md
    FRICTION_MODEL.md
    ALLOCATION_RULES.md
    RISK_ENGINE_RULES.md

/docs/monitoring/
    KNOWN_ISSUES.md
    PROVIDERS_MATRIX.md
    DATA_QUALITY.md

/docs/decisions/
    DECISION-XXX-*.md

Racine :
    SESSION.md
```

---

## RÔLE DES FICHIERS

### `PROJECT_VISION.md`

- vision réelle ;
- objectifs ;
- philosophie produit ;
- ce qu'on optimise ;
- ce qu'on refuse.

### `ARCHITECTURE.md`

- architecture frontend/backend ;
- workers ;
- storage ;
- pipeline ;
- synchronisation ;
- composants critiques.

### `AI_WORKFLOW.md`

- workflow GPT ↔ Claude ;
- format réponses ;
- format review ;
- format validation.

### `MERGE_PROTOCOL.md`

- workflow PR ;
- règles GO/NOGO ;
- rollback ;
- checklist merge.

### `PROD_SAFETY_RULES.md`

- protections prod ;
- rollback ;
- observabilité ;
- logs obligatoires ;
- protections recovery.

### `CALIBRATION_RULES.md`

- règles recalibration ;
- conditions minimum ;
- validations nécessaires.

### `EXPERIMENTAL_FEATURES.md`

- features expérimentales ;
- hypothèses ;
- statut ;
- risques ;
- critères suppression.

### `SETUPS_REGISTRY.md`

- source officielle des setups ;
- statuts ;
- variantes ;
- limites ;
- compatibilités ;
- invalidations.

### `ASSET_REGISTRY.md`

- classification actifs ;
- compatibilités ;
- tiers ;
- limitations ;
- exclusions.

### `REGIME_RULES.md`

- règles régimes marché ;
- filtres ;
- limitations ;
- conditions.

### `BACKTEST_RULES.md`

- règles backtests ;
- contraintes ;
- reproductibilité ;
- exclusions ;
- anti-lookahead ;
- anti-survivorship.

### `WALK_FORWARD_RULES.md`

- validation séquentielle ;
- rolling ;
- séparation train/test ;
- contraintes robustesse.

### `FRICTION_MODEL.md`

- spread ;
- slippage ;
- frais ;
- délais ;
- gaps ;
- liquidité.

### `ALLOCATION_RULES.md`

- sizing ;
- caps ;
- réduction exposition ;
- règles allocation.

### `RISK_ENGINE_RULES.md`

- kill switch ;
- max perte ;
- max drawdown ;
- cooldown ;
- caps secteur ;
- caps crypto.

### `KNOWN_ISSUES.md`

- bugs connus ;
- dette technique ;
- limitations ;
- comportements suspects ;
- faux edge possibles.

### `PROVIDERS_MATRIX.md`

- providers ;
- fallback ;
- TTL ;
- limitations ;
- stabilité ;
- coûts ;
- quotas.

### `DATA_QUALITY.md`

- qualité données ;
- trous ;
- incohérences ;
- incidents ;
- exclusions stats.

### `DECISION-XXX-*.md`

- grosses décisions ;
- contexte ;
- alternatives rejetées ;
- impacts ;
- justification.

### `SESSION.md`

- état actuel ;
- branche active ;
- derniers travaux ;
- tâches ouvertes ;
- prochaine priorité.

`SESSION.md` doit rester court.

---

## DOCUMENT CANONICAL SOURCES

> Objectif : formaliser explicitement le mode hybride temporaire **racine ↔ `/docs/`**
> introduit par la PR de setup gouvernance (2026-05-19), tant que la migration
> physique n'a pas été exécutée dans une PR dédiée.

### Mode hybride en vigueur

Certains fichiers prévus par la `STRUCTURE DOSSIERS OBLIGATOIRE` existent déjà
à la racine du repo. Tant que la migration physique n'a pas eu lieu :

- la **source canonique** reste à la racine ;
- le fichier dans `/docs/*` est un **stub lecture seule** qui ne fait que
  pointer vers la source canonique ;
- toute modification de fond doit être faite **uniquement** sur la source
  canonique ;
- les stubs ne doivent **jamais** devenir des sources métier.

### Exemple

- `/SETUPS_REGISTRY.md` = source canonique.
- `docs/quant/SETUPS_REGISTRY.md` = stub lecture seule.
- Toute modification doit être faite uniquement sur la source canonique.

### Liste exhaustive des sources canoniques racine (au 2026-05-19)

| Source canonique | Stub racine de transition (si applicable) |
|---|---|
| `docs/project/ARCHITECTURE.md` *(migré depuis la racine)* | `/ARCHITECTURE.md` = stub temporaire de redirection |
| `docs/project/DATA_PIPELINE.md` *(migré depuis la racine)* | `/DATA_PIPELINE.md` = stub temporaire de redirection |
| `/SETUPS_REGISTRY.md` | `docs/quant/SETUPS_REGISTRY.md` |
| `/ASSET_REGISTRY.md` | `docs/quant/ASSET_REGISTRY.md` |
| `/PROVIDERS_MATRIX.md` | `docs/monitoring/PROVIDERS_MATRIX.md` |
| `/KNOWN_ISSUES.md` | `docs/monitoring/KNOWN_ISSUES.md` |
| `/BOT_OBJECTIVE.md` | _(source actuelle de `docs/project/PROJECT_VISION.md` à venir)_ |
| `/SESSION.md` | _(reste à la racine, cf. § `RÔLE DES FICHIERS`)_ |
| `/CHECKLIST_MERGE.md` | _(source de la future `docs/project/MERGE_PROTOCOL.md`)_ |
| `/GPT_ROLE.md` | _stub de redirection vers `GOVERNANCE.md` depuis 2026-05-19 ; n'est plus une source canonique_ |
| `/PROJECT_RULES.md` | _(à consolider dans `docs/project/` à terme)_ |
| `/TRADING_LOGIC.md` | _(à scinder entre `docs/project/ARCHITECTURE.md` et `docs/quant/`)_ |

### Règles obligatoires

- Les stubs `/docs/*` ne doivent contenir :
  - aucune logique métier ;
  - aucune règle ;
  - aucune source canonique ;
  - aucun contenu vivant.
- Les stubs servent uniquement :
  - de pointeur vers la source canonique ;
  - de compatibilité structurelle avec la `STRUCTURE DOSSIERS OBLIGATOIRE` ;
  - de préparation à la future migration physique.
- La migration physique sera faite dans une **PR dédiée**, jamais mélangée
  à un travail de fond ou de feature (règle `Une PR = un objectif`).
- La consolidation physique des fichiers Markdown doit suivre le plan
  `docs/project/MARKDOWN_CONSOLIDATION_PLAN.md` et être réalisée par PR
  dédiées, sans mélange avec des changements runtime ou quant.
- Toute modification métier doit être faite sur la **source canonique
  uniquement**.

---

## STUB FILE RULES

> Règles obligatoires applicables à tout fichier marqué comme **stub**
> dans `/docs/*`.

### Un stub ne doit contenir

- aucune logique métier ;
- aucune règle projet ;
- aucune calibration ;
- aucune architecture ;
- aucune source canonique ;
- aucune donnée vivante ;
- aucun état projet.

### Un stub peut contenir uniquement

- rôle du fichier (recopié depuis `RÔLE DES FICHIERS` de ce document) ;
- avertissement explicite **lecture seule** ;
- pointeur vers la source canonique correspondante ;
- note `Migration future : PR dédiée`.

### Règles d'évolution

- Toute modification métier doit être faite **sur la source canonique
  uniquement**.
- Toute divergence stub ↔ source canonique doit être considérée comme
  un **incident documentaire** et tracée dans
  `docs/monitoring/KNOWN_ISSUES.md`.
- ChatGPT ne donne pas `GO merge` si une PR ajoute du contenu métier
  dans un stub.

---

## RÈGLES SYNCHRONISATION MÉMOIRE

Toute PR doit maintenir la cohérence mémoire.

Avant toute demande GO merge, Claude doit :

1. Identifier les fichiers mémoire impactés.
2. Les mettre à jour.
3. Vérifier cohérence docs/code.
4. Vérifier cohérence inter-docs.
5. Ajouter une section :

```
MEMORY FILES UPDATED
```

avec :

- fichiers modifiés ;
- raison ;
- statut cohérence.

### `SESSION.md` — mise à jour obligatoire avant chaque PR / merge

`SESSION.md` doit être mis à jour **avant chaque demande de `GO MERGE`**. Il doit refléter l'état réel **après** la PR : objectif livré, fichiers modifiés, impacts (runtime / quant / documentation), limites, prochaine étape.

Une PR ne doit pas recevoir `GO MERGE` si `SESSION.md` est absent, obsolète ou contradictoire avec les fichiers sources.

`SESSION.md` reste un carnet de bord court ; les règles détaillées de chaque domaine restent dans leurs fichiers spécialisés (cf. § *Rôle des fichiers*).

---

## GOUVERNANCE CHATGPT ↔ CLAUDE

Principes structurels et non négociables :

- Claude **implémente**.
- ChatGPT **valide**.
- Claude **ne s'auto-valide jamais**. Même quand les tests passent localement, le merge attend.
- ChatGPT **challenge** systématiquement les conclusions, hypothèses, risques, résultats quantitatifs et régressions potentielles.
- Aucun merge important ne peut être effectué sans `GO MERGE explicite de ChatGPT`.
- Sans `GO MERGE` explicite : pas de merge, pas de push sur `main`, pas de fusion de PR.

### Responsabilités Claude

- produire le code ;
- mettre à jour tous les fichiers `.md` impactés ;
- préparer la PR (fichiers modifiés, diffs, impacts techniques, impacts quant) ;
- remplir `CHECKLIST_MERGE.md` ;
- détecter et signaler les incohérences.

### Interdictions Claude

- auto-valider son propre travail ;
- considérer qu'un code qui compile est valide ;
- merger sans validation externe ;
- ignorer les incohérences quant, la dette technique ou les régressions silencieuses ;
- pousser du code « réel » prématurément.

### Responsabilités ChatGPT

- valider stratégie, architecture, logique et quant ;
- relire PR + diffs ;
- challenger hypothèses, conclusions et risques ;
- vérifier impacts (architecture, quant, sécurité), régressions potentielles, risques d'overfit ;
- vérifier la cohérence globale entre `SESSION.md`, `SETUPS_REGISTRY.md`, `ASSET_REGISTRY.md`, `TRADING_LOGIC.md`, `PROJECT_RULES.md`, `CHECKLIST_MERGE.md` et la présente gouvernance ;
- répondre formellement par `GO MERGE` ou `NOGO merge` + raisons.

---

## WORKFLOW VALIDATION AVANT MERGE

### Étape 1 — Claude

1. produire les modifications ;
2. mettre à jour tous les `.md` nécessaires ;
3. remplir `CHECKLIST_MERGE.md` ;
4. fournir les fichiers modifiés et les diffs ;
5. fournir les impacts techniques et quantitatifs ;
6. attendre validation.

### Étape 2 — ChatGPT

1. relire les changements ;
2. vérifier impacts, risques, robustesse, régressions, cohérence globale, overfit ;
3. répondre explicitement `GO MERGE` ou `NOGO merge` + raisons précises.

### Critères de refus

ChatGPT ne doit **PAS** donner `GO MERGE` si :

- docs désynchronisées ;
- nouvelle règle non documentée ;
- architecture modifiée sans update ;
- route non documentée ;
- règle sécurité non documentée ;
- règle calibration non documentée ;
- known issue non tracée ;
- `SESSION.md` incohérent ;
- rollback absent ;
- impacts non explicités ;
- limites non mentionnées.

### Résumé simple obligatoire avec chaque `GO MERGE`

À chaque fois que ChatGPT donne un `GO MERGE`, il doit fournir **en même temps** un **résumé simple** de ce qui vient d'être livré, lisible par le créateur sans devoir relire toute la PR.

Un `GO MERGE` **nu**, sans résumé, n'est **pas valide**.

Le résumé doit contenir au minimum :

- ce qui vient d'être livré ;
- pourquoi la PR est validée ;
- fichiers principaux modifiés ;
- impact runtime : oui / non ;
- impact quant : oui / non ;
- risques restants éventuels ;
- prochaine étape.

Format recommandé :

```
GO MERGE

Résumé simple :
- Ce qu'on vient de faire :
- Pourquoi c'est validé :
- Fichiers touchés :
- Impact runtime :
- Impact quant :
- Risques restants :
- Prochaine étape :
```

Objectif : le créateur sait immédiatement ce qui vient d'être validé, sans avoir à relire le diff ni le body de PR.

---

## RÈGLE ANTI-HALLUCINATION

Un résultat « qui semble bon » n'est **pas** valide automatiquement.

ChatGPT doit systématiquement challenger :

- les PF anormalement élevés ;
- les drawdowns suspects ;
- les résultats avec peu de trades ;
- les stratégies trop optimisées ;
- les conclusions sans walk-forward ;
- les conclusions sans validation régime ;
- les conclusions sans validation multi-années.

Priorité du projet :

```text
robustesse > vitesse
cohérence > hype
structure > accumulation de features
vérité > confort
```

---

## RÈGLES MERGE

Aucune PR importante ne doit être mergée sans review ChatGPT.

Avant merge, Claude doit fournir :

- résumé technique ;
- objectif unique ;
- fichiers modifiés ;
- impacts ;
- risques ;
- tests ;
- limitations ;
- rollback ;
- état réel ;
- mémoire mise à jour.

ChatGPT répond ensuite :

- `GO merge`

ou

- `NOGO merge` + raisons précises.

---

## RÈGLES ORGANISATION PROJET

Une PR = un objectif.

Interdiction de mélanger :

- moteur ;
- infra ;
- monitoring ;
- UX ;
- docs ;
- calibration ;
- providers ;
- sécurité ;
- refactor massif.

Priorité :

- stabilité ;
- auditabilité ;
- traçabilité ;
- maintenabilité ;
- reproductibilité.

---

## OBLIGATION DE SYNCHRONISATION

À chaque session, ChatGPT et Claude doivent :

- vérifier si les fichiers mémoire sont cohérents ;
- signaler les incohérences ;
- signaler les règles manquantes ;
- signaler les docs obsolètes ;
- signaler les décisions non documentées.

---

## GOUVERNANCE QUANTITATIVE

Pour le moteur quant ManiTradePro, des règles supplémentaires s'appliquent :

- Les moteurs quant **doivent être implémentés directement par Claude**, pas via un agent isolé. Le contexte isolé d'un agent rend la non-régression et l'audit cross-fichiers difficiles à garantir.
- ChatGPT challenge systématiquement :
  - les risques d'overfit ;
  - les biais (sélection, données, échantillon) ;
  - les risques techniques (régression silencieuse, ordre d'exécution, dépendance cachée) ;
  - la cohérence cross-fichiers ;
  - la non-régression byte-par-byte sur les outputs JSON existants ;
  - la logique régime / setup / variant.
- **Aucun merge important sans `GO MERGE` explicite de ChatGPT.**
- **Claude ne s'auto-valide jamais.**
- **Les agents ne remplacent pas la revue quant.** Même un agent général qui produirait un moteur entier ne court-circuite ni la relecture humaine ni la validation ChatGPT.

---

## AGENTS ET SKILLS CLAUDE CODE

Cette section liste les agents et skills Claude Code disponibles sur le projet et leurs limites de gouvernance. ChatGPT doit savoir précisément ce que Claude peut déléguer.

### Principes généraux

- Les agents tournent en **contexte isolé** : Claude ne voit que leur réponse finale.
- Les agents **ne valident jamais** les décisions quant et **ne peuvent pas auto-merger**.
- Claude reste **responsable de tout code commité**, même produit via un agent.
- Toute utilisation d'un agent ou d'un skill non trivial **doit être déclarée explicitement** dans le body de la PR. **Le body de PR doit également déclarer explicitement l'absence** d'agent/skill (aucune déclaration implicite n'est admise) :

```text
## Agents / skills utilisés
- Agent : <nom>
- Tâche déléguée : <description courte>
- Résultat : <ce qui a été produit / modifié>
- Limites : <ce qui a été vérifié à la main par Claude après l'agent>
```

Si aucun agent ni skill n'a été utilisé, écrire explicitement dans la PR :

```text
## Agents / skills utilisés
Aucun.
```

### Agents disponibles

| Agent | Rôle | Limites / Interdictions |
|---|---|---|
| `bug-hunter` | Bugs UI/CSS récurrents (thème, layout, modal, touch). | Pas de logique quant, pas de worker. |
| `claude` (catch-all) | Générique, tous outils. | Éviter si un agent spécifique convient ; pas de revue quant, pas de merge. |
| `claude-code-guide` | Questions Claude Code / SDK / API. | Ne touche pas au code applicatif. |
| `Explore` | Recherche read-only (fichiers, symboles). | Lit des extraits ; pas pour code review / audit cross-fichiers. |
| `general-purpose` | Recherche complexe multi-étapes. | Contexte isolé ; pas de validation quant finale, pas de merge. |
| `Plan` | Plans d'implémentation. | Read-only ; ne fait pas l'implémentation. |
| `statusline-setup` | Configuration status line CLI. | Cosmétique CLI uniquement. |

### Skills disponibles

Procédures scriptées invoquées par mot-clé ou `/<nom>`, s'exécutant **dans le contexte principal** (pas isolé) : `session-start-hook`, `ui-ux-pro-max`, `update-config`, `keybindings-help`, `simplify`, `fewer-permission-prompts`, `loop`, `claude-api`, `init`, `review`, `security-review`.

Leur usage doit être mentionné si il a influencé une PR importante.

### Interdictions communes

- Aucun agent ne valide une décision quant.
- Aucun agent ne décide un merge.
- Aucun agent ne remplace la revue ChatGPT.
- Les moteurs quant ne sont pas délégués à un agent isolé.

---

## RÈGLES ABSOLUES

- Backend = source canonique.
- Ne jamais inventer l'état du projet.
- Toujours distinguer : faits / hypothèses / intuitions.
- Toujours distinguer : réel / simulation / recherche / expérimental.
- Ne jamais cacher les limitations.
- Ne jamais masquer les risques.
- Ne jamais supprimer l'historique documentaire important.
- Toute décision importante doit être documentée.
- Toute modification sensible doit être documentée.
- Toute règle doit avoir une source claire.
- Toute incohérence détectée doit être signalée.
- Toute dette technique importante doit être tracée.

---

## INTERDICTIONS ABSOLUES

Interdiction :

- d'ignorer ce fichier ;
- de bypass les règles merge ;
- de bypass les règles mémoire ;
- de bypass les règles validation ;
- de bypass les règles documentation ;
- de bypass les règles rollback ;
- de bypass les règles review.

Interdiction :

- d'inventer l'état du projet ;
- de considérer `SESSION.md` comme unique source mémoire ;
- de modifier une architecture sans update docs ;
- de merger une PR importante sans review ChatGPT.

---

## OBLIGATION DE TRAÇABILITÉ

Toute décision importante doit être :

- documentée ;
- traçable ;
- datée ;
- reliée à une PR ou un commit ;
- synchronisée avec les fichiers mémoire concernés.

---

## OBLIGATION DE RAPPEL

Au début de chaque session projet, Claude et ChatGPT doivent implicitement considérer que :

- ce fichier a été lu ;
- les règles sont actives ;
- la gouvernance projet est obligatoire.

Aucune session ManiTradePro ne doit commencer sans lecture préalable de ce fichier.

---

## SESSION START PROTOCOL — REPRISE OFFICIELLE DE SESSION

> Objectif : reprendre chaque session ManiTradePro dans les meilleures conditions, sans relire inutilement tout le repo, mais sans oublier les fichiers qui changent la décision.

### Principe général

Au début d'une session ManiTradePro, ChatGPT et Claude **ne doivent jamais** partir uniquement de leur mémoire ou uniquement de `SESSION.md`.

La reprise correcte est :

```
socle obligatoire
+
fichiers spécialisés selon le sujet traité
```

La lecture de **tous** les fichiers Markdown du repo **n'est pas** obligatoire à chaque session.

### Socle obligatoire à chaque début de session

Lire obligatoirement, dans cet ordre :

1. `GOVERNANCE.md`
2. `BOT_OBJECTIVE.md`
3. `PROJECT_RULES.md`
4. `SESSION.md`
5. `KNOWN_ISSUES.md`

Rôle de chaque fichier :

- `GOVERNANCE.md` — règles du jeu, autorité projet, validation, merge, rôles, interdictions.
- `BOT_OBJECTIVE.md` — objectif réel du projet, ce que ManiTradePro doit devenir, conditions avant argent réel.
- `PROJECT_RULES.md` — règles techniques structurelles non négociables.
- `SESSION.md` — état actuel résumé, dernière situation connue, prochaines priorités.
- `KNOWN_ISSUES.md` — dette, bugs connus, limites et pièges à ne pas oublier.

### Fichiers spécialisés selon le sujet

Après le socle obligatoire, lire les fichiers spécialisés correspondant au sujet.

#### Architecture / worker / front / routes / Supabase / données

Lire aussi :

- `docs/project/ARCHITECTURE.md`
- `docs/project/DATA_PIPELINE.md`
- `PROVIDERS_MATRIX.md`

#### Trading / bot / paper trading / setups / scores / décisions / régimes / actifs

Lire aussi :

- `TRADING_LOGIC.md`
- `SETUPS_REGISTRY.md`
- `ASSET_REGISTRY.md`

#### Recherche quant / backtests / validation de setup / nouveau setup

Lire aussi :

- `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`
- `docs/research/SETUP_VALIDATION_CHECKLIST.md`
- `docs/research/ANTI_LOOKAHEAD_RULES.md`
- `docs/research/DATASET_GOVERNANCE.md`
- `SETUPS_REGISTRY.md`
- `ASSET_REGISTRY.md`

#### PR / merge / validation / livraison

Lire aussi :

- `CHECKLIST_MERGE.md`
- `CLAUDE.md`

#### Workflow ChatGPT ↔ Claude / agents / skills / règles IA

Lire uniquement la source canonique :

- `GOVERNANCE.md`

`GPT_ROLE.md` n'est plus une source active. Il reste un stub de redirection.

### Cas multi-domaines

Si une demande touche plusieurs domaines, lire **tous** les groupes concernés.

Exemples :

- Paper trading automatique = socle obligatoire + trading + architecture + validation PR.
- Nouveau setup = socle obligatoire + recherche quant + trading + registres.
- Provider prix live = socle obligatoire + architecture + données + trading.
- Nettoyage documentation = socle obligatoire + fichiers impactés + checklist merge.
- Broker réel = socle obligatoire + objectif produit + architecture + trading + risk + checklist merge.

### Règle anti-invention

Si une information est absente, contradictoire ou obsolète :

- ne pas inventer ;
- signaler l'incertitude ;
- indiquer quel fichier manque ou quelle contradiction existe ;
- proposer une correction documentaire si nécessaire.

### Sortie attendue au début d'une session

Après lecture du socle et des fichiers spécialisés nécessaires, Claude ou ChatGPT doit pouvoir résumer en 3 lignes :

```
Projet :
État réel :
Prochaine étape :
```

Ce résumé doit venir des fichiers lus, pas de mémoire approximative.

---

## FORMAT OBLIGATOIRE CHATGPT ↔ CLAUDE

> Règle de communication obligatoire pour toute interaction de travail entre ChatGPT et Claude sur le projet ManiTradePro. Complète et précise la section *Mode de communication obligatoire*.

### Sens ChatGPT → Claude : prompt unique

Pour toute demande de travail adressée à Claude, ChatGPT doit communiquer **uniquement** sous forme de **prompt complet, ultra précis, en un seul bloc prêt à copier-coller**.

Le prompt ChatGPT → Claude doit contenir, quand pertinent :

- contexte projet ;
- objectif exact ;
- fichiers à lire ;
- contraintes absolues ;
- étapes d'exécution ;
- fichiers autorisés à modifier ;
- fichiers interdits à modifier ;
- livrable attendu ;
- format de réponse attendu ;
- règle de non-merge sans validation ChatGPT.

ChatGPT **ne doit pas** envoyer à Claude :

- des consignes fragmentées ;
- des messages vagues ;
- des intentions générales ;
- des demi-prompts ;
- des instructions implicites ;
- des validations ambiguës.

### Sens Claude → ChatGPT : réponse en bloc unique

Claude doit répondre à ChatGPT **uniquement** en un **seul bloc structuré, prêt à copier-coller**, contenant :

1. résumé court ;
2. fichiers lus ;
3. fichiers modifiés ;
4. changements effectués ;
5. impacts techniques ;
6. impacts quantitatifs ;
7. risques ;
8. limites ;
9. vérifications effectuées ;
10. état de `SESSION.md` ;
11. agents / skills utilisés ;
12. demande explicite de validation si nécessaire.

Claude **ne doit pas** répondre à ChatGPT avec :

- plusieurs blocs dispersés ;
- des réponses partielles ;
- du storytelling ;
- des justifications vagues ;
- des conclusions non prouvées ;
- une demande de merge implicite.

### Objectif

Maximiser la précision d'exécution de Claude et permettre à ChatGPT de relire, challenger et valider efficacement.

---

## MATRICE D'IMPACT DOCUMENTAIRE

Avant chaque demande de `GO MERGE`, Claude doit consulter la matrice d'impact documentaire officielle :

`docs/project/DOC_IMPACT_MATRIX.md`

Cette matrice définit quels fichiers mémoire doivent être **mis à jour** ou **explicitement vérifiés** selon le type de modification.

### Règles

- `SESSION.md` doit toujours être mis à jour avant `GO MERGE` (cf. § *Règles synchronisation mémoire*).
- Les fichiers attendus par la matrice pour le type de PR doivent être mis à jour **ou** justifiés explicitement dans une section `## Documentation impact` du body de PR.
- En cas multi-domaines, **fusionner les listes** issues de chaque ligne concernée de la matrice.
- Si la matrice est incomplète pour un cas réel, **l'enrichir dans la même PR** plutôt que de bypass.

### Critères de refus

ChatGPT **ne doit pas** donner `GO MERGE` si :

- un fichier documentaire attendu par la matrice n'a pas été mis à jour ;
- aucun motif n'explique pourquoi il n'a pas été modifié ;
- `SESSION.md` n'a pas été mis à jour ;
- les fichiers sources sont contradictoires entre eux.

### Aide anti-oubli

Un script dev-only est fourni pour aider à détecter les oublis : `scripts/check-doc-impact.mjs` (commande : `npm run check:doc-impact`).

Le script est une **aide**, pas une garantie. Il ne remplace ni la matrice, ni la `CHECKLIST_MERGE.md`, ni la revue ChatGPT. Il ne doit pas être branché dans CI comme gate bloquant sans validation explicite de ChatGPT.
