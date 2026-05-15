# KNOWN_ISSUES — Bugs, incohérences, dette technique

## Explication simple

Ce fichier liste **ce qui ne va pas dans le projet** : bugs identifiés, incohérences connues, dette technique, risques d'architecture. C'est la référence pour ne pas redécouvrir un problème déjà documenté.

---

## Légende

| Niveau | Description |
|---|---|
| 🔴 CRITIQUE | Casse une fonction, fait perdre de l'argent virtuel, pollue l'apprentissage |
| 🟠 ÉLEVÉ | Visible côté utilisateur, peut induire en erreur |
| 🟡 MOYEN | Inconvénient UX, faux positif limité |
| 🟢 BAS | Cosmétique, dette propre |

---

## Issues actuelles (mai 2026)

### #1 ✅ Score volatile — résolu en vague A.1 (mai 2026)

**Description initiale**
Le `score` calculé par `calcDetailScore` mélangeait composantes stables (bougies clôturées) et composantes live (`quote.change24hPct` dans momentum/risk). Le score pouvait osciller entre 87 et 89 entre deux refresh sans qu'aucune bougie n'ait clôturé.

**Solution livrée (vague A.1)**
`calcDetailScore` retourne maintenant DEUX nouveaux objets en plus du payload existant :
- `strategicAnalysis` — score recalculé en retirant `change24hPct` (momentum/risk/participation) et `volume24h` (risk/context/participation), avec `dataQuality` neutralisé à 80 et SANS `regimeBonus` ni `newsBonus`. Applique uniquement `regimeMalus` (validité config vs régime, stable par batch) et `learningMalus` (bucket histoire, stable). **Garanti stable entre deux clôtures de bougies.**
- `liveContext` — container des inputs volatils (`change24hPct`, `volume24h`, `freshness`, `regimeBonus`, `newsBonus`) + `scoreImpact: { strategicScore, compositeScore, delta }` pour diagnostiquer l'écart.

Les champs legacy (`score`, `breakdown`, `plan`, `plan.safetyScore`, etc.) sont **inchangés** pour préserver `buildWorkerPlan` et le paper trading. Le front peut basculer son affichage sur `strategicAnalysis.score` quand il veut une valeur stable.

**État** : ✅ résolu côté Worker. Adaptation front (afficher strategicAnalysis.score) à faire dans une PR séparée si désiré.

---

### #2 🟠 `fxRateUsdToEur` fallback hardcodé 0.92

**Description**
Côté front (dans `assets/app.js`), si Yahoo ne renvoie pas le taux EUR/USD valide, le fallback est `0.92` hardcodé. Aucune alerte, aucune trace.

**Impact réel**
Quand Yahoo plante :
- P&L des positions US affiché avec un taux faux
- Conversion EUR → USD côté affichage devient incorrecte
- Aucune information à l'utilisateur sur la source du taux utilisé

**Cause**
Implémentation pragmatique mais non robuste. Pas de `fxRateUsedAt` ni `fxRateSource` exposés.

**Solution prévue**
Vague C : `fxEngine` unifié avec `convert(amount, from, to, asOf) → {value, fxRate, fxSource, fxAt}`.

**État** : non commencé.

---

### #3 🟠 `capital_base` stocké en USD, affiché en EUR

**Description**
`mtp_training_settings.capital_base` est en USD (défaut 10 000). L'utilisateur voit du EUR partout (P&L, équité, allocation) via conversion `× fxRateUsdToEur()`.

**Impact réel**
Quand `fxRateUsdToEur` varie :
- L'équité affichée fluctue alors que les positions n'ont pas bougé
- Le P&L réalisé total semble dériver
- L'utilisateur peut prendre une décision de sizing basée sur une équité fausse

**Cause**
Architecture USD-centrique héritée des premières versions du bot.

**Solution prévue**
Vague C : basculer `capital_base` en EUR (devise de référence) ou exposer `originalCurrency` + `convertedCurrency` partout.

**État** : non commencé. Décision attendue de l'utilisateur.

---

### #4 🟡 Pas de `snapshotId` entre opportunités et fiche détail

**Description**
La carte opportunité et la fiche détail font deux appels API séparés (`/api/opportunities` et `/api/opportunity-detail/:symbol`). Si un cycle cron tourne entre les deux affichages, l'utilisateur peut voir deux calculs différents pour le même actif.

**Impact réel**
- Cohérence visuelle imparfaite : score peut différer de 1-2 pts entre les deux écrans
- Régime peut différer si le cron a tourné entretemps

**Mitigation actuelle**
- PR récente a aligné le score affiché sur la valeur brute `safetyScore`
- Caches mémoire 2 min sur les quotes individuelles limitent la dérive

**Solution prévue**
Vague B.4 : `snapshotId` propagé dans tous les payloads. La fiche détail saurait si elle affiche un snapshot ou un recalcul.

**État** : non commencé.

---

### #5 🟡 Timestamps manquants sur certains payloads

**Description**
Le payload `/api/opportunities` ne porte pas systématiquement :
- `scoreCalculatedAt`
- `candlesUpdatedAt`
- `planGeneratedAt`

Seul `quotedAt` est présent. L'utilisateur ne peut pas distinguer une analyse de 10 s d'une analyse de 4 h.

**Impact réel**
- Décision opaque : "ce score date de quand ?"
- Si un cycle cron a planté, la fiche peut afficher des données stale sans alerte

**Solution prévue**
Vague B.5 : timestamps complets sur toutes les sorties API + badges UI.

**État** : non commencé.

---

### #6 🟡 `quoteQualityEngine` absent

**Description**
Aucune validation systématique :
- Âge de la quote (peut être > 2 min sans alerte)
- Écart entre providers (Yahoo dit 152, Twelve dit 145 → pas de signal)
- Quote sans `currency` explicite acceptée

**Impact réel**
- Faux stop possible si quote vieille de plusieurs heures
- Pas de détection de provider qui dérive

**Mitigation partielle**
- `tradeValidationEngine` détecte `stale_quote` à la fermeture (filet d'audit)
- Le check devise empêche le mismatch EUR/USD

**Solution prévue**
Vague B.6 : `quoteQualityEngine` qui vérifie âge, écart, devise AVANT toute décision.

**État** : non commencé.

---

### #7 🟡 Pas de validation broker (futur trading réel)

**Description**
Pas implémenté car pas encore en réel. Quand on basculera, il faudra vérifier :
- Broker connecté
- Currency supportée par le broker
- Market_open côté broker (pas notre check)
- Quota d'ordres pas dépassé

**Impact actuel** : aucun (paper trading)

**Solution** : préparation broker à prévoir après les vagues A/B/C/D.

---

### #8 🟢 `SUPABASE_TRADE_KEYS` ne contient pas `quality`

**Description**
La constante `SUPABASE_TRADE_KEYS` (dans `cloudflare-worker/worker.js`) qui sert au `handleTradesSync` ne contient ni `quality` ni `quality_flags`.

**Impact réel** : aucun. C'est le comportement voulu — les trades synchronisés manuellement depuis le front arrivent en `quality = NULL`, qui sont traités comme `ok` par les filtres learning.

**Solution** : commentaire à ajouter en haut de la constante pour documenter le choix.

**État** : trivial, pas urgent.

---

### #9 🟢 Notification push lit encore `officialScore` directement

**Description**
La notification de signal algo (legacy, peu utilisée actuellement) lit `o.officialScore` au lieu de passer par `safetyScoreFrom`.

**Impact réel** : éphémère. Si l'utilisateur reçoit une notification push avec un score, c'est `officialScore` (composite) au lieu de `safetyScore` (brut) → divergence avec ce qu'il voit en cliquant.

**Mitigation** : la fonction de notification est rarement déclenchée.

**Solution** : remplacer par `safetyScoreFrom` quand on passera sur l'écran.

**État** : trivial.

---

### #10 🟢 `pad()` interne mort dans `getMarketStatus`

**Description**
Suite à la refonte horaires de bourse, la fonction `pad(n)` définie localement dans `getMarketStatus` (côté `assets/app.js`) n'est plus appelée. Le formatage passe par `localHourToParis` qui retourne déjà "HH:MM".

**Impact réel** : aucun. Code mort.

**Solution** : suppression lors du prochain touchage du fichier.

---

### #11 🟢 `mtp_user_assets` : pas de tag qualité

**Description**
`validateSymbolOnProviders` accepte des actifs dont seul `getEodhdCandles` répond. Pas de tag `quality` car ce n'est pas un trade.

**Impact réel** : aucun. La qualité concerne les **trades clos**, pas les actifs en watchlist.

---

## Issues résolues récemment

| Description | Résolu par | Note |
|---|---|---|
| Faux stop ASML (devise mixée) | Garde-fou devise + `tradeValidationEngine` | Migration 015 + 016 |
| Liste opp vs fiche : 3 prix différents | Single source Yahoo v8 chart + TTL courts | Conservé en place |
| Scroll qui remonte tout seul | `.main-content.scrollTop` préservé + suppression render redondant | OK |
| Apprentissage qui learn des faux stops | `tradeValidationEngine` + filtres `or=(quality.eq.ok,quality.is.null)` | Tous les SELECT d'analyse filtrent maintenant |
| Bot ouvre des positions un jour férié | Calendrier `MARKET_HOLIDAYS` + filtre dans `isTrainingCandidateAllowed` | Tables 2026-2027 USD/EUR/CHF/GBP |
| Horaires NYSE en heure NY au lieu de Paris | `localHourToParis` via Intl | DST géré auto |
| Carte "Paramètres du bot" dupliquée | Retrait de la version Trades | Carte uniquement dans Réglages |
| Score volatile entre deux refresh (#1) | Vague A.1 : `strategicAnalysis` + `liveContext` séparés dans `calcDetailScore` | `strategicAnalysis.score` stable, `liveContext` isole les inputs volatils |

---

## Risques d'architecture identifiés mais non encore actionnables

### Worker monolithique (~9 800 lignes dans un seul fichier)
- Lisibilité dégradée, agents IA peinent à naviguer
- Risque de collision merge fréquent
- À traiter en **vague D** (modularisation `/market/`, `/trading/`, `/learning/`, `/shared/`)

### Pas de tests automatiques
- Aucune CI ne valide le worker ou le front avant merge
- On compte sur l'agent bug-hunter + tests manuels utilisateur
- Long terme : à mettre en place (Vitest pour le worker, Playwright pour le front)

### Pas de versioning des payloads API
- Si on modifie un champ, le front cache peut planter
- `payloadVersion` à introduire avec `snapshotId` en vague B

### Cron Cloudflare sans visibilité
- `mtp_training_events` log les cycles mais aucune alerte si le cron skip plusieurs heures
- À monitorer côté Cloudflare Dashboard manuellement

---

## Non encore fait

La liste suivante est aussi visible dans `SESSION.md`, dupliquée ici pour faciliter la lecture du fichier issues :

- **Vague A.1** : séparation `strategicScore` vs `liveContext`
- **Vague B.4** : `snapshotId` propagé
- **Vague B.5** : timestamps complets sur tous les payloads
- **Vague B.6** : `quoteQualityEngine`
- **Vague C.7** : `fxEngine` unifié
- **Vague C.8-9** : `originalCurrency` / `convertedCurrency` partout + capital base EUR
- **Vague D.10** : modularisation worker
- **Vague D.11** : modularisation front
- **Tests auto** : Vitest worker + Playwright front
- **Préparation broker réel** : adapters, slippage-engine

---

## Limites de fiabilité

- Les chiffres (volatilité ~42 pts, WR < 30 %, etc.) sont des observations / pondérations du code actuel. À recroiser avec le code si modifié.
- Les "issues résolues" ne contiennent volontairement pas de numéros de PR (qui peuvent être renommés ou squashés) — pour la traçabilité fine, voir `SESSION.md` qui maintient la liste des PRs récentes.
