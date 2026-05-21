# FRICTION_MODEL.md — Modèle friction officiel ManiTradePro V1

> **Statut** : OFFICIAL — figé par PR `docs(friction): canonise friction model V1 + factor into shared lib` (CLEAN-1, 2026-05-19). Source canonique unique du modèle friction projet.
>
> **Subordination** :
> - `BOT_OBJECTIVE.md` — constitution produit (autorité dure).
> - `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 3.2 et § 4 — friction obligatoire dès le baseline + critères de promotion sous stress friction.
> - `TRADING_PHILOSOPHY.md` § 1 — un setup ≠ un edge (l'edge doit survivre à la friction).
>
> **Implémentation technique canonique** : `tools/backtests/lib/friction-v1.mjs`. Source unique consommée par tous les scripts de backtest projet. Aucune duplication inline tolérée (cf. § 11 *Règle d'évolution*).

---

## 1. Philosophie friction

> **Pourquoi un backtest sans friction est dangereux.**

Un backtest sans friction donne **systématiquement** un PF surestimé. C'est l'erreur la plus commune des stratégies retail qui semblent "marcher" en théorie et meurent en réalité.

### 1.1 Pourquoi les backtests optimistes détruisent les systèmes

- Une stratégie qui affiche PF 1.4 sans friction tombe souvent à PF 0.9 avec friction réaliste. L'edge **n'existait pas** — c'était un artefact de modélisation.
- Plus le setup est **fréquent**, plus la friction cumulée le tue. Un setup haute-fréquence avec PF 1.05 brut = perdant net après friction.
- Plus le setup est **court-terme**, plus le ratio friction/edge est défavorable. Un trade de 3 jours paie 0.36 % de friction (frictionR = 0.072) pour un edge espéré de quelques pourcents — la marge d'erreur explose.
- Ignorer la friction = **mentir** sur la vraie performance. C'est exactement ce que ManiTradePro refuse (cf. `BOT_OBJECTIVE.md` § *Règles absolues* — pas d'inventer de données, pas de faux résultats).

### 1.2 Pourquoi ManiTradePro choisit une approche conservatrice

- **Asymétrie d'erreur** : un edge survestimé en backtest = perte d'argent en live. Un edge sous-estimé = on rate une stratégie. La perte d'argent coûte beaucoup plus cher que la stratégie ratée.
- **Stress > optimisme** : on préfère **éliminer** des setups marginaux que **garder** des setups fragiles. Cf. principe `RESEARCH_FRAMEWORK_FREEZE_V1.md` "échec honnête > faux edge optimisé".
- **Simplicité > précision factice** : un modèle simple appliqué uniformément est mieux qu'un modèle complexe par classe d'actif **avant qu'on ait observé** les frictions réelles en paper trading. Le modèle V1 est **volontairement conservateur** et **volontairement uniforme**.

### 1.3 Pourquoi survivre à la friction est obligatoire

`RESEARCH_FRAMEWORK_FREEZE_V1.md` § 4 (critères de promotion `VALIDATED_RESEARCH_CORE`) exige :

- **I2 — Stress friction ×2 PF ≥ 1.1** : le setup doit survivre à une friction **doublée** par rapport au baseline V1.
- **I3 — Stress friction ×3 PF ≥ 1.0** souhaité.

Un setup qui ne passe pas I2 est **fragile** et ne peut pas atteindre le statut `VALIDATED_RESEARCH_CORE`. Les ratios I2 et I3 sont des **garde-fous d'incertitude** : même si notre modèle V1 est mal calibré, le setup doit rester viable.

---

## 2. Objectif du modèle V1

Le modèle friction V1 a **trois objectifs** :

1. **Mesurer la robustesse réelle** des setups, pas leur performance théorique.
2. **Éviter les faux edges** qui apparaissent positifs en backtest brut mais meurent en condition réaliste.
3. **Éviter les setups fragiles** qui passent à PF 1.0 en baseline mais s'effondrent au moindre stress.

Le modèle V1 **n'a pas** pour objectif :

- de reproduire avec précision les frictions broker réelles (impossible sans données live + adapter broker spécifique) ;
- de modéliser la microstructure (carnet d'ordres, profondeur, latence) ;
- d'être finement calibré par classe d'actif ou par régime.

Ces raffinements seront le travail d'un modèle V2+ **après observation des frictions réelles en paper trading** sur broker réel. Pour V1, **uniformité conservatrice prime sur précision factice**.

---

## 3. Formule officielle V1

### 3.1 Formule canonique

```
frictionPct(holdDays, multiplier=1) = (0.30 + 0.02 × holdDays) × multiplier
frictionR(holdDays, multiplier=1)   = frictionPct(holdDays, multiplier) / 5
```

Où :

- `holdDays` = nombre de jours bourse de hold (entrée jusqu'à sortie incluse).
- `multiplier` = multiplicateur de stress test (1 = baseline, 2 = stress modéré, 3 = stress extrême).
- `5` = facteur de conversion 5 % = 1R (convention RS Rotation v1, voir § 5).

### 3.2 Composantes du coût fixe (0.30 % round-trip)

Le 0.30 % round-trip se décompose en :

| Composant | One-way (%) |
|---|---:|
| Spread bid-ask | 0.05 |
| Slippage (impact d'exécution) | 0.05 |
| Commission broker | 0.05 |
| **Total one-way** | **0.15** |
| **Total round-trip** (entry + exit) | **0.30** |

### 3.3 Composant temporel (0.02 % / jour de hold)

Le coût variable de 0.02 % par jour est un **proxy** pour :

- **Gap risk overnight** : risque que l'actif gap défavorablement entre deux séances.
- **Dérive financement** : coût de financement implicite pour positions overnight (négligeable pour actions cash, plus significatif pour leveraged ETF).
- **Dégradation de la tenue** : entropie du signal au fil du temps — plus on tient longtemps, plus l'incertitude grandit.

### 3.4 Tableau de friction par horizon

| Hold days | frictionPct V1 (% baseline) | frictionR V1 (R baseline) | frictionR ×2 (R stress) | frictionR ×3 (R stress) |
|---:|---:|---:|---:|---:|
| 1 | 0.32 | 0.064 | 0.128 | 0.192 |
| 3 | 0.36 | 0.072 | 0.144 | 0.216 |
| 5 | 0.40 | 0.080 | 0.160 | 0.240 |
| 10 | 0.50 | 0.100 | 0.200 | 0.300 |
| 20 | 0.70 | 0.140 | 0.280 | 0.420 |
| 30 | 0.90 | 0.180 | 0.360 | 0.540 |
| 60 | 1.50 | 0.300 | 0.600 | 0.900 |
| 120 | 2.70 | 0.540 | 1.080 | 1.620 |

**Lecture** : un hold de 20 jours (horizon RS Rotation v1) paie 0.14 R de friction par trade en baseline. Sur un expectancy brut de 0.88 R par trade (cf. PR-RS-HARDENING Phase 1 baseline NO_RISK_OFF), la friction consomme ~16 % de l'edge.

---

## 4. Explication détaillée — pourquoi sévère

Le modèle est **volontairement sévère** pour les raisons suivantes :

### 4.1 Spread (~0.05 % one-way)

Les actifs liquides US (SPY, QQQ, mega-cap) ont un spread effectif de 1-3 bps (0.01-0.03 %). Mais :

- L'Univers Core V1 contient des actifs moins liquides : ETF sectoriels SPDR (~5-10 bps), actifs Europe (~10-20 bps), crypto majeures (~10-30 bps selon plateforme), small caps semi (~10-30 bps).
- Le spread varie avec le contexte (HIGH_VOL → spreads peuvent doubler).
- 0.05 % est un compromis prudent qui couvre la majorité de l'univers.

### 4.2 Slippage (~0.05 % one-way)

Slippage = écart entre prix d'exécution attendu et prix d'exécution réel. Cause :

- Mouvements de prix entre signal et exécution (NEXT_OPEN gap entre close[i] et open[i+1]).
- Impact d'exécution (ordre market vs limit, taille relative au volume).
- Latence réseau et exécution broker.

Sur paper trading, le slippage observé sera **mesurable et corrigeable**. En V1 conservative, on table sur 5 bps one-way.

### 4.3 Commission (~0.05 % one-way)

Brokers retail US 2025 :
- Interactive Brokers : 0.5 bps (Tiered) à 3 bps (Fixed).
- Alpaca : 0 commission (mais spread effectif plus large).
- Robinhood : 0 commission (PFOF — risque de slippage caché).
- Coinbase / Binance crypto : 10-50 bps selon volume.

0.05 % one-way couvre le scénario médian (retail trader sans tier institutionnel). Pour les ETF/equity, c'est volontairement haut — pour la crypto, c'est minimal. **Le coût réel sera mesuré en paper et calibré en V2**.

### 4.4 Coût variable temporel (0.02 % / jour)

Le 0.02 % / jour est un **proxy** pour des coûts difficiles à modéliser exactement :

- **Gap overnight** : sur les 1255 jours bourse 2021-2025, l'écart-type moyen des gaps overnight (open vs close précédent) sur SPY est ~0.4 %. Le 0.02 %/j est un sous-cas (gap défavorable cumulé ~10 %).
- **Coût de financement** : pour positions cash equity, ~0. Pour leveraged ETF (SOXL, TQQQ — exclus de l'Univers Core V1), ~50-200 bps annualisés. Pour crypto sur certaines plateformes, frais de funding rate peuvent être significatifs.
- **Dégradation tenue** : plus on tient, plus les imprévus s'accumulent (earnings non anticipés, choc géopolitique, etc.).

### 4.5 Multiplier ×2 et ×3 (stress tests)

Le multiplier permet de tester la robustesse sous frictions plus élevées **sans** modifier le baseline :

- **×2** = on simule une friction **doublée** (par exemple : actif moins liquide, conditions de marché stressé, broker plus cher). Critère Freeze § 4 I2 : PF ×2 ≥ 1.10 obligatoire pour `VALIDATED_RESEARCH_CORE`.
- **×3** = stress extrême. Critère Freeze § 4 I3 : PF ×3 ≥ 1.00 souhaité.

Un setup qui meurt à ×2 est **fragile** par construction. Un setup qui survit à ×3 a une **vraie marge de sécurité**.

---

## 5. Convention R — 5 % = 1R

ManiTradePro adopte la convention historique RS Rotation v1 :

> **5 % de mouvement = 1R** (Risk Unit).

Cette convention est :

- **Arbitraire mais cohérente** dans tous les backtests projet (RS Rotation, Mean Reversion, Sector RS, etc.).
- **Calibrée sur l'horizon swing** : un swing typique 5-20 jours produit ~5 % de mouvement en moyenne.
- **Compatible avec sizing** : 1 unité = 1R = position dimensionnée pour risquer 5 % du capital.

**Modification de cette convention = PR documentaire dédiée** avec re-calibration de tous les setups et de leurs verdicts.

---

## 6. Interdictions

### 6.1 Interdictions sur la formule

- ❌ **Friction zéro** : aucun backtest projet ne peut être présenté avec friction = 0. `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 3.2.
- ❌ **Suppression opportuniste** : pas de "test sans friction pour voir l'edge brut" qui prétendrait être informatif. Si vous voulez voir l'expectancy brut, regardez `pnlRGross` du trade individuel, jamais le PF agrégé brut.
- ❌ **Ajustement setup par setup** : pas de "friction réduite à 0.20 % pour ce setup parce qu'il est plus liquide". Le modèle V1 est **uniforme** pour permettre la comparaison croisée entre setups.
- ❌ **Calibration rétroactive** : pas de "ajuster les coefficients pour faire passer un setup". Modification = PR documentaire avec audit régression sur tous les setups affectés (cf. § 11).

### 6.2 Interdictions sur les multipliers

- ❌ Utiliser `multiplier < 1` pour "aider" un setup. Aucun cas d'usage légitime.
- ❌ Utiliser `multiplier > 3` pour "tuer" un setup. Le brief stress max projet est ×3.
- ❌ Multiplier non entier (1.5, 2.5) sans justification documentée. Préférer × discrets (1, 2, 3) pour lisibilité.

### 6.3 Interdictions structurelles

- ❌ **Dupliquer la formule inline dans un script**. Toute nouvelle utilisation = import depuis `tools/backtests/lib/friction-v1.mjs`. Cf. § 11.
- ❌ **Bypass le module pour aller plus vite**. Si vous écrivez `const pct = 0.30 + 0.02 * holdDays` dans un script, c'est une régression à corriger.
- ❌ **Modifier les constantes locales** au lieu de modifier le module canonique. Les constantes `FRICTION_V1_ROUND_TRIP_PCT` et `FRICTION_V1_DAILY_PCT` sont la source unique.

---

## 7. Limites du modèle V1

### 7.1 Ce que le modèle ne capture pas

- **Profondeur de carnet** : ordre de grosse taille = slippage plus élevé. V1 ne modélise pas la taille de l'ordre.
- **Liquidité intraday** : V1 est uniforme alors que les heures d'ouverture et de clôture US sont moins liquides.
- **Asymétrie long/short** : V1 est calibré long-only. Le coût de borrow short n'est pas modélisé (et le projet est long-only à date).
- **Crypto vs equity vs Europe** : V1 utilise la même formule pour tout. Crypto a réellement des frictions ~2-3× plus élevées que les ETF US large.
- **Régime de stress** : en RISK_OFF violent, les spreads peuvent ×3-5. V1 n'est pas régime-aware.
- **Frais de financement overnight** : leveraged ETF, futures, crypto leveraged (exclus de l'Univers Core V1 par décision V1).

### 7.2 Ce que le modèle ne remplace pas

- **Pas un broker réel** : V1 n'est pas un substitut à un calcul broker précis.
- **Pas un order management system** : V1 ne gère pas les rejets, les exécutions partielles, les modifications d'ordre.
- **Pas un modèle de risque** : V1 mesure le coût d'exécution, pas le risque de position.

### 7.3 Évolution prévue (V2+)

Le modèle V2 viendra **après** observation des frictions réelles en paper trading :

- Calibration par classe d'actif (`crypto_pure`, `etf_large`, `semi_volatile`, etc.) — note : un module `tools/backtests/friction-model-v1.mjs` heuristique existe déjà pour cette dimension, mais opère sur `tradable-universe.json` post-allocation et n'est pas chargé pour les backtests historiques. V2 devra unifier.
- Calibration par régime (×1.5 en HIGH_VOL, etc.).
- Modélisation de la taille d'ordre vs volume moyen.

**Cette évolution est hors scope V1.** L'urgence projet est d'avoir une base canonique unique, pas un modèle parfait.

---

## 8. Implémentation technique

### 8.1 Module canonique

**Source unique** : `tools/backtests/lib/friction-v1.mjs`.

API exportée :

```javascript
// Constantes officielles (modification = PR documentaire dédiée).
export const FRICTION_V1_ROUND_TRIP_PCT = 0.30;
export const FRICTION_V1_DAILY_PCT = 0.02;
export const FRICTION_V1_R_CONVERSION = 5;

// Métadonnées pour reporting.
export const FRICTION_V1_METADATA = Object.freeze({ ... });

// Friction en %.
export function computeFrictionPctV1({ holdDays, multiplier = 1 });

// Friction en R (selon convention 5% = 1R).
export function computeFrictionV1({ holdDays, multiplier = 1 });
```

### 8.2 Contrat d'API

- **Déterministe** : mêmes entrées → mêmes sorties. Aucun random. Aucun état. Aucun effet de bord.
- **Pure function** : pas de mutation, pas d'IA, pas de paramètres implicites.
- **Validation d'entrée** : `holdDays` ≥ 0 et fini, `multiplier` ≥ 0 et fini. Sinon `return null` (caller décide).

### 8.3 Scripts consommateurs (au 2026-05-19)

- `tools/backtests/rs-rotation-robustness-lab-v1.mjs`
- `tools/backtests/rs-rotation-robustness-v1.mjs`
- `tools/backtests/meanrev-etf-range-v1.mjs`
- `tools/backtests/rs-rotation-hardening-v1.mjs`

Tous importent depuis `./lib/friction-v1.mjs`. Aucune duplication inline tolérée.

---

## 9. Position officielle du projet

> **Un setup qui meurt sous friction n'est pas robuste.**

Cette phrase est la position officielle ManiTradePro sur la friction. Ses corollaires :

1. **Aucun setup ne peut être promu `VALIDATED_RESEARCH_CORE` sans passer friction ×2** (Freeze § 4 I2).
2. **Tout rapport backtest projet doit afficher PF post-friction** comme PF principal, pas PF brut.
3. **La discussion d'un setup commence par sa friction** : "PF baseline avec friction baseline V1 = X" est la première métrique, pas la dernière.
4. **L'absence de friction dans un test = preuve d'incompétence ou de tentative d'overfit** (sauf cas pédagogique explicite).

---

## 10. Vérification anti-régression (preuve de canonisation)

Validation effectuée lors de la PR CLEAN-1 (commit ci-après) :

**Procédure** :
1. Sauvegarder les outputs des 4 scripts consommateurs **avant migration** (formule inline).
2. Appliquer la migration (4 scripts importent depuis `lib/friction-v1.mjs`).
3. Re-runner les 4 scripts **après migration**.
4. Comparer les outputs JSON byte-à-byte (hors `generatedAt`).

**Résultats** :
- ✓ `rs-rotation-robustness-lab-v1.json` : IDENTIQUE byte-à-byte.
- ✓ `rs-rotation-robustness-v1.json` : IDENTIQUE byte-à-byte.
- ✓ `meanrev-etf-range-v1.json` : IDENTIQUE byte-à-byte.
- ✓ `rs-rotation-hardening-v1.json` : IDENTIQUE byte-à-byte.

**Conclusion** : la migration est **purement structurelle**. Aucun drift quantitatif. Aucun PF modifié. Aucun verdict changé. Aucune logique métier touchée.

---

## 11. Règle d'évolution

### 11.1 Modification de la formule

Toute modification de la formule V1 (constantes 0.30, 0.02, 5) **doit** :

1. Faire l'objet d'une **PR documentaire dédiée** avec justification économique (pas pour faire passer un setup, anti-overfit Freeze § 6.2).
2. Inclure un **audit régression complet** : re-run des 4 scripts consommateurs + diff outputs + impact sur les verdicts setups documentés.
3. Recevoir une **validation explicite ChatGPT** + créateur.
4. Créer un fichier `tools/backtests/lib/friction-v2.mjs` **plutôt que de modifier V1**. La V1 reste figée pour reproductibilité historique.

### 11.2 Ajout d'un nouveau script consommateur

Tout nouveau script de backtest qui calcule de la friction **doit** :

1. Importer depuis `tools/backtests/lib/friction-v1.mjs`.
2. **Ne pas re-implémenter** la formule inline.
3. **Ne pas modifier** les constantes.
4. Ajouter son nom à la liste § 8.3 de ce document (PR documentaire courte).

### 11.3 Stress tests additionnels

Le multiplier permet ×2 et ×3 standardisés. Tout stress hors de ces valeurs **doit** être justifié dans le body de PR (ex: ×4 pour explorer un edge particulièrement résilient, ×0.5 **interdit** car réduction de friction sans justification).

---

## 12. Sources

- `BOT_OBJECTIVE.md` — constitution produit (autorité dure).
- `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 3.2 (friction obligatoire), § 4 critères I1-I4 (friction ×1/×2/×3 stress).
- `TRADING_PHILOSOPHY.md` § 1 (un setup ≠ un edge).
- `tools/backtests/lib/friction-v1.mjs` — implémentation technique canonique.
- `tools/backtests/rs-rotation-robustness-lab-v1.mjs` — script source historique de la formule (commits avant CLEAN-1).
- Brief créateur 2026-05-19 « MISSION — CLEAN-1 — CANONISATION OFFICIELLE DU MODÈLE FRICTION V1 ».

---

> **Conclusion-mémo** : le modèle friction V1 est officialisé et factorisé. Source documentaire unique = ce fichier. Source technique unique = `lib/friction-v1.mjs`. 4 scripts migrés en pure factorisation, outputs identiques byte-à-byte. Un setup qui meurt sous friction n'est pas robuste — position projet figée.
