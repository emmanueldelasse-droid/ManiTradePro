# Setup Validation Checklist

> Checklist obligatoire pour toute PR proposant un nouveau setup ou la promotion d'un setup existant.
>
> Référence : `RESEARCH_FRAMEWORK_FREEZE_V1.md` (gel officiel).

---

## Comment utiliser cette checklist

Copier le bloc ci-dessous dans la description de la PR. Cocher chaque case avec la valeur mesurée. Les PR qui ne remplissent pas toutes les cases ne peuvent pas être mergées avec un statut `VALIDATED_RESEARCH_CORE`.

---

## Section A — Hypothèse

- [ ] **A1.** Hypothèse économique / structurelle documentée en 1 paragraphe.
- [ ] **A2.** Pourquoi cet edge existerait-il (causalité supposée).
- [ ] **A3.** Pourquoi cet edge persisterait-il (pas immédiatement arbitré).
- [ ] **A4.** Différence claire vs setups existants déjà validés.

---

## Section B — Données

- [ ] **B1.** Sources de données listées et accessibles depuis le repo.
- [ ] **B2.** Couverture univers documentée (% des symboles UNIVERSE testés).
- [ ] **B3.** Période couverte documentée (idéalement ≥ 5 ans).
- [ ] **B4.** Survivorship bias documenté (univers actuel vs delistés).
- [ ] **B5.** Données externes ingérées (s'il y en a) auditées pour look-ahead (cf. `ANTI_LOOKAHEAD_RULES.md` section 4).

---

## Section C — Exécution

- [ ] **C1.** Entry = `open[i+1]` (NEXT_OPEN) ou variante documentée et justifiée.
- [ ] **C2.** Stop / TP calculés sur fenêtres `[..., i-1]` excluant la bougie signal.
- [ ] **C3.** Aucun usage de prix intra-bar (high[i] / low[i]) comme prix d'entrée.
- [ ] **C4.** Friction appliquée dès le premier backtest (formule `(0.30 + 0.02 × holdDays) / 5`).
- [ ] **C5.** Régime macro filter testé (au minimum `NO_RISK_OFF`).

---

## Section D — Métriques

- [ ] **D1.** Trades sur 5 ans : ____ (≥ 100 requis)
- [ ] **D2.** Profit factor post-friction : ____ (≥ 1.3 requis)
- [ ] **D3.** Expectancy R : ____ (≥ 0 requis)
- [ ] **D4.** Max drawdown R : ____
- [ ] **D5.** Sharpe approximatif annualisé : ____
- [ ] **D6.** Winrate : ____
- [ ] **D7.** Turnover annuel : ____

---

## Section E — Stabilité temporelle

- [ ] **E1.** Années positives (PF ≥ 1.0) : ___/5 (≥ 4/5 requis)
- [ ] **E2.** PF 2021 : ____
- [ ] **E3.** PF 2022 (bear year) : ____ (≥ 0.9 requis)
- [ ] **E4.** PF 2023 : ____
- [ ] **E5.** PF 2024 : ____
- [ ] **E6.** PF 2025 : ____
- [ ] **E7.** Edge decay early/late : ×____ (< ×1.5 requis)

---

## Section F — Walk-forward

- [ ] **F1.** Splits réalisés : 3 splits stricts sans réoptimisation.
- [ ] **F2.** Split 1 (train 2021-2022 → test 2023) : PF ____ (PASS / FAIL)
- [ ] **F3.** Split 2 (train 2021-2023 → test 2024) : PF ____ (PASS / FAIL)
- [ ] **F4.** Split 3 (train 2021-2024 → test 2025) : PF ____ (PASS / FAIL)
- [ ] **F5.** Splits PASS : ___/3 (≥ 2/3 requis)

---

## Section G — Concentration

- [ ] **G1.** Top 5 tickers share du PnL : ____ % (< 60 % requis)
- [ ] **G2.** Top ticker single share : ____ % (< 25 % requis)
- [ ] **G3.** Liste des top 5 tickers : ____
- [ ] **G4.** Stress test "sans top 5" PF : ____
- [ ] **G5.** Stress test "sans secteur dominant" PF : ____

---

## Section H — Anti-look-ahead

- [ ] **H1.** Audit anti-look-ahead spécifique exécuté.
- [ ] **H2.** PF CURRENT (code source) : ____
- [ ] **H3.** PF NEXT_OPEN strict : ____
- [ ] **H4.** Inflation PF (CURRENT / NEXT_OPEN) : ×____ (< ×1.05 requis)
- [ ] **H5.** Aucune fenêtre incluant bougie signal dans stop/TP.
- [ ] **H6.** Indicateurs vérifiés causaux (EMA, RSI, ATR, etc.).
- [ ] **H7.** Si dataset externe (earnings, fundamentals) : timing publication vs signal documenté.

---

## Section I — Friction stress

- [ ] **I1.** Friction ×1 (baseline) PF : ____
- [ ] **I2.** Friction ×2 PF : ____ (≥ 1.1 requis)
- [ ] **I3.** Friction ×3 PF : ____ (≥ 1.0 souhaité)
- [ ] **I4.** Friction extrême (round 1.20 % + 0.10 %/j) PF : ____
- [ ] **I5.** Point de rupture identifié : ____

---

## Section J — Corrélation vs setups existants

- [ ] **J1.** Setups existants candidats à corrélation : RS Rotation, SECTOR_RS, Trend Pullback (selon ce qui est vivant).
- [ ] **J2.** Corrélation PnL mensuel : ____ (< 0.85 requis pour considérer comme distinct)
- [ ] **J3.** Symbol overlap : ____ %
- [ ] **J4.** Trade overlap exact : ____ %

---

## Section K — Classification proposée

Cocher exactement UNE case :

- [ ] **K1.** `VALIDATED_RESEARCH_CORE` (tous critères D-J remplis)
- [ ] **K2.** `CONDITIONAL_EDGE` (1-2 critères échouent mais setup intéressant)
- [ ] **K3.** `EXPERIMENTAL_ONLY` (edge marginal, hypothèse non confirmée)
- [ ] **K4.** `FRAGILE` (stabilité ou concentration problématique)
- [ ] **K5.** `DEAD` (PF < 1.0 ou setup structurellement défaillant)
- [ ] **K6.** `INVALID_BACKTEST` (look-ahead détecté)
- [ ] **K7.** `DATA_INSUFFICIENT` (pas testable faute de données)

---

## Section L — Gouvernance

- [ ] **L1.** Aucun moteur runtime modifié (Worker, frontend, providers, paper trading, broker, ordres).
- [ ] **L2.** Aucun setup `VALIDATED_RESEARCH_CORE` antérieur dégradé sans débat.
- [ ] **L3.** SESSION.md mis à jour avec section dédiée.
- [ ] **L4.** Si setup ajouté à SETUPS_REGISTRY.md : fiche complète avec statut et caveats.
- [ ] **L5.** Conformité avec `RESEARCH_FRAMEWORK_FREEZE_V1.md` confirmée.

---

## Section M — Interdictions respectées

- [ ] **M1.** Pas d'optimisation massive (> 50 combinaisons sans hypothèse).
- [ ] **M2.** Pas de cherry-picking de tickers ni de périodes.
- [ ] **M3.** Pas de suppression de losing years.
- [ ] **M4.** Pas de friction supprimée "pour voir".
- [ ] **M5.** Pas d'annonce LIVE_READY sans shadow live + paper trading.
- [ ] **M6.** Pas de marketing du PF (PF présenté avec contexte risques).

---

## Récapitulatif final

| Section | Cases cochées | Total |
|---|---|---|
| A. Hypothèse | / | 4 |
| B. Données | / | 5 |
| C. Exécution | / | 5 |
| D. Métriques | / | 7 |
| E. Stabilité | / | 7 |
| F. Walk-forward | / | 5 |
| G. Concentration | / | 5 |
| H. Anti-look-ahead | / | 7 |
| I. Friction | / | 5 |
| J. Corrélation | / | 4 |
| K. Classification | / | 1 |
| L. Gouvernance | / | 5 |
| M. Interdictions | / | 6 |

**Décision** :
- Si **toutes** sections sont 100 % cochées avec valeurs respectant les seuils → setup éligible à `VALIDATED_RESEARCH_CORE`.
- Si certaines sections échouent → setup classé selon section K (`CONDITIONAL_EDGE` / `FRAGILE` / etc.).
- Si section M (interdictions) non respectée → PR rejetée, à reformuler.

---

> **Cette checklist fait autorité.** Elle est la traduction concrète du gel `RESEARCH_FRAMEWORK_FREEZE_V1.md`. Toute déviation doit être explicite et justifiée.
