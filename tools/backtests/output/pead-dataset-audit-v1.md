# PEAD Dataset Audit v1 — ManiTradePro

> Généré le 2026-05-18T17:13:01.024Z par `tools/backtests/pead-dataset-audit-v1.mjs`.

**⚠ Audit offline.** Ce script ne backtest pas. Il vérifie uniquement si les données nécessaires pour tester PEAD existent dans le repo.

## Verdict de complétude : **DATA_INSUFFICIENT**

| Critère | Statut |
|---|---|
| Univers déclaré | 191 symboles |
| OHLC coverage | 83.8 % (160/191) |
| Earnings data dans repo | **NON** |
| Score de complétude | 25/100 |
| Verdict | **DATA_INSUFFICIENT** |

## 1. OHLC daily

- Symboles avec OHLC : **160** / 191
- Coverage : **83.8 %**
- Champs détectés dans les fichiers OHLC : `time, open, high, low, close, volume`
- Période couverte (sample) : 2021-01-04 → 2025-12-31
- Candles par symbole (sample) : 1255

Symboles UNIVERSE sans OHLC : DIA, XLE, XLF, XLV, XLI, XLP, XLY, XLB, XLU, XLRE, XLC, EWJ, EWZ, FXI, EEM, VGK, FEZ, INDA, EWT, EWY, SLV, USO, UNG, DBA, IEF, HYG, LQD, TQQQ, KO, PG, JNJ

## 2. Earnings data

**Aucune donnée earnings trouvée dans le repo.**

Aucun fichier nommé `earnings*`, `eps*` ou `pead*` n'a été détecté dans data/, tools/, ou ailleurs.

Les fichiers OHLC ne contiennent que les champs `time, open, high, low, close, volume` — pas de surprise EPS, pas de date earnings.

**Conséquence directe** : tester PEAD nécessite l'ingestion d'un nouveau dataset.

## 3. Verdict détaillé

✗ **Données insuffisantes.** Impossible de tester PEAD honnêtement sans sourcer un dataset earnings.

Cf. `docs/research/PEAD_DATA_REQUIREMENTS.md` pour la liste exacte des données nécessaires et les sources possibles.

## 4. Prochaines étapes

1. Décider d'une source de données earnings (gratuite vs payante, cf. `PEAD_DATA_REQUIREMENTS.md`).
2. Construire un script d'ingestion qui populera `data/earnings/{SYMBOL}_earnings.json` avec : date, type (pre/post-market), actual EPS, estimate EPS, surprise %.
3. Re-tourner ce script d'audit pour valider que la couverture est suffisante.
4. Construire ensuite `tools/backtests/pead-signal-v1.mjs` (PR séparée).

---

**Limites de cet audit** :
- Le script ne télécharge rien (offline). Il ne vérifie que ce qui est présent dans le repo.
- Il ne lit que les noms de fichiers et leurs champs JSON. Il ne valide pas la qualité interne (timestamps cohérents, pas de doublons, etc.).
- Il assume que `data/` est le seul emplacement des données. Si d'autres datasets existent ailleurs (Cloudflare KV, R2, etc.), ils ne sont pas audités ici.