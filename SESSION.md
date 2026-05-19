# SESSION.md — ManiTradePro

> Carnet de bord court et exploitable du projet. Source de l'état **actuel**, pas un historique complet.
>
> Les règles, registres et détails techniques font autorité dans les fichiers spécialisés (cf. § *Fichiers sources à consulter*). `SESSION.md` ne fait que résumer.
>
> **Mise à jour obligatoire avant chaque demande de `GO MERGE`** (cf. `CHECKLIST_MERGE.md` et `GOVERNANCE.md` § *Règles synchronisation mémoire*).

## État actuel

- **Projet** : ManiTradePro — moteur quant de sélection / allocation / gestion du risque, orienté swing / rotation / momentum structurel multi-jours.
- **Date dernière mise à jour** : 2026-05-19.
- **Branche / PR active** : `claude/split-trading-logic` (en cours — split documentaire de `TRADING_LOGIC.md` racine entre `docs/quant/TRADING_LOGIC.md` et `docs/project/TRADING_ENGINE.md`).
- **Dernier merge connu** : PR #229 `docs(monitoring): migrate provider and issue docs` (commit `225b3b5` sur `main`).
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
- **PR** : #229 — `docs(monitoring): migrate provider and issue docs`.
- **Objectif** : troisième migration physique — `PROVIDERS_MATRIX.md` + `KNOWN_ISSUES.md` racine → `docs/monitoring/`.
- **Résultat** : merge squash sur `main` (commit `225b3b5`). Stubs racine en place, socle obligatoire du protocole de reprise pointe désormais vers `docs/monitoring/KNOWN_ISSUES.md`.
- **Fichiers ajoutés / migrés** : `docs/monitoring/PROVIDERS_MATRIX.md` (125), `docs/monitoring/KNOWN_ISSUES.md` (331).
- **Fichiers transformés en stubs** : `PROVIDERS_MATRIX.md` (racine), `KNOWN_ISSUES.md` (racine).
- **Impact runtime / quant** : aucun.
- **Statut merge** : `GO MERGE` reçu (créateur) après PR validée.

## PR en cours

- **PR** : split documentaire de `TRADING_LOGIC.md` — branche `claude/split-trading-logic`.
- **Objectif** : séparer le contenu transversal de `TRADING_LOGIC.md` racine en deux sources canoniques spécialisées (quant vs engine), sans aucune modification de fond métier.
- **Fichiers créés** : `docs/quant/TRADING_LOGIC.md` (logique quant : scoring `safetyScore` / `decisionScore` / `strategicAnalysis` / `exploitabilityScore` / `dossierScore` / `officialScore`, setups détectés, recherche quant externe, modulateurs régime / news / AI, apprentissage adaptatif, non encore fait quant, limites de fiabilité quant) ; `docs/project/TRADING_ENGINE.md` (logique engine : `liveContext`, `snapshotId` + timestamps analytiques, `quoteQuality`, règles d'ouverture cron + filtres + filtre 17 safety gate + sizing, règles de fermeture + filtre 0 + ordre de priorité + tracker intra + fallback + time exit + invalidation + manuel, garde-fou devise, configurations bot, non encore fait engine, limites engine, vague B.10 durcissement safety gate).
- **Fichiers transformés en stubs** : `TRADING_LOGIC.md` (racine, 13 lignes, pointe vers les deux fichiers spécialisés).
- **Fichiers modifiés (liens canoniques)** : `GOVERNANCE.md` (table hybride + exemple + § *Trading* du protocole de reprise + § *Gouvernance ChatGPT ↔ Claude*), `CLAUDE.md` (Documentation permanente + mémo merge), `CHECKLIST_MERGE.md` (Documentation, scinde la ligne TRADING_LOGIC en 2 lignes quant + engine), `docs/project/DOC_IMPACT_MATRIX.md` (4 lignes : Trading logic, Setup, Risk, Broker + exemple), `docs/project/MARKDOWN_CONSOLIDATION_PLAN.md` (inventaire actualisé, ligne split marquée *Migré (split)*, doublons recomputés), `docs/quant/ALLOCATION_RULES.md`, `docs/quant/RISK_ENGINE_RULES.md`, `docs/quant/REGIME_RULES.md` (sources à consolider), `SESSION.md`.
- **Impact runtime** : aucun.
- **Impact quant sur le fond** : aucun. Le contenu est conservé verbatim, seul le classement change.
- **Impact documentation** : `TRADING_LOGIC.md` racine devient stub ; le contenu est désormais réparti entre `docs/quant/TRADING_LOGIC.md` et `docs/project/TRADING_ENGINE.md`.
- **Non inclus** : migration de `BOT_OBJECTIVE.md` / `PROJECT_RULES.md` / `CHECKLIST_MERGE.md`, suppression des stubs racine, modification du fond métier.
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

1. **PR décisions / historique** (gouvernance) : première `DECISION-001-*.md` (candidat : fusion GPT_ROLE → GOVERNANCE).
2. **PR nettoyage final** (gouvernance) : suppression définitive des 7 stubs racine devenus inutiles (`ARCHITECTURE.md`, `DATA_PIPELINE.md`, `SETUPS_REGISTRY.md`, `ASSET_REGISTRY.md`, `PROVIDERS_MATRIX.md`, `KNOWN_ISSUES.md`, `TRADING_LOGIC.md`), décision finale sur `BOT_OBJECTIVE.md` et `GPT_ROLE.md`.
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
- **Logique quant / scoring / setups** : `docs/quant/TRADING_LOGIC.md` (la racine `TRADING_LOGIC.md` est un stub de redirection vers les deux fichiers spécialisés).
- **Moteur trading / exécution / safety / sizing** : `docs/project/TRADING_ENGINE.md`.
- **Setups quantitatifs** : `docs/quant/SETUPS_REGISTRY.md` (la racine `SETUPS_REGISTRY.md` est un stub temporaire de redirection).
- **Classification actifs** : `docs/quant/ASSET_REGISTRY.md` (la racine `ASSET_REGISTRY.md` est un stub temporaire de redirection).
- **Providers** : `docs/monitoring/PROVIDERS_MATRIX.md` (la racine `PROVIDERS_MATRIX.md` est un stub temporaire de redirection).
- **Bugs / dette** : `docs/monitoring/KNOWN_ISSUES.md` (la racine `KNOWN_ISSUES.md` est un stub temporaire de redirection).
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
