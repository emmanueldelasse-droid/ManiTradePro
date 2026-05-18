# PEAD SEC Validation v1 — ManiTradePro

> Généré le 2026-05-18T18:40:09.443Z par `tools/backtests/pead-sec-validation-v1.mjs`.

Validation croisée des earnings EODHD contre les filings 10-Q/10-K SEC EDGAR pour détecter d'éventuels timestamps incorrects ou look-ahead silencieux dans le dataset EODHD.

**⚠ DRY_RUN** — data/earnings/pead-eodhd-v1.json absent — exécuter pead-eodhd-ingestion-v1.mjs d'abord

Pour exécuter la validation :

```bash
# 1. Ingérer le dataset EODHD d'abord
export EODHD_API_KEY="votre_clé"
node tools/backtests/pead-eodhd-ingestion-v1.mjs
# 2. Puis lancer la validation SEC
export SEC_USER_AGENT="VotreNom contact@email.com"
node tools/backtests/pead-sec-validation-v1.mjs
```
