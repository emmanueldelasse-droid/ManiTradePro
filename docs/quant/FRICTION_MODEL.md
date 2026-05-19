# FRICTION_MODEL.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - spread ;
> - slippage ;
> - frais ;
> - délais ;
> - gaps ;
> - liquidité.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).

---

## 1. Spread

_À remplir._

Items attendus :

- modèle de spread par tier d'actif (cf. `ASSET_REGISTRY.md`) ;
- valeurs par défaut ;
- variation par régime (cf. `REGIME_RULES.md`).

## 2. Slippage

_À remplir._

Items attendus :

- modèle de slippage à l'entrée et à la sortie ;
- distinction marché normal vs marché stressé ;
- distinction limit vs market ;
- impact de la taille de position sur le slippage.

## 3. Frais

_À remplir._

Items attendus :

- frais broker par classe d'actif (paper / réel) ;
- frais Binance pour crypto ;
- frais éventuels de financement / overnight.

## 4. Délais d'exécution

_À remplir._

Items attendus :

- délai signal → ordre ;
- délai ordre → exécution ;
- impact sur le prix d'entrée vs prix observé.

## 5. Gaps

_À remplir._

Items attendus :

- gestion des gaps overnight ;
- gestion des gaps weekends (crypto vs equity) ;
- impact des gaps sur les stops.

## 6. Liquidité

_À remplir._

Items attendus :

- volume minimum requis par tier (cf. `ASSET_REGISTRY.md`) ;
- impact estimé du trade sur le carnet ;
- exclusion automatique des actifs sous le seuil.

---

## Sources existantes à consolider

- `/SESSION.md` — discussions friction
- `docs/quant/ASSET_REGISTRY.md`
- `/PROVIDERS_MATRIX.md`
