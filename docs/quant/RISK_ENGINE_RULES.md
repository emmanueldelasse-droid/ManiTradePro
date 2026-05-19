# RISK_ENGINE_RULES.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - kill switch ;
> - max perte ;
> - max drawdown ;
> - cooldown ;
> - caps secteur ;
> - caps crypto.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).

---

## 1. Kill switch

_À remplir._

Items attendus :

- conditions de déclenchement ;
- action déclenchée (flatten, halt trading, alert) ;
- comment réactiver (manuel obligatoire / automatique) ;
- audit log.

## 2. Max perte par trade

_À remplir._

## 3. Max perte journalière

_À remplir._

## 4. Max drawdown portfolio

_À remplir._

Items attendus :

- seuils ;
- conséquences (réduction exposition vs halt complet) ;
- méthode de calcul (peak-to-trough, rolling, etc.).

## 5. Cooldown après pertes

_À remplir._

Items attendus :

- déclencheurs ;
- durée ;
- conditions de sortie de cooldown.

## 6. Caps secteur

_À remplir — coordonner avec `ALLOCATION_RULES.md` § 2._

## 7. Caps crypto

_À remplir._

Crypto = classe d'actif à part en risk management :

- volatilité plus élevée ;
- marché 24/7 (gestion stops weekend) ;
- liquidité variable ;
- pas de halts marché.

## 8. Priorité de déclenchement

_À remplir — ordre de priorité quand plusieurs règles risk s'activent simultanément._

---

## Sources existantes à consolider

- `/SESSION.md` — discussions risk
- `docs/project/TRADING_ENGINE.md` (risk limits, kill switch) + `docs/quant/TRADING_LOGIC.md` (apprentissage adaptatif)
- `/cloudflare-worker/worker.js` — fonction `validateConfiguration` (exception merge selon `CLAUDE.md`)
