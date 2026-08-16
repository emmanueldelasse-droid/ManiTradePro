# SESSION.md — ManiTradePro

> Carnet de bord court et exploitable. Les règles détaillées restent dans les fichiers canoniques spécialisés.
> Dernière mise à jour : 2026-08-16.

## État actuel

- **Objectif produit** : détecter les trades les plus sûrs possibles, apprendre uniquement à partir de paper trades fiables, améliorer progressivement le moteur avant tout argent réel.
- **Mode** : paper trading uniquement. Aucun broker réel, aucun capital réel.
- **Architecture en comparaison** : V1 = benchmark actuel ; V2 = challenger learning bot.
- **V1** : résultats récents positifs mais échantillon limité et forte concentration `continuation`; reste un benchmark, pas un edge validé.
- **V2 runtime vérifié le 2026-08-16** : `/api/v2/stats` répond `status=ok`, 121 trades clos.
- **V2 global pré-fix** : win rate 32,23 %, PF 1,0311, expectancy +9,9596, PnL +1 205,11, max drawdown 11 276,40.
- **V2 par setup pré-fix** : breakout PF 0,789 / expectancy négative ; pullback PF 1,0623 / quasi neutre ; mean_reversion PF 1,2667 / expectancy +56,54 sur 32 trades.
- **Limite majeure découverte** : plusieurs positions V2 quasi identiques ont été ouvertes simultanément sur le même symbole (ex. CRWD, ORCL, PANW). Les 121 trades pré-fix ne constituent donc pas 121 observations indépendantes.
- **Cause technique** : `worker-v2.js` possède déjà une garde `openBySymbol`, mais elle n'est pas atomique entre deux cycles concurrents. Deux cycles peuvent lire l'état avant que l'autre ait écrit sa position.

## PR active — #270 Anti-duplication V2

- **Branche** : `agent/v2-anti-duplicate-signal`.
- **Objectif unique** : empêcher atomiquement plusieurs positions V2 ouvertes sur le même symbole sans toucher aux setups, seuils, sizing ou sélection.
- **Livré** :
  - `cloudflare-worker/migrations/v2/003_one_open_position_per_symbol.sql` : index unique partiel PostgreSQL sur `symbol WHERE status='open'`.
  - Préflight non destructif : si des doublons ouverts existent déjà, la migration échoue explicitement et ne modifie aucune ligne.
  - `tools/v2/test/anti-duplicate-position-v2.test.mjs` : vérifie la contrainte DB, le caractère non destructif et le maintien de `openBySymbol` côté Worker.
- **Impact runtime** : oui, uniquement après application de la migration 003 ; une seconde insertion concurrente du même symbole est refusée par PostgreSQL.
- **Impact quant** : aucun changement de setup, signal, seuil, RR ou sizing. Impact méthodologique positif : observations futures plus propres et risque non multiplié par une même idée.
- **Impact données historiques** : aucun. Les 121 trades actuels restent la cohorte `V2_PRE_ANTI_DUP_FIX` et ne doivent pas être mélangés avec la future cohorte post-fix pour juger V2.
- **Limite restante** : le Worker peut compter un conflit unique comme une erreur de cycle ; le doublon est néanmoins empêché. Amélioration de reporting à faire séparément si nécessaire.
- **Migration** : requise dans Supabase avant de considérer le correctif actif en production V2.

## Décision V1 vs V2

- **Aucune décision définitive** au 2026-08-16.
- V1 reste le benchmark provisoire.
- V2 doit être réévaluée uniquement sur une cohorte post-fix propre.
- Critères de décision : expectancy, profit factor, drawdown, concentration PnL, stabilité temporelle, qualité d'exécution et nombre d'observations indépendantes.
- Ne pas optimiser les setups V2 avant d'avoir rétabli l'intégrité de l'expérience.

## Prochaines étapes obligatoires

1. Finaliser et merger PR #270 après checklist documentaire et tests.
2. Appliquer migration 003 à Supabase et vérifier qu'elle passe sans doublons ouverts existants.
3. Vérifier `/api/v2/positions` puis laisser démarrer la cohorte `V2_POST_ANTI_DUP_FIX`.
4. Recréer le monitoring automatique V1/V2 depuis le `main` à jour ; l'ancienne PR #269 ne doit pas être forcée si elle devient obsolète.
5. Comparer V1 vs V2 post-fix sans modifier les règles en cours d'échantillonnage.

## MEMORY FILES UPDATED

- `SESSION.md` : état réel août 2026, V1/V2, stats V2, bug de doublons, PR #270 et prochaine étape.
- `docs/monitoring/KNOWN_ISSUES.md` : bug V2 anti-duplication tracé ; ancien historique archivé.
- Archives documentaires : copies immuables des anciens fichiers avant nettoyage de la mémoire.
- **Cohérence** : alignée avec `GOVERNANCE.md`, `BOT_OBJECTIVE.md`, `PROJECT_RULES.md` et `CHECKLIST_MERGE.md`.

## Sources canoniques à consulter au prochain démarrage

Ordre obligatoire : `GOVERNANCE.md` → `BOT_OBJECTIVE.md` → `PROJECT_RULES.md` → fichiers spécialisés nécessaires → `SESSION.md` en dernier.
