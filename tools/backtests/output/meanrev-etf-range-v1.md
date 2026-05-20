# PR-R3B — Mean Reversion V1 ETF Range Short — test isolé

> Généré le 2026-05-20T16:36:55.242Z par `tools/backtests/meanrev-etf-range-v1.mjs`.

**⚠ Analyse strictement offline.** Aucun ordre, aucun broker. Aucun fichier runtime modifié. Paramètres GELÉS ex-ante. Aucune ré-optimisation. Test UNIQUE.

**Statuts autorisés en sortie** : `KEEP_RESEARCH_CANDIDATE`, `DEAD_AGGREGATED`, `DEAD / ABANDONED`, `NEEDS_MORE_DATA`. **Interdits** : `VALIDATED_RESEARCH_CORE`, `LIVE_READY`, `CONDITIONAL_EDGE`.

## 1. Hypothèse économique testée (gelée avant test)

> Les ETF larges et sectoriels possèdent encore des mécanismes de retour à la moyenne court terme grâce aux flux passifs, à l'arbitrage NAV, aux rebalancing institutionnels, et à la dilution idiosyncratique. Cet effet serait potentiellement exploitable UNIQUEMENT en marché RANGE, sur horizon court, avec excès temporaires, sans actifs momentum extrêmes.

## 2. Paramètres gelés

```json
{
  "universe": [
    "ETFs_US_INDEX",
    "ETFs_US_SECTORS"
  ],
  "rsiThreshold": 25,
  "distEmaFactor": 0.97,
  "entry": "NEXT_OPEN",
  "exit": "ema20_or_horizon",
  "horizonMaxDays": 10,
  "stopAtrMultiple": 1.5,
  "rsiPeriod": 14,
  "emaPeriod": 20,
  "atrPeriod": 14,
  "rangeSpyEma200BandPct": 0.05,
  "rangeSpyEma200SlopePct": 0.005,
  "rangeSlopeLookbackDays": 20
}
```

## 3. Univers

- Univers cible prévu (brief ChatGPT) : `ETFs_US_INDEX` + `ETFs_US_SECTORS` = **15 ETF** : SPY, QQQ, IWM, DIA, MDY, XLE, XLF, XLV, XLI, XLP, XLY, XLB, XLU, XLRE, XLC.
- Univers effectif (présents dans le dataset projet) : **4 ETF** : SPY, QQQ, IWM, MDY.
- **⚠ DATASET_GAP** : 11/15 ETF ABSENTS du dataset projet (`DIA, XLE, XLF, XLV, XLI, XLP, XLY, XLB, XLU, XLRE, XLC`). Ratio gap = 73 %.
- OHLC chargés (incluant SPY/QQQ/SMH pour régime) : 5.

**Finding structurel #1 — DATASET_GAP** : l'hypothèse économique V1 (cf. R3A) cible explicitement les ETF larges **et** sectoriels. Les ETF sectoriels (SPDR `XLE`/`XLF`/`XLV`/…) ne sont pas dans `data/*.json`. Le test ne couvre donc que les ETF d'indice large (SPY/QQQ/IWM/MDY). Les conclusions ci-dessous **ne peuvent pas** se généraliser à l'hypothèse V1 complète tant que ce gap dataset n'est pas comblé.

## 4. Définition opérationnelle du régime RANGE

- SPY |close - EMA200| / EMA200 < 5 % (proche EMA200)
- |slope EMA200 sur 20j| < 0.5 % (pente faible)
- NOT RISK_OFF (SPY+QQQ+SMH pas tous sous EMA200)

**Jours RANGE / total** : 139 / 1255 (**11.08 %**).

## 5. Modèle d'exécution

- entry = open[i+1] (never close[i] or intra-bar)
- stop computed from ATR[i] (causal)
- regime computed from EMA200[i] and slope over [i-20..i] (causal)
- RSI[i] causal (recursive smoothing on close[0..i])

- Entry : open[i+1] (NEXT_OPEN)
- Exit : first of: stop hit (low ≤ entry - 1.5*ATR), close ≥ ema20, horizon 10j (exit open[i+11])
- Friction formule : `frictionR = (0.30 + 0.02 × holdDays) / 5` × multiplier (5 % = 1R)
- Multipliers testés : ×1, ×2, ×3

## 5bis. Finding structurel #2 — FILTERS_TOO_STRICT_FOR_LARGE_ETF

**0 signal généré** sur 4 ETF × 139 jours RANGE = ~556 opportunités-jour théoriques.

Les paramètres gelés ex-ante (RSI(14) < 25 ET prix < EMA20 × 0.97) **ne se déclenchent quasiment jamais** sur les ETF larges US (SPY/QQQ/IWM/MDY) en régime RANGE. Raisons probables :

- RSI(14) < 25 sur un ETF d'indice large = excès statistique rare (≈ < 1 % des jours, et concentré en bear violent — pas en RANGE).
- Distance EMA20 < -3 % sur indice large = mouvement amplitude rare (les indices sont par construction moins volatils que les single names).
- La conjonction des deux + filtre RANGE = quasi-impossible.

**Conséquence méthodologique** : l'opérationnalisation V1 du diagnostic R3A (paramètres calibrés implicitement pour des ETF sectoriels ou des leaders volatils) **n'est pas adaptée** aux ETF d'indice large. Soit (a) il faut tester sur les ETF sectoriels (absents du dataset — cf. finding #1), soit (b) il faut reformuler V1 avec des paramètres explicitement calibrés pour les ETF d'indice large (RSI < 30 + distEMA20 < -1 %, par exemple — **mais cela nécessite une nouvelle PR-R3A bis avec hypothèse économique distincte**, pas une modification post-hoc des paramètres de V1).

**Pour respecter la règle anti-overfit** : aucune modification des paramètres V1 dans cette PR. Le résultat 0-signal est consigné honnêtement comme **information utile**, pas comme échec à corriger.

## 6. Baseline F×1 (friction baseline projet)

| Métrique | Valeur |
|---|---:|
| Signaux générés (avant friction) | 0 |
| Trades (= signaux, exit géré) | 0 |
| Wins / Losses | 0 / 0 |
| Winrate | 0.00 % |
| Expectancy R | 0.0000 |
| **Profit factor (frictionné F×1)** | **0.00** |
| Total R | 0.00 |
| Max drawdown R | 0.00 |
| Longest loss streak | 0 |

PF par année :

| Année | Trades | PF | Total R |
|---|---:|---:|---:|
| 2021 | _aucun trade_ | n/a | n/a |
| 2022 | _aucun trade_ | n/a | n/a |
| 2023 | _aucun trade_ | n/a | n/a |
| 2024 | _aucun trade_ | n/a | n/a |
| 2025 | _aucun trade_ | n/a | n/a |

## 7. Walk-forward STRICT (3 splits, paramètres gelés)

| Split | Train years | Test years | Train trades | Train PF | Test trades | Test PF | Test totalR | Pass live (≥1.0) | Pass robust (≥1.20) |
|---|---|---|---:|---:|---:|---:|---:|---|---|
| S1 | 2021-2022 | 2023 | 0 | 0.00 | 0 | **0.00** | 0.00 | ✗ | ✗ |
| S2 | 2021-2022-2023 | 2024 | 0 | 0.00 | 0 | **0.00** | 0.00 | ✗ | ✗ |
| S3 | 2021-2022-2023-2024 | 2025 | 0 | 0.00 | 0 | **0.00** | 0.00 | ✗ | ✗ |

**Splits PASS live** : 0 / 3.

**Splits PASS robust** : 0 / 3.

## 8. Concentration top 5 contributeurs

- Symboles ayant tradé : **0**
- Symboles avec contribution positive : **undefined**
- Somme positive (R) : **n/a**
- **Top 5 share** (% du PnL positif) : **n/a %**
- Single max share : n/a %
- **PF sans top 5** : **n/a**
- Total R sans top 5 : n/a (sur undefined trades)

Top 5 contributeurs positifs :

| Rang | Symbole | Trades | Total R | Share % |
|---:|---|---:|---:|---:|

## 9. Drawdown deep-dive

- Max drawdown : **0.00 R**
- Longest loss streak : **0** trades consécutifs perdants
- Worst drawdown magnitude : 0.00 R sur 0 trades

**Clusters de pertes (≥ 5 trades consécutifs perdants)** : 0

## 10. Dépendance aux dates extrêmes

- **Sans top 3 dates gagnantes** : PF = **0.00**, Total R = 0.00 (sur 0 trades).
- Top 3 dates retirées : 
- **Sans top 5 dates gagnantes** : PF = **0.00**, Total R = 0.00 (sur 0 trades).

**Lecture** : si PF sans top 3 dates < 1.0, l'edge dépend de quelques événements (rebonds de crash, recovery exceptionnelle) — pas reproductible.

## 11. Transitions régime mid-hold

| Sous-groupe | Trades | Winrate | Expectancy R | PF | Total R |
|---|---:|---:|---:|---:|---:|
| Stable (régime entry == régime exit) | 0 | 0.00 % | 0.0000 | 0.00 | 0.00 |
| Transition (régime change mid-hold) | 0 | 0.00 % | 0.0000 | 0.00 | 0.00 |

**Lecture** : si la branche transition est très négative, le setup est fragile aux bascules régime mid-hold (limite du filtre statique à l'entrée).

## 12. Friction stress ×2 et ×3

| Friction | Trades | PF | Total R | Max DD | WF passLive | WF passRobust |
|---|---:|---:|---:|---:|---|---|
| ×1 (baseline) | 0 | 0.00 | 0.00 | 0.00 | 0/3 | 0/3 |
| ×2 | 0 | 0.00 | 0.00 | 0.00 | 0/3 | 0/3 |
| ×3 | 0 | 0.00 | 0.00 | 0.00 | 0/3 | 0/3 |

**Critères Freeze § 4** : friction ×2 PF ≥ 1.10 attendu, friction ×3 PF ≥ 1.0 souhaité.

## 13. Checklist PASS / FAIL

| Critère | Seuil | Valeur | Pass |
|---|---|---|---|
| Sample minimum | ≥ 30 trades | 0 | ✗ |
| PF baseline F×1 | ≥ 1.20 | 0.00 | ✗ |
| PF friction ×2 | ≥ 1.10 | 0.00 | ✗ |
| WF pass robust | ≥ 2/3 splits PF test ≥ 1.20 | 0/3 | ✗ |
| Top 5 share | < 70 % | n/a % | ✓ |
| PF sans top 5 | ≥ 1.05 | n/a | ✓ |
| 2022 PF | ≥ 0.5 | n/a | ✓ |
| Sans top 3 dates PF | ≥ 1.0 | 0.00 | ✗ |
| Max DD / Total R | ≤ 1.5 | n/a | ✓ |

## 14. Verdict

**Statut : `NEEDS_MORE_DATA`**

Raisons :

- DATASET_GAP : 11/15 ETF de l'univers cible absents du dataset projet (DIA, XLE, XLF, XLV, XLI, XLP, XLY, XLB, XLU, XLRE, XLC). L'univers effectif est limité à 4 ETF (SPY, QQQ, IWM, MDY).
- FILTERS_TOO_STRICT_FOR_LARGE_ETF : 0 signal généré sur 4 ETF × 139 jours RANGE = ~556 opportunités-jour. Les paramètres gelés (RSI(14) < 25 ET prix < EMA20 × 0.97) ne se déclenchent quasiment jamais sur les ETF larges US (SPY/QQQ/IWM/MDY) en régime RANGE. Conclusion structurelle : l'opérationnalisation V1 proposée dans le diagnostic R3A n'est pas testable sur l'univers disponible.
- Sample insuffisant : 0 trades. RANGE strict + univers ETF + signal RSI<25 produit trop peu de signaux pour conclure quantitativement.

Note : Le statut effectif Setup 4 Mean Reversion dans SETUPS_REGISTRY.md reste inchangé tant que GO MERGE ChatGPT explicite n'est pas reçu.

Vocabulaire : Statuts autorisés ici : KEEP_RESEARCH_CANDIDATE, DEAD_AGGREGATED, DEAD / ABANDONED, NEEDS_MORE_DATA. Interdits : VALIDATED_RESEARCH_CORE, LIVE_READY, CONDITIONAL_EDGE (réservé à une PR ultérieure, jamais auto-appliqué).

### Lecture honnête du verdict

Cette PR n'a pas cherché à sauver Mean Reversion ; elle a testé une hypothèse économique précise avec paramètres gelés. Le résultat est **NEEDS_MORE_DATA** pour deux raisons structurelles distinctes :

1. **Dataset incomplet** : les ETF sectoriels (XLE, XLF, etc.) qui constituent une partie significative de l'hypothèse V1 ne sont pas dans `data/`. Sans eux, on ne peut conclure que sur les ETF d'indice large.
2. **Filtres inadaptés aux ETF d'indice large** : les paramètres RSI < 25 + distEMA20 < -3 % sont trop extrêmes pour les indices US, qui sont par construction moins volatils que les single names. Sur 5 ans × 4 ETF × 139 jours RANGE, 0 signal — le filtre ne capte aucun excès.

**Implication produit** : Mean Reversion V1 dans sa forme actuelle n'est **pas opérationnellement testable** sur l'univers ManiTradePro disponible. Les options réalistes pour ChatGPT :

- **(A) Sourcer les OHLC ETF sectoriels** (XLE, XLF, XLV, XLI, XLP, XLY, XLB, XLU, XLRE, XLC) puis relancer PR-R3B sur l'univers complet 15 ETF avec les **mêmes paramètres gelés** — c'est la voie la plus saine méthodologiquement.
- **(B) Accepter que V1 est non-testable sur le dataset actuel** et la classer `DATA_INSUFFICIENT` dans `SETUPS_REGISTRY.md` (statut Freeze § 8). Le setup officiel Mean Reversion resterait `EXPERIMENTAL_ONLY / FRICTION_REQUIRED`, V1 marquée comme bloquée par dataset.
- **(C) Reformuler une nouvelle hypothèse V1bis** dans une PR-R3A bis (pas dans cette PR) avec paramètres calibrés ex-ante pour ETF d'indice large (par exemple RSI < 30 + distEMA20 < -1.5 %) — **interdiction de modifier les paramètres de V1 ici**, ce serait du tuning post-hoc.

Issue **DEAD / ABANDONED** **non recommandée** à ce stade : on ne peut pas dire que V1 est mort si on ne l'a jamais réellement testé. L'issue saine est `NEEDS_MORE_DATA` + décision politique sourcing dataset (A) ou reformulation hypothèse (C).

## 15. Limites

- Univers ex-post (survivants 2021-2025). Pas de delistés.
- Friction simplifiée uniforme (pas de modulation par classe d'actif ETF index vs ETF sectoriel).
- Long-only (pas de short-side).
- Pas de sizing dynamique (taille fixe = 1 unité, 5 % = 1R).
- Régime RANGE = SPY proche EMA200 + pente faible. Définition opérationnelle, pas seul standard possible.
- Walk-forward sur années calendaires (pas de rolling glissant).
- Pas de VIX intégré.
- Exit `close ≥ ema20` peut sortir trop tôt après un rebond intra-day vers ema20 — convention conservatrice retenue.

## 16. Rollback

- Runtime : Aucun. Aucun fichier runtime modifié.
- Documentation : git revert de la PR — aucun impact moteur.
- Outputs : Reproductibles à chaque exécution du script — supprimables sans impact.

## 17. Anti-overfit — vérifications honnêteté

- ✅ Paramètres figés ex-ante (cf. § 2). Aucune modification post-résultat.
- ✅ Aucune variante cachée. Une seule version testée.
- ✅ Aucun cherry-picking de période. Toutes les années 2021-2025 incluses.
- ✅ Aucun cherry-picking d'ETF. Univers gelé `ETFs_US_INDEX + ETFs_US_SECTORS`.
- ✅ Friction obligatoire dès baseline + stress ×2 et ×3.
- ✅ Walk-forward strict 3 splits paramètres gelés.
- ✅ Concentration analyse explicite (top 5, single max, PF sans top 5).
- ✅ Drawdown deep-dive + clusters de pertes + transitions régime.
- ✅ Dépendance dates extrêmes mesurée (sans top 3 / top 5 dates).
- ✅ Max 4 filtres simultanés (régime RANGE, RSI < 25, dist EMA20 × 0.97, stop ATR × 1.5). Garde-fou TRADING_PHILOSOPHY § 1 respecté.

## 18. Sources

- `docs/research/MEAN_REVERSION_DIAGNOSTIC_R3A.md (hypothèse économique V1, paramètres gelés)`
- `tools/backtests/rs-rotation-robustness-v1.mjs (modèle méthodologique walk-forward + friction + concentration)`
- `tools/backtests/backtest-meanrev-v1.mjs (référence historique — variantes RSI 25/30/35 déjà testées)`
- `tools/backtests/universe-v2.mjs (univers ETF source)`
- `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md § 3.5 walk-forward, § 4 critères, § 6.3 interdictions`
- `docs/project/TRADING_PHILOSOPHY.md § 4.4 Mean Reversion comme axe secondaire`
- `Directives ChatGPT 2026-05-19 (PR-R3B mission, méthodologie obligatoire, critères PASS/FAIL).`

---

Hypothèses : friction round-trip 0.30 % + 0.02 %/j, conversion 5 % = 1R, indicateurs causaux par construction, entry NEXT_OPEN exclusivement, paramètres baseline gelés ex-ante.