# KNOWN_ISSUES — Bugs, incohérences, dette technique

> **Vérité unique sur ce qui ne va pas dans le projet.**
> Mise à jour obligatoire dès qu'un bug est découvert ou résolu.
> Dernière vérification : 2026-05-15, après PR #158.

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

### #1 🟠 Score volatile (composante live dans `calcDetailScore`)

**Description**
Le `score` actuel calculé par `calcDetailScore` (worker.js L2499) mélange composantes stables (bougies clôturées) et composantes live (`quote.change24hPct` dans momentum/risk). Résultat : le score affiché peut osciller entre 87 et 89 entre deux refresh sans qu'aucune bougie n'ait clôturé.

**Impact réel**
- Décision auto-cycle volatile : un même setup peut passer "Trade propose → A surveiller → Trade propose" sur 90 s
- Apprentissage faussé : le `score_at_open` enregistré sur un trade ouvert à 17:30 ≠ score que le bot voyait 30 s plus tard
- En passage broker réel : ordre passé sur un signal qui n'existe déjà plus à l'instant du fill

**Cause**
- Pondération du score inclut `0.20 × momentum` qui intègre `quote.change24hPct × 9`
- Pondération `0.18 × risk` qui inclut aussi `change24hPct`
- Représente ~42 pts sur 100 de volatilité potentielle

**Solution prévue**
Vague A.1 (en cours) :
- Calcul parallèle `strategicScore` basé uniquement sur bougies clôturées + modulateurs stables (regimeBonus + learningMalus)
- `liveContext` exposé séparément (price, change24hPct, newsBonus, aiModifier)
- Front affiche `strategicScore` comme score principal

**État** : non commencé. Documenté en plan dans SESSION.md.

---

### #2 🟠 `fxRateUsdToEur` fallback hardcodé 0.92

**Description**
Côté front (app.js L854), si Yahoo ne renvoie pas le taux EUR/USD valide, le fallback est `0.92` hardcodé. Aucune alerte, aucune trace.

**Impact réel**
Quand Yahoo plante :
- P&L des positions US affiché avec un taux faux (le vrai EUR/USD bouge entre 0.85 et 1.05 selon la conjoncture)
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
Architecture USD-centrique héritée des premières versions du bot. L'utilisateur étant français, la double conversion crée des artefacts.

**Solution prévue**
Vague C : basculer `capital_base` en EUR (devise de référence) ou exposer `originalCurrency` + `convertedCurrency` partout.

**État** : non commencé. Décision attendue de l'utilisateur (cf. plan refonte).

---

### #4 🟡 Pas de `snapshotId` entre opportunités et fiche détail

**Description**
La carte opportunité et la fiche détail font deux appels API séparés (`/api/opportunities` et `/api/opportunity-detail/:symbol`). Si un cycle cron tourne entre les deux affichages, l'utilisateur peut voir deux calculs différents pour le même actif.

**Impact réel**
- Cohérence visuelle imparfaite : score peut différer de 1-2 pts entre les deux écrans
- Régime peut différer si le cron a tourné entretemps

**Mitigation actuelle**
- PR #153 a aligné le score à la valeur brute `safetyScore` (élimine la divergence due aux bonus composites)
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

Seul `quotedAt` est présent (PR #136). L'utilisateur ne peut pas distinguer une analyse de 10 s d'une analyse de 4 h.

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
- PR #157 `tradeValidationEngine` détecte `stale_quote` à la fermeture (filet d'audit)
- Le check devise post-PR #143 empêche le mismatch EUR/USD

**Solution prévue**
Vague B.6 : `quoteQualityEngine` qui vérifie âge, écart, devise AVANT toute décision.

**État** : non commencé.

---

### #7 🟡 Pas de validation broker_api_available (futur trading réel)

**Description**
Pas implémenté car pas encore en réel. Quand on basculera, il faudra vérifier :
- Broker connecté
- Currency supportée par le broker
- Market_open côté broker (pas notre check)
- Quota d'ordres pas dépassé

**Impact actuel** : aucun (paper trading)

**Solution** : vague D (préparation broker réel) après les autres vagues.

---

### #8 🟢 `SUPABASE_TRADE_KEYS` ne contient pas `quality`

**Description**
La constante `SUPABASE_TRADE_KEYS` (worker.js L5627) qui sert au `handleTradesSync` (sync du front local vers la base) ne contient ni `quality` ni `quality_flags`.

**Impact réel** : aucun. C'est le comportement voulu — les trades synchronisés manuellement depuis le front arrivent en `quality=NULL`, qui sont traités comme `ok` par les filtres learning.

**Solution** : commentaire à ajouter en haut de la constante pour documenter le choix.

**État** : trivial, pas urgent.

---

### #9 🟢 Notification push lit encore `officialScore` directement

**Description**
`fireAlertNotification` (front, app.js L1592) construit le texte du toast via `priceDisplay(alert.targetPrice)`. La notification de signal algo (legacy, peu utilisée actuellement) lit `o.officialScore` au lieu de passer par `safetyScoreFrom`.

**Impact réel** : éphémère. Si l'utilisateur reçoit une notification push avec un score, c'est `officialScore` (composite) au lieu de `safetyScore` (brut) → divergence avec ce qu'il voit en cliquant.

**Mitigation** : la fonction de notification est rarement déclenchée (alertes prix uniquement).

**Solution** : remplacer par `safetyScoreFrom` quand on passera sur l'écran.

**État** : trivial.

---

### #10 🟢 `pad()` interne mort dans `getMarketStatus`

**Description**
Suite à la refonte horaires de bourse (PR #155), la fonction `pad(n)` définie en local dans `getMarketStatus` n'est plus appelée. Le formatage passe maintenant par `localHourToParis` qui retourne déjà "HH:MM".

**Impact réel** : aucun. Code mort.

**Solution** : suppression lors du prochain touchage du fichier.

---

### #11 🟢 `mtp_user_assets` ne valide pas le `quality` pré-fill

**Description**
Quand l'utilisateur ajoute manuellement un actif via `/api/user-assets`, le `validateSymbolOnProviders` (worker.js L9421) accepte des actifs dont seul `getEodhdCandles` répond (`partial_data` théorique). Pas de tag `quality` car ce n'est pas un trade.

**Impact réel** : aucun, car la qualité concerne les **trades clos**, pas les actifs en watchlist.

---

## Issues résolues récemment (historique récent)

| # | Description | Résolu par | Date |
|---|---|---|---|
| Faux stop ASML (devise mixée) | Garde-fou devise + `tradeValidationEngine` | PR #143 + #157 | 14-15/05 |
| Liste opp vs fiche : 3 prix différents | Single source Yahoo v8 chart + TTL courts | PR #135 → #138 | 14/05 |
| Scroll qui remonte tout seul | `.main-content.scrollTop` préservé + suppression render redondant | PR #141 + #142 | 14/05 |
| Apprentissage qui learn des faux stops | `tradeValidationEngine` + filtres `or=(quality.eq.ok,quality.is.null)` | PR #157 + #158 | 15/05 |
| Bot ouvre des positions un jour férié | Calendrier `MARKET_HOLIDAYS` + filtre dans `isTrainingCandidateAllowed` | PR #156 | 15/05 |
| Horaires NYSE en heure NY au lieu de Paris | `localHourToParis` via Intl | PR #155 | 14/05 |
| Carte "Paramètres du bot" dupliquée (Trades + Réglages) | Retrait de la version Trades | PR #147 | 14/05 |

---

## Risques d'architecture identifiés mais non encore actionnables

### Worker monolithique (9000 lignes dans un seul fichier)
- Lisibilité dégradée, agents IA peinent à naviguer
- Risque de collision merge fréquent
- À traiter en **vague D** (modularisation `/market/`, `/trading/`, `/learning/`, `/shared/`)

### Pas de tests automatiques
- Aucune CI ne valide le worker ou le front avant merge
- On compte sur le bug-hunter agent + tests manuels utilisateur
- Long terme : à mettre en place (vitest pour le worker, Playwright pour le front)

### Pas de versioning des payloads API
- Si on modifie un champ, le front cache peut planter
- `payloadVersion` à introduire avec `snapshotId` en vague B

### Cron Cloudflare sans visibilité
- `mtp_training_events` log les cycles mais aucune alerte si le cron skip plusieurs heures
- À monitorer côté Cloudflare Dashboard manuellement
