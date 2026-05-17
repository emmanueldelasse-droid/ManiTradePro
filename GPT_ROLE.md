# GPT_ROLE — Rôles et gouvernance IA du projet ManiTradePro

> Ce fichier décrit qui fait quoi entre Claude et ChatGPT sur le projet.
> Il est **structurel** et **non négociable** — toute évolution future doit être discutée explicitement avec l'utilisateur.

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
