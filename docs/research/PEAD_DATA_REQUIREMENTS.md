# PEAD — Data Requirements

> Spécification précise des datasets nécessaires pour tester POST_EARNINGS_DRIFT sérieusement.
>
> Document de référence avant toute décision de sourcing.

---

## 1. Données obligatoires (sans ces données, PEAD n'est PAS testable)

### 1.1 Earnings publication dates

Pour chaque symbole de UNIVERSE, pour la période 2021-2025 :

| Champ | Type | Exemple | Obligatoire |
|---|---|---|---|
| `symbol` | string | `"AAPL"` | ✓ |
| `publishedAt` | ISO 8601 + TZ | `"2024-04-25T20:30:00Z"` | ✓ |
| `type` | enum | `"pre_market" \| "post_market" \| "intraday"` | ✓ |
| `fiscalQuarter` | string | `"Q1 2024"` | ✓ |

**Critères de qualité** :
- Précision timestamp : minute (idéalement). Heure acceptable.
- Timezone : UTC ou ET explicite. Ambiguïté = invalide.
- Couverture : ≥ 95 % des symboles UNIVERSE, ≥ 95 % des trimestres 2021-2025.

### 1.2 EPS surprise

Pour chaque earnings event :

| Champ | Type | Exemple | Obligatoire |
|---|---|---|---|
| `actualEPS` | number | `1.53` | ✓ |
| `estimateEPS` | number | `1.49` | ✓ |
| `surprisePct` | number | `2.68` | calculé |
| `sourceConsensusDate` | ISO 8601 | `"2024-04-24T16:00:00Z"` | **CRITIQUE** |

**Le champ `sourceConsensusDate`** documente quand le consensus a été figé. **Si ≥ `publishedAt`, c'est un look-ahead silencieux**.

### 1.3 Prix réalistes (déjà disponibles)

✓ Disponibles dans `data/{SYMBOL}_2025.json` :
- open, high, low, close
- volume

---

## 2. Données importantes (améliorent la qualité du backtest)

### 2.1 Revenue surprise

Complémentaire à l'EPS surprise. Parfois un beat EPS / miss revenue donne un drift négatif (qualité du beat questionnée).

| Champ | Type | Exemple |
|---|---|---|
| `revenueActual` | number | `90750000000` |
| `revenueEstimate` | number | `90290000000` |
| `revenueSurprisePct` | number | `0.51` |

### 2.2 Guidance forward (encore plus important)

Souvent, le marché réagit moins à l'earnings actuel qu'à la guidance pour le trimestre suivant. Donnée critique mais difficile à structurer (texte libre).

À reporter en v2.

### 2.3 Régime marché (déjà reconstructible)

Disponible via `regimeByDate` calculé sur SPY+QQQ+SMH vs EMA200. Pas besoin de sourcer.

### 2.4 Secteur

Mapping symbole → secteur déjà dans `tools/backtests/universe-v2.mjs`. Pas besoin de sourcer.

---

## 3. Données souhaitables (nice-to-have, v2+)

- **Surprise relative au secteur** : EPS surprise du symbole vs moyenne secteur le même trimestre.
- **Analyst revisions post-earnings** : si les analystes upgradent dans les jours suivants, signal de drift confirmé.
- **Options activity** : IV crush, put/call ratio, OI changes.
- **Short interest** : changements de short interest pré/post-earnings.

Toutes ces données coûtent cher et nécessitent des feeds spécialisés. Reportés en v3+.

---

## 4. Comparaison sources

### 4.1 Sources gratuites / faible coût

#### SEC EDGAR (`sec.gov/edgar`)

| Aspect | Valeur |
|---|---|
| Coût | Gratuit |
| Couverture | Toutes companies SEC-registered, depuis 1993 |
| Earnings dates | ✓ via filings 10-Q/10-K |
| EPS actual | ✓ via XBRL parsing |
| EPS estimate | ✗ Pas d'estimates analystes |
| Timing pre/post | ⚠ Inferrable mais pas explicite |
| Look-ahead risk | **Zéro** (filings publics avec timestamps officiels) |

**Verdict** : excellente source pour dates et actuals. Doit être croisée avec une autre source pour estimates.

#### Alpha Vantage (`alphavantage.co`)

| Aspect | Valeur |
|---|---|
| Coût | Gratuit (limité 5 req/min) ou $50/mois |
| Couverture | US principalement, 5+ ans |
| Earnings dates | ✓ |
| EPS actual/estimate | ✓ via `EARNINGS` endpoint |
| Timing pre/post | ✓ via `time` field |
| Look-ahead risk | Faible (timestamps documentés) |

**Verdict** : bon pour démarrer. Quota gratuit suffit pour ingestion historique en plusieurs sessions.

#### Yahoo Finance

| Aspect | Valeur |
|---|---|
| Coût | Gratuit (scraping fragile, conditions d'usage à vérifier) |
| Couverture | Mondial, 5 ans |
| Earnings dates | ✓ |
| EPS actual/estimate | ✓ |
| Look-ahead risk | **Élevé** — Yahoo met parfois à jour les estimates rétroactivement |

**Verdict** : à éviter pour validation rigoureuse. OK comme triangulation rapide.

#### Twelve Data (`twelvedata.com`)

| Aspect | Valeur |
|---|---|
| Coût | Gratuit limité, $30+ |
| Couverture | Mondial |
| Earnings | ✓ via `/earnings` endpoint |
| Look-ahead risk | Modéré |

ManiTradePro utilise déjà Twelve Data (cf. CLAUDE.md "4 clés rotation"). Réutiliser la même clé pour earnings serait économique.

### 4.2 Sources payantes (recommandées)

#### Polygon (`polygon.io`)

| Aspect | Valeur |
|---|---|
| Coût | $29 (Starter) / $79 (Advanced) / $199 (Premier) |
| Couverture | US, 15+ ans |
| Earnings dates | ✓ |
| EPS actual/estimate | ✓ |
| Timing pre/post | ✓ précis |
| Look-ahead risk | **Faible** — timestamps SEC-precision |

**Verdict** : meilleur rapport qualité/prix pour phase production. $79 plan recommandé.

#### Financial Modeling Prep (`financialmodelingprep.com`)

| Aspect | Valeur |
|---|---|
| Coût | $19 (Starter) / $50 (Premium) |
| Couverture | Mondial, 10+ ans |
| Earnings + estimates | ✓ |
| Look-ahead risk | Modéré (consensus parfois mis à jour) |

**Verdict** : bonne alternative à Polygon, mais moins fiable sur estimates historiques.

#### EOD Historical Data (`eodhd.com`)

| Aspect | Valeur |
|---|---|
| Coût | $20-$80/mois |
| Couverture | Mondial |
| Earnings | ✓ via `/calendar/earnings` |
| Look-ahead risk | Modéré |

ManiTradePro utilise déjà EODHD pour OHLC (`download-eodhd-2025.mjs`). Réutilisation logique.

---

## 5. Recommandation de sourcing

### Phase 1 — Validation gratuite (cette PR + suivante)

1. **SEC EDGAR** pour les dates exactes de publication (10-Q/10-K filings).
2. **Alpha Vantage `EARNINGS` endpoint** pour EPS actual + estimate + timing.
3. **Croisement manuel** sur 20 earnings tests pour valider la cohérence.

Coût : **$0**. Volume : suffisant pour 158 symboles × ~20 trimestres = ~3000 events.

### Phase 2 — Production (si l'edge est confirmé)

1. **Polygon Advanced ($79/mois)** ou **EODHD ($30-$50/mois)** pour fiabilité.
2. **Audit anti-look-ahead spécifique** sur 50 earnings tests random.

Coût : **$30-$80/mois**. Justifié uniquement si Phase 1 montre un edge tangible.

---

## 6. Anti-look-ahead — checklist de validation

Pour qu'un dataset earnings soit recevable, **chacun des points suivants doit être vérifié** :

- [ ] Les `publishedAt` ont une timezone explicite (UTC ou ET).
- [ ] Les `publishedAt` sont AVANT ou APRÈS la cloture du marché US — pas pendant.
- [ ] Les `estimateEPS` ne changent pas après `publishedAt` (cf. `sourceConsensusDate`).
- [ ] Sample de 20 earnings vérifié manuellement contre les filings SEC.
- [ ] Aucun champ "future-looking" stocké (next quarter guidance, future revisions, etc.) sauf marqué explicitement.
- [ ] Pour les pre-market : entry à T+1 ; pour les post-market : entry à T+2 (lendemain de la digestion). **JAMAIS** trade le jour de la publication.

---

## 7. Format de fichier proposé

`data/earnings/{SYMBOL}_earnings.json` :

```json
[
  {
    "symbol": "AAPL",
    "publishedAt": "2024-04-25T20:30:00Z",
    "type": "post_market",
    "fiscalQuarter": "Q1 2024",
    "actualEPS": 1.53,
    "estimateEPS": 1.49,
    "surprisePct": 2.68,
    "revenueActual": 90750000000,
    "revenueEstimate": 90290000000,
    "revenueSurprisePct": 0.51,
    "source": "alpha_vantage",
    "sourceFetchedAt": "2025-06-15T10:00:00Z",
    "sourceConsensusDate": "2024-04-24T16:00:00Z"
  }
]
```

---

## 8. Quantité de données estimée

- 158 symboles UNIVERSE.
- ~4 earnings par an par symbole.
- 5 ans (2021-2025).
- **~3 200 earnings events** au total.

Chaque event ~500 bytes → **~1.6 MB total**. Trivial en stockage.

---

## 9. Étape de validation manuelle (avant tout backtest)

Avant de construire le moteur PEAD :

1. Tirer 20 earnings au hasard du dataset ingéré.
2. Pour chaque : vérifier sur le site officiel (investor relations de la company ou SEC EDGAR) :
   - Date et heure de publication.
   - EPS actual.
   - Le consensus stocké était-il publié AVANT la date d'earnings ?
3. Si > 1 erreur sur 20 → source non fiable, changer.
4. Si 0-1 erreur → source acceptée.

---

## 10. Décision politique requise

Avant la PR suivante (script d'ingestion), arbitrer :

1. **Phase 1 gratuite** (SEC EDGAR + Alpha Vantage) ou directement **Phase 2 payante** (Polygon $79/mois) ?
2. Si payante : qui paie l'abonnement et comment il est géré ?
3. Quel volume historique cibler ? 5 ans (recommandé) ou plus ?

Ces questions ne sont pas techniques. Elles relèvent du choix politique/budgétaire. À arbitrer par ChatGPT/utilisateur avant la prochaine PR.

---

> **Conclusion** : sans dataset earnings, PEAD n'est pas testable. Phase 1 gratuite est suffisante pour démarrer. Décision à prendre avant la PR d'ingestion.
