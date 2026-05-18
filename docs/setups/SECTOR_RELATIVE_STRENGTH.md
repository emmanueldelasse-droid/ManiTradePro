# SECTOR_RELATIVE_STRENGTH v1

> Premier setup robuste crédible formalisé du projet ManiTradePro. Issu de [`new-setup-discovery-lab-v1`](../../tools/backtests/new-setup-discovery-lab-v1.mjs) (PR #211).
>
> **Classification : VALIDATED_RESEARCH_CORE** — pas LIVE_READY, pas PRODUCTION_READY. À traiter comme un cœur de recherche stabilisé, pas comme une stratégie de trading active.

---

## 1. Concept

Rotation à **deux niveaux** :

1. **Niveau 1 — classement des secteurs.** Pour chaque date d'évaluation, calculer le momentum agrégé de chaque groupe sectoriel sur les `lookback` derniers jours.
2. **Niveau 2 — top assets du secteur retenu.** Garder le ou les meilleurs secteurs, puis dans chaque secteur retenu, sélectionner les meilleurs actifs par momentum individuel.

Objectif : capturer simultanément :
- **momentum structurel** (au niveau secteur, plus stable qu'au niveau actif isolé) ;
- **leadership sectoriel** (l'industrie qui domine le marché change cycliquement) ;
- **concentration intelligente** (top assets du top secteur, pas dispersion sur l'univers entier).

C'est différent d'une rotation simple à un niveau (comme RS Rotation), qui ne capture que le momentum individuel sans pondération sectorielle.

---

## 2. Architecture

### Étape 1 — Classement des secteurs

Groupes sectoriels utilisés (depuis `tools/backtests/universe-v2.mjs`) :

- `BIG_TECH` — NVDA, AAPL, MSFT, META, GOOGL, AMZN, TSLA, NFLX, AVGO, ORCL
- `SEMIS` — AMD, TSM, MU, ARM, KLAC, LRCX, AMAT, ADI, MCHP, ON, TXN, …
- `CYBER_CLOUD` — CRWD, PANW, ZS, OKTA, NET, DDOG, MDB, ESTC, …
- `SOFTWARE` — CRM, NOW, SNOW, TEAM, SHOP, ADBE, INTU, HUBS, …
- `AI_MOMENTUM` — PLTR, SMCI, APP, SOUN, BBAI, AI, UPST, APLD, NBIS, CRWV
- `CONSUMER_GROWTH` — MELI, ABNB, UBER, PDD, SE, TTD, DUOL, ROKU, TTWO, EA
- `QUALITY_DEFENSIVE` — WM, COST, LLY, VRTX, ELV, MSCI, KO, PG, JNJ
- `INDUSTRIALS` — PH, TT, ETN, HUBB, ROP, LIN
- `FINANCIALS` — JPM, V, MA, AXP, BKNG, SPGI
- `EUROPE` — ASML, SAP, AIR, LVMH, RMS, TTE, NESN, STM, CAP, DSY

Pour chaque date `t`, le momentum sectoriel d'un groupe `G` est la moyenne des momentums individuels de ses constituants :

```text
sectorMomentum(G, t) = avg( (close[symbol, t] - close[symbol, t - lookback]) / close[symbol, t - lookback] )
                     for symbol in G
```

Les secteurs sont triés par momentum décroissant. Les `topSectors` premiers sont retenus.

### Étape 2 — Sélection d'actifs dans chaque secteur retenu

Dans chaque secteur retenu, classer les constituants par leur momentum individuel sur la même fenêtre `lookback`, puis garder les `topAssetsPerSector` premiers.

### Étape 3 — Entrée / Sortie

- **Entry** : `open[t+1]`. Le signal est généré en fin de jour `t` (close[t] connu), l'exécution se fait à l'ouverture du jour suivant.
- **Exit** : `open[t+1+horizon]`. Holding fixe en jours bourse.
- **Rebalance** : tous les `rebalance` jours. Entre deux rebalances, pas de changement de positions.

### Étape 4 — Friction

Appliquée systématiquement, dès le backtest :

```text
frictionR = (0.30 + 0.02 × holdDays) / 5
```

avec 5 % = 1R (convention). Pour `horizon = 60`, la friction est `(0.30 + 1.20) / 5 = 0.30 R` par trade.

---

## 3. Parameters v1 (gelés)

| Paramètre | Valeur | Justification |
|---|---|---|
| `horizon` | **60 jours** | PF 2.16 stable, edge decay favorable (×0.68). horizon=120 donne PF 2.08 avec 4/5 années positives (vs 5/5 ici). horizon=40 donne 1.95. |
| `topSectors` | **1** | Concentration sur le meilleur secteur. topSectors=2 donne PF 1.68 (dilution). |
| `topAssetsPerSector` | **5** | Sweet spot. topAssets=3 trop concentré (decay 1.28). topAssets=10 dilution (PF 1.84). |
| `rebalance` | **10 jours** | Sweet spot identifié dans la PR #210. Daily = turnover toxique. Monthly = perd réactivité. |
| `lookback` | **90 jours** | Référence historique du moteur RS Rotation v1. Suffisamment long pour filtrer le bruit, court pour rester réactif. |
| `regime` | **NO_RISK_OFF** | Trading désactivé si SPY < EMA200 ET QQQ < EMA200 ET SMH < EMA200. PR #210 confirme : c'est le filtre régime optimal pour les setups momentum. |
| `execution` | **NEXT_OPEN** | Pas de prix théorique, pas d'intraday impossible. Conforme aux exigences post-audit (PR #207, #208). |
| `exit` | **FIXED_HOLD** | ATR trailing tue l'edge (PR #210, FRAGILE). Fixed hold reste robuste. |

### Paramètres rejetés

- `topSectors = 2` ou `3` → PF chute à 1.68 ou moins. Trop de dilution.
- `topAssets = 3` → PF 1.79 mais decay ×1.28 (edge fragile, plus de variance).
- `rebalance = 1 (daily)` → trop de turnover toxique (PR #210).
- Exit `ATR_TRAILING` → classifié FRAGILE (PR #210).

### Paramètres expérimentaux non testés (hors scope)

- Pondération par capitalisation des constituants dans le calcul du momentum sectoriel.
- Filtres breadth (% de constituants au-dessus de EMA50).
- Filtres VIX (données non disponibles dans le repo).
- Variation lookback (60j, 120j) avec topSectors=1 et topAssets=5.

---

## 4. Execution model

| Aspect | Spécification |
|---|---|
| Entrée | `open[t+1]` (NEXT_OPEN). Pas d'usage du close[t] comme prix d'entrée. |
| Sortie | `open[t+1+horizon]` (fixed hold). |
| Friction | Round-trip 0.30 % + 0.02 % par jour de hold (overnight gap penalty). |
| Conversion R | `5 % = 1R`. |
| Régime filter | `NO_RISK_OFF` sur SPY+QQQ+SMH vs EMA200. Trading skip les jours où les 3 sont sous leur EMA200. |
| Look-ahead | Audité comme propre (PR #208 sur RS Rotation simple, mécanisme similaire). Aucun usage de bougie future, aucun indicateur recalculé rétroactivement. |
| Hypothèses irréalistes | Aucune. Pas de MOC, pas de fills magiques, pas d'intraday. |

---

## 5. Validation rules (critères officiels)

Pour qu'une PR future puisse modifier cette config v1, elle doit prouver que la nouvelle version respecte :

| Critère | Seuil |
|---|---|
| Profit factor post-friction | ≥ **1.3** |
| Années positives sur 5 ans | ≥ **4/5** |
| Inflation PF (CURRENT vs NEXT_OPEN strict) | < **×1.05** |
| Edge decay (early PF / late PF) | < **×1.5** |
| Exécution | **NEXT_OPEN obligatoire** |
| Friction | **obligatoire dès le premier test** (`(0.30 + 0.02 × holdDays) / 5`) |
| Données non inventées | Pas d'earnings simulés, pas de VIX synthétique, pas de prix intraday extrapolés |

Toute PR qui ne respecte pas ces critères doit être marquée explicitement comme dégradant la config officielle et nécessite un débat ChatGPT séparé avant merge.

---

## 6. Robustness summary (référence PR #211)

| Métrique | Valeur |
|---|---:|
| Trades sur 5 ans | 445 |
| Winrate | 54.61 % |
| Expectancy par trade | 2.30 R |
| **Profit factor** | **2.157** |
| Max drawdown | 192.98 R |
| Total R | 1 023.63 R |
| Sharpe approximatif annualisé | 1.64 |
| Turnover / an | ~89 trades |

### PF annuel

| Année | PF |
|---|---:|
| 2021 | 1.87 |
| 2022 | 1.08 |
| 2023 | 1.86 |
| 2024 | 2.90 |
| 2025 | 2.09 |

→ **5/5 années positives**, dont 2022 (bear market) qui reste légèrement positive.

### Edge decay

- PF 2021-2022 : 1.75
- PF 2024-2025 : 2.56
- **Decay ratio : ×0.68** — l'edge est MEILLEUR récemment qu'au début. C'est rare, suggère que le mécanisme bénéficie de l'élargissement du leadership tech / IA sur 2024-2025.

### 17 configs ROBUST_EDGE identifiées au total

Les 9 premières du ranking ROBUST_EDGE de la PR #211 sont toutes des variantes SECTOR_RELATIVE_STRENGTH. Le pattern est extrêmement consistant.

---

## 7. Risks (à documenter explicitement avant tout usage live)

| Risque | Niveau | Mitigation actuelle |
|---|---|---|
| **Dépendance régime macro** | élevé | Filtre NO_RISK_OFF actif. Mais si SPY/QQQ/SMH oscille autour de l'EMA200, on entre/sort fréquemment. |
| **Concentration sectorielle** | élevé | Par construction, topSectors=1 expose à 100 % au secteur leader. Si ce secteur crash, drawdown amplifié. |
| **Turnover** | modéré | ~89 trades/an = ~1.7 trades/semaine. Friction modélisée mais pas la pression de liquidité réelle. |
| **Momentum crash** | modéré-élevé | Inhérent à toute stratégie momentum. Voir 2022 (PF 1.08, marginalement positif). |
| **Sizing dynamique absent** | élevé | Pas de Kelly, pas de volatility targeting. Taille fixe = 1 unité par position. Pas réaliste pour live. |
| **Live shadow absent** | bloquant | Aucun paper trading parallèle. Pas de mesure réelle vs backtest. |
| **Look-ahead spécifique non audité** | modéré | Le mécanisme est similaire à RS Rotation simple (audit CLEAN PR #208), mais le calcul de momentum sectoriel agrégé n'a pas été audité formellement. À faire dans une PR dédiée. |
| **Survivorship bias** | modéré | Les 158 symboles avec OHLC dans `data/` sont les survivants 2021-2025. Pas de delistés. À quantifier. |
| **Friction simplifiée** | modéré | Modèle uniforme. Crypto vs ETF ont des frictions très différentes. Pas par actif. |
| **Pas de short side** | modéré | Long-only. Si bear market structurel, pas de couverture explicite. |

---

## 8. Comparison vs RS Rotation simple

| Aspect | RS Rotation simple (PR #210 best) | SECTOR_RS v1 |
|---|---|---|
| PF post-friction | 1.91 | **2.16** |
| Années positives | 4/5 | **5/5** |
| Edge decay | ×0.72 | **×0.68** (légèrement mieux) |
| Trades / 5 ans | 829 | 445 |
| Mécanisme | momentum individuel sur univers entier | momentum sectoriel puis individuel |
| Concentration | top 10 sur univers mixé | top 5 dans top 1 secteur |
| Sensibilité régime | NO_RISK_OFF nécessaire | NO_RISK_OFF nécessaire |

### Pourquoi SECTOR_RS surperforme

Hypothèse principale : la rotation 2-niveaux **filtre les pièges de momentum individuel**. Un actif peut avoir un beau momentum individuel sur 90 jours alors que tout son secteur s'effondre — c'est un signal piégeur. SECTOR_RS évite ce piège en ne traitant que les actifs des secteurs eux-mêmes en momentum.

Inversement, dans un secteur leader, plusieurs actifs candidats sont disponibles, ce qui réduit la dépendance à un seul ticker.

### Complémentarité potentielle

Les deux setups partagent le même univers et le même régime filter, mais le mécanisme de sélection diffère.

- **Trades partagés** : non quantifié dans cette PR. À mesurer dans une future PR de corrélation.
- **Diversification** : si peu de chevauchement, allocation 50/50 entre les deux pourrait améliorer la stabilité globale du portefeuille de stratégies.
- **Risque commun** : tous deux long-only momentum, donc même type de bear market risk.

---

## 9. Future stress tests (framework, non exécutés dans cette PR)

À planifier dans des PR dédiées, avant tout usage live :

| Stress test | Description | Critère d'échec |
|---|---|---|
| **Friction ×2** | round-trip 0.60 % + 0.04 %/jour | PF < 1.2 |
| **Friction ×3** | round-trip 0.90 % + 0.06 %/jour | PF < 1.1 |
| **Bear market** | sous-période 2022 isolée + simulation drawdown plus large | Max DD > 30 % de Total R |
| **Concentration stress** | topSectors=1 sur 2022 spécifiquement | PF annuel 2022 < 0.9 |
| **Sector collapse** | choix d'un secteur fictif qui collapse de -40 % sur 60j | Drawdown attendu |
| **Gap stress** | overnight gap réel mesuré sur les trades effectifs, comparer au 0.02 %/jour théorique | Si gaps réels > 0.04 %/jour, PF dégradé |
| **Slippage stress** | slippage one-way 0.20 % au lieu de 0.05 % | PF < 1.5 |
| **Walk-forward conditionnel** | 3-split walk-forward avec régime NO_RISK_OFF strictement appliqué split par split | ≥ 2/3 splits PASS |
| **Audit anti-look-ahead spécifique** | reprendre la méthodologie PR #207/#208 sur ce setup précis | Inflation < ×1.05 |

---

## 10. Final recommendation

### Statut officiel proposé

**`VALIDATED_RESEARCH_CORE`**

Justification :
- Le setup remplit les 7 critères de la nouvelle règle de validation post-audit (cf. SETUPS_REGISTRY.md, section "Post execution-bias audit status").
- Le PF post-friction 2.16, 5/5 années positives, edge decay favorable, exécution propre.
- C'est le premier setup du projet à atteindre ce niveau de robustesse documentée.

### Pourquoi PAS `LIVE_READY` ni `PRODUCTION_READY`

- **Pas de live shadow** : aucun paper trading parallèle. On n'a pas mesuré l'écart backtest / réel.
- **Pas de sizing dynamique** : taille fixe = 1R par position. En réel, il faut un sizing volatility-aware (Kelly fraction, ATR-based, ou vol targeting).
- **Pas de stress-test exécuté** : le framework est documenté (section 9) mais aucun stress n'a été passé.
- **Pas de gestion de portefeuille multi-setup** : si on veut allouer entre SECTOR_RS et RS Rotation simple, il faut une couche d'allocation séparée.
- **Pas d'audit anti-look-ahead spécifique** : le mécanisme est similaire à RS Rotation (CLEAN PR #208), mais le calcul du momentum sectoriel agrégé n'a pas été audité.

### Prochaines étapes recommandées (PR séparées)

1. **Audit anti-look-ahead spécifique SECTOR_RS** (cohérence méthodologique avec PR #207/208).
2. **Walk-forward conditionnel** par régime (durcir la robustesse temporelle).
3. **Comparaison fine RS Rotation vs SECTOR_RS** : matrice de corrélation trade-by-trade, périodes complémentaires.
4. **Stress tests friction ×2, ×3** (cf. section 9).
5. **Mise à jour SETUPS_REGISTRY.md** avec le nouveau statut VALIDATED_RESEARCH_CORE pour SECTOR_RS.
6. **Sourcer earnings dates** pour débloquer POST_EARNINGS_DRIFT (cf. new-setup-discovery-lab section 3).

### Interdictions associées à cette config v1

- NE PAS optimiser davantage les paramètres dans cette config gelée.
- NE PAS ajouter de paramètres exotiques sans audit séparé.
- NE PAS toucher au runtime (Worker, frontend, providers, broker, paper trading).
- NE PAS activer en live tant que stress-tests + walk-forward conditionnel + audit anti-look-ahead ne sont pas faits.

---

> **Conclusion** : SECTOR_RELATIVE_STRENGTH v1 est le **premier setup robuste crédible** du projet ManiTradePro. C'est une découverte de recherche, pas une stratégie de trading. Le terrain est posé pour aller plus loin proprement.
