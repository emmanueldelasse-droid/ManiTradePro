# ALLOCATION_RULES.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - sizing ;
> - caps ;
> - réduction exposition ;
> - règles allocation.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).

---

## 1. Sizing par trade

_À remplir._

Items attendus :

- méthode (% fixe, ATR-based, Kelly fractionnel, etc.) ;
- valeurs par défaut ;
- variations par tier d'actif (cf. `ASSET_REGISTRY.md`).

## 2. Caps par catégorie

_À remplir._

Items attendus :

- cap par actif individuel (% portfolio) ;
- cap par secteur ;
- cap par classe d'actif (equity / crypto / autres) ;
- cap total exposition longue / courte.

Coordination avec `RISK_ENGINE_RULES.md`.

## 3. Réduction exposition

_À remplir._

Items attendus :

- conditions de réduction (drawdown, régime, volatilité) ;
- pas de réduction (50%, 100%) ;
- conditions de retour à l'exposition normale.

## 4. Règles allocation watchlist

_À remplir._

Items attendus :

- nombre max trades simultanés (cf. `SESSION.md` § "Architecture cible" : 3-5 trades) ;
- règle de priorité entre signaux concurrents ;
- gestion des nouveaux signaux quand portfolio plein.

## 5. Allocation par régime

_À remplir — coordonner avec `REGIME_RULES.md`._

---

## Sources existantes à consolider

- `/SESSION.md` § "Architecture cible" (Top 3-5 trades max)
- `/TRADING_LOGIC.md`
