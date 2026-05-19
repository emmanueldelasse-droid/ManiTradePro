# EXPERIMENTAL_FEATURES.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - features expérimentales ;
> - hypothèses ;
> - statut ;
> - risques ;
> - critères suppression.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).
> **À remplir** au fil des features expérimentales — format ci-dessous obligatoire pour chaque entrée.

---

## Template entrée

```markdown
### NOM_FEATURE

- **Statut :** EXPÉRIMENTAL | EN VALIDATION | PROMUE | ABANDONNÉE
- **Hypothèse testée :** _qu'est-ce qu'on essaie de prouver / réfuter_
- **Date d'introduction :** YYYY-MM-DD (PR #xxx)
- **Risques :** _liste des risques connus_
- **Critères de promotion :** _conditions pour passer en stable_
- **Critères de suppression :** _conditions qui invalident la feature_
- **Dernière review :** YYYY-MM-DD par ChatGPT/créateur
- **Liens :** PR, snapshots `bot-stats`, decisions/
```

---

## Features actives

_Aucune entrée pour l'instant — ajouter ici les features marquées expérimentales dans le code et la doc._

**TODO Claude :** scanner `app.js`, `worker.js`, `data/research/`, `data/setups/` pour identifier les features actuellement marquées expérimentales et les lister ici.

---

## Features abandonnées (archivage)

_Garder l'historique des features expérimentales qui ont été retirées, avec la raison._

---

## Sources existantes à consolider

- `docs/quant/SETUPS_REGISTRY.md` — setups marqués `FRAGILE`, `DATA_INSUFFICIENT`, `EDGE_DEPENDS_ON_*`
- `/SESSION.md` — historique expérimentations
- `/docs/research/`
