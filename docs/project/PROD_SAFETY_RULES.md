# PROD_SAFETY_RULES.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - protections prod ;
> - rollback ;
> - observabilité ;
> - logs obligatoires ;
> - protections recovery.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).
> **À remplir** par Claude + ChatGPT lors de la prochaine PR touchant la prod.

---

## 1. Protections prod (frontend + Worker + Supabase)

_À remplir._

Items attendus :

- Conditions d'accès admin (PIN + HMAC 24h).
- Endpoints sensibles et protections.
- Pas de log de secrets / tokens.
- Versionning du SW (`CACHE_VERSION`).

## 2. Rollback

_À remplir — coordonner avec `MERGE_PROTOCOL.md` § 5._

Couvrir :

- frontend Pages (revert PR, bump cache) ;
- Cloudflare Worker (revert + redeploy via Actions ou wrangler) ;
- migrations Supabase (script de rollback obligatoire).

## 3. Observabilité

_À remplir._

Couvrir :

- monitoring Worker (logs Cloudflare) ;
- monitoring data quality ;
- alertes critiques ;
- canary / smoke tests post-deploy.

## 4. Logs obligatoires

_À remplir — lister les événements qui DOIVENT être loggés (et ceux qui ne doivent pas pour éviter fuite de secrets)._

## 5. Protections recovery

_À remplir._

Couvrir :

- backup Supabase ;
- rétention des snapshots `bot-stats` ;
- procédure de restauration ;
- RTO / RPO cibles.

## 6. Garde-fous broker / argent réel

Tant que le bot reste en paper, lister les conditions minimum AVANT toute connexion broker réelle :

- _À remplir._

---

## Sources existantes à consolider

- `/CLAUDE.md` § "Contraintes de déploiement", § "Secrets"
- `docs/monitoring/KNOWN_ISSUES.md` — incidents prod historiques
- `/SESSION.md` — sections "Architecture cible" et incidents
