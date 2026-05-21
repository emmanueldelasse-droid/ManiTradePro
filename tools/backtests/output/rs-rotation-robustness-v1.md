# RS Rotation Robustness Hardening v1 — ManiTradePro

> Généré le 2026-05-21T13:34:41.300Z par `tools/backtests/rs-rotation-robustness-v1.mjs`.

**⚠ Analyse strictement offline.** Aucun ordre, aucun broker, aucun endpoint live. Aucun fichier runtime modifié. Modèle d'exécution réaliste (NEXT_OPEN + friction obligatoire). Paramètres gelés ex-ante (aucune ré-optimisation entre les splits).

**Statut maximal proposable par ce script** : `CONDITIONAL_EDGE`. Les statuts `VALIDATED_RESEARCH_CORE` et `LIVE_READY` sont **interdits** ici (cf. `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 5 — nécessite shadow live + paper live prolongé).

## 1. Objectif

RS Rotation est actuellement classé `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED` dans `docs/quant/SETUPS_REGISTRY.md` (Setup 3) : exécution propre (PR #208 CLEAN, inflation PF ×1.01) mais 0 cellule ROBUST/STABLE en rolling walk-forward.

Ce script durcit l'évaluation avec :

1. baseline frictionné explicite ;
2. décomposition par régime macro ;
3. walk-forward STRICT train/test 3 splits ;
4. analyse concentration top 5 contributeurs ;
5. analyse drawdown explicite ;
6. verdict conservateur dans le vocabulaire Freeze v1.

Complémentaire de `rs-rotation-robustness-lab-v1.mjs` qui couvre la breadth (sweeps univariés).

## 2. Méthodologie

**Baseline gelée** (identique à `rs-rotation-robustness-lab-v1.mjs § BASELINE` et alignée sur la variante `rs_90d_top10_hold20` de `backtest-relative-strength-rotation-v1.mjs`) :

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

**Modèle d'exécution** :

- entry = open[i+1] (jamais close[i], jamais ema[i])
- exit = open[i+1+horizon] (jamais close[i])
- momentum = (close[i] - close[i-lookback]) / close[i-lookback] (causal)
- régime = SPY/QQQ/SMH > EMA200[i] (causal, EMA récurrente)

**Friction** (formule canonique projet, source : `rs-rotation-robustness-lab-v1.mjs § Friction model`) :

```
frictionR = (0.30 + 0.02 × holdDays) / 5

Avec :
  spread one-way    = 0.05 %
  slippage one-way  = 0.05 %
  commission o/way  = 0.05 %
  round-trip total  = 0.30 %
  overnight gap pen = 0.02 % / jour
  conversion        = 5 % = 1R
```

Pour le baseline horizon=20 : friction par trade = (0.30 + 0.02 × 20) / 5 = **0.14 R**.

## 3. Univers

- Univers : **mixed** (tous les groupes UNIVERSE flat de `universe-v2.mjs`).
- Symboles avec OHLC chargés : **169** sur 191 demandés.
- Période : 2021-2025 (5 ans).
- Limitation : Univers ex-post (survivants 2021-2025). Pas de delistés. Limitation documentée — cf. RESEARCH_FRAMEWORK_FREEZE_V1.md § 10.

## 4. Baseline (régime NO_RISK_OFF, friction appliquée)

| Métrique | Valeur |
|---|---:|
| Trades | 930 |
| Wins | 506 |
| Losses | 424 |
| Winrate | 54.41 % |
| Expectancy (R) | 0.7410 |
| Profit factor (frictionné) | **1.53** |
| Total R | 689.10 |
| Max drawdown (R) | 222.82 |
| Longest loss streak | 19 |

PF par année :

| Année | Trades | PF | Total R |
|---|---:|---:|---:|
| 2021 | 170 | 1.53 | 143.94 |
| 2022 | 60 | 0.15 | -91.24 |
| 2023 | 250 | 2.05 | 280.96 |
| 2024 | 250 | 1.68 | 239.87 |
| 2025 | 200 | 1.39 | 115.57 |

## 5. Analyse par régime

| Régime | Trades | Winrate | Expectancy R | PF | Total R | Max DD |
|---|---:|---:|---:|---:|---:|---:|
| ALL_REGIMES | 1097 | 52.78 % | 0.5927 | 1.42 | 650.21 | 305.38 |
| NO_RISK_OFF | 930 | 54.41 % | 0.7410 | 1.53 | 689.10 | 222.82 |
| RANGE_ONLY | 290 | 59.66 % | 0.7813 | 1.71 | 226.57 | 81.91 |
| RISK_ON_ONLY | 530 | 47.92 % | 0.4638 | 1.28 | 245.79 | 222.46 |

PF par année et par régime :

| Régime | 2021 | 2022 | 2023 | 2024 | 2025 |
|---|---:|---:|---:|---:|---:|
| ALL_REGIMES | 1.53 | 0.56 | 2.05 | 1.68 | 1.37 |
| NO_RISK_OFF | 1.53 | 0.15 | 2.05 | 1.68 | 1.39 |
| RANGE_ONLY | n/a | 0.27 | 2.55 | 999.00 | 0.42 |
| RISK_ON_ONLY | 0.58 | 0.04 | 0.90 | 1.62 | 1.76 |

## 6. Walk-forward STRICT (3 splits, paramètres gelés)

Méthode : 3 splits stricts paramètres gelés (cf. RESEARCH_FRAMEWORK_FREEZE_V1.md § 3.5).

Seuil **passLive** = PF test ≥ 1.0 ET trades test ≥ 10.

Seuil **passRobust** = PF test ≥ 1.3 ET trades test ≥ 20.

| Split | Train years | Test years | Train trades | Train PF | Test trades | Test PF | Test totalR | Pass live | Pass robust |
|---|---|---|---:|---:|---:|---:|---:|---|---|
| S1 | 2021-2022 | 2023 | 230 | 1.14 | 250 | **2.05** | 280.96 | ✓ | ✓ |
| S2 | 2021-2022-2023 | 2024 | 480 | 1.52 | 250 | **1.68** | 239.87 | ✓ | ✓ |
| S3 | 2021-2022-2023-2024 | 2025 | 730 | 1.57 | 200 | **1.39** | 115.57 | ✓ | ✓ |

**Splits passant live (PF ≥ 1.0)** : 3 / 3 — seuil Freeze § 3.5 = ≥ 2/3.

**Splits passant robust (PF ≥ 1.3)** : 3 / 3 — seuil promotion Freeze § 4.

## 7. Analyse concentration (top 5 contributeurs)

- Symboles ayant tradé : **97**
- Symboles avec contribution positive : **59**
- Somme positive (R) : **926.48**
- Top 5 somme positive (R) : **451.25**
- **Top 5 share** (% du PnL positif) : **48.71 %**
- Top 5 share (% du |R| total) : 38.77 %
- Single max share (% du PnL positif) : 11.61 %
- **PF sans top 5** : **1.22**
- Total R sans top 5 : 237.85 (sur 759 trades)

Top 5 contributeurs positifs :

| Rang | Symbole | Trades | Total R | Share % du PnL positif |
|---:|---|---:|---:|---:|
| 1 | SOL | 29 | 107.61 | 11.61 % |
| 2 | APLD | 49 | 94.18 | 10.17 % |
| 3 | AVAX | 21 | 90.95 | 9.82 % |
| 4 | APP | 41 | 86.69 | 9.36 % |
| 5 | PLTR | 31 | 71.82 | 7.75 % |

**Lecture** : un top 5 share > **60 %** est le seuil dur du Freeze § 4 (critère G "concentration"). Un PF sans top 5 < 1.05 signifie que l'edge dépend entièrement de 5 tickers — c'est exactement le piège qui a fait dégrader SECTOR_RS v1 en `FRAGILE / CONCENTRATION_EXCESSIVE` lors de la PR truth-sync #233.

## 8. Analyse drawdown

- Max drawdown : **222.82 R**
- Longest loss streak : **19** trades consécutifs perdants
- Worst drawdown magnitude : 222.82 R sur 106 trades
- Worst drawdown période : 2021-11-03 → 2022-12-14

- **Pire année** : 2022 (PF 0.15, 60 trades, total R -91.24)
- **Pire split test** : S3 (PF test 1.39, 200 trades)

## 9. Verdict conservateur

**Statut recommandé : `KEEP_RESEARCH_CANDIDATE`**

Raisons :

- Pire année (2022) PF = 0.146 < 0.9 → robustesse bear/transitions insuffisante. Promotion CONDITIONAL_EDGE bloquée tant que stress tests friction ×2/×3 + analyse transitions régime + rolling walk-forward glissant n'ont pas été exécutés.

Vocabulaire : Freeze v1 + truth-sync 2026-05-19. Interdit ici : VALIDATED_RESEARCH_CORE, LIVE_READY.

Note : Statut proposé par ce script. La promotion finale reste subordonnée à validation ChatGPT (gouvernance projet).

**Statuts possibles en sortie de ce script** :

- `KEEP_RESEARCH_CANDIDATE` — robustesse temporelle non encore prouvée, statu quo.
- `CONDITIONAL_EDGE` — passe les critères de base mais 1-2 caveats résiduels.
- `FRAGILE / CONCENTRATION_EXCESSIVE` — top 5 share > 70 % OU PF sans top 5 < 1.05.
- `DEAD_AGGREGATED` — PF baseline frictionné < 1.20, edge insuffisant.
- `NEEDS_MORE_DATA` — sample insuffisant pour conclure.

**Statuts interdits en sortie de ce script** (gouvernance Freeze v1 § 5) :

- `VALIDATED_RESEARCH_CORE` — nécessite validation ChatGPT séparée + 10/10 critères Freeze § 4 + audit anti-look-ahead spécifique.
- `LIVE_READY` — nécessite shadow live + paper live prolongé + slippage réel + kill-switch + portfolio management.

## 9bis. Why this is NOT yet `CONDITIONAL_EDGE`

Bien que RS Rotation montre des **améliorations de robustesse fortes** (walk-forward 3/3 PASS robust, concentration acceptable, edge diversifiable), le statut reste conservativement à `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED`. Raisons explicites :

1. **Pire année 2022 PF = 0.14** (59 trades, totalR -92.97 R sur la baseline NO_RISK_OFF). Le filtre régime NO_RISK_OFF n'a pas immunisé le setup contre le bear 2022 — il l'a juste atténué. Les transitions rapides de régime peuvent encore frapper en cours de hold (`horizon = 20` jours, le régime peut basculer en cours de trade).

2. **Max drawdown 226.21 R** (~33 % du Total R baseline). Drawdown réel mesuré sur l'historique. Indique une volatilité de l'equity curve très significative — exige un capital tampon majeur en condition réelle, pas modélisé ici.

3. **Longest loss streak = 19 trades consécutifs perdants**. Sans sizing dynamique, ce streak en condition live induit une pression psychologique et un drawdown intra-période qui peut sortir le système de son régime statistique attendu.

4. **Survivorship bias non quantifié**. L'univers `universe-v2.mjs` contient les survivants 2021-2025. Aucun delisté, aucune fusion défavorable, aucun ticker en faillite. La performance future sur un univers point-in-time réel sera probablement < à l'historique mesuré ici.

5. **Friction simplifiée uniforme**. Modèle 0.30 % round-trip + 0.02 %/j identique pour ETF SPY, crypto MSTR, leveraged SOXL. Les frictions réelles divergent fortement par classe d'actif — le PF 1.53 peut chuter sensiblement avec friction calibrée par actif (cf. `tools/backtests/friction-model-v1.mjs` heuristique v1).

6. **Stress tests friction ×2 et ×3 non exécutés**. Le seuil Freeze § 4 critère I2 demande PF ≥ 1.1 à friction ×2, et critère I3 demande PF ≥ 1.0 souhaité à friction ×3. Tant que ces tests n'ont pas tourné, le PF post-friction peut être surévalué.

7. **Audit anti-look-ahead spécifique non exécuté** sur l'agrégation RS Rotation. La PR #208 a audité le mécanisme RS simple (CLEAN ×1.01 d'inflation) mais l'agrégation actuelle de ce script (NEXT_OPEN + momentum causal) n'a pas eu son audit symétrique formel.

8. **Pas d'analyse transitions régime**. Le bascule RISK_ON → RISK_OFF mid-hold (régime en jour i autorisé, régime en jour i+10 = RISK_OFF) n'est pas traité ici. Le filtre n'applique qu'à l'entrée, pas dynamiquement.

9. **Pas d'analyse de clusters de pertes**. Les 19 pertes consécutives sont-elles distribuées sur 2022 uniquement, ou clusterisées dans des sous-périodes spécifiques (bascules régime, news macro) ? Non analysé.

10. **Rolling walk-forward glissant non exécuté**. Les 3 splits sont calendaires (par années). Un rolling glissant (par exemple : train 24 mois → test 6 mois, pas de 3 mois) donnerait une mesure de stabilité plus continue.

11. **Pas de validation sur univers alternatif**. Tester l'edge sur un univers différent (par exemple uniquement ETF, uniquement Big Tech, ou un univers historique reconstruit) confirmerait que le mécanisme n'est pas dépendant d'un sous-set précis.

12. **Pas de test réduction hold en bear** ni de **volatility filter**. Une stratégie réellement antifragile devrait avoir un mécanisme de protection crash actif — pas seulement un filtre régime statique à l'entrée.

**Conséquence** : RS Rotation devient **le candidat de recherche le plus crédible du repo** à date, mais le statut effectif reste **`RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED`**. Cette PR est présentée comme **robustness improvement evidence**, pas comme une proposition de promotion. La promotion `CONDITIONAL_EDGE` est subordonnée à l'exécution des stress tests, transitions régime, et rolling walk-forward listés ci-dessus (à découper en PR séparées, `une PR = un objectif`).

## 10. Limites

- Univers ex-post (survivants 2021-2025). Pas de delistés.
- Friction simplifiée uniforme (pas de modulation par actif : crypto vs ETF vs leveraged).
- Pas de short-side (long-only).
- Pas de sizing dynamique (taille fixe = 1 unité par position, 5 % = 1R).
- Pas de modélisation des coûts de financement (overnight rates pour positions levered).
- Pas de comparaison multi-univers (réservé au lab existant `rs-rotation-robustness-lab-v1.mjs`).
- Walk-forward fixe sur années calendaires (pas de rolling glissant).
- Régimes calculés sur SPY+QQQ+SMH uniquement (pas de VIX, données non disponibles dans le repo).

## 11. Rollback

- Runtime : Aucun rollback nécessaire — aucun fichier runtime modifié.
- Documentation : Si verdict contesté, rollback documentaire = git revert de la PR sans impact moteur.
- Outputs : tools/backtests/output/rs-rotation-robustness-v1.json et .md sont produits à chaque exécution — supprimables sans impact.

## 12. Interdictions restantes (gouvernance)

- **Pas d'activation paper automatique** sur RS Rotation tant que le statut n'a pas reçu `GO MERGE` ChatGPT explicite + validation runtime séparée.
- **Pas d'activation live** — l'état actuel reste `0 setup LIVE_READY` au 2026-05-19 (cf. `SESSION.md`).
- **Pas de promotion `VALIDATED_RESEARCH_CORE`** depuis ce script — la promotion exige les 10 critères Freeze § 4 dont l'audit anti-look-ahead spécifique non encore exécuté sur l'agrégation RS.
- **Pas de modification runtime** (worker, front, providers, broker, paper trading). Cette PR est strictement documentaire / recherche offline.
- **Pas de cherry-picking** : l'analyse « sans top 5 » est une mesure de robustesse en aval, pas un changement d'univers à la sélection.

## 13. Sources

- `tools/backtests/backtest-relative-strength-rotation-v1.mjs (variante de référence rs_90d_top10_hold20)`
- `tools/backtests/rs-rotation-robustness-lab-v1.mjs (formule friction canonique, baseline)`
- `tools/backtests/universe-v2.mjs (univers ex-post 2021-2025)`
- `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md (§ 3.5 walk-forward, § 4 critères promotion)`
- `docs/research/ANTI_LOOKAHEAD_RULES.md (entry NEXT_OPEN, fenêtres causales)`
- `docs/quant/SETUPS_REGISTRY.md (Setup 3 — RS Rotation, statut courant RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED)`
- `data/*.json (OHLC 2021-2025)`

---

Hypothèses : friction round-trip 0.30 % + 0.02 % par jour, conversion 5 % = 1R, indicateurs causaux par construction, entry NEXT_OPEN exclusivement, exit fixed_hold horizon 20, paramètres baseline gelés ex-ante.
