# BACKTEST_RULES.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - règles backtests ;
> - contraintes ;
> - reproductibilité ;
> - exclusions ;
> - anti-lookahead ;
> - anti-survivorship.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).
> Une grande partie du contenu existe déjà dans `docs/research/`.

---

## 1. Contraintes générales

_À remplir._

Items attendus :

- périmètre temporel minimum ;
- périmètre univers ;
- fréquence des barres (daily / intraday / mixte) ;
- séparation données train / validation / test.

## 2. Reproductibilité

_À remplir._

Items attendus :

- seed obligatoire ;
- version dataset gelée (cf. `docs/research/DATASET_GOVERNANCE.md`) ;
- version code gelée (commit SHA dans le rapport) ;
- format de sortie standard.

## 3. Exclusions

_À remplir._

Items attendus :

- périodes exclues (incidents data, gaps, halts) ;
- actifs exclus ;
- jours sans liquidité.

## 4. Anti-lookahead

Voir `docs/research/ANTI_LOOKAHEAD_RULES.md` (source canonique).

_Lier les règles principales ici._

## 5. Anti-survivorship

_À remplir._

Items attendus :

- inclusion des actifs delistés ;
- gestion des fusions / spin-offs ;
- gestion des changements de ticker.

## 6. Format rapport backtest

_À remplir._

---

## Sources existantes à consolider

- `/docs/research/ANTI_LOOKAHEAD_RULES.md` (source canonique anti-lookahead)
- `/docs/research/DATASET_GOVERNANCE.md`
- `/docs/research/SETUP_VALIDATION_CHECKLIST.md`
- `/docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`
