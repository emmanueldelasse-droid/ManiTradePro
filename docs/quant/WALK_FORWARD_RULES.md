# WALK_FORWARD_RULES.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - validation séquentielle ;
> - rolling ;
> - séparation train/test ;
> - contraintes robustesse.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).

---

## 1. Schéma walk-forward officiel

_À remplir._

Items attendus :

- taille fenêtre train (mois) ;
- taille fenêtre test (mois) ;
- pas d'avancement (mois) ;
- nombre minimum de folds.

## 2. Règles de séparation train / test

_À remplir._

Items attendus :

- aucune fuite de données du test vers le train ;
- ré-optimisation autorisée uniquement sur le train ;
- paramètres figés avant le test.

## 3. Critères de robustesse

_À remplir._

Items attendus :

- stabilité des paramètres optimaux entre folds ;
- absence de fold qui détruit la moyenne ;
- corrélation rendement train ↔ test acceptable.

## 4. Critères de rejet

_À remplir._

Conditions qui invalident un setup même si la moyenne est positive :

- _liste à compléter._

## 5. Friction et coûts

Le walk-forward doit toujours inclure la friction réaliste (cf. `FRICTION_MODEL.md`).

## 6. Format rapport walk-forward

_À remplir._

---

## Sources existantes à consolider

- `/docs/research/SETUP_VALIDATION_CHECKLIST.md`
- `/docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`
