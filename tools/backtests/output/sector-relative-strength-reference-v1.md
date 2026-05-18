# SECTOR_RELATIVE_STRENGTH v1 — Reference output

> Snapshot pérenne des métriques de référence du setup SECTOR_RELATIVE_STRENGTH dans sa version v1.
>
> Issue de la PR #211 (new-setup-discovery-lab-v1). **Classification : VALIDATED_RESEARCH_CORE**.

## Identité

| Champ | Valeur |
|---|---|
| Setup ID | `SECTOR_RELATIVE_STRENGTH` |
| Version | v1 |
| Gelé le | 2026-05-18 |
| Config | `tools/backtests/configs/sector-relative-strength-v1.json` |
| Doc | `docs/setups/SECTOR_RELATIVE_STRENGTH.md` |
| Source lab | `tools/backtests/new-setup-discovery-lab-v1.mjs` (PR #211) |

## Paramètres officiels

```text
horizon              = 60 days
topSectors           = 1
topAssetsPerSector   = 5
rebalance            = 10 days
lookback             = 90 days
regime               = NO_RISK_OFF
execution            = NEXT_OPEN
exit                 = FIXED_HOLD
```

## Friction appliquée

```text
roundTripPct                    = 0.30 %
overnightGapPenaltyPctPerDay    = 0.02 %
conversionToR                   = 5 % = 1R
formula                         = frictionR = (0.30 + 0.02 × holdDays) / 5
frictionRForHorizon60           = 0.30 R
```

## Métriques de référence

| Métrique | Valeur |
|---|---:|
| Trades sur 5 ans (2021-2025) | 445 |
| Wins | 243 |
| Losses | 202 |
| Winrate | 54.61 % |
| Expectancy par trade | 2.30 R |
| **Profit factor (post-friction)** | **2.157** |
| Max drawdown | 192.98 R |
| Total R cumulé | 1 023.63 R |
| Sharpe approximatif annualisé | 1.64 |
| Turnover annuel | ~89 trades/an |

## PF annuel

| Année | PF |
|---|---:|
| 2021 | 1.87 |
| 2022 | 1.08 |
| 2023 | 1.86 |
| 2024 | 2.90 |
| 2025 | 2.09 |

**5/5 années positives.** 2022 (bear market) reste marginalement positive.

## Edge decay

| Période | PF |
|---|---:|
| 2021-2022 (early) | 1.75 |
| 2024-2025 (late) | 2.56 |
| **Decay ratio** | **×0.68** |

L'edge est meilleur récemment qu'au début de la période — pas de signe de dégradation, au contraire.

## Vérification des critères de validation

| Critère | Seuil | Mesuré | OK ? |
|---|---|---:|---|
| Profit factor post-friction | ≥ 1.3 | 2.157 | ✓ |
| Années positives | ≥ 4/5 | 5/5 | ✓ |
| Edge decay | < ×1.5 | ×0.68 | ✓ |
| Exécution NEXT_OPEN | obligatoire | appliqué | ✓ |
| Friction appliquée | dès le 1er test | round-trip 0.30 % + 0.02 %/j | ✓ |

**Tous les critères de la nouvelle règle de validation (cf. SETUPS_REGISTRY.md) sont remplis.**

## Configurations alternatives ROBUST_EDGE de la même famille

15 autres configurations SECTOR_RELATIVE_STRENGTH passent les critères ROBUST_EDGE dans la PR #211. Top 3 (hors config v1 officielle) :

| Rang | Paramètres | PF | Years+ | Decay |
|---:|---|---:|---:|---:|
| 2 | horizon 120 / topSec 1 / topAst 5 | 2.077 | 4/5 | 0.18 |
| 3 | horizon 120 / topSec 1 / topAst 10 | 1.998 | 4/5 | 0.12 |
| 4 | horizon 40 / topSec 1 / topAst 5 | 1.95 | 4/5 | 0.63 |

**Pattern** : top sectors=1 + top assets 5-10 est consistant à travers les horizons. C'est le mécanisme qui produit l'edge, pas un fit fortuit sur un horizon précis.

## Comparaison vs RS Rotation simple

| Métrique | RS Rotation best (PR #210) | SECTOR_RS v1 |
|---|---:|---:|
| Profit factor | 1.91 | **2.157** |
| Années positives | 4/5 | **5/5** |
| Edge decay | ×0.72 | **×0.68** |

→ SECTOR_RS surperforme RS Rotation simple sur les 3 métriques principales.

## Risques connus

- `regime_dependency_high` — filtre NO_RISK_OFF actif mais oscillations possibles autour de l'EMA200.
- `sector_concentration_high` — topSectors=1, 100 % exposé au secteur leader.
- `turnover_moderate` — ~89 trades/an.
- `momentum_crash_inherent` — inhérent à toute stratégie momentum long-only.
- `no_dynamic_sizing` — taille fixe = 1R par position.
- `no_live_shadow` — pas de paper trading parallèle.
- `look_ahead_audit_not_specific` — mécanisme similaire à RS Rotation simple (CLEAN PR #208) mais calcul momentum agrégé non audité formellement.
- `survivorship_bias_universe` — 158 symboles survivants 2021-2025, pas de delistés.
- `friction_uniform_per_asset` — pas par actif (crypto vs ETF ont des coûts différents).
- `long_only` — pas de couverture explicite en bear.

## Prochaines étapes requises avant tout usage live

1. Audit anti-look-ahead spécifique (symétrique PR #207, #208).
2. Walk-forward conditionnel par régime (3 splits temporels).
3. Stress tests friction ×2, ×3.
4. Stress tests bear market 2022 isolé, sector collapse simulé.
5. Comparaison corrélation/complémentarité vs RS Rotation simple.
6. Mise à jour SETUPS_REGISTRY.md.
7. Sizing dynamique avant tout passage live.
8. Live shadow paper trading minimum 3-6 mois.

## Interdictions

- Ne pas optimiser davantage les paramètres dans cette config gelée.
- Ne pas ajouter de paramètres exotiques sans audit séparé.
- Ne pas toucher au runtime (Worker, frontend, providers, broker, paper trading).
- Ne pas activer en live tant que les 8 prochaines étapes ci-dessus ne sont pas réalisées.
