# AI_WORKFLOW.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - workflow GPT ↔ Claude ;
> - format réponses ;
> - format review ;
> - format validation.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).
> Sources canoniques : `GOVERNANCE.md` (gouvernance IA centralisée depuis la fusion de `GPT_ROLE.md` le 2026-05-19) + section "Validation obligatoire avant merge" de `CLAUDE.md`.

---

## 1. Acteurs et rôles

Voir `GOVERNANCE.md` § "Gouvernance projet" et § "Gouvernance ChatGPT ↔ Claude".

| Acteur | Responsabilité principale |
|---|---|
| Créateur humain | Décideur final |
| ChatGPT | Reviewer, validation merge, cohérence système |
| Claude | Implémentation, investigation, tests, doc |

## 2. Format des réponses Claude → ChatGPT

_À remplir — extraire de `GOVERNANCE.md` § "Format obligatoire des réponses"._

## 3. Format des reviews ChatGPT → Claude

_À remplir._

## 4. Format de validation `GO merge` / `NOGO merge`

_À remplir — extraire de `CLAUDE.md` § "Validation obligatoire avant merge" et `GOVERNANCE.md` § "Workflow validation avant merge"._

## 5. Cas d'escalade vers créateur ("Avis créateur requis")

_À remplir — lister exhaustivement les cas où Claude doit demander au créateur._

## 6. Délégation aux agents Claude Code

Voir `GOVERNANCE.md` § "Agents et skills Claude Code".

_À synchroniser ici._

---

## Sources existantes à consolider

- `/GOVERNANCE.md` § "Gouvernance ChatGPT ↔ Claude", § "Workflow validation avant merge", § "Règle anti-hallucination", § "Gouvernance quantitative", § "Agents et skills Claude Code", § "Mode de communication obligatoire", § "Format obligatoire des réponses"
- `/CLAUDE.md` § "Validation obligatoire avant merge", § "Agents et skills Claude Code"
