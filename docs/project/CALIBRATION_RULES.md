# CALIBRATION_RULES.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - règles recalibration ;
> - conditions minimum ;
> - validations nécessaires.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).
> **À remplir** par Claude + ChatGPT — sujet sensible (impact direct sur l'edge du moteur, risque de curve-fitting).

---

## 1. Quand recalibrer ?

_À remplir._

Questions à trancher :

- Déclencheur temporel (calendrier fixe) ou statistique (dégradation observée) ?
- Périodicité minimum entre deux recalibrations ?
- Recalibration partielle vs complète ?

## 2. Conditions minimum (sample size, qualité données, etc.)

_À remplir._

Items attendus :

- nombre minimum de trades observés ;
- couverture régimes marché ;
- qualité données minimum (cf. `docs/monitoring/DATA_QUALITY.md`) ;
- absence de bug majeur connu sur la période (cf. `KNOWN_ISSUES.md`).

## 3. Validations obligatoires

_À remplir._

Items attendus :

- walk-forward (cf. `docs/quant/WALK_FORWARD_RULES.md`) ;
- friction réaliste (cf. `docs/quant/FRICTION_MODEL.md`) ;
- comparaison vs paramètres précédents (pas de saut significatif sans justification) ;
- review ChatGPT obligatoire avant déploiement ;
- approbation créateur obligatoire si paramètres principaux changent.

## 4. Anti curve-fitting

_À remplir._

Items attendus :

- limites au nombre de paramètres ajustables ;
- nécessité d'un test hors échantillon ;
- pénalisation des configurations sur-optimisées.

## 5. Traçabilité

_À remplir — chaque recalibration doit produire un `docs/decisions/DECISION-XXX-recalibration-*.md`._

---

## Sources existantes à consolider

- `/SESSION.md` — historique recalibrations
- `/docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`
- `/docs/research/ANTI_LOOKAHEAD_RULES.md`
- `/docs/research/SETUP_VALIDATION_CHECKLIST.md`
