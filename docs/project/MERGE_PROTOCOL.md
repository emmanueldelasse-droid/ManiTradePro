# MERGE_PROTOCOL.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - workflow PR ;
> - règles GO/NOGO ;
> - rollback ;
> - checklist merge.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).
> Sources à consolider : `CHECKLIST_MERGE.md` (racine), `CLAUDE.md` § "Règle workflow Git", `GOVERNANCE.md` § "Règles merge".

---

## 1. Workflow PR

_À remplir — depuis `CLAUDE.md` § "Règle workflow Git"._

Principes :

- Une PR = un objectif (cf. `GOVERNANCE.md`).
- Toujours développer sur la branche désignée.
- Jamais de push direct sur `main`.

## 2. Règles GO / NOGO

### Conditions GO (depuis `GOVERNANCE.md`)

ChatGPT donne `GO merge` uniquement si :

- docs synchronisées ;
- toute nouvelle règle est documentée ;
- architecture cohérente avec `ARCHITECTURE.md` ;
- routes documentées ;
- règles sécurité / calibration / risk documentées ;
- known issues tracées ;
- `SESSION.md` cohérent ;
- rollback fourni ;
- impacts explicités ;
- limites mentionnées.

### Conditions NOGO

_Lister exhaustivement._

## 3. Format demande de GO de Claude

Avant merge, Claude doit fournir :

- résumé technique ;
- objectif unique ;
- fichiers modifiés ;
- impacts ;
- risques ;
- tests ;
- limitations ;
- rollback ;
- état réel ;
- mémoire mise à jour (section `MEMORY FILES UPDATED`).

## 4. Auto-merge — exceptions

Cas où Claude doit **demander avant de merger** même si auto-merge autorisé (depuis `CLAUDE.md`) :

- PR touche un broker réel / passage en argent réel ;
- PR contient une migration SQL Supabase destructrice (DROP, TRUNCATE) ;
- PR supprime un endpoint authentifié ou affaiblit l'auth admin (PIN, HMAC) ;
- PR change la matrice `validateConfiguration` du moteur (`worker.js`).

## 5. Rollback

_À remplir — procédure de rollback pour frontend (revert PR + bump CACHE_VERSION) et Worker (revert + redeploy CI ou wrangler manuel)._

## 6. Checklist merge

_À consolider depuis `CHECKLIST_MERGE.md`._

---

## Sources existantes à consolider

- `/CHECKLIST_MERGE.md`
- `/CLAUDE.md` § "Règle workflow Git (IMPÉRATIVE)", § "Validation obligatoire avant merge"
- `/GOVERNANCE.md` § "Règles merge", § "Règles validation ChatGPT", § "Règles synchronisation mémoire"
