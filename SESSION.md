# SESSION.md — ManiTradePro

> Carnet de bord court et exploitable. Les règles détaillées restent dans les fichiers canoniques spécialisés.
> Dernière mise à jour : 2026-08-17.

## État actuel

- **Objectif produit** : détecter les trades les plus sûrs possibles, apprendre uniquement à partir de paper trades fiables, améliorer progressivement le moteur avant tout argent réel.
- **Mode** : paper trading uniquement. Aucun broker réel, aucun capital réel.
- **Architecture en comparaison** : V1 = benchmark actuel ; V2 = challenger learning bot.
- **V1 snapshot actuel** : 45 trades clos, 20 gains / 25 pertes, win rate 44,4 %, expectancy +0,8273, PnL +37,23 ; 44/45 trades sont `continuation`, donc pas d'edge considéré comme validé.
- **V2 pré-fix** : 121 trades clos, win rate 32,2 %, PF 1,031, PnL +1 205,11. Cohorte `V2_PRE_ANTI_DUP_FIX`, non utilisable pour décider V1 vs V2.
- **V2 pré-fix par setup** : breakout PF 0,789 ; pullback PF 1,062 ; mean_reversion PF 1,267 sur 32 trades.

## Correctif anti-duplication V2 — ACTIF

- **PR #270** mergée le 2026-08-16, squash `111747f`.
- **Migration Supabase** `v2_one_open_position_per_symbol` appliquée sous la version `20260816210447`.
- **Frontière cohorte propre** : `2026-08-16T21:04:47Z`.
- **CRWD** : la position la plus ancienne est restée `open`; 2 ouvertures supplémentaires ont été conservées mais reclassées `duplicate_invalid_pre_fix`.
- **Vérification après migration** : 0 symbole avec plus d'une position `open`; 13 positions ouvertes valides ; 2 positions historiques invalidées ; 121 positions closes pré-fix.
- **PR #271** mergée le 2026-08-17, squash `2f43048`, pour synchroniser la mémoire projet avec cet état réel.

## Monitoring V1 / V2 — ACTIF SUR MAIN

- **PR #272** mergée le 2026-08-17, squash `1df0e5e`.
- **Workflow unique** : `.github/workflows/snapshot-bot-stats.yml`, toutes les 30 minutes + exécution manuelle + validation sur PR.
- **Validation intégration** : run PR `31977283009` success ; premier run `main` `31977325312` success, y compris écriture des snapshots.
- **Cohorte V2 propre** : `trade.openedAt >= 2026-08-16T21:04:47Z`.
- **Premier snapshot post-fix** : 0 trade V2 clos dans la cohorte propre. Aucun verdict V1/V2 possible à ce stade.
- **Fichiers actifs** : `data/bot-stats.json` (legacy V1), `data/bot-stats-v1.json`, `data/bot-stats-v2.json` (historique référence seulement), `data/bot-stats-v2-post-fix.json`, `data/v1-v2-comparison.json`.
- **Ancienne PR #269** : fermée sans merge car elle mélangeait V2 pré-fix et post-fix et ajoutait un second workflow concurrent.
- **Impact runtime trading** : aucun. Aucun Worker, setup, seuil, RR, sizing, provider ou schéma Supabase modifié par le monitoring.

## Règle méthodologique active

- Ne pas optimiser les setups pendant la constitution de `V2_POST_ANTI_DUP_FIX`.
- Pour décider V1 vs V2, utiliser uniquement V2 post-fix ; V2 lifetime reste une référence historique.
- Critères : expectancy, profit factor, drawdown, concentration PnL, stabilité temporelle et nombre d'observations indépendantes.
- 0 trade clos post-fix = aucune conclusion ; attendre des observations réelles propres.

## Prochaine priorité

1. Laisser grossir automatiquement la cohorte `V2_POST_ANTI_DUP_FIX` sans modifier ses règles.
2. Surveiller l'intégrité des nouvelles positions / trades et le bon fonctionnement des snapshots.
3. Réévaluer V1 vs V2 uniquement avec un échantillon post-fix suffisant.
4. Dette séparée : nettoyer le reporting Worker sur conflit d'index unique si cela apparaît dans les cycles.
5. Dette sécurité séparée : analyser les alertes RLS Supabase V2 avant toute modification des policies, sans casser les accès Worker existants.

## MEMORY FILES UPDATED

- `SESSION.md` : monitoring V1/V2 validé et actif sur `main`, premier snapshot vérifié.
- `docs/monitoring/KNOWN_ISSUES.md` : bug anti-duplication déjà tracé ; aucune nouvelle modification requise pour ce changement documentaire.
- **Cohérence** : alignée avec `GOVERNANCE.md`, `BOT_OBJECTIVE.md`, `PROJECT_RULES.md`, `DOC_IMPACT_MATRIX.md` et `CHECKLIST_MERGE.md`.

## Sources canoniques à consulter au prochain démarrage

Ordre obligatoire : `GOVERNANCE.md` → `BOT_OBJECTIVE.md` → `PROJECT_RULES.md` → fichiers spécialisés nécessaires → `SESSION.md` en dernier.
