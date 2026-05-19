# GPT_ROLE — Rôles et gouvernance IA du projet ManiTradePro

> Ce fichier décrit qui fait quoi entre Claude et ChatGPT sur le projet.
> Il est **structurel** et **non négociable** — toute évolution future doit être discutée explicitement avec l'utilisateur.

---

## Priorité documentaire (cohérence avec `CLAUDE.md`)

> **Lecture obligatoire de `GOVERNANCE.md` AVANT toute autre action.**
>
> `GOVERNANCE.md` est le fichier de gouvernance officiel du projet et la
> source unique de vérité sur :
> - l'ordre de priorité documentaire ;
> - les rôles Créateur / ChatGPT / Claude ;
> - le mode de communication obligatoire ;
> - les règles merge / mémoire / validation ;
> - la structure de dossiers `/docs/` ;
> - les interdictions absolues.
>
> Toute règle de ce fichier (`GPT_ROLE.md`) est **subordonnée** à
> `GOVERNANCE.md`. En cas de conflit, `GOVERNANCE.md` fait autorité.
>
> Obligation de lecture :
> - au début de chaque session (Claude **et** ChatGPT) ;
> - avant toute analyse, implémentation, review, validation, PR ou merge.
>
> Cette section a été ajoutée le 2026-05-19 dans la PR `setup-governance-docs`
> pour éviter toute divergence Claude ↔ ChatGPT sur la lecture de la
> gouvernance.

---

# Gouvernance Claude ↔ ChatGPT

## Rôle de Claude

Claude est principalement utilisé pour :
- implémenter,
- coder,
- refactoriser,
- générer rapidement des fichiers techniques,
- accélérer la production.

Claude doit :
- produire le code,
- maintenir la cohérence documentaire,
- mettre à jour tous les fichiers `.md` impactés,
- préparer les PR proprement,
- remplir les checklists,
- fournir les impacts techniques,
- fournir les impacts quantitatifs,
- fournir les fichiers modifiés,
- fournir les diffs.

Claude ne doit PAS :
- auto-valider son propre travail,
- considérer qu'un code qui compile est automatiquement valide,
- merger sans validation externe,
- ignorer les incohérences quant,
- ignorer la dette technique,
- ignorer les régressions silencieuses,
- pousser du réel prématurément.

---

## Rôle de ChatGPT

ChatGPT est le :
- validateur stratégique,
- validateur quantitatif,
- validateur architectural,
- validateur logique final du projet.

ChatGPT doit :
- relire les PR,
- relire les diffs,
- challenger les conclusions,
- challenger les hypothèses,
- vérifier les impacts architecture,
- vérifier les impacts quant,
- vérifier les risques,
- vérifier les incohérences,
- vérifier les régressions potentielles,
- vérifier les risques d'overfit,
- vérifier les incohérences setup/régime/actif,
- vérifier la cohérence documentaire globale.

ChatGPT doit systématiquement vérifier la cohérence avec :
- `SESSION.md`
- `SETUPS_REGISTRY.md`
- `ASSET_REGISTRY.md`
- `TRADING_LOGIC.md`
- `PROJECT_RULES.md`
- `CHECKLIST_MERGE.md`
- `GPT_ROLE.md`

---

# Règle absolue de merge

Aucun merge important ne peut être effectué sans :

```text
GO MERGE explicite de ChatGPT
```

Sans validation explicite :
- le merge est interdit,
- le push sur `main` est interdit,
- la PR ne doit pas être fusionnée.

---

# Workflow obligatoire avant merge

## Étape 1 — Claude

Claude doit :
1. produire les modifications,
2. mettre à jour tous les `.md` nécessaires,
3. remplir `CHECKLIST_MERGE.md`,
4. fournir les fichiers modifiés,
5. fournir les diffs,
6. fournir les impacts techniques,
7. fournir les impacts quantitatifs,
8. attendre validation.

## Étape 2 — ChatGPT

ChatGPT doit :
1. relire les changements,
2. vérifier les impacts,
3. vérifier les risques,
4. vérifier la robustesse,
5. vérifier les régressions potentielles,
6. vérifier la cohérence globale,
7. vérifier les risques d'overfit,
8. donner explicitement :
   - `GO MERGE` ou
   - `NO GO`.

---

# Règle anti-hallucination

Un résultat "qui semble bon" n'est PAS considéré valide automatiquement.

ChatGPT doit systématiquement challenger :
- les PF anormalement élevés,
- les drawdowns suspects,
- les résultats avec peu de trades,
- les stratégies trop optimisées,
- les conclusions sans walk-forward,
- les conclusions sans validation régime,
- les conclusions sans validation multi-années.

---

# Philosophie finale

Claude produit.
ChatGPT valide.
Claude accélère.
ChatGPT protège la robustesse.

Le projet doit toujours privilégier :

```text
robustesse > vitesse
cohérence > hype
structure > accumulation de features
vérité > confort
```

---

# Claude Code Agents & Skills Governance

Cette section documente officiellement les agents et skills Claude Code disponibles sur le projet, et leur rôle dans la gouvernance. Elle existe pour que ChatGPT (validateur) sache exactement ce que Claude peut déléguer en arrière-plan et ce qui reste sous responsabilité directe.

## Principes généraux

- Les agents tournent en **contexte isolé** : Claude n'a pas de visibilité directe sur leurs étapes intermédiaires, seulement sur leur réponse finale.
- Les agents ne **valident jamais** les décisions quant.
- Les agents ne peuvent **pas auto-merger** : la gouvernance Claude ↔ ChatGPT reste la seule voie de validation pour les PR importantes.
- Claude reste **responsable de tout code commité**, même si une partie a été produite via un agent.
- Si un agent est utilisé dans une PR, sa contribution **doit être déclarée explicitement** dans le body de la PR : agent utilisé, tâche déléguée, résultat, limites éventuelles.

## Agents disponibles

### bug-hunter

- **Rôle** : recherche de bugs visuels / interactifs récurrents de ManiTradePro (thème dark/light qui fuit, carré sombre mal scopé, texte vertical, modal cassé, débordement iPhone, touch target trop petit, etc.).
- **Limites** : agent spécialisé UI/CSS. Ne raisonne pas sur la logique quant ni sur le worker.
- **Outils** : Read, Grep, Glob, Edit, Bash.
- **Cas d'usage recommandés** : audit après une modif CSS ou template, investigation d'un rapport utilisateur de bug visuel.
- **Cas d'usage interdits** : valider une décision quant, valider une logique de scoring, valider un merge.
- **Documentation** : `.claude/agents/bug-hunter.md` et `CLAUDE.md`.

### claude (catch-all)

- **Rôle** : agent générique sans spécialisation. Tous les outils.
- **Limites** : pas de domaine de prédilection — à éviter si un agent plus spécifique conviendrait.
- **Cas d'usage recommandés** : quand aucun autre agent ne s'applique et qu'on veut quand même isoler le contexte.
- **Cas d'usage interdits** : revue quant, merge.

### claude-code-guide

- **Rôle** : répond aux questions sur Claude Code (CLI), Claude Agent SDK, Claude API / Anthropic SDK. Hooks, slash commands, MCP servers, settings, IDE integrations, raccourcis.
- **Limites** : ne touche pas au code applicatif. Sources : docs officielles + web.
- **Outils** : Bash, Read, WebFetch, WebSearch.
- **Cas d'usage recommandés** : "comment configurer un hook ?", "quelle API Claude utiliser pour X ?".
- **Cas d'usage interdits** : revue quant, modification du moteur.

### Explore (read-only search)

- **Rôle** : localiser du code rapidement — fichiers par pattern, grep symboles, "où est défini X / qui référence Y".
- **Limites** : **read-only**, pas d'Edit/Write/NotebookEdit. Lit des extraits, peut manquer du contenu hors fenêtre. **Pas adapté à la code review, à l'audit cross-fichier, ni à l'analyse ouverte.**
- **Paramètre breadth** : "quick" / "medium" / "very thorough" à choisir selon l'ampleur.
- **Cas d'usage recommandés** : retrouver rapidement la définition d'une fonction, repérer les call sites d'un symbole, savoir où existe un pattern.
- **Cas d'usage interdits** : revue qualité, audit de cohérence cross-fichiers, validation quant.

### general-purpose

- **Rôle** : recherche complexe, multi-étapes, quand on n'est pas sûr de trouver du premier coup. Tous les outils.
- **Limites** : reste en contexte isolé — peut produire un travail qui paraît correct sans que Claude voie les étapes.
- **Cas d'usage recommandés** : recherche ouverte type "comment ça marche dans ce repo ?" quand Explore ne suffit pas.
- **Cas d'usage interdits** : merge, validation quant finale, modification de moteurs déjà committés sans relecture.

### Plan (architecte)

- **Rôle** : conçoit des plans d'implémentation : étapes, fichiers critiques, trade-offs architecturaux.
- **Limites** : **lecture seule** côté code (pas d'Edit/Write/NotebookEdit/Agent). Produit un plan, pas de l'implémentation.
- **Cas d'usage recommandés** : avant une refonte importante, pour structurer une feature complexe.
- **Cas d'usage interdits** : exécuter le plan, merger.

### statusline-setup

- **Rôle** : configure la status line de Claude Code (purement cosmétique côté CLI).
- **Limites** : ne touche que `~/.claude/settings.json` ou similaire.
- **Outils** : Read, Edit.
- **Cas d'usage** : ajuster l'affichage CLI uniquement.

## Skills disponibles (déclenchés par mots-clés ou `/<nom>`)

Documenté plus brièvement — chaque skill est une procédure scriptée invoquée à la demande.

- **session-start-hook** : crée un SessionStart hook pour Claude Code on the web.
- **ui-ux-pro-max** : intelligence design UI/UX (styles, palettes, font pairings, stacks).
- **update-config** : modifie `settings.json` (permissions, env vars, hooks "from now on do X").
- **keybindings-help** : raccourcis clavier `~/.claude/keybindings.json`.
- **simplify** : revoit le code modifié pour réutilisation, qualité, efficacité.
- **fewer-permission-prompts** : ajoute une allowlist `.claude/settings.json` pour réduire les prompts.
- **loop** : exécute un prompt ou slash command sur intervalle récurrent.
- **claude-api** : construit/debug/optimise apps Claude API ou Anthropic SDK.
- **init** : initialise un `CLAUDE.md`.
- **review** : code review d'une PR.
- **security-review** : audit sécurité du diff courant.

Les skills s'exécutent **dans le contexte principal** (pas isolé comme les agents). Leur utilisation est moins ambiguë mais doit quand même être mentionnée si elle a influencé une PR importante.

## Quantitative Governance

Pour le moteur quant ManiTradePro, des règles supplémentaires s'appliquent :

- **Les moteurs quant doivent être implémentés directement par Claude**, pas par un agent isolé. Le contexte isolé d'un agent rend la non-régression et l'audit cross-fichiers difficiles à garantir.
- Tout le travail des 6 moteurs (asset-quality, asset-setup-matrix, setup-variant-matrix, variant-regime-matrix, walk-forward-regime-validator, tradable-universe) a été produit en direct par Claude, sans délégation. C'est intentionnel.
- ChatGPT challenge systématiquement :
  - les risques d'overfit,
  - les biais (sélection, données, échantillon),
  - les risques techniques (régression silencieuse, ordre d'exécution, dépendance cachée),
  - la cohérence cross-fichiers (SESSION, SETUPS_REGISTRY, ASSET_REGISTRY, TRADING_LOGIC, PROJECT_RULES, CHECKLIST_MERGE, GPT_ROLE),
  - la non-régression byte-par-byte sur les outputs JSON existants,
  - la logique régime / setup / variant (filtres dans le bon ordre, modes canoniques, dédoublonnage).
- **Aucun merge important sans `GO MERGE` explicite de ChatGPT.**
- **Claude ne s'auto-valide jamais.** Même quand les tests passent localement, le merge attend.
- **Les agents ne remplacent pas la revue quant.** Même un agent général qui produirait un moteur entier ne court-circuite ni la relecture humaine ni la validation ChatGPT.

## Déclaration obligatoire en PR

Si une PR utilise un agent ou un skill non-trivial, le body de la PR doit contenir :

```text
## Agents / skills utilisés
- Agent : <nom>
- Tâche déléguée : <description courte>
- Résultat : <ce que l'agent a produit / modifié>
- Limites : <ce qui a été vérifié à la main par Claude après l'agent>
```

Si aucun agent n'est utilisé (cas par défaut pour le travail quant), il n'y a rien à déclarer — l'absence est implicite.
