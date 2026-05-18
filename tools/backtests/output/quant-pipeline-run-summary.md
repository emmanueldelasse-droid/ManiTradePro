# Quant Pipeline Run Summary

> Généré le 2026-05-18T09:21:50.713Z par `tools/backtests/run-quant-pipeline-v1.mjs`.

**Statut global : ✓ OK**

Durée totale : 7.0 s

## Étapes

| # | Moteur | Statut | Durée | Output | Output modifié |
|---:|---|---|---:|---|---|
| 1 | asset-quality-engine-v1 | ✓ OK | 2.2 s | `tools/backtests/output/asset-quality-report.json` | ✓ |
| 2 | asset-setup-matrix-v1 | ✓ OK | 804 ms | `tools/backtests/output/asset-setup-matrix.json` | ✓ |
| 3 | setup-variant-matrix-v1 | ✓ OK | 883 ms | `tools/backtests/output/setup-variant-matrix.json` | ✓ |
| 4 | variant-regime-matrix-v1 | ✓ OK | 1.5 s | `tools/backtests/output/variant-regime-matrix.json` | ✓ |
| 5 | walk-forward-regime-validator-v1 | ✓ OK | 948 ms | `tools/backtests/output/walk-forward-regime-validator.json` | ✓ |
| 6 | tradable-universe-v1 | ✓ OK | 578 ms | `tools/backtests/output/tradable-universe.json` | ✓ |
| 7 | allocation-engine-v1 | ✓ OK | 121 ms | `tools/backtests/output/allocation-plan.json` | ✓ |

## Outputs vérifiés

- ✓ `tools/backtests/output/asset-quality-report.json` (modifié pendant ce run : oui)
- ✓ `tools/backtests/output/asset-setup-matrix.json` (modifié pendant ce run : oui)
- ✓ `tools/backtests/output/setup-variant-matrix.json` (modifié pendant ce run : oui)
- ✓ `tools/backtests/output/variant-regime-matrix.json` (modifié pendant ce run : oui)
- ✓ `tools/backtests/output/walk-forward-regime-validator.json` (modifié pendant ce run : oui)
- ✓ `tools/backtests/output/tradable-universe.json` (modifié pendant ce run : oui)
- ✓ `tools/backtests/output/allocation-plan.json` (modifié pendant ce run : oui)

## Prochaine étape recommandée

Le tradable universe est à jour. Point d'entrée pour le futur allocation-engine :

```text
tools/backtests/output/allocation-plan.json
```

Pour mettre à jour après un nouveau backtest : relancer ce même pipeline.
