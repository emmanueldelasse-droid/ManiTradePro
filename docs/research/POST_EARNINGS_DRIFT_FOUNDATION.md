# POST_EARNINGS_DRIFT (PEAD) — Foundation document

> **Statut** : `RESEARCH_FOUNDATION` — pas un setup encore. Ce document pose les bases avant tout backtest.
>
> **Pas de moteur PEAD final dans cette PR.** L'objectif est de répondre à : « Avons-nous les données nécessaires pour tester sérieusement PEAD sans tricher ? »

---

## 1. Concept

**Post-Earnings Announcement Drift (PEAD)** : phénomène académique documenté depuis Ball & Brown (1968), Bernard & Thomas (1989) et confirmé sur de multiples décennies et marchés. Après une publication de résultats trimestriels surprenants (positifs ou négatifs), le prix d'une action a tendance à continuer dans la direction de la surprise pendant plusieurs semaines avant que les analystes et le marché ne ré-évaluent pleinement l'information.

L'edge théorique :
- **Hypothèse marché efficient faible** : toute information publique est immédiatement intégrée au prix.
- **Constat empirique** : le marché digère lentement les surprises trimestrielles. Les gros surprises (beat ≥ +10 %) tendent à driffer positivement pendant 60-90 jours après la publication.

PEAD est aujourd'hui largement reconnu, parfois exploité par les fonds quant. Sa **demi-vie** s'est probablement raccourcie depuis 2000 mais l'effet persiste, surtout sur les small/mid caps et les actions sous-couvertes.

---

## 2. Pourquoi PEAD est prioritaire pour ManiTradePro

Après une série d'audits rigoureux (PR #207 à #215), le constat est sans appel :

| Setup | Verdict | Note |
|---|---|---|
| PULLBACK_MOMENTUM | DEAD / DO_NOT_TRADE | look-ahead structurel |
| BREAKOUT_EXPANSION (agrégé) | DEAD_AGGREGATED | PF < 1 |
| MEAN_REVERSION | EXPERIMENTAL_ONLY | edge marginal |
| RS_ROTATION (simple) | RESEARCH_CANDIDATE | fragile rolling |
| VOLATILITY_COMPRESSION | DEAD / ABANDONED | PF 0.78 |
| SECTOR_RELATIVE_STRENGTH | EDGE_DEPENDS_ON_AI_WINNERS | non diversifiable |
| TREND_PULLBACK_DYNAMIC_SUPPORT | FRAGILE | PF 1.04, marginal |

**Aucun setup momentum n'est aujourd'hui à la fois robuste, diversifié, et non-AI-dépendant.**

PEAD apporte des propriétés structurellement différentes :

| Propriété | Setups momentum testés | PEAD |
|---|---|---|
| Causalité | trend following | **événement fondamental** (publication earnings) |
| Dépendance régime | élevée (NO_RISK_OFF obligatoire) | modérée (effet documenté en bull et bear) |
| Dépendance thème | très forte (concentration AI 2024-2025) | faible (touche tous secteurs) |
| Demi-vie de l'edge | inconnue | étudiée académiquement (~60-90j) |
| Anti-cyclicité | nulle | présente sur surprises négatives |

**PEAD est event-driven, pas trend-following.** C'est une source d'edge structurellement distincte.

---

## 3. Architecture proposée

### 3.1 Signal

Critères cumulés (toutes obligatoires) :

1. **Earnings publication** : symbole a publié ses résultats dans la fenêtre T-1 (signal généré J après publication).
2. **Surprise EPS forte** : `(actualEPS - estimateEPS) / abs(estimateEPS) ≥ surpriseMin` (typiquement ≥ +5 %, à calibrer).
3. **Gap d'ouverture confirmant** : `open[T+1] / close[T-1] ≥ gapMin` (typiquement ≥ +3 %, ce qui filtre les "beats" décevants où le marché a déjà escompté).
4. **Volume anormal** : `volume[T+1] ≥ avg(volume[T-21..T-1]) × volumeMult` (typiquement ≥ ×1.5).
5. **Régime marché ≠ RISK_OFF** (filtre baseline).
6. **Relative strength positive** : `close[T+1] / close[T+1-90] > sectorClose[T+1] / sectorClose[T+1-90]`.

### 3.2 Entrée

**STRICTEMENT** :

```text
entry = open[T+2]
```

Où :
- T = jour de publication earnings (par ex. mardi soir)
- T+1 = lendemain bourse, le marché digère la news (gap, volume anormal)
- T+2 = jour suivant, exécution du trade à l'open

L'objectif : ne **jamais** trader le jour même de la publication (gap d'ouverture impossible à anticiper avec certitude) ni le lendemain (volatilité intraday élevée).

### 3.3 Exits possibles

À tester :
- `fixed_hold` : 20, 40, 60, 90 jours (PEAD étudié sur ces horizons).
- `momentum_decay` : exit si rendement 5j < 0 (signal de fin de drift).
- `atr_trailing` : trailing à `highest - 2 × ATR`.
- `relative_strength_decay` : exit si l'action ne bat plus son secteur.
- `next_earnings` : exit forcé à T = next earnings - 5 j (éviter le risque de prochaine publication).

### 3.4 Risk model

- **Max gap exposure** : si gap > +15 %, **NE PAS** entrer (déjà tout escompté).
- **Max earnings cluster** : ne pas avoir plus de N positions en PEAD simultanément (typiquement N=5-10).
- **Sector concentration** : max 30 % du portfolio dans un seul secteur.
- **Volatility scaling** : taille de position = baseSize × (refATR / ATR(symbol)). Pénalise les actions volatiles.

---

## 4. Anti-look-ahead obligatoire

PEAD est le setup le plus sensible au look-ahead du projet. Documentation exhaustive **obligatoire** :

### 4.1 Earnings publication timing

| Cas | Timing | Action |
|---|---|---|
| Pre-market (avant 9h30 ET) | jour T avant ouverture | Le marché digère pendant la journée T. Entry au open[T+1]. |
| Post-market (après 16h ET) | jour T après cloture | Le gap a lieu à l'ouverture de T+1. Entry au open[T+2]. |
| Cas indéterminé | inconnu | **REFUSER LE TRADE.** Si timing non documenté, on ne trade pas. |

**Règle absolue** : si la timezone et le timing de publication ne sont pas connus avec certitude pour un earnings donné, le trade est annulé.

### 4.2 Séparation signal-time / execution-time

- `signalTime` = quand on apprend l'earnings (cloture de T pour post-market, ouverture de T pour pre-market).
- `executionTime` = T+1 ou T+2 selon timing.
- **JAMAIS** utiliser de prix entre signalTime et executionTime pour le signal.

### 4.3 EPS estimate timing

L'estimate analyste utilisé doit être l'estimate **AVANT** la publication, pas l'estimate révisé après. Sources :
- Bloomberg / Refinitiv (consensus pré-earnings) — payant.
- Yahoo, Zacks, Estimize — gratuit mais consensus parfois mis à jour rétroactivement.
- **Risque** : si la source met à jour l'estimate après publication, on a un look-ahead silencieux.

**Validation requise** : prendre 5-10 earnings historiques connus, vérifier manuellement que l'estimate stocké est cohérent avec ce qui était public AVANT la publication.

### 4.4 Reconstruction historique propre

Pour 2021-2025 sur ~150 symboles × ~4 earnings/an = ~3000 earnings events. Pour chaque event :
- Date exacte (ISO 8601 + timezone)
- Type : `pre_market`, `post_market`, ou `intraday` (rare)
- actualEPS
- estimateEPS (consensus pré-publication)
- surprise % = (actual - estimate) / |estimate|
- Optionnel : revenue surprise

---

## 5. Survivorship bias

Le repo actuel contient les OHLC de 158 symboles SURVIVANTS 2021-2025. Les tickers **delistés** ou **fusionnés** ne sont pas inclus. Pour PEAD :

- Risque mineur sur l'univers actuel (160 grandes caps, peu de disparitions).
- Risque réel si on étend l'univers aux small caps ou émergents.

**Mitigation proposée** : utiliser un univers point-in-time (snapshot mensuel de S&P 500 / Russell 1000 à chaque rebalance) plutôt qu'un univers fixé. Mais c'est une complexité supplémentaire — à reporter en v2.

---

## 6. Cost estimation des données

Comparaison des sources pour earnings dates + EPS surprise :

| Source | Coût mensuel | Couverture historique | Qualité | Look-ahead risk |
|---|---|---|---|---|
| **Alpha Vantage** | Gratuit (limité) à $50 | 5+ ans US | Bon | Faible — estimates pre-earnings parfois flous |
| **Polygon** | $29 (Starter) à $79 (Advanced) | 5+ ans US | Excellent | Faible — timestamps précis |
| **Financial Modeling Prep** | $19-$50 | 10+ ans | Bon | Modéré — consensus parfois mis à jour |
| **EOD Historical Data** | $20-$80 | 10+ ans, mondial | Bon | Modéré |
| **SEC EDGAR** | Gratuit | Tous (depuis 1993) | Excellent (dates filings) | Aucun pour les dates ; mais PAS d'estimates analystes |
| **Yahoo Finance** | Gratuit (scraping fragile) | 5 ans | Variable | Élevé — estimates parfois rétro-modifiés |
| **Twelve Data** | Gratuit (limité) à $30+ | Variable | Moyen | Modéré |

### Recommandation initiale

**Phase 1 (gratuite)** : SEC EDGAR pour les dates exactes de filings 10-Q/10-K + Alpha Vantage pour les estimates. Croiser les deux pour validation.

**Phase 2 (payante)** : Polygon Advanced ($79/mois) pour précision timestamps et fiabilité estimates.

**Coût total estimé** : $0-$100/mois pour phase recherche. $100-$300/mois si extension aux options et fundamentals en complément.

---

## 7. Architecture data ingestion proposée

```text
data/
├── earnings/
│   ├── {SYMBOL}_earnings.json    ← liste des earnings events
│   └── _consensus_estimates.json ← estimates pré-publication (sourced)
├── {SYMBOL}_2025.json             ← OHLC daily existant (inchangé)
└── ...
```

Format de fichier earnings :

```json
[
  {
    "publishedAt": "2024-04-25T20:30:00Z",
    "type": "post_market",
    "fiscalQuarter": "Q1 2024",
    "actualEPS": 1.53,
    "estimateEPS": 1.49,
    "surprisePct": 2.68,
    "revenueActual": 90750000000,
    "revenueEstimate": 90290000000,
    "source": "alpha_vantage|polygon|sec_edgar|...",
    "sourceConsensusDate": "2024-04-24T16:00:00Z"
  }
]
```

Le champ `sourceConsensusDate` documente quand le consensus a été stocké — critique pour audit anti-look-ahead.

---

## 8. Risk model du moteur PEAD futur

À détailler dans une PR séparée lors de la construction du moteur :

- **Max simultaneous PEAD positions** : ex. 8.
- **Earnings cluster avoidance** : si déjà N PEAD positions, ne pas ouvrir de nouvelle.
- **Sector concentration cap** : max 30 % par secteur, max 50 % par broad theme.
- **Volatility scaling** : `size = baseSize × min(2, max(0.5, refATR / atr))`.
- **Stop loss** : `entry - 2 × ATR` ou `entry × 0.92` (max -8 %).
- **Friction obligatoire** : identique aux autres setups (`(0.30 + 0.02 × holdDays) / 5 R`).

---

## 9. Validation framework

Pour qu'un futur backtest PEAD soit recevable :

| Critère | Valeur |
|---|---|
| Trades minimum sur 5 ans | ≥ 200 |
| PF post-friction | ≥ 1.3 |
| Années positives | ≥ 4/5 |
| Walk-forward 3 splits | ≥ 2/3 |
| Top 5 ticker share | < 60 % (PEAD doit être distribué — c'est tout son intérêt) |
| Edge decay | < ×1.5 |
| Inflation PF (CURRENT vs strict NEXT_OPEN T+2) | < ×1.05 |
| Test bear 2022 | PF ≥ 0.9 |

Si l'un de ces critères échoue, ne PAS promouvoir le setup.

---

## 10. Étapes de développement

1. ✅ **Cette PR** : foundation + audit dataset existant.
2. **PR future** : décision politique sur la source de données + script d'ingestion.
3. **PR future** : `tools/backtests/pead-signal-detect-v1.mjs` (génération de signaux sur dataset earnings, pas de backtest encore).
4. **PR future** : `tools/backtests/pead-backtest-v1.mjs` (backtest complet avec friction).
5. **PR future** : audit anti-look-ahead spécifique sur le code PEAD (symétrique aux PR #207, #208).
6. **PR future** : destruction tests PEAD (symétrique à la PR #213).
7. **PR future** : formalisation v1 PEAD si tous les critères passent.

---

## 11. Risques et limites assumées

- **PEAD edge possible mais pas garanti.** L'effet existe académiquement, mais sa magnitude sur 2021-2025 sur notre univers spécifique est inconnue. Le backtest peut très bien révéler un edge nul.
- **Demi-vie** : PEAD est probablement plus court qu'historiquement (passage à $0 trade en 2019). Tester plusieurs horizons.
- **Earnings clusters** : pendant les saisons d'earnings (avril, juillet, octobre, janvier), beaucoup de signaux simultanés. Gestion concentration nécessaire.
- **Estimates fiabilité** : si le consensus stocké est rétro-modifié par la source, on a un look-ahead. Validation manuelle obligatoire au début.
- **Univers limité** : 158 grandes caps US/EU. PEAD est historiquement plus fort sur small/mid caps — extension univers à considérer.

---

## 12. Interdictions explicites pour cette PR

- **NE PAS** construire le moteur PEAD complet.
- **NE PAS** télécharger des données externes.
- **NE PAS** activer en live.
- **NE PAS** modifier le runtime.
- **NE PAS** promettre des résultats avant le backtest.

Cette PR pose les fondations. Rien d'autre.

---

> **Conclusion** : PEAD est le candidat de recherche le plus sérieux à ce stade du projet. Mais il nécessite un dataset earnings que nous n'avons pas. La prochaine étape est une décision politique : quelle source choisir et à quel coût.
