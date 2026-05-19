# AI_WORKFLOW.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - workflow GPT ↔ Claude ;
> - format réponses ;
> - format review ;
> - format validation.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).
> Source canonique unique de la gouvernance IA : `GOVERNANCE.md` (centralisée depuis la fusion de `GPT_ROLE.md` le 2026-05-19).
> `CLAUDE.md` est le manuel opérationnel Claude Code ; il n'est **pas** une source canonique de gouvernance IA.

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

_À remplir — extraire de `GOVERNANCE.md` § "Workflow validation avant merge"._

## 5. Cas d'escalade vers créateur ("Avis créateur requis")

_À remplir — lister exhaustivement les cas où Claude doit demander au créateur._

## 6. Délégation aux agents Claude Code

Voir `GOVERNANCE.md` § "Agents et skills Claude Code".

_À synchroniser ici._

---

## Sources existantes à consolider

Source canonique unique de gouvernance IA :

- `/GOVERNANCE.md` § "Gouvernance ChatGPT ↔ Claude", § "Workflow validation avant merge", § "Règle anti-hallucination", § "Gouvernance quantitative", § "Agents et skills Claude Code", § "Mode de communication obligatoire", § "Format obligatoire des réponses".

Référence opérationnelle (non canonique pour la gouvernance IA) :

- `/CLAUDE.md` — manuel opérationnel Claude Code (conventions de session, déploiement, style code). Ne fait pas autorité sur la gouvernance IA ; en cas de conflit, `GOVERNANCE.md` prime.
