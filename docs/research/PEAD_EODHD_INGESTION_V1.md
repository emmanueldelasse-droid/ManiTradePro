# PEAD EODHD Ingestion v1

> Documentation de l'ingestion EODHD pour le futur moteur POST_EARNINGS_DRIFT.
>
> Référence : `POST_EARNINGS_DRIFT_FOUNDATION.md`, `PEAD_DATA_REQUIREMENTS.md`, `DATASET_GOVERNANCE.md`, `ANTI_LOOKAHEAD_RULES.md`.

---

## 1. Pourquoi PEAD nécessite des timestamps propres

PEAD (Post-Earnings Announcement Drift) repose sur un événement précis : la publication des résultats trimestriels d'une entreprise. L'edge théorique vient du fait que le marché digère lentement l'information sur 60-90 jours.

**Pour être tradable réalistement, le moteur PEAD doit savoir exactement** :
1. **À quel moment** l'information est devenue publique (pre-market, post-market, intraday).
2. **À partir de quand** un trader peut effectivement réagir (open du prochain jour bourse).
3. **Si l'estimate analyste** stocké était bien le consensus AVANT publication, pas une révision rétroactive.

Sans ces 3 informations propres, le backtest contient nécessairement du look-ahead.

---

## 2. Pourquoi les earnings after-close sont dangereux

Exemple typique :
- Jeudi 17h00 ET : Apple publie ses résultats (after-close).
- Le marché US est fermé. Aucun ordre ne peut s'exécuter avant le lendemain à l'ouverture.
- Vendredi 9:30 ET : ouverture, gap (souvent ±5 %), volume anormal.
- **L'entry tradable** est `vendredi open` au plus tôt.

**Mais beaucoup de datasets earnings sont datés simplement "T = jour de l'announcement"** sans préciser pre/post-market. Si on suppose "T+1 open" pour tous, on entre :
- **OK pour POST_MARKET** : Jeudi soir → Vendredi open = T+1.
- **TROP TARD pour PRE_MARKET** : Jeudi matin → Jeudi open déjà passé. T+1 = Vendredi open, on rate la digestion immédiate.

Mauvaise classification = look-ahead silencieux ou loupé l'edge selon le cas. **Le timing pre/post-market est CRITIQUE.**

---

## 3. Comment le dataset évite le look-ahead

Le script `tools/backtests/pead-eodhd-ingestion-v1.mjs` applique les règles suivantes :

### 3.1 Classification stricte

Chaque earnings est classé en :
- `PRE_MARKET` — publié avant 9:30 ET. Tradable à l'open du même jour pour les rapides ; pour ManiTradePro, on entrera à T+1 open (lendemain) pour garder un coussin.
- `POST_MARKET` — publié après 16:00 ET. Tradable à T+1 open (lendemain).
- `INTRADAY` — publié pendant la séance. **Marqué comme non-tradable** (`INTRADAY_NOT_TRADABLE` qualityFlag).
- `UNKNOWN` — timing non documenté par EODHD. **Marqué comme non-tradable** par défaut.

### 3.2 Champ `publishedAt` reconstruit explicitement

À partir du timing classifié :
- PRE_MARKET : `publishedAt = reportDate T13:00:00Z` (≈ 08:00 ET)
- POST_MARKET : `publishedAt = reportDate T22:00:00Z` (≈ 17:00 ET)
- INTRADAY : `publishedAt = reportDate T17:00:00Z` (≈ 12:00 ET, marqué non-tradable)
- UNKNOWN : `publishedAt = reportDate T00:00:00Z` (heure absente, marqué non-tradable)

**Précision** : ~1 heure. Suffisant pour décider quel jour bourse trader, pas pour intraday.

### 3.3 qualityFlags par event

Chaque earnings event a un array `qualityFlags` qui peut contenir :
- `MARKET_SESSION_UNKNOWN`
- `INTRADAY_NOT_TRADABLE`
- `EPS_ACTUAL_MISSING`
- `EPS_ESTIMATE_MISSING`
- `REVENUE_ACTUAL_MISSING`
- `REVENUE_ESTIMATE_MISSING`

Le moteur PEAD futur **devra exclure** les events avec `MARKET_SESSION_UNKNOWN` ou `INTRADAY_NOT_TRADABLE`.

### 3.4 `sourceConsensusDate` = null pour EODHD

EODHD ne fournit PAS de date à laquelle le consensus analystes a été figé. C'est une limite documentée. Le risque est qu'EODHD mette à jour les estimates rétroactivement, créant un look-ahead silencieux.

**Mitigation** : validation SEC via `pead-sec-validation-v1.mjs`. Si la `filingDate` SEC correspond bien à `reportDate` EODHD à ±5 jours, le timing est cohérent. Cela ne valide PAS l'estimate (SEC ne fournit pas les estimates analystes), mais valide le timing.

---

## 4. Limitations EODHD

| Limite | Conséquence | Mitigation actuelle |
|---|---|---|
| Pas de `sourceConsensusDate` | Look-ahead silencieux possible sur estimates rétroactives | Validation SEC sur timing (pas sur estimate value) |
| Heures de publication estimées (8h / 17h ET) | Précision ~1h, pas tick-precise | Acceptable pour PEAD daily (entry à T+1 open) |
| DST non géré (UTC-5 fixe) | Décalage de 1h pendant été ET (avril-octobre) | Documenté. Pas critique pour décision daily. |
| `revenue_actual/estimate` souvent absent | Revenue surprise non disponible | EPS surprise utilisé seul. v2 possible avec /api/fundamentals. |
| Cryptos / FX dans UNIVERSE | EODHD ne retourne rien pour eux | Symboles exclus du dataset (correct). |
| Symboles européens (.AS, .PA, etc.) | Couverture earnings variable | À mesurer après ingestion réelle. |

---

## 5. Pourquoi la validation SEC existe

EODHD est une source commerciale agrégée. SEC EDGAR est la source officielle des filings 10-Q et 10-K. La validation croisée mesure :
- **Si EODHD reportDate** correspond à un filing SEC réel.
- **Si la fréquence des earnings** ressemble à 4/an (US SEC-registered companies).
- **Si les timings** sont cohérents (filing rarement plus de 45j après quarter-end).

Une PR séparée (`pead-sec-validation-v1.mjs`) tire un échantillon de 30 earnings au hasard du dataset EODHD et les compare aux filings SEC :

| Mismatch rate | Verdict |
|---|---|
| ≤ 10 % | VALIDATION_PASSED |
| 10-25 % | VALIDATION_PARTIAL |
| > 25 % | VALIDATION_FAILED → revoir le dataset |

---

## 6. Ce qui reste non résolu

### 6.1 Pré-publication consensus

EODHD stocke `estimate`, mais ne dit pas QUAND ce consensus a été figé. Si EODHD met à jour rétroactivement après publication, c'est un look-ahead silencieux.

**Mitigation actuelle** : aucune côté code. La validation SEC valide le timing, pas la valeur de l'estimate. **À traiter dans une PR séparée** si on veut une validation rigoureuse :
1. Croiser avec Polygon ou FMP qui exposent `consensusDate` explicite.
2. Ou : assume que l'estimate est figé en moyenne 1-7j avant earnings (hypothèse documentée mais non garantie).

### 6.2 Univers point-in-time

Le dataset utilise l'univers `universe-v2.mjs` actuel (158 symboles survivants 2021-2025). Les delistés / spin-offs / fusions ne sont pas dans le dataset.

**Mitigation actuelle** : documenté dans `DATASET_GOVERNANCE.md` (section 6). Survivorship bias acceptable pour phase recherche.

### 6.3 Guidance forward

Souvent, le marché réagit moins à l'earnings actuel qu'à la guidance pour le trimestre suivant. EODHD ne capture pas ces guidances (texte libre).

**Mitigation actuelle** : aucune. Limite assumée. À explorer en v3+.

### 6.4 Données fundamentals complémentaires

PEAD pourrait être enrichi par :
- short interest changes
- options activity (IV crush, put/call ratio)
- analyst revisions post-earnings

Aucune n'est dans cette ingestion v1. À reporter en versions futures.

---

## 7. Exécution

### 7.1 Pré-requis

```bash
# Variable d'environnement EODHD obligatoire
export EODHD_API_KEY="votre_clé_eodhd"

# Variable d'environnement SEC obligatoire (pour validation)
export SEC_USER_AGENT="VotreNom contact@email.com"
```

### 7.2 Pipeline

```bash
# 1. Ingestion EODHD
node tools/backtests/pead-eodhd-ingestion-v1.mjs

# 2. Validation SEC (échantillon)
node tools/backtests/pead-sec-validation-v1.mjs

# 3. Inspecter les outputs
cat tools/backtests/output/pead-eodhd-ingestion-v1.md
cat tools/backtests/output/pead-sec-validation-v1.md
```

### 7.3 Sortie

| Fichier | Contenu |
|---|---|
| `data/earnings/pead-eodhd-v1.json` | Dataset normalisé complet |
| `data/earnings/pead-eodhd-v1.meta.json` | Metadata d'ingestion |
| `data/earnings/_sec_company_tickers.json` | Cache mapping ticker → CIK SEC |
| `tools/backtests/output/pead-eodhd-ingestion-v1.{json,md}` | Audit qualité |
| `tools/backtests/output/pead-sec-validation-v1.{json,md}` | Audit validation SEC |

---

## 8. Verdicts possibles

| Verdict | Conditions | Action |
|---|---|---|
| `DATASET_READY_FOR_PROTOTYPE` | Score ≥ 80, UNKNOWN < 20 % | Construire le moteur PEAD (PR séparée) |
| `PARTIAL_DATASET_READY` | Score 50-80, UNKNOWN < 40 % | Backtester avec exclusions documentées |
| `HIGH_LOOKAHEAD_RISK` | UNKNOWN ≥ 40 % | Investiguer EODHD, peut-être changer de source |
| `DATASET_UNUSABLE` | Score < 50, ou validation SEC FAILED | Revoir la stratégie de sourcing |
| `DATASET_NOT_GENERATED_DRY_RUN` | EODHD_API_KEY absent | Re-exécuter avec clé |

---

## 9. Interdictions explicites

- **NE PAS** construire le moteur PEAD complet dans cette PR.
- **NE PAS** lancer de backtest performance.
- **NE PAS** chercher un PF.
- **NE PAS** optimiser des paramètres de signal.
- **NE PAS** modifier le runtime.
- **NE PAS** activer en live.
- **NE PAS** modifier le dataset rétroactivement après ingestion (créer une v2 si nécessaire).

---

## 10. Conformité framework

Cette PR respecte `RESEARCH_FRAMEWORK_FREEZE_V1.md` :
- ✓ Documentation pure + scripts d'ingestion (pas de moteur de signal).
- ✓ Anti-look-ahead documenté (cf. section 3, 6).
- ✓ Dataset governance (cf. section 7, `DATASET_GOVERNANCE.md`).
- ✓ Versionnement clair (v1, pas de modification rétroactive).
- ✓ Validation croisée prévue (SEC EDGAR).

Pas de déviation. Pas de besoin de marquer `⚠ DÉVIATION FRAMEWORK FREEZE v1`.

---

> **Conclusion** : cette PR construit la fondation dataset propre pour PEAD. Aucun edge n'est encore mesuré. Les PR suivantes (signal detection, backtest, destruction tests) viendront seulement après validation EODHD + SEC.
