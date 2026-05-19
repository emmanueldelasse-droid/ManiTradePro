# PEAD EODHD Ingestion v1 — ManiTradePro

> Généré le 2026-05-18T18:40:41.115Z par `tools/backtests/pead-eodhd-ingestion-v1.mjs`.

**⚠ MODE DRY_RUN.** Variable d'environnement `EODHD_API_KEY` absente. Aucun appel réseau, aucun dataset téléchargé. Pour générer le dataset réel :

```bash
export EODHD_API_KEY="votre_clé"
node tools/backtests/pead-eodhd-ingestion-v1.mjs
```

## Verdict : **DATASET_NOT_GENERATED_DRY_RUN**

| Critère | Valeur |
|---|---:|
| Mode | DRY_RUN |
| Score complétude | 0/100 |
| Symbols UNIVERSE | 191 |
| Symbols avec earnings | 0 (0.0 %) |
| Events totaux | 0 |
| EPS actual coverage | 0.0 % |
| Revenue actual coverage | 0.0 % |
| Surprise computable | 0.0 % |
| UNKNOWN session % | 0.0 % |

## Distribution par session marché

| Session | Events | % |
|---|---:|---:|
| PRE_MARKET | 0 | 0.0 % |
| POST_MARKET | 0 | 0.0 % |
| INTRADAY | 0 | 0.0 % |
| UNKNOWN | 0 | 0.0 % |

## Distribution par année

| Année | Events |
|---|---:|

## Symbols UNIVERSE SANS earnings (191)

SPY, QQQ, IWM, DIA, MDY, XLK, VGT, IGV, IYW, FTEC, SOXX, SMH, SOXQ, XSD, PSI, BOTZ, FDN, SKYY, CLOU, WCLD, CIBR, HACK, BUG, XLE, XLF, XLV, XLI, XLP, XLY, XLB…

**Raisons possibles** : symbole non US (FX, crypto), ticker non couvert par EODHD, ou symbole sans earnings publics.

## Limitations connues

- EODHD ne fournit pas systématiquement le `sourceConsensusDate` (date où le consensus analystes a été figé). Risque de look-ahead silencieux si EODHD met à jour les estimates rétroactivement. Validation SEC nécessaire (cf. pead-sec-validation-v1.mjs).
- Heures de publication estimées : PRE_MARKET = 08:00 ET, POST_MARKET = 17:00 ET. Conversion en UTC en supposant UTC-5 (pas d'ajustement DST). Précision : ~1h.
- INTRADAY publications classées non-tradables (UNKNOWN_TRADABILITY).
- Symboles FX (EURUSD, GBPUSD, USDJPY) exclus (pas d'earnings).
- Symboles crypto inclus mais EODHD ne retourne probablement rien pour eux (pas d'earnings).
- Univers survivant 2021-2025 — pas de tickers delistés (cf. DATASET_GOVERNANCE.md).

## Garanties anti-look-ahead

- Aucun champ futur stocké (next quarter guidance, revisions post-earnings, etc.).
- PRE_MARKET → publishedAt = 13:00 UTC (≈ 08:00 ET, avant ouverture marché US à 14:30 UTC ≈ 9:30 ET).
- POST_MARKET → publishedAt = 22:00 UTC (≈ 17:00 ET, après cloture marché US à 21:00 UTC ≈ 16:00 ET).
- qualityFlags pour chaque event documentent les champs manquants.

## Prochaines étapes obligatoires

1. **Exécuter avec une vraie clé EODHD_API_KEY** pour générer le dataset.
2. **Re-tourner cet audit** pour vérifier la couverture réelle.
3. **Exécuter `pead-sec-validation-v1.mjs`** pour valider 20-50 earnings contre SEC EDGAR.
4. **Si verdict ≥ PARTIAL_DATASET_READY**, construire `pead-signal-detect-v1.mjs` (PR séparée).

---

**Référence framework** : `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`, `docs/research/DATASET_GOVERNANCE.md`, `docs/research/PEAD_DATA_REQUIREMENTS.md`.