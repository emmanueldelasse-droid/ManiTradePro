# DECISION-001 — Fusion de GPT_ROLE.md dans GOVERNANCE.md

## Statut

ACTIVE.

## Date

2026-05-19.

## Contexte

Avant cette décision, les règles IA / ChatGPT / Claude étaient réparties entre plusieurs fichiers, notamment :

- `GPT_ROLE.md`
- `GOVERNANCE.md`
- `CLAUDE.md`
- `docs/project/AI_WORKFLOW.md`

Cela créait un risque :

- doublons ;
- contradictions ;
- règles oubliées ;
- confusion entre source canonique et manuel opérationnel.

## Décision

Fusionner le contenu utile de `GPT_ROLE.md` dans `GOVERNANCE.md`.

Après cette décision :

- `GOVERNANCE.md` devient la source canonique unique de gouvernance IA / projet ;
- `GPT_ROLE.md` devient un stub de redirection ;
- `CLAUDE.md` reste un manuel opérationnel Claude Code subordonné à `GOVERNANCE.md` ;
- en cas de conflit, `GOVERNANCE.md` prime.

## Raisons

- Réduire les doublons.
- Clarifier l'autorité documentaire.
- Éviter que ChatGPT ou Claude appliquent des règles différentes.
- Faciliter les validations PR / merge.
- Préparer le protocole officiel de reprise session.
- Préparer la consolidation Markdown progressive.

## Conséquences

Conséquences positives :

- une seule source canonique pour les règles IA ;
- meilleure cohérence entre ChatGPT et Claude ;
- moins de risque d'oubli ;
- base plus propre pour les PR suivantes.

Contraintes / risques :

- `GPT_ROLE.md` ne doit plus être utilisé comme source active ;
- les agents peuvent encore ouvrir l'ancien fichier par habitude ;
- les anciens liens doivent être redirigés ou conservés via stub ;
- toute nouvelle règle IA doit être ajoutée dans `GOVERNANCE.md`, pas dans `GPT_ROLE.md`.

## Fichiers concernés

- `GOVERNANCE.md`
- `GPT_ROLE.md`
- `CLAUDE.md`
- `docs/project/AI_WORKFLOW.md`
- `SESSION.md`

## PR liées

- PR #220 — fusion de `GPT_ROLE.md` dans `GOVERNANCE.md`.
- PR #221 — nettoyage de `CLAUDE.md`.
- PR #223 — protocole officiel de reprise session.
- PR #225 — résumé simple obligatoire avec chaque `GO MERGE`.

## État actuel

Au 2026-05-19 :

- `GOVERNANCE.md` est la source canonique unique pour la gouvernance IA / projet ;
- `CLAUDE.md` est subordonné à `GOVERNANCE.md` ;
- `GPT_ROLE.md` n'existe plus à la racine (cf. note datée ci-dessous).

### 2026-05-19 — Stub `GPT_ROLE.md` supprimé

Le stub `GPT_ROLE.md` racine a été supprimé lors de la PR de nettoyage final (`claude/final-doc-stub-cleanup`). Aucune référence active ne dépendait du stub au moment de la suppression. L'historique de la fusion `GPT_ROLE.md` → `GOVERNANCE.md` reste conservé dans cette décision.

## Suite éventuelle

- Garder cette décision comme trace historique, même si l'organisation documentaire continue d'évoluer.
- Toute nouvelle PR qui voudrait recréer un fichier `GPT_ROLE.md` doit d'abord passer par une nouvelle `DECISION-MMM` qui marque la présente décision `SUPERSEDED`.
