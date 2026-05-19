# DATA_QUALITY.md

> **Rôle (selon `GOVERNANCE.md`) :**
> - qualité données ;
> - trous ;
> - incohérences ;
> - incidents ;
> - exclusions stats.

> **Statut :** squelette créé le 2026-05-19 (PR setup-governance-docs).

---

## 1. Qualité des données par provider

_À remplir — coordonner avec `PROVIDERS_MATRIX.md`._

| Provider | Couverture | Latence | Incohérences connues | TTL cache |
|---|---|---|---|---|
| EODHD | _à remplir_ | _à remplir_ | _à remplir_ | _à remplir_ |
| Binance | _à remplir_ | _à remplir_ | _à remplir_ | _à remplir_ |
| Twelve Data | _à remplir_ | _à remplir_ | _à remplir_ | _à remplir_ |
| Yahoo | _à remplir_ | _à remplir_ | _à remplir_ | _à remplir_ |
| CoinGecko | _à remplir_ | _à remplir_ | _à remplir_ | _à remplir_ |
| Alpha Vantage | _à remplir_ | _à remplir_ | _à remplir_ | _à remplir_ |
| Finnhub | _à remplir_ | _à remplir_ | _à remplir_ | _à remplir_ |

## 2. Trous identifiés

_À remplir — périodes / actifs avec données manquantes ou suspectes._

## 3. Incohérences détectées

_À remplir — divergences entre providers, anomalies de prix, splits non gérés, etc._

## 4. Historique incidents data

_À remplir — format date + provider + symptôme + résolution._

## 5. Exclusions stats

Périodes / actifs à exclure des stats et backtests (cf. `BACKTEST_RULES.md` § 3) :

_À remplir._

---

## Sources existantes à consolider

- `docs/monitoring/PROVIDERS_MATRIX.md`
- `docs/monitoring/KNOWN_ISSUES.md` — incidents data historiques
- `/docs/research/DATASET_GOVERNANCE.md`
- `/docs/research/PEAD_DATA_REQUIREMENTS.md`
