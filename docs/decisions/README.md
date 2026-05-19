# docs/decisions/

> **Rôle (selon `GOVERNANCE.md`, fichier `DECISION-XXX-*.md`) :**
> - grosses décisions ;
> - contexte ;
> - alternatives rejetées ;
> - impacts ;
> - justification.

Chaque décision importante du projet ManiTradePro doit produire un fichier `DECISION-NNN-slug.md`.

---

## Convention de nommage

```
DECISION-001-supabase-vs-cloudflare-d1.md
DECISION-002-eodhd-primary-provider.md
DECISION-003-recalibration-q3-2026.md
...
```

- `NNN` = numéro séquentiel à 3 chiffres.
- `slug` = court, kebab-case, en anglais.

---

## Template obligatoire

```markdown
# DECISION-NNN — Titre court

- **Date :** YYYY-MM-DD
- **Statut :** ACTIVE | SUPERSEDED par DECISION-MMM | REVERTED
- **Auteur :** créateur / ChatGPT / Claude
- **PR liée :** #xxx
- **Commit lié :** SHA

## Contexte

_Pourquoi cette décision est nécessaire ? Quel problème elle résout ?_

## Alternatives considérées

1. **Option A :** _description, avantages, inconvénients._
2. **Option B :** _description, avantages, inconvénients._
3. **Option C (retenue) :** _description, raisons._

## Décision

_Ce qu'on fait concrètement._

## Impacts

- _Impact code._
- _Impact docs._
- _Impact prod._
- _Impact data._

## Risques

_Liste exhaustive des risques + plan de mitigation._

## Critères de revisite

_Conditions qui pourraient invalider cette décision et nécessiter une DECISION-MMM superseding._

## Sources

- _PR_
- _commits_
- _autres décisions liées_
```

---

## Décisions actuelles

_Aucune entrée pour l'instant._

**TODO créateur + ChatGPT :** identifier les décisions importantes passées qui méritent d'être documentées rétroactivement (choix EODHD, séparation analytique/live, snapshotId, etc.) et les écrire ici.
