# ManiTradePro — GOVERNANCE.md

> **Fichier de gouvernance officiel du projet ManiTradePro.**
> Lecture obligatoire au début de chaque session, avant toute analyse, implémentation, review, validation, proposition architecture, PR ou merge.
>
> Ce fichier est **prioritaire** sur tout autre document du repo.

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

---

## RÈGLES VALIDATION CHATGPT

ChatGPT ne doit **PAS** donner GO merge si :

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
