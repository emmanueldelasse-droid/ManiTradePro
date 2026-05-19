# AI_WORKFLOW.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - workflow GPT ↔ Claude ;
> - format réponses ;
> - format review ;
> - format validation.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).
> Sources à consolider : `GPT_ROLE.md` (racine), section "Mode de communication" de `GOVERNANCE.md`, section "Validation obligatoire avant merge" de `CLAUDE.md`.

---

## 1. Acteurs et rôles

Voir `GOVERNANCE.md` § "Gouvernance projet".

| Acteur | Responsabilité principale |
|---|---|
| Créateur humain | Décideur final |
| ChatGPT | Reviewer, validation merge, cohérence système |
| Claude | Implémentation, investigation, tests, doc |

## 2. Format des réponses Claude → ChatGPT

_À remplir — extraire de `GOVERNANCE.md` § "Format obligatoire des réponses" et `GPT_ROLE.md`._

## 3. Format des reviews ChatGPT → Claude

_À remplir._

## 4. Format de validation `GO merge` / `NOGO merge`

_À remplir — extraire de `CLAUDE.md` § "Validation obligatoire avant merge"._

## 5. Cas d'escalade vers créateur ("Avis créateur requis")

_À remplir — lister exhaustivement les cas où Claude doit demander au créateur._

## 6. Délégation aux agents Claude Code

Voir `GPT_ROLE.md` § "Claude Code Agents & Skills Governance".

_À synchroniser ici._

---

## Sources existantes à consolider

- `/GPT_ROLE.md`
- `/CLAUDE.md` § "Validation obligatoire avant merge", § "Agents et skills Claude Code"
- `/GOVERNANCE.md` § "Mode de communication obligatoire", § "Format obligatoire des réponses"
