# SESSION.md — ManiTradePro

> Carnet de bord court et exploitable du projet. Source de l'état **actuel**, pas un historique complet.
>
> Les règles, registres et détails techniques font autorité dans les fichiers spécialisés (cf. § *Fichiers sources à consulter*). `SESSION.md` ne fait que résumer.
>
> **Mise à jour obligatoire avant chaque demande de `GO MERGE`** (cf. `CHECKLIST_MERGE.md` et `GOVERNANCE.md` § *Règles synchronisation mémoire*).

## État actuel

- **Projet** : ManiTradePro — moteur quant de sélection / allocation / gestion du risque, orienté swing / rotation / momentum structurel multi-jours.
- **Date dernière mise à jour** : 2026-05-19.
- **Branche / PR active** : `claude/migrate-docs-project-architecture` (en cours — première migration physique : `ARCHITECTURE.md` + `DATA_PIPELINE.md` racine → `docs/project/`).
- **Dernier merge connu** : PR #226 `docs(project): add markdown consolidation plan` (commit `ae0aef7` sur `main`).
- **Statut global** : phase de recherche quantitative active, sous **gel méthodologique** (Research Framework Freeze v1, cf. `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`).
- **Mode actuel** : recherche + documentation. Pas de capital réel. Pas de bot live actif.
- **Ce qui est réel** : aucun trading capital réel. Rien.
- **Ce qui est paper trading** : infrastructure paper existe (`mtp_positions`, `mtp_trades` Supabase) mais aucun setup n'est branché en automatique sans supervision humaine.
- **Ce qui est recherche** : tous les setups quantitatifs en cours d'évaluation, sous le pipeline 10 étapes du Framework Freeze v1.
- **Ce qui est expérimental** : MEAN_REVERSION, SECTOR_RELATIVE_STRENGTH v1, TREND_PULLBACK_DYNAMIC_SUPPORT v1 (cf. `SETUPS_REGISTRY.md`).
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
- **PR** : #226 — `docs(project): add markdown consolidation plan`.
- **Objectif** : audit Markdown complet + plan officiel de consolidation par PR successives.
- **Résultat** : merge squash sur `main` (commit `ae0aef7`). Plan créé (`docs/project/MARKDOWN_CONSOLIDATION_PLAN.md`), comptages exacts après review ChatGPT, aucune migration physique.
- **Fichiers modifiés** : `docs/project/MARKDOWN_CONSOLIDATION_PLAN.md` (nouveau), `GOVERNANCE.md`, `docs/project/DOC_IMPACT_MATRIX.md`, `SESSION.md`.
- **Impact runtime / quant** : aucun.
- **Statut merge** : `GO MERGE` explicite reçu avec résumé simple, merge effectué en squash.

## PR en cours

- **PR** : migration `docs/project/` (étape 1 du plan) — branche `claude/migrate-docs-project-architecture`.
- **Objectif** : déplacer les sources canoniques `ARCHITECTURE.md` et `DATA_PIPELINE.md` de la racine vers `docs/project/`, en remplaçant les chemins racine par des stubs temporaires de redirection.
- **Fichiers ajoutés (déplacement bloc)** : `docs/project/ARCHITECTURE.md` (344 lignes, contenu intégral de l'ancien `ARCHITECTURE.md` racine ; l'ancien stub de 18 lignes a été remplacé), `docs/project/DATA_PIPELINE.md` (640 lignes, contenu intégral de l'ancien `DATA_PIPELINE.md` racine).
- **Fichiers transformés en stubs** : `ARCHITECTURE.md` (racine), `DATA_PIPELINE.md` (racine).
- **Fichiers modifiés (liens canoniques)** : `GOVERNANCE.md` (table hybride + section spécialisée architecture), `CLAUDE.md` (Documentation permanente + Mémo merge), `CHECKLIST_MERGE.md` (Documentation + Cohérence), `docs/project/DOC_IMPACT_MATRIX.md` (lignes worker / front / provider / Supabase / broker), `docs/project/MARKDOWN_CONSOLIDATION_PLAN.md` (inventaire + ordre des PR), `SESSION.md`.
- **Impact runtime** : aucun.
- **Impact quant** : aucun.
- **Impact documentation** : `ARCHITECTURE.md` et `DATA_PIPELINE.md` désormais canoniques sous `docs/project/` ; stubs racine conservés pour compatibilité avec les anciens liens. Aucun contenu de fond perdu (copie bloc, aucune édition métier).
- **Non inclus** : suppression des stubs racine, migration `docs/quant/`, migration `docs/monitoring/`, modification de contenu métier des documents déplacés.
- **Statut merge** : attente `GO MERGE explicite de ChatGPT` accompagné d'un résumé simple.

## Décisions actives

- **Gouvernance** : `GOVERNANCE.md` = source canonique unique (IA, projet, validation, merge, agents/skills, gouvernance quant). `GPT_ROLE.md` = stub de redirection. `CLAUDE.md` = manuel opérationnel Claude Code.
- **Provider principal** : EODHD (daily / swing). Détails et fallbacks dans `PROVIDERS_MATRIX.md`.
- **Capital réel** : interdit tant que les conditions de `BOT_OBJECTIVE.md` § *Conditions avant passage en bot réel* ne sont pas remplies (walk-forward, frictions, sizing, kill switch, paper trading prolongé, etc.).
- **Research Framework Freeze v1** : actif. Toute PR de recherche doit s'y conformer ou marquer explicitement `⚠ DÉVIATION FRAMEWORK FREEZE v1` + justification.
- **Cadence imposée** : maximum 1 nouvelle famille de setup par 2 semaines. Pas de PR « polissage » sans valeur incrémentale claire.
- **Anti-hallucination** : aucun résultat « qui semble bon » n'est valide sans walk-forward + multi-régimes + multi-années (cf. `GOVERNANCE.md` § *Règle anti-hallucination*).

## Points de vigilance

- **Aucun setup `LIVE_READY`** au 2026-05-19. Détail des statuts dans `SETUPS_REGISTRY.md`.
- **PEAD** : seule piste structurellement distincte de momentum, mais bloquée par absence de dataset earnings.
- **RS Rotation simple** : crédible côté exécution mais fragile temporellement. Walk-forward conditionnel régime obligatoire avant tout passage live.
- **Biais d'exécution historiques** : les anciens PF / winrate antérieurs aux audits PR #207 et #208 sont annulés. Voir bannière en tête de `SETUPS_REGISTRY.md`.
- **Dépendance KV `MTP_CACHE`** : la cohérence prix cross-worker dépend du binding KV. Sans lui, bug cross-worker silencieux (cf. `PROJECT_RULES.md` R4).
- **`buildSnapshotId`** : purement analytique, aucune dépendance live autorisée. Toute modif casse l'historique des snapshots.
- **Documentation** : `SESSION.md` doit refléter l'état réel **après** chaque merge. Ne jamais y mettre une intention non livrée.

## Prochaines priorités

1. **PR migration `docs/quant/`** (gouvernance) : déplacer `SETUPS_REGISTRY.md`, `ASSET_REGISTRY.md`, décider du sort de `TRADING_LOGIC.md`.
2. **PR migration `docs/monitoring/`** (gouvernance) : déplacer `PROVIDERS_MATRIX.md` et `KNOWN_ISSUES.md`.
3. **Décision politique sur le sourcing PEAD** (quant) : trouver / abandonner le dataset earnings nécessaire pour valider PEAD.
4. **Walk-forward conditionnel régime sur RS Rotation simple** (quant) : prérequis avant tout passage paper / live.
5. **Toute PR future de recherche** : doit référencer `RESEARCH_FRAMEWORK_FREEZE_V1.md` et joindre la checklist `docs/research/SETUP_VALIDATION_CHECKLIST.md` cochée avec valeurs mesurées.

## Fichiers sources à consulter

- **Gouvernance projet (priorité absolue)** : `GOVERNANCE.md`.
- **Manuel opérationnel Claude Code** : `CLAUDE.md`.
- **Objectif produit / constitution** : `BOT_OBJECTIVE.md`.
- **Règles techniques structurelles** : `PROJECT_RULES.md`.
- **Architecture code** : `docs/project/ARCHITECTURE.md` (la racine `ARCHITECTURE.md` est un stub temporaire de redirection).
- **Pipeline de données** : `docs/project/DATA_PIPELINE.md` (la racine `DATA_PIPELINE.md` est un stub temporaire de redirection).
- **Logique trading / moteur** : `TRADING_LOGIC.md`.
- **Setups quantitatifs** : `SETUPS_REGISTRY.md`.
- **Classification actifs** : `ASSET_REGISTRY.md`.
- **Providers** : `PROVIDERS_MATRIX.md`.
- **Bugs / dette** : `KNOWN_ISSUES.md`.
- **Checklist merge** : `CHECKLIST_MERGE.md`.
- **Matrice d'impact documentaire** : `docs/project/DOC_IMPACT_MATRIX.md` (aide anti-oubli : `npm run check:doc-impact`).
- **Plan de consolidation Markdown** : `docs/project/MARKDOWN_CONSOLIDATION_PLAN.md`.
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
- **Lecture obligatoire au début de chaque session** : appliquer le protocole `GOVERNANCE.md` § *Session start protocol — reprise officielle de session* — socle obligatoire (`GOVERNANCE.md`, `BOT_OBJECTIVE.md`, `PROJECT_RULES.md`, `SESSION.md`, `KNOWN_ISSUES.md`) puis fichiers spécialisés selon le sujet. Ne jamais partir uniquement de `SESSION.md`.
- **Mise à jour obligatoire avant chaque PR / merge** : voir section suivante.

## Règle : mise à jour de `SESSION.md` avant chaque PR / merge

`SESSION.md` doit être mis à jour **avant chaque demande de `GO MERGE`**. Il doit refléter l'état réel **après** la PR :

- objectif livré ;
- fichiers modifiés ;
- impacts (runtime / quant / documentation) ;
- limites ;
- prochaine étape.

Une PR ne doit pas recevoir `GO MERGE` si `SESSION.md` est absent, obsolète ou contradictoire avec les fichiers sources. Règles canoniques : `CHECKLIST_MERGE.md` § *Documentation* et `GOVERNANCE.md` § *Règles synchronisation mémoire*.
