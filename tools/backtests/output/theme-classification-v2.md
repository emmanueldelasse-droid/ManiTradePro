# Theme Classification v2 — ManiTradePro

> Généré le 2026-05-18T10:21:17.385Z par `tools/backtests/theme-classification-v2.mjs`.

**⚠ Classification heuristique v2** maintenue à la main, basée sur la connaissance du produit. Pas de ML, pas de scraping, pas de matrice de covariance réelle. Vise à améliorer les caps et la lisibilité, pas à fournir une vérité financière.

Les positions peuvent avoir **plusieurs tags** (ex. NVDA = semis_pure + ai_hypergrowth + mega_cap_tech), donc la somme des % par thème peut dépasser 100 % du portefeuille.

## 1. Résumé global

- Symboles dans le portefeuille : **10** (10 classifiés, 0 inconnus)
- Sous-thèmes détectés dans le plan original : **13**
- Entrées dans la table de classification : 179

## 2. Table de classification (positions du plan)

| Symbole | Thèmes | Confiance |
|---|---|---|
| APP | ai_hypergrowth, software_saas | MEDIUM |
| CRWD | cybersecurity, software_saas | HIGH |
| GLD | precious_metals, macro_defensive | HIGH |
| IYW | us_growth_etf, mega_cap_tech | HIGH |
| JPM | banks_financials | HIGH |
| MSTR | crypto_correlated_equity | HIGH |
| ROM | leveraged_tech, mega_cap_tech | HIGH |
| SOL | crypto_layer1 | HIGH |
| SPYG | us_growth_etf, broad_market | HIGH |
| VUG | us_growth_etf, quality_growth | HIGH |

## 3. Exposition par sous-thème — plan original

| Thème | Positions | Poids total | Symboles |
|---|---:|---:|---|
| us_growth_etf | 3 | 39.75 % | VUG, SPYG, IYW |
| mega_cap_tech | 2 | 17.89 % | IYW, ROM |
| software_saas | 2 | 14.57 % | APP, CRWD |
| quality_growth | 1 | 13.25 % | VUG |
| broad_market | 1 | 13.25 % | SPYG |
| ai_hypergrowth | 1 | 13.25 % | APP |
| precious_metals | 1 | 13.25 % | GLD |
| macro_defensive | 1 | 13.25 % | GLD |
| crypto_layer1 | 1 | 9.27 % | SOL |
| crypto_correlated_equity | 1 | 9.27 % | MSTR |

## 4. Exposition par sous-thème — plan friction-adjusted

| Thème | Positions | Poids total | Symboles |
|---|---:|---:|---|
| us_growth_etf | 3 | 43.26 % | VUG, SPYG, IYW |
| mega_cap_tech | 2 | 18.21 % | IYW, ROM |
| quality_growth | 1 | 14.42 % | VUG |
| broad_market | 1 | 14.42 % | SPYG |
| software_saas | 2 | 14.27 % | APP, CRWD |
| ai_hypergrowth | 1 | 12.98 % | APP |
| precious_metals | 1 | 12.98 % | GLD |
| macro_defensive | 1 | 12.98 % | GLD |
| crypto_correlated_equity | 1 | 9.08 % | MSTR |
| banks_financials | 1 | 9.08 % | JPM |

## 5. Clusters corrélés détectés

### Plan original

- **multi_position_theme** `us_growth_etf` : 3 positions (VUG, SPYG, IYW) — poids total 39.75 %
- **multi_position_theme** `software_saas` : 2 positions (APP, CRWD) — poids total 14.57 %
- **multi_position_theme** `mega_cap_tech` : 2 positions (IYW, ROM) — poids total 17.89 %

### Plan friction-adjusted

- **multi_position_theme** `us_growth_etf` : 3 positions (VUG, SPYG, IYW) — poids total 43.26 %
- **multi_position_theme** `software_saas` : 2 positions (APP, CRWD) — poids total 14.27 %
- **multi_position_theme** `mega_cap_tech` : 2 positions (IYW, ROM) — poids total 18.21 %

## 6. ETF très proches

_aucun chevauchement ETF détecté_

## 7. Risques de concentration cachés

**Plan original :**

- ⚠ Sous-thème "us_growth_etf" représente 39.75 % du portefeuille (3 positions : VUG, SPYG, IYW) — concentration cachée derrière le cap large tech_ai 60 %.

**Plan friction-adjusted :**

- ⚠ Sous-thème "us_growth_etf" représente 43.26 % du portefeuille (3 positions : VUG, SPYG, IYW) — concentration cachée derrière le cap large tech_ai 60 %.

## 8. Symboles non classés

_aucun_

## 9. Limites

- **Classification manuelle.** Toute évolution doit être commitée explicitement. Si l'univers ajoute un nouveau symbole, il faut le classifier à la main.
- **Confiance subjective.** HIGH / MEDIUM / LOW reflètent une appréciation experte, pas une mesure statistique.
- **Pas de corrélation mathématique.** Deux actifs marqués "semis_pure" peuvent en réalité être faiblement corrélés (ex. NVDA vs INTC). La table ne mesure pas la corrélation, elle suggère une corrélation thématique probable.
- **Multi-tag = chevauchement attendu.** La somme des % par thème dépasse 100 % par construction.
- **Pas d'intégration au pipeline.** Ce moteur tourne à la demande, pas dans `run-quant-pipeline-v1.mjs`. Volontaire pour garder la chaîne principale agnostique de la classification.
- **Pas de modification des sources.** `allocation-plan.json` et `allocation-plan-friction-adjusted.json` restent intacts.

## 10. Recommandations futures

- **Caps par sous-thème** dans `allocation-engine-v1.mjs` (priorité quant) : ajouter des caps fins comme `semis_pure ≤ 20 %`, `us_growth_etf ≤ 30 %`, `cybersecurity ≤ 15 %`. Permettrait de bloquer les portefeuilles faussement diversifiés.
- **Backfill ETF holdings** : pour chaque ETF, ingérer la composition réelle et propager les sous-thèmes sous-jacents. Permet d'attraper l'exposition cachée (ex. QQQ = ~40 % mega_cap_tech).
- **Calibrage par corrélation observée** : une fois le paper trading en route, mesurer la corrélation réalisée entre actifs et confronter à la classification heuristique. Réviser les tags qui ne tiennent pas.
- **Validation cross-source** : comparer la classification v2 avec un fournisseur externe (FactSet, MSCI GICS, etc.) si accès — uniquement après calibration interne, pour éviter le copier-coller passif.
- **Tag par stage de croissance** : ajouter `hypergrowth` / `mature` / `defensive` orthogonaux aux sous-thèmes sectoriels pour des caps croisés (ex. hypergrowth ≤ 40 %).
