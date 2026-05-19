# BOT_OBJECTIVE — Constitution officielle du projet ManiTradePro

> **Ce fichier est la vérité produit absolue du projet.**
> En cas de doute sur une priorité, une décision technique, une fonctionnalité, on lit ce fichier avant tout autre.
> Toute évolution qui contredit ce document doit être refusée ou faire l'objet d'une discussion explicite avec l'utilisateur.

---

## Explication simple

Ce fichier dit **à quoi sert vraiment ManiTradePro**, ce qu'il faut faire en priorité, ce qu'il faut éviter, et ce qui est interdit. C'est la boussole du projet. Quand Claude, ChatGPT ou n'importe quelle IA travaille sur ce projet, elle doit relire ce fichier en premier pour éviter de partir dans une mauvaise direction.

---

## 1. Objectif réel du projet

### Le vrai but de ManiTradePro

- Analyser des actifs réels (actions, crypto, forex, matières premières).
- Détecter les trades les plus sûrs possibles.
- Éviter les mauvais trades.
- Apprendre des erreurs passées pour réduire ces mauvais trades.
- Améliorer progressivement la qualité des décisions.
- Préparer un futur passage à un vrai bot de trading, avec de l'argent réel, quand le moteur sera suffisamment fiable.

### Ce que le projet n'est pas

ManiTradePro **n'est pas** un dashboard de trading.

Le dashboard (interface graphique, écrans, graphiques) est uniquement :

- un outil de lecture (voir ce que pense le moteur),
- un outil de contrôle (lancer un cycle, fermer une position, modifier les réglages),
- un outil de suivi (historique, P&L, alertes).

Le **vrai produit**, c'est le **moteur de décision**. Le dashboard sert à le piloter, pas à le remplacer.

### Ce que le projet ne doit pas devenir

- Une app de news.
- Une app de graphiques jolis mais sans décision.
- Une app pleine de widgets « parce que ça fait pro ».
- Une app « belle mais inutile ».
- Une app où le design passe avant la qualité du moteur.

---

## 2. Priorité absolue

Quand il faut choisir entre deux travaux, l'ordre de priorité est strict :

1. **Qualité des données** (sources fiables, devises correctes, timestamps clairs)
2. **Fiabilité des prix** (live vrai, pas de prix inventé, pas de prix faux)
3. **Cohérence des scores** (un même actif doit afficher le même score partout)
4. **Validation des trades** (un trade clos doit être propre avant d'alimenter l'apprentissage)
5. **Qualité du paper trading** (entrées et sorties réalistes, intra-tracking fiable)
6. **Qualité de l'apprentissage** (les buckets ne doivent contenir que des trades propres)
7. **Gestion du risque** (daily loss, weekly loss, consecutive losses, cooldown)
8. **Cohérence du moteur** (mêmes règles, mêmes résultats, mêmes décisions, à conditions égales)
9. **Stabilité globale** (pas de régression, pas de plantage, pas de cron qui boucle)
10. **UI / design / confort utilisateur**

> **Règle dure** : le design ne passe **jamais** avant la logique de trading. Si une amélioration UI rend la logique moins fiable, elle est refusée.

---

## 3. Ce qui est considéré comme une réussite

Un bon résultat pour ManiTradePro, c'est :

- Un trade cohérent (l'utilisateur comprend pourquoi le bot l'a pris).
- Un trade bien filtré (les setups faibles ont été écartés).
- Un trade compréhensible (le score, la décision et le plan racontent la même histoire).
- Un trade avec un bon rapport risque/récompense.
- Un trade basé sur des données fiables (live vrai, pas de fallback périmé).
- Un trade pris pour de bonnes raisons (pas un hasard, pas un faux signal).
- Un apprentissage utile (les buckets perdants sont identifiés et pénalisés).
- Une amélioration progressive des performances mesurables sur la durée.

---

## 4. Ce qui est considéré comme un échec

Un mauvais résultat, c'est :

- Un faux signal (le bot prend un trade qui n'avait pas de logique réelle).
- Un prix incohérent (la carte dit 208, la fiche dit 235, le marché est à 240).
- Un mauvais stop (déclenché à tort à cause de données mélangées).
- Un problème de devise (USD comparé à EUR comme si c'était la même chose).
- Un trade pris avec des données douteuses (quote différée, snapshot vieux d'heures).
- Un score incohérent (qui change d'une seconde à l'autre sans raison).
- Un trade ouvert hors de la logique (jour férié, marché fermé, hors des règles).
- Un apprentissage qui se nourrit de données fausses (faux stops, prix faux).
- Une fonctionnalité ajoutée qui rend le moteur plus complexe sans le rendre meilleur.

---

## 5. Règles absolues du projet

### Règle 1 — Ne jamais inventer de données

Aucun prix généré « pour faire joli ». Aucune bougie reconstruite à partir d'une moyenne. Aucune valeur « estimée » présentée comme réelle. Si la donnée n'est pas disponible, on l'affiche comme indisponible.

### Règle 2 — Ne jamais afficher un prix faux

Si on n'a pas de prix fiable, on affiche « donnée indisponible », « dernière clôture » ou « différé ». Jamais un prix sans contexte ni source.

### Règle 3 — Ne jamais mélanger devises sans conversion claire

Un stop en USD ne se compare jamais à un prix live en EUR. Toute conversion doit afficher le taux utilisé et sa source. Cas réel à ne plus jamais reproduire : ASML stoppé à tort parce qu'un prix EUR a été comparé à un stop USD.

### Règle 4 — Ne jamais présenter une donnée différée comme du temps réel

Si la source est différée (Twelve Data free tier = 15 min de retard, EODHD EU = 15-20 min), le badge doit le dire clairement : « différé 15 min ». Pas de « live » menteur.

### Règle 5 — Le score stratégique doit rester stable

Le score d'analyse (sûreté, exploitabilité) doit être calculé sur des bougies clôturées. Il ne doit pas bouger toutes les secondes parce que le prix live a changé. Le score d'un actif à 9 h doit être le même à 9 h 02, sauf si une bougie a effectivement clôturé entre les deux.

### Règle 6 — Le live sert à valider l'entrée réelle, pas à reconstruire le score

Le prix live sert à :

- vérifier le prix actuel,
- déclencher un stop ou un take profit,
- calculer le P&L instantané d'une position ouverte,
- afficher l'écart entre entry théorique et marché réel.

Le live **ne sert pas** à recalculer le score. Le score reste stable. Le live est une couche **par-dessus**, pas **à la place de**.

### Règle 7 — Le bot ne doit apprendre QUE sur des trades fiables

Un trade clos sur une donnée mélangée, un faux stop, une devise incohérente, ne doit jamais entrer dans les buckets d'apprentissage. Le `tradeValidationEngine` tag chaque trade clos `ok / suspect / invalid`. Seuls les `ok` (et les trades historiques avant validation, traités comme `ok` par défaut) alimentent l'apprentissage.

### Règle 8 — La stabilité passe avant les nouvelles fonctionnalités

Avant d'ajouter une feature, on vérifie :

- Est-ce que le moteur actuel est stable ?
- Est-ce que cette feature crée un risque de régression ?
- Est-ce que cette feature améliore vraiment le moteur, ou est-ce du confort UI ?

Si la stabilité est en doute, on attend.

### Règle 9 — La logique trading passe avant l'UI

Si un travail UI/UX rend le moteur moins fiable (par exemple en cachant un avertissement de qualité), il est refusé. Le moteur dicte ce que l'UI doit montrer, pas l'inverse.

### Règle 10 — Chaque modification doit améliorer une de ces trois choses

- La cohérence du système.
- La fiabilité des données.
- La qualité du moteur de décision.

Si une modification n'améliore aucune des trois, elle ne doit pas être faite.

---

## 6. Rôle de l'IA dans le projet

### L'IA n'a pas autorité finale sur les trades

L'IA (Claude ou autre) :

- **ne décide pas** d'ouvrir un trade à la place du moteur quantitatif,
- **ne remplace pas** le scoring technique (RSI, EMA, ATR, Donchian, etc.),
- **agit uniquement** comme filtre contextuel secondaire (lire les news, donner un avis qualitatif, détecter une anomalie évidente).

### Le moteur principal reste quantitatif

La décision d'ouvrir, fermer ou ignorer un trade repose sur :

- Le score (sûreté, exploitabilité, dossier).
- Les règles quantitatives (RR, distance entrée, ADX, EMA crossover).
- Les données de marché réelles.
- Les validations de risque (daily/weekly loss, cooldown).
- Les filtres de session (jours fériés, heures de marché).

L'IA peut **moduler** ces décisions, jamais les **remplacer**.

### Ce que l'IA peut faire

- Aider à comprendre une news (sentiment, classification).
- Filtrer (« cette news contredit fortement le trade proposé, prudence »).
- Contextualiser (« régime macro RISK_OFF + setup baissier = cohérent »).
- Détecter une anomalie évidente (« le ticker ASML est en chute libre de 30 % alors que le marché est calme, vérifier »).

### Ce que l'IA ne doit jamais faire

- Halluciner un signal qui n'existe pas dans les données.
- Inventer une probabilité (« 73 % de chance de hausse » sans calcul réel derrière).
- Créer une décision arbitraire (« je sens que ce trade va marcher »).
- Modifier seule un score sans justification chiffrée.

---

## 7. Objectif du paper trading

### À quoi sert le paper trading

- Tester le moteur sur de vrais marchés.
- Mesurer les résultats sans risque financier.
- Détecter les erreurs (faux stops, faux signaux, problèmes de devise).
- Entraîner le système d'apprentissage.
- Calibrer les règles (seuils minimaux, sizing, cooldown).

### Ce que le paper trading ne doit pas être

- Un simulateur avec des faux prix.
- Un simulateur avec des faux marchés (synthétiques, générés).
- Un simulateur qui invente des trades juste pour remplir l'historique.

### Ce qui est fictif et ce qui est réel

| Élément | État |
|---|---|
| Capital | **Fictif** (paramétré à 10 000 USD par défaut) |
| Prix d'entrée | **Réel** (provider live, pas inventé) |
| Prix de sortie | **Réel** (provider live ou EOD selon dispo) |
| Stop loss touché | **Réel** (tracker intraday sur prix réel) |
| Take profit touché | **Réel** (idem) |
| Sizing | Calculé sur le capital fictif mais selon les vraies règles |
| Slippage | **Pas modélisé** pour l'instant (à ajouter avant le réel) |

Toutes les données de marché doivent rester réelles. C'est ce qui permet à l'apprentissage d'être utile pour le futur passage en réel.

---

## 8. Objectif de l'apprentissage

### Ce que l'apprentissage n'est pas

L'apprentissage **n'est pas** :

- « de l'IA magique »,
- un modèle deep learning entraîné sur tout et n'importe quoi,
- un outil pour prédire le marché.

### Ce que l'apprentissage doit faire

Plus simplement :

- **Identifier les setups qui marchent vraiment.** Si le bucket `pullback|long|RISK_ON|stock` a 35 trades et 60 % de réussite, il est validé. S'il a 35 trades et 30 % de réussite, il est pénalisé.
- **Identifier les conditions dangereuses.** Une combinaison setup × régime × asset class qui perd systématiquement est désactivée par les règles correctives 1-6.
- **Réduire progressivement les mauvais trades.** En relevant les seuils minimaux pour les buckets faibles, le bot prend moins de trades mais de meilleure qualité.
- **Améliorer les filtres.** Quand un faux signal est identifié, une nouvelle règle de validation est ajoutée au `tradeValidationEngine` pour le détecter à la fermeture.
- **Améliorer les scores.** Les modulateurs (regimeBonus, newsBonus, learningMalus) sont ajustés en fonction de ce qui marche réellement.

### Conditions pour qu'un apprentissage soit valide

- Suffisamment de trades dans le bucket (minimum 20).
- Trades tous `quality: ok` (les `suspect` et `invalid` sont exclus par les filtres `or=(quality.eq.ok,quality.is.null)`).
- Buckets clairement définis (setup × direction × régime × asset_class).
- Historique long (idéalement plusieurs régimes macro pour ne pas surajuster un seul contexte).

---

## 9. Ce qui est interdit

Liste explicite. Toute violation doit être refusée ou corrigée immédiatement.

- **Données fictives** : pas de prix généré, pas de bougie reconstruite, pas de quote inventée.
- **Faux prix** : pas de chiffre affiché sans source vérifiable.
- **Faux live** : un prix différé ne doit jamais être présenté comme du temps réel.
- **Mélange de providers sans contrôle** : si un provider est utilisé en fallback, c'est tagué dans la quote (`sourceUsed`, `freshness`, `quotedAt`).
- **Modifications non documentées** : toute PR doit passer par `CHECKLIST_MERGE.md`.
- **Quick fix** : pas de patch qui masque un problème sans le résoudre.
- **Patch sale** : pas de hack qui crée de la dette technique pour gagner du temps maintenant.
- **Complexité inutile** : une fonctionnalité ajoutée doit servir le moteur. Sinon, refusée.
- **Fonctionnalités gadget** : pas de feature « parce que c'est joli ». Si ça n'améliore pas la cohérence, la fiabilité ou la qualité du moteur, on ne l'ajoute pas.
- **UI prioritaire sur logique trading** : déjà couvert par la règle 9, mais répété ici pour insistance.

---

## 10. Conditions avant passage en bot réel

Le projet ne pourra envisager du trading réel (argent réel chez un broker) **que si** toutes les conditions suivantes sont réunies :

1. **Prix live fiables sur tous les actifs tradés** : pas de fallback différé silencieux. Si Yahoo plante sur LVMH, on doit le savoir et arrêter de trader LVMH plutôt que de basculer sur un Twelve différé de 15 min sans alerte.
2. **Devises propres** : conversion EUR/USD explicite, taux et timestamp affichés, plus de fallback hardcodé 0.92.
3. **Stops fiables** : aucun déclenchement sur données mélangées ou périmées. Le `tradeValidationEngine` doit avoir éliminé tous les faux stops connus.
4. **Timestamps cohérents** : `scoreCalculatedAt`, `candlesUpdatedAt`, `quoteUpdatedAt`, `planGeneratedAt` exposés et utilisés par le front pour signaler la fraîcheur réelle.
5. **Paper trading stable sur plusieurs mois** : pas de plantage, pas de cron qui boucle, pas de positions oubliées.
6. **Résultats bons sur la durée** : retour positif sur au moins 100 trades clos, plusieurs régimes macro traversés, ratio gain/perte favorable.
7. **Faux signaux maîtrisés** : le taux de trades `suspect` ou `invalid` doit rester sous un seuil acceptable (à définir, par exemple < 5 %).
8. **Données validées en continu** : `quoteQualityEngine` en place, alerte si écart inter-providers > seuil.
9. **Moteur stable** : pas de changement de scoring non maîtrisé. Toute évolution doit être validée par backtest et A/B.
10. **Régressions sous contrôle** : `docs/monitoring/KNOWN_ISSUES.md` à jour, aucun bug critique non résolu, processus de doc respecté à chaque merge.
11. **Slippage modélisé** : pas de prix d'exécution parfait. Une estimation réaliste du slippage doit être intégrée avant l'argent réel.
12. **Adapter broker prêt** : intégration testée avec un compte démo du broker choisi avant le moindre euro réel.

Tant que ces conditions ne sont pas réunies, **le projet reste en paper trading**, point.

---

## 11. Référence permanente

Ce fichier sert à empêcher les dérives. À chaque fois qu'une nouvelle idée arrive (« on pourrait ajouter X », « ça serait cool si Y »), la première question est :

> **Est-ce que cette idée respecte les 10 règles absolues et la liste des priorités ?**

Si oui, on peut envisager la PR.
Si non, on refuse ou on reformule.

Si Claude (ou ChatGPT, ou un futur développeur) suggère une modification qui contredit ce document, l'utilisateur doit pouvoir s'appuyer dessus pour dire **non, ce n'est pas la priorité du projet**.

---

## Non encore fait (cohérent avec les conditions de passage en réel)

Les éléments suivants sont planifiés mais non livrés. Tant qu'ils manquent, on ne peut pas envisager le réel.

- **Séparation `strategicScore` (stable) vs `liveContext` (volatile)** — règle 5 et 6 pas encore strictement appliquées.
- **`fxEngine` unifié** — règle 3 partiellement appliquée (garde-fou présent, mais conversion globale encore artisanale).
- **`quoteQualityEngine`** — règle 4 partiellement appliquée (badges existent, mais validation systématique absente).
- **`snapshotId` + timestamps complets** — cohérence inter-écrans pas totale.
- **Slippage modélisé** — pas commencé.
- **Adapter broker réel** — pas commencé.

Détail complet dans `docs/monitoring/KNOWN_ISSUES.md` et `SESSION.md`.

---

## Limites de fiabilité

Ce document est une constitution produit, pas une référence technique. Il décrit **ce que le projet doit être**, pas **comment il l'est aujourd'hui**. Pour l'état réel du code :

- `docs/project/ARCHITECTURE.md` pour le code.
- `docs/project/DATA_PIPELINE.md` pour les flux.
- `docs/quant/TRADING_LOGIC.md` pour la logique quant (scoring / setups / régimes) et `docs/project/TRADING_ENGINE.md` pour la logique moteur (exécution / sizing / safety).
- `docs/monitoring/PROVIDERS_MATRIX.md` pour les sources.
- `docs/monitoring/KNOWN_ISSUES.md` pour les écarts entre l'idéal (ce document) et le réel.
