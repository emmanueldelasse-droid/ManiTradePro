# Dataset Governance

> Règles de gestion des données utilisées pour la recherche quant ManiTradePro.
>
> Référence : `RESEARCH_FRAMEWORK_FREEZE_V1.md`.

---

## 1. Périmètre

Ce document gouverne tous les datasets utilisés pour la recherche offline (backtests, audits, labs). Il ne concerne PAS les données runtime (Worker, providers live), qui sont gouvernées par `PROVIDERS_MATRIX.md`.

---

## 2. Datasets actuels

### 2.1 OHLC daily

| Champ | Valeur |
|---|---|
| Emplacement | `data/{SYMBOL}_2025.json` |
| Source originale | EOD Historical Data (cf. `tools/backtests/download-eodhd-2025.mjs`) |
| Période | 2021-01-04 → 2025-12-31 (~1255 candles par symbole) |
| Format | JSON array of `{ time, open, high, low, close, volume }` |
| Couverture univers | 158/191 symboles (83.8 %) |
| Symboles manquants | cf. `tools/backtests/output/pead-dataset-audit-v1.json` |
| Statut | **OK pour recherche actuelle** |

### 2.2 Univers de symboles

| Champ | Valeur |
|---|---|
| Emplacement | `tools/backtests/universe-v2.mjs` |
| 191 symboles uniques organisés en 18 groupes thématiques |
| Statut | **OK, à étendre si justifié** |

### 2.3 Régime macro

Reconstructible à la volée depuis SPY/QQQ/SMH vs EMA200 (cf. code source de plusieurs moteurs). Pas un fichier dédié.

### 2.4 Earnings / fundamentals — **MANQUANT**

| Champ | Valeur |
|---|---|
| Statut | **DATA_INSUFFICIENT** (cf. `pead-dataset-audit-v1.json`) |
| Conséquence | POST_EARNINGS_DRIFT non testable |
| Décision en attente | Sourcing à arbitrer (cf. `PEAD_DATA_REQUIREMENTS.md`) |

---

## 3. Critères d'acceptation d'une nouvelle source de données

Toute nouvelle source de données ingérée doit respecter les critères suivants.

### 3.1 Documentation obligatoire dans la PR d'ingestion

- [ ] Nom de la source (ex. Polygon, Alpha Vantage, SEC EDGAR).
- [ ] URL/endpoint utilisé.
- [ ] Coût (gratuit, abonnement, $X / mois).
- [ ] Conditions d'usage (CGU, terms of service).
- [ ] Format et structure des données.
- [ ] Couverture (symboles, période, fréquence).
- [ ] Qualité connue (gaps, erreurs documentées).

### 3.2 Audit anti-look-ahead source

Pour toute donnée datée (pas juste OHLC), il faut :

- [ ] **Timestamp explicite** avec timezone (UTC ou ET).
- [ ] **Pas de mise à jour rétroactive** (la source ne change pas les valeurs historiques après publication).
- [ ] **`sourceFetchedAt`** documenté dans chaque enregistrement.
- [ ] **Test manuel** : tirer 20 enregistrements random, vérifier la cohérence avec une autre source.

Si la source met à jour rétroactivement (Yahoo, certains feeds), c'est un look-ahead potentiel. Refus ou usage très encadré.

### 3.3 Stockage local

- [ ] Format : JSON normalisé, un fichier par symbole (sauf si volume justifie un format plus efficace).
- [ ] Emplacement : `data/{type}/{SYMBOL}_{type}.json` (ex. `data/earnings/AAPL_earnings.json`).
- [ ] Pas de fichier global > 50 MB sauf compression / chunking documenté.
- [ ] Snapshot immutable : ne JAMAIS modifier les fichiers historiques après ingestion. Si une correction nécessite mise à jour, créer une nouvelle version (ex. `_earnings_v2.json`).

### 3.4 Audit script obligatoire

Pour toute nouvelle catégorie de données, un script d'audit doit accompagner l'ingestion :

- Mesure de couverture (% symboles, % périodes).
- Détection des gaps temporels.
- Détection des incohérences (timestamps, types, valeurs aberrantes).
- Score de complétude pour décider si les données suffisent au backtest.

Modèle : `tools/backtests/pead-dataset-audit-v1.mjs` (PR #216).

---

## 4. Pipeline d'ingestion recommandé

```text
1. Décision politique sur la source (coût, qualité)
   ↓
2. PR de sourcing : config + script d'ingestion uniquement
   ↓
3. Ingestion en CI dédié (pas en local pour reproductibilité)
   ↓
4. Validation manuelle sur 20 échantillons random
   ↓
5. PR d'audit dataset (score complétude, gaps, qualité)
   ↓
6. Si audit OK → données utilisables par les setups
   ↓
7. Si audit échoue → corriger source ou changer
```

**Étape clé** : la PR de sourcing et la PR d'audit sont DISTINCTES de la PR d'utilisation par un setup. Un setup ne peut commencer son backtest qu'après audit dataset validé.

---

## 5. Reproductibilité

Pour qu'un backtest soit reproductible :

- Les datasets utilisés doivent être versionnés (commit hash).
- Le script d'ingestion doit pouvoir re-générer le dataset à partir de la source.
- Les paramètres d'ingestion doivent être documentés dans un fichier `data/{type}/_meta.json`.

Format `_meta.json` proposé :

```json
{
  "type": "earnings",
  "source": "alpha_vantage",
  "ingestedAt": "2026-05-20T10:00:00Z",
  "scriptVersion": "tools/data/ingest-earnings-v1.mjs",
  "scriptCommit": "abc123def",
  "coverage": {
    "symbolsRequested": 191,
    "symbolsIngested": 158,
    "periodStart": "2021-01-01",
    "periodEnd": "2025-12-31"
  }
}
```

---

## 6. Survivorship bias

Les données actuelles dans `data/` sont biaisées par construction :
- Univers fixé en 2025 (donc connu).
- 158 symboles qui existent encore.
- Pas de delistés (CRWV, retraits S&P, etc.).

**Conséquence** : tout backtest sur cet univers ex-post est légèrement optimiste.

Pour les setups qui passent en `VALIDATED_RESEARCH_CORE` :
- documenter explicitement le biais.
- mesurer si possible avec un univers point-in-time alternatif.

Pour la phase de recherche : acceptable de garder cet univers, à condition que ce soit documenté.

---

## 7. Données publiques vs privées

| Type | Source | Statut légal |
|---|---|---|
| OHLC public | Yahoo, EODHD, etc. | Public, redistributable selon CGU |
| Earnings publics | SEC EDGAR | Public, libre |
| Estimates analystes | Bloomberg, Refinitiv | Privé, distribution interdite hors abonnement |
| News / sentiment | Variable | Variable |

Règle : les données privées (estimates) achetées via API sont OK pour la recherche locale, mais **ne doivent pas être commitées dans le repo** si la licence interdit la redistribution.

Solution : 
- Stocker les données privées dans `data/private/` (gitignored).
- Documenter dans `_meta.json` que les données sont d'origine privée.
- Donner les instructions de re-fetch dans `docs/research/` pour reproductibilité.

---

## 8. Nettoyage et expiration

- Les datasets OHLC sont mis à jour annuellement (snapshot 2021-2025 actuel → 2026 quand l'année sera close).
- Les snapshots anciens (ex. `data/snapshots/2025-12-31/`) sont conservés pour audit ex-post.
- **Pas de suppression** sans archivage explicite (commit + tag).

---

## 9. Interdictions

- **NE PAS** commiter de données privées si la licence l'interdit.
- **NE PAS** modifier les fichiers historiques après ingestion initiale.
- **NE PAS** mélanger plusieurs sources dans un même fichier (sauf si documenté explicitement).
- **NE PAS** ingérer en local pour un setup à promouvoir (utiliser CI ou environnement reproductible).
- **NE PAS** utiliser un dataset non audité par un setup en `VALIDATED_RESEARCH_CORE`.

---

## 10. Cas spécial : PEAD

POST_EARNINGS_DRIFT est aujourd'hui bloqué par `DATA_INSUFFICIENT`. La prochaine PR de sourcing devra :

1. Choisir une source parmi celles listées dans `PEAD_DATA_REQUIREMENTS.md`.
2. Implémenter un script `tools/data/ingest-earnings-v1.mjs` reproductible.
3. Stocker dans `data/earnings/{SYMBOL}_earnings.json` ou `data/private/earnings/` si licence privée.
4. Auditer via `pead-dataset-audit-v1.mjs` (qui devra être mis à jour pour lire `data/earnings/`).
5. Vérifier manuellement 20 échantillons.
6. Documenter dans `_meta.json`.

**Aucun backtest PEAD ne peut commencer avant validation de ces 6 étapes.**

---

## 11. Mise à jour de ce document

Modifications par PR explicite. Pas de modification silencieuse. Toute extension d'univers ou ingestion de nouvelle source doit référencer ce document.

---

> **Conclusion** : les données sont la base de toute la recherche. Une donnée biaisée invalide tous les setups qui en dépendent. La rigueur sur les datasets est non-négociable.
