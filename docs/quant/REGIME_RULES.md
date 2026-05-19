# REGIME_RULES.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - règles régimes marché ;
> - filtres ;
> - limitations ;
> - conditions.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).

---

## 1. Régimes définis

_À remplir._

Items attendus :

- liste exhaustive des régimes (`risk-on`, `risk-off`, `range`, `crash`, `melt-up`, etc.) ;
- définition technique de chaque régime (indicateurs, seuils, fenêtre) ;
- source de la classification (provider, calcul interne).

## 2. Filtres par régime

_À remplir._

Items attendus :

- quels setups sont autorisés dans quel régime (cf. `SETUPS_REGISTRY.md`) ;
- quels actifs sont autorisés dans quel régime (cf. `ASSET_REGISTRY.md`) ;
- réduction d'exposition par régime (cf. `ALLOCATION_RULES.md`).

## 3. Conditions de transition

_À remplir._

Items attendus :

- comment détecte-t-on un changement de régime ?
- y a-t-il un délai / une zone tampon pour éviter le flip-flop ?
- audit log des transitions.

## 4. Limitations connues

_À remplir._

Items attendus :

- faux régimes possibles ;
- biais de la classification ;
- lookahead à éviter.

---

## Sources existantes à consolider

- `/SESSION.md` — discussions régimes marché
- `/docs/research/`
- `docs/quant/TRADING_LOGIC.md` (modulateurs régime)
