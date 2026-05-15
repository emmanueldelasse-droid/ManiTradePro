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
- `strategicAnalysis` — score recalculé en retirant `change24hPct` (momentum/risk/participation) et `volume24h` (risk/context/participation), avec `dataQuality` neutralisé à 80 et SANS `regimeBonus` ni `newsBonus`. Applique uniquement `regimeMalus` (validité config vs régime, stable par batch) et `learningMalus` (bucket histoire, stable). **Conçu pour être stable entre deux clôtures de bougies sur les entrées live directes** — mais pas une garantie absolue tant que : (a) `regimeMalus` peut bouger si le régime macro est rafraîchi côté KV (cache 1 h), (b) `learningMalus` peut bouger si un nouveau trade clos publie ses stats, (c) la dernière bougie daily peut être encore ouverte selon le provider et le fuseau, (d) `snapshotId` n'est pas encore propagé (vague B.4).
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

**Solution livrée (vague B.4, mai 2026)**
`snapshotId` propagé dans tous les payloads. Hash déterministe FNV-1a 8 chars hex basé sur `symbol | timeframe | analysisType | candlesAt | regimeAt | learningAt`. Deux analyses avec les mêmes inputs analytiques produisent exactement le même snapshotId, indépendamment du prix live. Permet de comparer la carte d'opportunité et la fiche détail : `card.snapshotId === detail.snapshotId` ⇒ même état analytique. Le badge UI "recalcul détecté" reste à brancher côté front dans une PR séparée.

**État** : ✅ backend livré (PR à venir). Badge UI à brancher dans une PR front.

---

### #5 ✅ Timestamps analytiques — résolu en vague B.4 (mai 2026)

**Description initiale**
Le payload `/api/opportunities` ne portait pas systématiquement les timestamps de calcul (`scoreCalculatedAt`, `candlesUpdatedAt`, `planGeneratedAt`). Seul `quotedAt` (live) était présent. Impossible de distinguer une analyse de 10 s d'une analyse de 4 h.

**Solution livrée (vague B.4)**
4 timestamps analytiques exposés dans le payload + dans `strategicAnalysis` :
- `strategicCalculatedAt` — ISO du moment où `calcDetailScore` s'est exécuté
- `candlesUpdatedAt` — ISO de la dernière bougie utilisée
- `regimeUpdatedAt` — ISO de quand le régime macro a été calculé
- `learningSnapshotAt` — ISO de quand le `learningContext` a été pré-fetché

Ces timestamps sont strictement analytiques, **ne contiennent aucun input live** (pas de `quotedAt`, pas de `freshness`).

**État** : ✅ backend livré (PR à venir). Affichage front à brancher dans une PR séparée.

---

### #6 ✅ `quoteQualityEngine` — livré vague B.6 (mai 2026) + B.6.1 (correctif stale ≠ delayed)

**Description initiale**
Aucune validation systématique de l'âge des quotes, écart inter-providers, ou devise explicite.

**Solution livrée (vague B.6)**
Nouveau moteur `quoteQualityEngine(quote, candles, options)` synchrone qui produit un objet `quoteQuality` dans `liveContext` :
- `trustScore` 0-100 — agrégat indicatif
- `stale` — quote trop vieille en heures de marché (crypto > 120 s, delayed > 1800 s, live > 600 s — vague B.6.1)
- `delayed` — provider légalement différé (EODHD EU, Alpha Vantage)
- `marketClosed` — marché fermé (week-end, hors fenêtre par devise, jour férié)
- `abnormalSpread` — `|livePrice - lastClose| / ATR > 3` (5 pour crypto)
- `currencyMismatch` — quote.currency ≠ `getCurrencyForSymbol(symbol)`
- `providerConfidence` — high / medium / low / unsafe selon `sourceUsed`
- `executionSafe` — `true` si aucune anomalie disqualifiante
- `validationStatus` — 1ère raison disqualifiante par ordre de gravité
- `reasons[]` — liste explicite des flags actifs

**Périmètre strict** : agit uniquement sur la validation live. **N'altère PAS** `strategicAnalysis`, le score, le plan, le paper trading, le learning, ni les RR.

**État** : ✅ backend livré. Branchement broker réel + UI badges à venir dans des PRs séparées.

**Limites résiduelles** :
- Comparaison inter-providers non encore implémentée (un seul provider par quote)
- Heures de marché synchrones approximatives (USD 13:00-21:30 UTC, EUR/CHF/GBP 07:00-16:30 UTC) — large pour tolérer DST, peut donner un faux positif `marketClosed` à la marge
- `executionSafe` ne consulte pas encore `getMarketStatus` complet (front uniquement)

**Vague B.6.1 — correctif faux positif stale sur delayed quotes (mai 2026)**

Faux positif observé en runtime sur les quotes EODHD `delayed_15m` (NESN.SW, ASML.AS, AAPL via Alpha) : `stale: true` à cause de `ageSec > 600 s`, alors que la quote est juste différée de 15 min (comportement normal). Le brief B.6 disait pourtant : *"Le système doit distinguer stale ET delayed. Ce n'est PAS la même chose."*

**Fix livré** :
- Ordre inversé dans `quoteQualityEngine` : `delayed` calculé AVANT `stale`
- Seuil `maxAge` adapté : crypto 120 s, **delayed 1800 s** (30 min = 15 min légal + marge), live 600 s
- Une quote `delayed_15m` reste `stale: false` jusqu'à 30 min d'âge ; au-delà, elle devient effectivement stale (provider qui ne refresh plus)
- Aucun autre champ touché, aucun seuil critique modifié

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
| Score volatile entre deux refresh (#1) | Vague A.1 : `strategicAnalysis` + `liveContext` séparés dans `calcDetailScore` | `strategicAnalysis.score` stable par conception sur les entrées live directes ; stabilité absolue conditionnée à la vague B.4 (`snapshotId`) |
| Cohérence opp ↔ fiche détail (#4) | Vague B.4 : `snapshotId` propagé partout | Hash FNV-1a déterministe basé sur sources analytiques (candles + régime + learning). Indépendant du live. |
| Timestamps analytiques manquants (#5) | Vague B.4 : `strategicCalculatedAt`, `candlesUpdatedAt`, `regimeUpdatedAt`, `learningSnapshotAt` | Exposés dans `strategicAnalysis` et à la racine du payload |
| `quoteQualityEngine` absent (#6) | Vague B.6 : moteur synchrone produisant `quoteQuality` dans `liveContext` | 6 détections + trustScore + validationStatus + reasons[]. Périmètre strict : aucune modif scoring/plan/learning |

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
