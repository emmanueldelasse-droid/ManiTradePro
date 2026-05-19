# SESSION.md — ManiTradePro

> Carnet de bord court et exploitable du projet. Source de l'état **actuel**, pas un historique complet.
>
> Les règles, registres et détails techniques font autorité dans les fichiers spécialisés (cf. § *Fichiers sources à consulter*). `SESSION.md` ne fait que résumer.
>
> **Mise à jour obligatoire avant chaque demande de `GO MERGE`** (cf. `CHECKLIST_MERGE.md` et `GOVERNANCE.md` § *Règles synchronisation mémoire*).

## État actuel

- **Projet** : ManiTradePro — moteur quant de sélection / allocation / gestion du risque, orienté swing / rotation / momentum structurel multi-jours.
- **Date dernière mise à jour** : 2026-05-19.
- **Branche / PR active** : `claude/add-decision-records` (en cours — création du dossier `docs/decisions/` et première décision officielle `DECISION-001`).
- **Dernier merge connu** : PR #230 `docs(trading): split trading logic documentation` (commit `3e674da` sur `main`).
- **Statut global** : phase de recherche quantitative active, sous **gel méthodologique** (Research Framework Freeze v1, cf. `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`).
- **Mode actuel** : recherche + documentation. Pas de capital réel. Pas de bot live actif.
- **Ce qui est réel** : aucun trading capital réel. Rien.
- **Ce qui est paper trading** : infrastructure paper existe (`mtp_positions`, `mtp_trades` Supabase) mais aucun setup n'est branché en automatique sans supervision humaine.
- **Ce qui est recherche** : tous les setups quantitatifs en cours d'évaluation, sous le pipeline 10 étapes du Framework Freeze v1.
- **Ce qui est expérimental** : MEAN_REVERSION, SECTOR_RELATIVE_STRENGTH v1, TREND_PULLBACK_DYNAMIC_SUPPORT v1 (cf. `docs/quant/SETUPS_REGISTRY.md`).
- **Ce qui n'est pas encore live** : tout. Aucun setup `LIVE_READY` au 2026-05-19.

## Dernière session / dernière PR mergée

- **Date** : 2026-05-19.
- **PR** : #222 — `docs(session): clean session state and enforce update rule`.
- **Objectif** : réduire `SESSION.md` à un carnet de bord court, formaliser l'obligation de mise à jour avant chaque `GO MERGE`.
- **Résultat** : merge squash sur `main` (commit `c6d6d91`). `SESSION.md` réduit à ~100 lignes, règle synchro mémoire renforcée dans `GOVERNANCE.md` et `CHECKLIST_MERGE.md`.
- **Fichiers modifiés** : `SESSION.md`, `CHECKLIST_MERGE.md`, `GOVERNANCE.md`, `CLAUDE.md`.
- **Impact runtime** : aucun.
- **Impact quant** : aucun.
- **Impact documentation** : `SESSION.md` redevient un résumé d'état, pas un journal complet.
- **Statut merge** : `GO MERGE` explicite reçu, merge effectué en squash.

## Dernière session / dernière PR mergée (bis)

- **Date** : 2026-05-19.
- **PR** : #230 — `docs(trading): split trading logic documentation`.
- **Objectif** : split documentaire de `TRADING_LOGIC.md` racine en deux sources canoniques spécialisées (quant vs engine).
- **Résultat** : merge squash sur `main` (commit `3e674da`). `docs/quant/TRADING_LOGIC.md` (262) et `docs/project/TRADING_ENGINE.md` (307) créés, stub racine 16 lignes en place, comptage corrigé après review ChatGPT.
- **Fichiers ajoutés** : `docs/quant/TRADING_LOGIC.md`, `docs/project/TRADING_ENGINE.md`.
- **Fichiers transformés en stubs** : `TRADING_LOGIC.md` (racine).
- **Impact runtime / quant** : aucun changement de fond.
- **Statut merge** : `GO MERGE` reçu (créateur) après correction.

## PR en cours

- **PR** : création du dossier `docs/decisions/` et première décision historique — branche `claude/add-decision-records`.
- **Objectif** : historiser les décisions structurantes du projet dans un dossier dédié et archiver la première décision officielle (`DECISION-001`, fusion `GPT_ROLE.md` → `GOVERNANCE.md`).
- **Fichiers créés / réécrits** : `docs/decisions/README.md` (réécrit en format court conforme au plan : objectif, format recommandé, statuts, règle de non-réécriture, index des décisions), `docs/decisions/DECISION-001-gpt-role-merged-into-governance.md` (90 lignes : statut ACTIVE / date / contexte / décision / raisons / conséquences / fichiers concernés / PR liées #220 #221 #223 #225 / état actuel / suite éventuelle).
- **Fichiers modifiés** : `GOVERNANCE.md` (nouvelle section *Décisions historiques* avec ordre de précédence et règles), `CLAUDE.md` (section *Décisions historiques* — pointeur vers `docs/decisions/`, rappel que ce ne sont pas des règles actives), `CHECKLIST_MERGE.md` (ligne ajoutée : `docs/decisions/` créé ou mis à jour si la PR acte une décision structurante), `docs/project/DOC_IMPACT_MATRIX.md` (nouvelle ligne *Décision structurante / historique*), `docs/project/MARKDOWN_CONSOLIDATION_PLAN.md` (étape 4 marquée partiellement réalisée, inventaire actualisé), `SESSION.md`.
- **Impact runtime** : aucun.
- **Impact quant** : aucun.
- **Impact documentation** : système d'historique des décisions formalisé ; règle « une décision historique ne se réécrit pas » officialisée ; ordre de précédence `GOVERNANCE > spécialisés > SESSION > decisions` documenté.
- **Non inclus** : suppression des stubs racine, suppression de `GPT_ROLE.md`, migration de `BOT_OBJECTIVE.md` / `PROJECT_RULES.md` / `CHECKLIST_MERGE.md`.
- **Statut merge** : attente `GO MERGE explicite de ChatGPT` accompagné d'un résumé simple.

## Décisions actives

- **Gouvernance** : `GOVERNANCE.md` = source canonique unique (IA, projet, validation, merge, agents/skills, gouvernance quant). `GPT_ROLE.md` = stub de redirection. `CLAUDE.md` = manuel opérationnel Claude Code.
- **Provider principal** : EODHD (daily / swing). Détails et fallbacks dans `docs/monitoring/PROVIDERS_MATRIX.md`.
- **Capital réel** : interdit tant que les conditions de `BOT_OBJECTIVE.md` § *Conditions avant passage en bot réel* ne sont pas remplies (walk-forward, frictions, sizing, kill switch, paper trading prolongé, etc.).
- **Research Framework Freeze v1** : actif. Toute PR de recherche doit s'y conformer ou marquer explicitement `⚠ DÉVIATION FRAMEWORK FREEZE v1` + justification.
- **Cadence imposée** : maximum 1 nouvelle famille de setup par 2 semaines. Pas de PR « polissage » sans valeur incrémentale claire.
- **Anti-hallucination** : aucun résultat « qui semble bon » n'est valide sans walk-forward + multi-régimes + multi-années (cf. `GOVERNANCE.md` § *Règle anti-hallucination*).

## Points de vigilance

- **Aucun setup `LIVE_READY`** au 2026-05-19. Détail des statuts dans `docs/quant/SETUPS_REGISTRY.md`.
- **PEAD** : seule piste structurellement distincte de momentum, mais bloquée par absence de dataset earnings.
- **RS Rotation simple** : crédible côté exécution mais fragile temporellement. Walk-forward conditionnel régime obligatoire avant tout passage live.
- **Biais d'exécution historiques** : les anciens PF / winrate antérieurs aux audits PR #207 et #208 sont annulés. Voir bannière en tête de `docs/quant/SETUPS_REGISTRY.md`.
- **Dépendance KV `MTP_CACHE`** : la cohérence prix cross-worker dépend du binding KV. Sans lui, bug cross-worker silencieux (cf. `PROJECT_RULES.md` R4).
- **`buildSnapshotId`** : purement analytique, aucune dépendance live autorisée. Toute modif casse l'historique des snapshots.
- **Documentation** : `SESSION.md` doit refléter l'état réel **après** chaque merge. Ne jamais y mettre une intention non livrée.

## Prochaines priorités

1. **PR nettoyage final** (gouvernance) : suppression définitive des 7 stubs racine devenus inutiles (`ARCHITECTURE.md`, `DATA_PIPELINE.md`, `SETUPS_REGISTRY.md`, `ASSET_REGISTRY.md`, `PROVIDERS_MATRIX.md`, `KNOWN_ISSUES.md`, `TRADING_LOGIC.md`), arbitrage final sur `BOT_OBJECTIVE.md` et `GPT_ROLE.md`.
2. **Décision politique sur le sourcing PEAD** (quant) : trouver / abandonner le dataset earnings nécessaire pour valider PEAD.
3. **Walk-forward conditionnel régime sur RS Rotation simple** (quant) : prérequis avant tout passage paper / live.
4. **Toute PR future de recherche** : doit référencer `RESEARCH_FRAMEWORK_FREEZE_V1.md` et joindre la checklist `docs/research/SETUP_VALIDATION_CHECKLIST.md` cochée avec valeurs mesurées.

## Fichiers sources à consulter

- **Gouvernance projet (priorité absolue)** : `GOVERNANCE.md`.
- **Manuel opérationnel Claude Code** : `CLAUDE.md`.
- **Objectif produit / constitution** : `BOT_OBJECTIVE.md`.
- **Règles techniques structurelles** : `PROJECT_RULES.md`.
- **Architecture code** : `docs/project/ARCHITECTURE.md` (la racine `ARCHITECTURE.md` est un stub temporaire de redirection).
- **Pipeline de données** : `docs/project/DATA_PIPELINE.md` (la racine `DATA_PIPELINE.md` est un stub temporaire de redirection).
- **Logique quant / scoring / setups** : `docs/quant/TRADING_LOGIC.md` (la racine `TRADING_LOGIC.md` est un stub de redirection vers les deux fichiers spécialisés).
- **Moteur trading / exécution / safety / sizing** : `docs/project/TRADING_ENGINE.md`.
- **Setups quantitatifs** : `docs/quant/SETUPS_REGISTRY.md` (la racine `SETUPS_REGISTRY.md` est un stub temporaire de redirection).
- **Classification actifs** : `docs/quant/ASSET_REGISTRY.md` (la racine `ASSET_REGISTRY.md` est un stub temporaire de redirection).
- **Providers** : `docs/monitoring/PROVIDERS_MATRIX.md` (la racine `PROVIDERS_MATRIX.md` est un stub temporaire de redirection).
- **Bugs / dette** : `docs/monitoring/KNOWN_ISSUES.md` (la racine `KNOWN_ISSUES.md` est un stub temporaire de redirection).
- **Checklist merge** : `CHECKLIST_MERGE.md`.
- **Matrice d'impact documentaire** : `docs/project/DOC_IMPACT_MATRIX.md` (aide anti-oubli : `npm run check:doc-impact`).
- **Plan de consolidation Markdown** : `docs/project/MARKDOWN_CONSOLIDATION_PLAN.md`.
- **Décisions structurantes historiques** : `docs/decisions/` (format dans `docs/decisions/README.md`).
- **Framework recherche (gel actif)** : `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`, `docs/research/SETUP_VALIDATION_CHECKLIST.md`, `docs/research/ANTI_LOOKAHEAD_RULES.md`, `docs/research/DATASET_GOVERNANCE.md`.

## Non encore fait

- Migration physique des fichiers Markdown (racine → `/docs/`) : à exécuter en plusieurs PR successives selon `docs/project/MARKDOWN_CONSOLIDATION_PLAN.md`.
- Sourcing dataset PEAD : décision politique en attente.
- Walk-forward conditionnel régime sur RS Rotation simple : non lancé.
- Migration physique racine → `/docs/` (mode hybride en vigueur, cf. `GOVERNANCE.md` § *Document canonical sources*).
- Aucun setup activé en paper trading automatique sans supervision humaine.
- Aucune connexion broker réel (pas de passage en argent réel).

## Règles de reprise importantes

- **Ne jamais inventer l'état du projet.** Toujours partir de ce fichier + des fichiers sources, jamais de la mémoire.
- **Toujours vérifier les fichiers sources** quand une décision dépend du domaine (setups, actifs, architecture, trading, providers). `SESSION.md` ne fait que résumer ; il n'est pas la source de vérité du domaine.
- **Ne pas considérer `SESSION.md` comme source unique** : c'est le carnet de bord, pas la mémoire complète. Les règles détaillées vivent dans les fichiers spécialisés.
- **Lecture obligatoire au début de chaque session** : appliquer le protocole `GOVERNANCE.md` § *Session start protocol — reprise officielle de session* — socle obligatoire (`GOVERNANCE.md`, `BOT_OBJECTIVE.md`, `PROJECT_RULES.md`, `SESSION.md`, `docs/monitoring/KNOWN_ISSUES.md`) puis fichiers spécialisés selon le sujet. Ne jamais partir uniquement de `SESSION.md`.
- **Mise à jour obligatoire avant chaque PR / merge** : voir section suivante.

## Règle : mise à jour de `SESSION.md` avant chaque PR / merge

`SESSION.md` doit être mis à jour **avant chaque demande de `GO MERGE`**. Il doit refléter l'état réel **après** la PR :

- objectif livré ;
- fichiers modifiés ;
- impacts (runtime / quant / documentation) ;
- limites ;
- prochaine étape.

Une PR ne doit pas recevoir `GO MERGE` si `SESSION.md` est absent, obsolète ou contradictoire avec les fichiers sources. Règles canoniques : `CHECKLIST_MERGE.md` § *Documentation* et `GOVERNANCE.md` § *Règles synchronisation mémoire*.
