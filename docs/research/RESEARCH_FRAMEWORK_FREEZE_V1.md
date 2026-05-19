# Research Framework Freeze v1

> **Statut** : `OFFICIAL_FREEZE` — fait autorité pour toute recherche future.
>
> Document de gel méthodologique. Aucune dérive sans débat préalable.
>
> **Date du gel** : 2026-05-18 (après PR #207 à #216).

---

## 1. Pourquoi ce gel

Les deux derniers jours ont produit ~10 PR d'audits, de découverte de setups, et de tests de robustesse. Le bilan :

- Plusieurs setups historiquement présentés comme `VALIDATED` ont été invalidés par audit anti-look-ahead.
- Les PF affichés étaient artificiellement gonflés.
- Les setups qui survivent restent fragiles, contextuels, ou concentrés.
- **Aucun setup n'est `LIVE_READY` à ce jour.**

Le risque sans ce gel :
- dériver vers une boucle infinie de nouveaux setups,
- sur-optimiser des paramètres pour battre artificiellement des seuils,
- multiplier les PR sans consolidation méthodologique,
- présenter à terme des résultats trompeurs comme des "réussites".

Ce document arrête la dérive et fixe le cadre.

---

## 2. État honnête du projet (au 2026-05-18)

| Setup | Statut effectif | Note |
|---|---|---|
| `PULLBACK_MOMENTUM` | **DEAD / DO_NOT_TRADE** | INVALID_BACKTEST (PR #207). PF affiché 1.73 → réel 0.98 en exécution réaliste. Look-ahead structurel sur entry=ema20[i]. |
| `BREAKOUT_EXPANSION` (agrégé) | **DEAD_AGGREGATED** | PF agrégé 0.92 même avec biais (PR #208). Seule exception : GLD × breakout_h20_vol1.5 (n=47, trop faible statistiquement). |
| `MEAN_REVERSION` | **EXPERIMENTAL_ONLY** | Edge marginal (PF 1.21 en exécution réaliste). Pas live-ready. |
| `RS_ROTATION` (simple) | **RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED** | Edge CLEAN execution (×1.01 inflation), mais 0 cellule ROBUST/STABLE en rolling walk-forward 3 splits. Fragilité temporelle. |
| `VOLATILITY_COMPRESSION` | **DEAD / ABANDONED** | PF 0.78. Définitivement abandonné. |
| `SECTOR_RELATIVE_STRENGTH` v1 | **EDGE_DEPENDS_ON_AI_WINNERS** | PF 2.16 mais top 5 tickers (APLD, APP, PLTR, NBIS, UPST) = 103 % du PnL. Sans eux : PF 0.94. Edge non diversifiable. |
| `TREND_PULLBACK_DYNAMIC_SUPPORT` v1 | **FRAGILE** | Améliore l'ancien Pullback (1.045 vs 0.98) mais sous critères minimum. Concept Pullback marginal sous exécution réaliste. |
| `POST_EARNINGS_DRIFT` | **DATA_INSUFFICIENT** | Concept prometteur, mais aucun dataset earnings dans le repo. Non testable actuellement. |

**Aucun setup n'est `LIVE_READY` à ce jour.**

### Ce qui reste réellement prometteur

- **PEAD** : seule piste structurellement distincte de momentum (event-driven). Demande un dataset earnings non disponible aujourd'hui. À déprioriser tant que le sourcing n'est pas décidé.
- **RS Rotation simple** : crédible côté exécution mais fragile temporellement. Mérite un walk-forward conditionnel par régime avant tout passage live.

### Ce qui est officiellement abandonné ou marginal

- Pullback Momentum sous toutes ses formes.
- Breakout agrégé.
- Volatility Compression.
- Mean Reversion (sauf si friction confirme un edge marginal documentable).
- SECTOR_RS sous sa forme v1 (concentration AI rédhibitoire).

---

## 3. Règles obligatoires pour toute future recherche

Aucune PR de nouveau setup ne peut être mergée sans respecter **toutes** les règles ci-dessous.

### 3.1 Exécution

- `entry = open[i+1]` (NEXT_OPEN) systématique. Aucun `entry = close[i]` ni `entry = ema20[i]` sauf si formellement justifié par MOC order et stress-testé.
- `exit` à `open[exitIdx]` pour fixed hold. Pour trailing/stop, exit au close de la bougie déclenchante.
- Aucun usage d'un indicateur calculé sur `slice(0, i+1)` comme prix d'entrée.

### 3.2 Friction

- Obligatoire **dès le premier test**. Pas de "premier backtest sans friction puis on regardera".
- Formule canonique : `frictionR = (0.30 + 0.02 × holdDays) / 5` (5 % = 1R).
- Stress tests systématiques à ×2 et ×3 avant promotion.

### 3.3 Anti-look-ahead

Cf. `ANTI_LOOKAHEAD_RULES.md`. Audit anti-look-ahead spécifique obligatoire avant toute promotion à `VALIDATED_RESEARCH_CORE`.

### 3.4 Séparation signal-time / execution-time

- Le signal est généré en fin de bougie i (après close[i] connu).
- L'exécution se fait à la bougie i+1.
- Aucun usage du low/high de la bougie signal pour décider l'entrée ou calculer le stop/TP.

### 3.5 Walk-forward

- 3 splits minimum sur 5 ans (2021-2022 → 2023, 2021-2023 → 2024, 2021-2024 → 2025).
- Paramètres gelés (pas de réoptim entre splits).
- Au moins 2/3 splits doivent passer.

### 3.6 Concentration analysis

- Calcul du share top 5 tickers obligatoire pour tout setup.
- Si > 60 %, alarme "concentration excessive" et statut maximal `CONDITIONAL_EDGE`.

### 3.7 Stress tests

- Friction ×2 obligatoire avant promotion (`VALIDATED_RESEARCH_CORE`).
- Bear market isolation (2022 seule + pires fenêtres glissantes).
- Walk-forward strict 3/3 splits sans réoptim.
- Survivorship / exclusion stress sur top 5 winners.
- Sector collapse (retirer le secteur dominant).
- Corrélation vs setups existants (éviter les redondances).

---

## 4. Critères minimums avant promotion

Un setup ne peut être promu `VALIDATED_RESEARCH_CORE` que si **tous** les critères ci-dessous sont remplis :

| Critère | Seuil |
|---|---|
| Profit factor post-friction | ≥ 1.3 |
| Années positives (5 ans 2021-2025) | ≥ 4/5 |
| Walk-forward 3 splits | ≥ 2/3 passent |
| Inflation PF (CURRENT vs NEXT_OPEN strict) | < ×1.05 |
| Edge decay (early/late) | < ×1.5 |
| Top 5 ticker share | < 60 % |
| Stress friction ×2 PF | ≥ 1.1 |
| Audit anti-look-ahead spécifique | passé |
| Trades sur 5 ans | ≥ 100 |
| Single-symbol max share | < 25 % |

Si **un seul** critère échoue, le setup ne peut pas être promu. Statut maximal possible :
- `CONDITIONAL_EDGE` (si la majorité passe)
- `FRAGILE` (si concentration ou edge decay problématique)
- `EXPERIMENTAL_ONLY` (si edge marginal)
- `DEAD` (si PF < 1 ou setup structurellement défaillant)

---

## 5. Critères `LIVE_READY` futurs

`LIVE_READY` est un statut **différent et supplémentaire** à `VALIDATED_RESEARCH_CORE`. Il nécessite :

| Critère | Détail |
|---|---|
| **Shadow live** | 1 mois minimum de tracking des signaux générés en temps réel, sans exécution, juste mesure |
| **Paper live prolongé** | 3-6 mois de paper trading via broker simulator, mesure des écarts vs backtest |
| **Tracking slippage réel** | Mesure trade-by-trade du slippage vs friction théorique |
| **Stabilité multi-régimes** | Tenir au moins 2 cycles régime (au moins 1 RISK_OFF traversé) |
| **Monitoring runtime** | Dashboard live avec métriques temps réel |
| **Kill-switch** | Mécanisme d'arrêt automatique si DD dépasse seuil |
| **Drawdown controls** | Réduction taille positions si drawdown intra-période |
| **Portfolio management** | Logique allocation multi-setup, gestion exposition globale |
| **Conformité réglementaire** | Vérifications fiscales, déclaratives, etc. |

**Aucun setup n'a accès au statut `LIVE_READY` actuellement.** Aucun n'a fait de shadow live.

---

## 6. Interdictions officielles

Les pratiques suivantes sont **interdites** et entraîneront automatiquement le rejet d'une PR de recherche :

### 6.1 Méthodologie

- **Optimisation massive de paramètres** : tester > 50 combinaisons d'un même setup pour trouver les "meilleurs". Pas d'overfitting déguisé en exploration.
- **1000 variantes sans hypothèse** : pas de grid search aveugle. Chaque variante doit avoir une hypothèse documentée.
- **Cherry-picking de tickers** : pas de "tient si on retire SOXL et TQQQ". Les exclusions doivent être systématiques (par règle, pas par ticker).
- **Cherry-picking de périodes** : pas de "tient si on ignore 2022". Toutes les années comptent.

### 6.2 Modélisation

- **Prix irréalistes** : entry = ema20[i] théorique, prix intra-bar, MOC sans validation, ouverture interpolée. Interdit.
- **Suppression de friction** : aucun backtest "pour voir si l'edge existe sans friction". Friction obligatoire dès le premier essai.
- **Suppression de losing years** : pas de filtre "années bull seulement". Si le setup ne tient pas en bear, c'est documenté, pas masqué.

### 6.3 Présentation

- **Marketing du PF** : pas de "PF 2.16 !!!" sans le contexte (concentration AI 103 %).
- **Annonces prématurées** : pas de "setup validé" tant que les 10 critères ne sont pas tous remplis.
- **Promesses live** : pas de "tradable dès demain" sans shadow live + paper trading.

---

## 7. Pipeline de recherche officielle

Toute nouvelle PR de setup doit suivre ce pipeline en 10 étapes. Chaque étape doit être documentée dans la PR.

```text
1. Hypothèse formulée explicitement
   ↓
2. Dataset audit (les données existent ? sont-elles propres ?)
   ↓
3. Prototype simple (1 config baseline, pas 50 variantes)
   ↓
4. Audit anti-look-ahead (cf. ANTI_LOOKAHEAD_RULES.md)
   ↓
5. Friction test (×1, ×2, ×3)
   ↓
6. Walk-forward 3 splits stricts
   ↓
7. Concentration analysis (top 5 share, single-symbol)
   ↓
8. Stress tests (bear, sector collapse, exclusion)
   ↓
9. Classification (VALIDATED_RESEARCH_CORE / CONDITIONAL / FRAGILE / DEAD)
   ↓
10. Shadow live éventuel (si VALIDATED_RESEARCH_CORE et décision politique)
```

Si une étape échoue, le setup s'arrête à cette étape avec le statut correspondant. Pas de "on passe à l'étape suivante pour voir".

---

## 8. Classification officielle des setups

Liste exhaustive des statuts possibles. Tout setup doit avoir exactement un statut.

| Statut | Critères | Action recommandée |
|---|---|---|
| **VALIDATED_RESEARCH_CORE** | 10/10 critères de section 4 remplis | Candidat pour shadow live (PR séparée) |
| **CONDITIONAL_EDGE** | PF ≥ 1.3, ≥ 4/5 années, mais 1-2 caveats (concentration, edge decay) | Recherche additionnelle, pas tradable |
| **RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED** | Exécution propre (inflation PF < ×1.05), edge backtest, MAIS 0 cellule ROBUST/STABLE en rolling walk-forward | Pas tradable tant que robustesse temporelle pas confirmée |
| **CONDITIONAL_RESEARCH_CANDIDATE** | Edge isolé sur un actif unique, n faible (typiquement < 100 trades) | Cas d'étude, ne pas scaler à l'univers entier |
| **EXPERIMENTAL_ONLY / FRICTION_REQUIRED** | Edge marginal (PF 1.1-1.3), friction obligatoire pour confirmer ou tuer le setup | Maintenu en observation, pas tradable |
| **EXPERIMENTAL_ONLY** | Edge marginal (PF 1.1-1.3), ou hypothèse non confirmée | Maintenu en observation, pas tradable |
| **FRAGILE / CONCENTRATION_EXCESSIVE** | PF brut intéressant mais critère § 4 "top 5 ticker share < 60 %" violé (concentration > 60 %, ou top 5 = quasi-totalité du PnL) | Pas tradable, edge non diversifiable, pas de promotion sans correction concentration |
| **FRAGILE** | PF marginal, années positives < 4/5, ou stress test échoue | Pas tradable, peut être candidat à amélioration |
| **DEAD / DO_NOT_TRADE** | PF < 1.0 sous exécution réaliste, ou setup structurellement défaillant | Abandon documenté, aucune réutilisation runtime |
| **DEAD_AGGREGATED** | Agrégat sans edge (PF < 1) mais une variante isolée peut survivre (à classer en `CONDITIONAL_RESEARCH_CANDIDATE`) | Abandon de la famille agrégée |
| **DEAD** | PF < 1.0 ou setup structurellement défaillant | Abandon documenté |
| **INVALID_BACKTEST** | Audit anti-look-ahead révèle un PF gonflé > ×1.05 vs réaliste | Setup à corriger ou abandonner |
| **DATA_INSUFFICIENT** | Pas de données pour tester | Documenté, sourcing à planifier |
| **RESEARCH_FOUNDATION** | Setup en cours d'architecture, pas encore de backtest | Étape transitoire |
| **EDGE_DEPENDS_ON_AI_WINNERS** | Sous-cas spécifique de `FRAGILE / CONCENTRATION_EXCESSIVE` — concentration top 5 sur tickers AI 2021-2025 | Identique à `FRAGILE / CONCENTRATION_EXCESSIVE`, mention conservée pour SECTOR_RS v1 |

> **Note (truth-sync 2026-05-19)** : le tableau § 2 ("État honnête") utilise désormais le vocabulaire de ce § 8 comme source canonique. Tout setup doit avoir un statut listé ici ou être renvoyé à `docs/quant/SETUPS_REGISTRY.md` pour qualification. `docs/quant/SETUPS_REGISTRY.md` § *Mapping de vocabulaire* tient la table de correspondance entre l'ancien vocabulaire registre (`VALIDATED`, `RESEARCH_CANDIDATE`, etc.) et celui-ci.

---

## 9. Anti-look-ahead — rappel exécutif

Cf. `ANTI_LOOKAHEAD_RULES.md` pour la liste complète. Résumé exécutif :

1. **Toute fenêtre `slice(..., i+1)`** doit être justifiée. Préférer `slice(..., i)` quand le prix d'entrée vient de la bougie suivante.
2. **Aucun indicateur calculé incluant la bougie signal** ne peut être utilisé comme prix d'entrée.
3. **`swingLow`, `swingHigh`, `ATR`** sur la fenêtre incluant la bougie signal sont à proscrire pour stop/TP. Utiliser des fenêtres `[i-N..i-1]`.
4. **Indicateurs causaux** (EMA, RSI récurrents) sont OK, mais leur **usage** comme prix doit être encadré.
5. **Test de validation** : recalculer le PF avec NEXT_OPEN strict (entry = open[i+1], stop/TP fenêtres exclues de bougie i). Si PF chute > ×1.05, look-ahead révélé.

---

## 10. Dataset governance — rappel exécutif

Cf. `DATASET_GOVERNANCE.md`. Résumé :

1. **OHLC déjà disponible** dans `data/` : 158 symboles, 2021-2025. Pas d'extension sans justification.
2. **Earnings data manquant** : décision politique en attente (PR #216).
3. **Aucun téléchargement de données externe** sans audit anti-look-ahead spécifique de la source.
4. **Survivorship bias** : univers actuel = survivants 2021-2025. À documenter dans chaque PR de setup.

---

## 11. Cadence de recherche imposée

- **Maximum 1 nouvelle famille de setup par 2 semaines**. Pas plus.
- **Stress tests obligatoires** avant nouvelle famille.
- **Pas de PR de "polissage"** sans valeur incrémentale claire.
- **Pas de PR de "optimisation" sans hypothèse documentée**.

---

## 12. Ce document fait autorité

Toute PR future qui contourne ce framework doit être marquée explicitement dans son body :

```text
⚠ DÉVIATION FRAMEWORK FREEZE v1
Justification : [raison précise]
Section contournée : [3.x, 4, 6, ...]
```

Et nécessite une **discussion ChatGPT explicite** avant merge.

---

## 13. Mise à jour de ce document

Ce document peut être modifié, mais **seulement** via une PR dédiée `feat/research-framework-freeze-v2` qui :
- documente précisément ce qui change et pourquoi,
- liste les setups affectés,
- propose une période de transition,
- nécessite un GO MERGE explicite de ChatGPT.

Pas de modification silencieuse.

---

> **Conclusion** : ManiTradePro entre dans une phase de discipline méthodologique. Le projet a un cadre désormais. Toute dérive future doit passer par ce cadre, ou être explicitement reconnue comme déviation.
