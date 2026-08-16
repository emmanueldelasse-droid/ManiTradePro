# SESSION.md — ManiTradePro

> Carnet de bord court et exploitable. Les règles détaillées restent dans les fichiers canoniques spécialisés.
> Dernière mise à jour : 2026-08-16.

## État actuel

- **Objectif produit** : détecter les trades les plus sûrs possibles, apprendre uniquement à partir de paper trades fiables, améliorer progressivement le moteur avant tout argent réel.
- **Mode** : paper trading uniquement. Aucun broker réel, aucun capital réel.
- **Architecture en comparaison** : V1 = benchmark actuel ; V2 = challenger learning bot.
- **V1** : résultats récents positifs mais échantillon limité et forte concentration `continuation`; reste un benchmark, pas un edge validé.
- **V2 historique pré-fix** : 121 trades clos, win rate 32,2 %, PF 1,031, PnL +1 205,11. Cette cohorte est `V2_PRE_ANTI_DUP_FIX` et ne doit pas être mélangée avec la cohorte post-fix.
- **V2 par setup pré-fix** : breakout PF 0,789 ; pullback PF 1,062 ; mean_reversion PF 1,267 sur 32 trades.

## Correctif anti-duplication V2 — ACTIF

- **PR #270** mergée le 2026-08-16, squash `111747f`.
- **Cause** : la garde `openBySymbol` du Worker n'était pas atomique entre deux cycles concurrents.
- **Base Supabase vérifiée** : un seul symbole avait encore des doublons ouverts, `CRWD` avec 3 positions.
- **Nettoyage non destructif** : la position CRWD la plus ancienne est conservée `open`; les 2 ouvertures supplémentaires sont conservées en base mais reclassées `duplicate_invalid_pre_fix`. Aucune ligne supprimée.
- **Migration appliquée** : index unique partiel `uq_mtp_v2_positions_one_open_symbol` sur `mtp_v2_positions(symbol) WHERE status='open'`.
- **Vérification après migration** : 0 symbole avec plus d'une position `open`; 13 positions ouvertes valides ; 2 positions historiques marquées `duplicate_invalid_pre_fix` ; 121 positions closes.
- **Impact quant** : aucun changement de setup, signal, seuil, RR ou sizing.
- **Impact expérimental** : les nouvelles observations V2 ne peuvent plus être multipliées par des ouvertures concurrentes du même symbole.

## État méthodologique V2

- La cohorte post-fix démarre maintenant sous le label `V2_POST_ANTI_DUP_FIX`.
- Ne pas optimiser les setups pendant la constitution de cette cohorte.
- Le breakout pré-fix est nettement sous 1 de PF et reste le setup le plus faible.
- Mean reversion est le meilleur setup V2 pré-fix, mais 32 trades sont insuffisants pour conclure à un edge robuste.
- Pullback est proche de l'équilibre et non démontré.
- Décision V1 vs V2 : **aucune conclusion définitive** avant un échantillon post-fix propre.

## Prochaine priorité

1. Mettre en place le monitoring automatique V1/V2 depuis le `main` actuel.
2. Mesurer séparément la cohorte `V2_POST_ANTI_DUP_FIX` : expectancy, PF, drawdown, concentration PnL, stabilité temporelle, observations indépendantes.
3. Ne modifier les règles V2 qu'après collecte suffisante ou apparition d'un nouveau bug d'intégrité.
4. Dette séparée : le Worker peut comptabiliser un conflit d'index unique comme une erreur de cycle ; l'intégrité est protégée mais le reporting pourra être nettoyé dans une micro-PR.

## Sécurité / infrastructure observée

- Supabase Advisors signale des problèmes de sécurité préexistants, notamment RLS désactivé sur plusieurs tables publiques V2 (`mtp_v2_positions`, `mtp_v2_trades`, `mtp_v2_cycles`, `mtp_v2_setup_stats`).
- Ces alertes ne sont pas causées par PR #270. Elles doivent être traitées dans une PR sécurité dédiée pour ne pas mélanger les objectifs.

## MEMORY FILES UPDATED

- `SESSION.md` : état réel post-merge/post-migration.
- `docs/monitoring/KNOWN_ISSUES.md` : bug anti-duplication tracé ; historique antérieur archivé.
- **Cohérence** : alignée avec `GOVERNANCE.md`, `BOT_OBJECTIVE.md`, `PROJECT_RULES.md` et `CHECKLIST_MERGE.md`.

## Sources canoniques à consulter au prochain démarrage

Ordre obligatoire : `GOVERNANCE.md` → `BOT_OBJECTIVE.md` → `PROJECT_RULES.md` → fichiers spécialisés nécessaires → `SESSION.md` en dernier.
