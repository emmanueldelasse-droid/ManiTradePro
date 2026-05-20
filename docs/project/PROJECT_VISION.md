# PROJECT_VISION.md — Vision produit ManiTradePro

> **Rôle (selon `GOVERNANCE.md`)** :
> - vision réelle ;
> - objectifs ;
> - philosophie produit ;
> - ce qu'on optimise ;
> - ce qu'on refuse.
>
> **Sources canoniques associées** :
> - `BOT_OBJECTIVE.md` (constitution produit, règles absolues, conditions avant argent réel) — fait toujours autorité sur les règles dures.
> - `docs/project/TRADING_PHILOSOPHY.md` (architecture moteur cible en 5 couches, setups prioritaires en familles, univers cible, horizons) — source de l'architecture produit.
> - `GOVERNANCE.md` (autorité absolue, gouvernance projet).
>
> **Date** : 2026-05-19 (rédaction officielle, PR-VISION).

---

## 1. Vision réelle

ManiTradePro est un **moteur de détection de comportements marché exploitables**, orienté **swing réactif et intraday lent**, opéré sur un **univers ciblé de 40 à 120 actifs liquides**, construit selon une architecture **contextuelle en 5 couches** :

```
Contexte → Sélection actifs → Setup → Timing → Risk → Mesure
```

Le projet n'est **pas** :

- un bot qui trouve automatiquement des trades gagnants ;
- un scanner exhaustif du marché ;
- un score universel ;
- un système de scalping / HFT / microstructure ;
- une chasse aux patterns de bougies isolés ;
- un dashboard d'analyse passive.

Le projet **est** :

- un moteur quantitatif **contextuel** ;
- une recherche d'**hypothèses économiques survivables** ;
- un système qui **mesure honnêtement** la différence entre théorie (backtest) et réalité (paper trading) ;
- un projet qui **accepte explicitement** qu'un setup peut être mort (`DEAD / ABANDONED`).

Le détail de l'architecture produit vit dans `docs/project/TRADING_PHILOSOPHY.md`.

---

## 2. Objectifs

### 2.1 Objectif structurel long terme

> Construire un moteur quant capable, à terme, de générer des décisions de trading **fiables, défendables et auditables**, sur un univers ciblé, avec mesure continue de l'écart théorie/réalité.

L'objectif n'est pas la performance maximale. L'objectif est la **robustesse et l'auditabilité**. Une performance honnête de PF 1.3 stable est préférable à une performance de PF 2.5 fragile.

### 2.2 Conditions avant tout passage en argent réel

Définies dans `BOT_OBJECTIVE.md` § *Conditions avant passage en bot réel* (12 conditions). Tant que ces conditions ne sont pas réunies, le projet reste en **paper trading**.

### 2.3 Hiérarchie des priorités

Reprise de `BOT_OBJECTIVE.md` § *Priorité absolue* (10 priorités, ordre strict) :

1. Qualité des données
2. Fiabilité des prix
3. Cohérence des scores
4. Validation des trades
5. Qualité du paper trading
6. Qualité de l'apprentissage
7. Gestion du risque
8. Cohérence du moteur
9. Stabilité globale
10. UI / design / confort utilisateur

**Règle dure** : le design ne passe **jamais** avant la logique de trading.

---

## 3. Philosophie produit

### 3.1 Principe central

> **Un setup ≠ un edge.**
>
> Un setup est une réponse conditionnelle à un contexte. Un edge est un setup dont l'hypothèse économique survit à une exécution réaliste sous friction, sur 3 splits walk-forward, sans concentration excessive, sans empilement de filtres.

Détail dans `docs/project/TRADING_PHILOSOPHY.md` § 1.

### 3.2 Architecture moteur cible — 5 couches

1. **Context Engine** — quel setup a le droit d'être actif.
2. **RS Rotation / Asset Selection** — quels actifs sont éligibles aujourd'hui.
3. **Setup Activation** — quel setup détecté sur ces actifs.
4. **Candle Timing Engine** — quand entrer précisément.
5. **Paper Trading Measurement** — mesurer l'edge réel vs théorique.

Détail dans `docs/project/TRADING_PHILOSOPHY.md` § 2.

### 3.3 Setups prioritaires (familles, pas instances)

- **Pullback Momentum** — famille prioritaire 1. Instance historique : `DEAD / DO_NOT_TRADE`. Direction = reconstruire avec hypothèse économique nouvelle.
- **Breakout Expansion après compression** — famille prioritaire 2. Instance historique agrégée : `DEAD_AGGREGATED`. Direction = reconstruire avec compression detection + breakout en deux modules distincts.
- **Mean Reversion** — axe secondaire. Diagnostic R3A complet (PR #235). Probablement cassé sur single names momentum, possiblement viable sur ETF larges. Abandon `DEAD / ABANDONED` reste autorisé.
- **RS Rotation** — couche d'infrastructure, pas un setup. Statut `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED` (PR #234), 10 items requis avant promotion.

Détail dans `docs/project/TRADING_PHILOSOPHY.md` § 4 et `docs/quant/SETUPS_REGISTRY.md`.

### 3.4 Univers cible — 40 à 120 actifs liquides

- ETF US indices (5-10) + ETF sectoriels (10-15) + ETF thématiques (5-10) + leaders US grandes capitalisations (10-20) + quality/defensive (5-10) + crypto majeures (3-5).
- Exclusions : penny stocks, small caps spéculatives, crypto altcoins illiquides, FX exotiques, ETF leveraged par défaut.
- Pourquoi pas tout le marché : bruit statistique, friction inacceptable, survivorship aggravé, coût d'observation, contradiction avec la logique contextuelle.

Détail dans `docs/project/TRADING_PHILOSOPHY.md` § 5 et `docs/quant/ASSET_REGISTRY.md`.

### 3.5 Horizons cibles

- **Swing réactif** : 3-20 jours bourse.
- **Intraday lent** : entrées sur bougies 1h/4h, sorties dans la journée ou le lendemain.
- **Refusés explicitement** : scalping, HFT, tick trading, microstructure, market making déguisé.

Détail dans `docs/project/TRADING_PHILOSOPHY.md` § 6.

### 3.6 Patterns de bougies — pas un edge

Les patterns de bougies seuls (hammer, doji, engulfing, etc.) **ne constituent pas** un edge exploitable. Ils peuvent vivre **uniquement** dans le Candle Timing Engine (couche 4) comme confirmation secondaire d'un setup déjà validé par le contexte et la détection.

Détail dans `docs/project/TRADING_PHILOSOPHY.md` § 7.

---

## 4. Ce qu'on optimise

- **Cohérence du système** entre les 5 couches. Une décision de trade doit être traçable de bout en bout.
- **Fiabilité des données** (prix live, freshness, qualité quote — cf. `quoteQualityEngine` et `resolveLiveQuote` dans `PROJECT_RULES.md` R3-bis et R4).
- **Honnêteté méthodologique** : préférer une conclusion `DEAD / ABANDONED` à un faux edge optimisé.
- **Auditabilité** : chaque statut de setup est justifié par des PR documentées (PR #207, #208, #233, #234, #235, etc.).
- **Mesure continue** de l'écart théorie / réalité via le paper trading (couche 5).
- **Approfondissement** d'un setup existant avant l'exploration d'une nouvelle famille (cadence Freeze § 11 — max 1 nouvelle famille par 2 semaines).

---

## 5. Ce qu'on refuse

- **Score universel** prétendant qualifier tout setup sur tout actif dans tout régime.
- **Setup universel** prétendant fonctionner sans contexte.
- **Optimisation opportuniste** des paramètres pour battre un seuil arbitraire.
- **Cherry-picking** de tickers ou de périodes.
- **Faux edge** survivant grâce à un empilement de filtres (> 4 filtres simultanés).
- **Scalping / HFT / microstructure** — pas l'infrastructure projet.
- **Patterns de bougies seuls** comme base de décision.
- **Annonces prématurées** (`LIVE_READY`, `VALIDATED_RESEARCH_CORE`) sans satisfaire les 10 critères Freeze § 4 + shadow live + paper live prolongé.
- **Marketing du PF** sans contexte (concentration, edge decay, friction, etc.).
- **Données fictives** (prix inventés, bougies reconstruites, quotes générées).
- **Promesses sans preuve** ("ça devrait marcher", "probablement bon").

---

## 6. État actuel honnête (2026-05-19)

- **0 setup `VALIDATED_RESEARCH_CORE`**.
- **0 setup `LIVE_READY`**.
- **0 capital réel**.
- Architecture cible des 5 couches : **lointaine** (Context Engine en embryon, Setup Activation trop permissive, Candle Timing absent, Paper Trading prêt techniquement mais non auto-activé).
- Statuts setups documentés et stables dans `SETUPS_REGISTRY.md`.
- Méthodologie de recherche figée par `RESEARCH_FRAMEWORK_FREEZE_V1.md`.
- Phase projet : recherche d'**hypothèses économiques survivables** (cadrage méta ChatGPT 2026-05-19).

---

## 7. Trajectoire (vue d'ensemble)

Réordonnée post-PR #235 :

1. ✅ Truth-sync vocabulaire et statuts (PR #233).
2. ✅ RS Rotation robustness evidence (PR #234).
3. ✅ Mean Reversion diagnostic R3A (PR #235).
4. ✅ Architecture produit + philosophie (PR-VISION, en cours).
5. 🔜 PR-R3B Mean Reversion V1 test isolé (sur signal ChatGPT dédié).
6. 🔜 PR-R3C / PR-R3D conditionnelles séquentielles.
7. 🔜 RS Rotation stress tests friction ×2/×3 (1-2 items des 10 prérequis promotion).
8. 🔜 GLD breakout isolated validation (PR séparée).
9. 🔜 Nouvelles hypothèses Pullback / Breakout (conditionnelles, hypothèse économique défendable obligatoire).
10. 🔜 Stubs documentaires `WALK_FORWARD_RULES.md`, `FRICTION_MODEL.md`, `BACKTEST_RULES.md`.
11. 🔜 Décomposition `SESSION.md`.

Tout est subordonné à la gouvernance ChatGPT et aux principes du `RESEARCH_FRAMEWORK_FREEZE_V1.md`.

---

## 8. Arbitrage avec `BOT_OBJECTIVE.md`

`BOT_OBJECTIVE.md` reste la **constitution produit** et fait autorité sur :

- les règles absolues 1-10 (ne pas inventer de données, prix faux, mélanger devises, etc.) ;
- les conditions avant passage en argent réel (12 conditions) ;
- la définition de succès / échec ;
- le rôle de l'IA dans le projet ;
- l'objectif du paper trading ;
- l'objectif de l'apprentissage.

`PROJECT_VISION.md` (ce fichier) ajoute :

- la **vision produit consolidée** ;
- la **philosophie de moteur en 5 couches** ;
- les **setups prioritaires en familles** ;
- l'**univers cible** ;
- les **horizons** ;
- les **refus explicites** (scalping, HFT, patterns seuls).

`docs/project/TRADING_PHILOSOPHY.md` ajoute le **détail technique** de chaque couche.

En cas de conflit : `BOT_OBJECTIVE.md` > `PROJECT_VISION.md` > `TRADING_PHILOSOPHY.md`.

Une migration future éventuelle (consolidation `BOT_OBJECTIVE.md` → `PROJECT_VISION.md`) reste possible mais nécessite une PR dédiée + `DECISION-002` (cf. `docs/decisions/`). Hors scope PR-VISION.

---

## 9. Sources

- `BOT_OBJECTIVE.md` — constitution produit (autorité absolue règles dures).
- `docs/project/TRADING_PHILOSOPHY.md` — architecture moteur cible 5 couches, détail technique.
- `GOVERNANCE.md` — gouvernance projet.
- `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md` — gel méthodologique recherche.
- `docs/research/MEAN_REVERSION_DIAGNOSTIC_R3A.md` — méthodologie de cadrage produit appliquée (PR #235).
- `docs/quant/SETUPS_REGISTRY.md` — statuts officiels setups.
- `docs/quant/ASSET_REGISTRY.md` — classification actifs.
- `SESSION.md` — état projet courant.

---

> **Conclusion-mémo** : ManiTradePro est un moteur contextuel en 5 couches sur 40-120 actifs liquides, qui mesure honnêtement la différence entre ses backtests et la réalité, qui accepte qu'un setup peut être mort, et qui refuse explicitement le scalping, le HFT, le score universel et les patterns de bougies seuls.
