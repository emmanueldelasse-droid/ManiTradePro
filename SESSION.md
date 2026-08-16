# SESSION.md — ManiTradePro

> Carnet de bord court et exploitable. Les règles détaillées restent dans les fichiers canoniques spécialisés.
> Dernière mise à jour : 2026-08-17.

## État actuel

- **Objectif produit** : détecter les trades les plus sûrs possibles, apprendre uniquement à partir de paper trades fiables, améliorer progressivement le moteur avant tout argent réel.
- **Mode** : paper trading uniquement. Aucun broker réel, aucun capital réel.
- **Architecture en comparaison** : V1 = benchmark actuel ; V2 = challenger learning bot.
- **V1** : benchmark historique existant, encore dominé par `continuation`; pas d'edge considéré comme validé.
- **V2 pré-fix** : 121 trades clos, win rate 32,2 %, PF 1,031, PnL +1 205,11. Cohorte `V2_PRE_ANTI_DUP_FIX`, non utilisable pour décider V1 vs V2.
- **V2 pré-fix par setup** : breakout PF 0,789 ; pullback PF 1,062 ; mean_reversion PF 1,267 sur 32 trades.

## Correctif anti-duplication V2 — ACTIF

- **PR #270** mergée le 2026-08-16, squash `111747f`.
- **Migration Supabase** `v2_one_open_position_per_symbol` appliquée sous la version `20260816210447`.
- **Frontière cohorte propre** : `2026-08-16T21:04:47Z`.
- **CRWD** : la position la plus ancienne est restée `open`; 2 ouvertures supplémentaires ont été conservées mais reclassées `duplicate_invalid_pre_fix`.
- **Vérification après migration** : 0 symbole avec plus d'une position `open`; 13 positions ouvertes valides ; 2 positions historiques invalidées ; 121 positions closes pré-fix.
- **PR #271** mergée le 2026-08-17, squash `2f43048`, pour synchroniser la mémoire projet avec cet état réel.

## Monitoring V1 / V2 — travail actif

- **Branche** : `agent/v1-v2-post-fix-monitoring`.
- **Objectif unique** : comparer V1 au challenger V2 sans mélanger la cohorte historique V2 contaminée avec les observations post-fix.
- **Workflow existant réutilisé** : `.github/workflows/snapshot-bot-stats.yml` devient le workflow unique V1/V2, toutes les 30 minutes et à la demande.
- **Script** : `tools/v2/snapshot-v1-v2-stats.mjs` récupère V1, stats V2 historiques et trades V2, puis filtre la cohorte propre sur `trade.openedAt >= 2026-08-16T21:04:47Z`.
- **Compatibilité** : `data/bot-stats.json` reste le snapshot V1 legacy ; ajout de `bot-stats-v1.json`, `bot-stats-v2.json`, `bot-stats-v2-post-fix.json`, `v1-v2-comparison.json`.
- **Anti-bruit Git** : aucun timestamp volatile dans les snapshots ; aucun commit si les statistiques n'ont réellement pas changé.
- **Test ajouté** : vérifie qu'un trade ouvert avant la frontière est exclu et qu'un trade ouvert après est inclus.
- **Impact runtime trading** : aucun. Aucun Worker, setup, seuil, RR, sizing, provider ou base Supabase modifié.

## État méthodologique V2

- Ne pas optimiser les setups pendant la constitution de `V2_POST_ANTI_DUP_FIX`.
- Le comparateur doit utiliser V2 post-fix pour la décision ; V2 lifetime reste seulement une référence historique.
- Critères de décision : expectancy, profit factor, drawdown, concentration PnL, stabilité temporelle et nombre d'observations indépendantes.
- Aucune conclusion V1 vs V2 avant un échantillon post-fix suffisant.

## Prochaine priorité

1. Valider le workflow V1/V2 sur sa branche puis merger la PR monitoring.
2. Vérifier le premier snapshot réel généré sur `main`.
3. Laisser grossir la cohorte `V2_POST_ANTI_DUP_FIX` sans modifier ses règles.
4. Dette séparée : nettoyer le reporting Worker sur conflit d'index unique si nécessaire.
5. Dette sécurité séparée : traiter les alertes RLS Supabase V2 dans une PR dédiée.

## MEMORY FILES UPDATED

- `SESSION.md` : état post-fix + monitoring V1/V2 actif.
- `docs/monitoring/KNOWN_ISSUES.md` : bug anti-duplication déjà tracé ; aucune nouvelle modification nécessaire dans cette PR.
- **Cohérence** : alignée avec `GOVERNANCE.md`, `BOT_OBJECTIVE.md`, `PROJECT_RULES.md`, `DOC_IMPACT_MATRIX.md` et `CHECKLIST_MERGE.md`.

## Sources canoniques à consulter au prochain démarrage

Ordre obligatoire : `GOVERNANCE.md` → `BOT_OBJECTIVE.md` → `PROJECT_RULES.md` → fichiers spécialisés nécessaires → `SESSION.md` en dernier.
