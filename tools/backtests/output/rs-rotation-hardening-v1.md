# RS Rotation Hardening Phase 1 — stress tests + regime validation

> Généré le 2026-05-21T13:34:42.052Z par `tools/backtests/rs-rotation-hardening-v1.mjs`.

**⚠ Analyse strictement offline.** Aucun ordre, aucun broker. Aucun fichier runtime modifié. Paramètres BASELINE GELÉS ex-ante (identiques `rs-rotation-robustness-v1.mjs`). Aucune optimisation post-hoc.

**Statuts autorisés en sortie** : `HARDENED_ROBUST_CANDIDATE`, `HARDENED_MARGINAL`, `HARDENED_FRAGILE`, `STRUCTURALLY_WEAK_HARDENED_DEAD`. **Interdits** : `VALIDATED_RESEARCH_CORE`, `LIVE_READY`, `CONDITIONAL_EDGE`. Le statut officiel RS Rotation dans `SETUPS_REGISTRY.md` reste `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED` tant que `GO MERGE` ChatGPT non reçu sur PR de promotion dédiée.

## 1. Objectif

Mesurer ce qui survit réellement sur RS Rotation sous 8 stress tests structurels (A.1-A.8) + matrice par régime 4 états officiels v1 (RISK_ON, RANGE, RISK_OFF, HIGH_VOL). Pas "trouver un edge". Pas "améliorer le PF". Découvrir où le setup casse.

Complémentaire de `rs-rotation-robustness-lab-v1.mjs` (breadth via 6 sweeps univariés) et `rs-rotation-robustness-v1.mjs` (depth via walk-forward strict + concentration + drawdown). Ce script ajoute la couverture systématique des stress + régimes.

## 2. Baseline (gelée)

```json
{
  "lookback": 90,
  "horizon": 20,
  "topN": 10,
  "rebalance": 10,
  "minMomentum": 12,
  "exit": "fixed_hold",
  "regime": "NO_RISK_OFF",
  "universe": "mixed"
}
```

Univers de trading effectif : **169** symboles. Dates communes : 1255.

Gross trades baseline (avant coûts) : **930**.

## 3. Distribution régime 4-état officiels v1

| Régime | Jours | % |
|---|---:|---:|
| RISK_ON | 566 | 53.60 % |
| RANGE | 243 | 23.00 % |
| RISK_OFF | 111 | 10.50 % |
| HIGH_VOL | 135 | 12.80 % |

HIGH_VOL = realized vol SPY 20j > 25 % annualisée (prend priorité sur RISK_ON/RANGE/RISK_OFF quand déclenché).

## 4. Stress A.1 — Friction ×1 / ×2 / ×3

| Multiplier | Trades | PF | Expectancy R | Total R | Max DD | Verdict |
|---|---:|---:|---:|---:|---:|---|
| x1 | 930 | **1.53** | 0.7410 | 689.10 | 222.82 | SURVIVES |
| x2 | 930 | **1.41** | 0.6010 | 558.90 | 237.66 | SURVIVES |
| x3 | 930 | **1.30** | 0.4610 | 428.70 | 254.34 | SURVIVES |

Seuils Freeze § 4 : friction ×2 PF ≥ 1.10 (I2), ×3 PF ≥ 1.00 (I3 souhaité).

## 5. Stress A.2 — Slippage one-way

| Slippage one-way | Trades | PF | Total R | Verdict |
|---|---:|---:|---:|---|
| 0.00% | 930 | **1.53** | 689.10 | SURVIVES |
| 0.05% | 930 | **1.51** | 670.50 | SURVIVES |
| 0.10% | 930 | **1.50** | 651.90 | SURVIVES |
| 0.20% | 930 | **1.46** | 614.70 | SURVIVES |

Modèle : slippage symétrique entry+exit (round-trip = 2 × one-way). Pas modulé par classe d'actif.

## 6. Stress A.3 — Délais d'exécution (NEXT_OPEN + N jours)

| Délai | Trades | PF | Total R | Verdict |
|---|---:|---:|---:|---|
| +0d | 930 | **1.53** | 689.10 | SURVIVES |
| +1d | 930 | **1.54** | 680.95 | SURVIVES |
| +2d | 920 | **1.49** | 626.38 | SURVIVES |
| +5d | 920 | **1.42** | 540.27 | SURVIVES |

Proxy : entry reportée de N jours bourse. Mesure la sensibilité du setup au timing d'exécution.

## 7. Stress A.4 — Suppression top performers

| Stress | Trades | PF | Total R | Verdict |
|---|---:|---:|---:|---|
| base | 930 | **1.53** | 689.10 | SURVIVES |
| noTop5Symbols | 759 | **1.22** | 237.85 | SURVIVES |
| noTop10Symbols | 619 | **1.08** | 64.73 | MARGINAL |
| noTop3Dates | 900 | **1.43** | 551.21 | SURVIVES |
| noTop5AndTop3Dates | 738 | **1.15** | 157.91 | MARGINAL |

Top 5 symboles retirés : SOL, APLD, AVAX, APP, PLTR.

Top 10 symboles retirés : SOL, APLD, AVAX, APP, PLTR, AEHR, UPST, SMCI, MSTR, BBAI.

Top 3 dates retirées : `2025-01-10`, `2023-05-09`, `2024-11-25`.

## 8. Stress A.5 — Stress sectoriel (sans secteur dominant)

Secteur dominant identifié : **AI_MOMENTUM**.

Ranking des secteurs par Total R :

| Rang | Groupe | Trades | Total R |
|---:|---|---:|---:|
| 1 | AI_MOMENTUM | 251 | 405.61 |
| 2 | CRYPTO | 138 | 257.43 |
| 3 | CYBER_CLOUD | 93 | 43.78 |
| 4 | LEVERAGED | 56 | 21.90 |
| 5 | EUROPE | 13 | 8.53 |
| 6 | FINANCIALS | 4 | 3.56 |
| 7 | SEMIS | 156 | 3.52 |
| 8 | ETFs_US_SECTORS | 7 | 2.19 |
| 9 | QUALITY_DEFENSIVE | 19 | 1.41 |
| 10 | ETFs_COMMODITIES | 1 | -0.18 |

**Sans secteur dominant (AI_MOMENTUM)** : trades=679 winrate=54.05% PF=1.33 expR=0.4175 totalR=283.49 maxDD=180.58 streak=17 — Verdict SURVIVES.

## 9. Stress A.6 — Bear market (isolation 2022)

| Sous-période | Trades | PF | Total R | Max DD | Verdict |
|---|---:|---:|---:|---:|---|
| 2022 uniquement | 60 | **0.15** | -91.24 | 91.72 | KILLED |
| Excluant 2022 | 870 | **1.66** | 780.34 | 139.59 | SURVIVES |

## 10. Stress A.7 — Concentration sweep (topN = 5, 10, 20)

| topN | Trades | PF | Total R | Max DD | Verdict |
|---|---:|---:|---:|---:|---|
| 5 | 465 | **1.54** | 414.80 | 118.16 | SURVIVES |
| 10 | 930 | **1.53** | 689.10 | 222.82 | SURVIVES |
| 20 | 1818 | **1.36** | 788.20 | 355.38 | SURVIVES |

## 11. Stress A.8 — Volatility expansion (rvol SPY 20j > 25 %)

| Sous-groupe | Trades | PF | Total R | Verdict |
|---|---:|---:|---:|---|
| Signaux en HIGH_VOL | 10 | **5.64** | 11.94 | SURVIVES |
| Signaux en vol normale | 920 | **1.52** | 677.16 | SURVIVES |

## 12. B — Matrice par régime (4 régimes officiels v1)

| Régime | Trades | Winrate | PF | Expectancy R | Total R | Max DD | Verdict |
|---|---:|---:|---:|---:|---:|---:|---|
| RISK_ON | 530 | 47.92 % | **1.28** | 0.4638 | 245.79 | 222.46 | SURVIVES |
| RANGE | 390 | 62.56 % | **2.04** | 1.1061 | 431.37 | 81.91 | SURVIVES |
| RISK_OFF | 0 | 0.00 % | **0.00** | 0.0000 | 0.00 | 0.00 | KILLED |
| HIGH_VOL | 10 | 80.00 % | **5.64** | 1.1935 | 11.94 | 2.39 | SURVIVES |

**Lecture régime** :
- `RISK_ON` : marché clairement haussier (SPY/QQQ/SMH > EMA200).
- `RANGE` : marché mixte / latéral.
- `RISK_OFF` : marché bear (SPY/QQQ/SMH < EMA200). **Notez** : baseline filtre `NO_RISK_OFF` donc cette ligne devrait être vide ou minimale — c'est normal.
- `HIGH_VOL` : realized vol SPY > 25 % annualisée. Prend priorité sur les 3 autres états quand déclenchée.

## 13. Survival map

| Stress | PF | Verdict |
|---|---:|---|
| baseline_F1 | 1.53 | SURVIVES |
| friction_x2 | 1.41 | SURVIVES |
| friction_x3 | 1.30 | SURVIVES |
| slippage_0_05 | 1.51 | SURVIVES |
| slippage_0_10 | 1.50 | SURVIVES |
| slippage_0_20 | 1.46 | SURVIVES |
| delay_1d | 1.54 | SURVIVES |
| delay_2d | 1.49 | SURVIVES |
| delay_5d | 1.42 | SURVIVES |
| noTop5Symbols | 1.22 | SURVIVES |
| noTop10Symbols | 1.08 | MARGINAL |
| noTop3Dates | 1.43 | SURVIVES |
| noTop5AndTop3Dates | 1.15 | MARGINAL |
| withoutDominantSector | 1.33 | SURVIVES |
| year2022_only | 0.15 | KILLED |
| excludingYear2022 | 1.66 | SURVIVES |
| topN_5 | 1.54 | SURVIVES |
| topN_10 | 1.53 | SURVIVES |
| topN_20 | 1.36 | SURVIVES |
| highVol_only | 5.64 | SURVIVES |
| normalVol_only | 1.52 | SURVIVES |
| regime_RISK_ON | 1.28 | SURVIVES |
| regime_RANGE | 2.04 | SURVIVES |
| regime_RISK_OFF | 0.00 | KILLED |
| regime_HIGH_VOL | 5.64 | SURVIVES |

Total : 21 SURVIVES / 2 MARGINAL / 2 KILLED (8 % killed).

## 14. Verdict global

**Statut : `HARDENED_FRAGILE`**

Raisons :

- PF 2022 = 0.146 < 0.5 → survivance bear catastrophique.
- Stress tests : 21 survives / 2 marginal / 2 killed (8.0 % killed).

**Vocabulaire** : Aucune promotion de statut depuis ce script. Statut Setup 3 (RS Rotation) reste RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED tant que GO MERGE ChatGPT non reçu sur PR dédiée.

Statuts possibles en sortie de ce script :

- `HARDENED_ROBUST_CANDIDATE` — tous critères durs passent (F×2 ≥ 1.10, F×3 ≥ 1.00, sans top 5 ≥ 1.05, 2022 ≥ 0.5).
- `HARDENED_MARGINAL` — quelques critères passent, mais pas tous.
- `HARDENED_FRAGILE` — critère structurel critique fail (sans top 5 < 1.05 OU 2022 < 0.5 OU HIGH_VOL < 1.0 OU > 30 % des stress KILLED).
- `STRUCTURALLY_WEAK_HARDENED_DEAD` — baseline F×1 < 1.20 OU F×2 < 1.0 (edge mort sous friction réaliste).

**Aucun de ces statuts n'est une promotion officielle.** Toute promotion vers `CONDITIONAL_EDGE` ou `VALIDATED_RESEARCH_CORE` reste subordonnée aux 10 critères Freeze § 4 + validation ChatGPT explicite sur PR séparée.

## 15. Limites

- Univers ex-post 2021-2025 (survivants).
- Slippage proxy uniforme (pas modulé par classe d'actif).
- Délai d'exécution proxy (entry NEXT_OPEN + N jours, pas modélisation broker fine).
- Régime HIGH_VOL = realized vol SPY 20j > 25 % annualisée (définition opérationnelle, pas standard universel).
- Sector group = première occurrence dans UNIVERSE (un symbole appartient à un seul group, ce qui est imparfait pour les actifs cross-thématiques).
- Pas de modélisation des taux de financement (overnight) ni des coûts de borrow short (non applicable car long-only).
- Walk-forward strict 3-splits déjà couvert par rs-rotation-robustness-v1.mjs — pas redoublé ici pour éviter la duplication. Cf. PR #234 commit 1641abf.

## 16. Rollback

- Runtime : Aucun — aucun fichier runtime modifié.
- Documentation : git revert de la PR — aucun impact moteur.
- Outputs : Reproductibles à chaque exécution du script — supprimables sans impact.

## 17. Anti-overfit — checklist d'honnêteté

- ✅ Paramètres baseline figés ex-ante (identiques `rs-rotation-robustness-v1.mjs`). Aucune modification.
- ✅ Aucune variante optimisée pour faire passer un stress.
- ✅ Aucun cherry-picking de période, d'univers, d'actif, ou de date.
- ✅ Slippage et délai = stress symétriques (positifs et négatifs autorisés).
- ✅ Tous les stress mesurent des dégradations, jamais des améliorations.
- ✅ Vocabulaire de sortie ne permet pas de promotion (`CONDITIONAL_EDGE` interdit).
- ✅ Si un edge disparaît sous friction réaliste, le verdict descend automatiquement (`STRUCTURALLY_WEAK_HARDENED_DEAD`).

## 18. Sources

- `tools/backtests/rs-rotation-robustness-v1.mjs (baseline gelée, méthodologie héritée)`
- `tools/backtests/rs-rotation-robustness-lab-v1.mjs (breadth via sweeps)`
- `tools/backtests/universe-v2.mjs (univers source)`
- `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md (critères § 4 friction ×2/×3, concentration, survivance bear)`
- `docs/project/TRADING_PHILOSOPHY.md (architecture 5 couches, garde-fou anti-empilement filtres, refus microstructure)`
- `docs/quant/SETUPS_REGISTRY.md Setup 3 (statut courant + 10 items items requis avant CONDITIONAL_EDGE)`
- `Brief créateur 2026-05-19 « PHASE QUANT HARDENING V1 »`

---

Hypothèses : friction round-trip 0.30 % + 0.02 %/j, conversion 5 % = 1R, indicateurs causaux par construction, entry NEXT_OPEN exclusivement (sauf stress A.3 délai +N), paramètres baseline gelés ex-ante.