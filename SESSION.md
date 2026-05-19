# SESSION.md — ManiTradePro

> Carnet de bord court et exploitable du projet. Source de l'état **actuel**, pas un historique complet.
>
> Les règles, registres et détails techniques font autorité dans les fichiers spécialisés (cf. § *Fichiers sources à consulter*). `SESSION.md` ne fait que résumer.
>
> **Mise à jour obligatoire avant chaque demande de `GO MERGE`** (cf. `CHECKLIST_MERGE.md` et `GOVERNANCE.md` § *Règles synchronisation mémoire*).

## État actuel

- **Projet** : ManiTradePro — moteur quant de sélection / allocation / gestion du risque, orienté swing / rotation / momentum structurel multi-jours.
- **Date dernière mise à jour** : 2026-05-19.
- **Branche / PR active** : `claude/final-doc-stub-cleanup` (en cours — nettoyage final : suppression des 7 stubs racine + `GPT_ROLE.md`, arbitrages `BOT_OBJECTIVE.md` reste racine).
- **Dernier merge connu** : PR #231 `docs(decisions): add first project decision record` (commit `a4249d8` sur `main`).
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
- **PR** : #231 — `docs(decisions): add first project decision record`.
- **Objectif** : système officiel d'historique des décisions structurantes + première décision archivée (`DECISION-001`).
- **Résultat** : merge squash sur `main` (commit `a4249d8`). `docs/decisions/README.md` réécrit, `DECISION-001` archivée (statut ACTIVE), GOVERNANCE.md § Décisions historiques en place.
- **Fichiers ajoutés** : `docs/decisions/DECISION-001-gpt-role-merged-into-governance.md`.
- **Impact runtime / quant** : aucun.
- **Statut merge** : `GO MERGE` reçu (créateur).

## PR en cours

- **PR** : nettoyage final des stubs racine et arbitrages — branche `claude/final-doc-stub-cleanup`.
- **Objectif** : terminer la consolidation Markdown en supprimant les 7 stubs racine de redirection, arbitrer le sort de `BOT_OBJECTIVE.md` et de `GPT_ROLE.md`.
- **Fichiers supprimés** : `ARCHITECTURE.md`, `DATA_PIPELINE.md`, `SETUPS_REGISTRY.md`, `ASSET_REGISTRY.md`, `PROVIDERS_MATRIX.md`, `KNOWN_ISSUES.md`, `TRADING_LOGIC.md`, `GPT_ROLE.md`.
- **Arbitrages** : `BOT_OBJECTIVE.md` reste à la racine (squelette `docs/project/PROJECT_VISION.md` vide, migration future sous PR dédiée si besoin) ; `GPT_ROLE.md` supprimé (aucune référence active dépendante ; historique préservé dans `DECISION-001` + note datée 2026-05-19).
- **Fichiers modifiés** : `GOVERNANCE.md` (header note GPT_ROLE, ordre de priorité, structure dossiers racine enrichie, § *Document canonical sources* réécrit en "État final post-nettoyage" avec 5 tables par dossier, phrase finale workflow IA), `CLAUDE.md` (retrait des annotations "stub temporaire de redirection"), `PROJECT_RULES.md` (5 lignes : KNOWN_ISSUES, ARCHITECTURE/DATA_PIPELINE/TRADING_LOGIC/TRADING_ENGINE/PROVIDERS_MATRIX, SETUPS_REGISTRY ×2, ASSET_REGISTRY), `BOT_OBJECTIVE.md` (6 lignes : KNOWN_ISSUES ×3, ARCHITECTURE, DATA_PIPELINE, TRADING_LOGIC scindée, PROVIDERS_MATRIX), `docs/project/DOC_IMPACT_MATRIX.md` (ligne "Évolution future structure" reformulée), `docs/project/MARKDOWN_CONSOLIDATION_PLAN.md` (inventaire actualisé avec lignes ~~strikethrough~~ pour stubs supprimés, étape 5 marquée réalisée), `docs/decisions/DECISION-001-...` (note datée § État actuel + § Suite éventuelle), `SESSION.md`.
- **Impact runtime** : aucun.
- **Impact quant** : aucun.
- **Impact documentation** : consolidation Markdown **terminée**. Racine réduite à 6 sources canoniques (`GOVERNANCE`, `BOT_OBJECTIVE`, `PROJECT_RULES`, `SESSION`, `CLAUDE`, `CHECKLIST_MERGE`). Tous les anciens chemins racine de transition supprimés. `GPT_ROLE.md` supprimé conformément à `DECISION-001` § *Suite éventuelle*.
- **Non inclus** : migration de `BOT_OBJECTIVE.md` / `PROJECT_RULES.md` / `CHECKLIST_MERGE.md` (squelettes équivalents pas prêts), modification du fond métier, modification runtime, modification quant.
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

1. **Décision politique sur le sourcing PEAD** (quant) : trouver / abandonner le dataset earnings nécessaire pour valider PEAD.
2. **Walk-forward conditionnel régime sur RS Rotation simple** (quant) : prérequis avant tout passage paper / live.
3. **Toute PR future de recherche** : doit référencer `RESEARCH_FRAMEWORK_FREEZE_V1.md` et joindre la checklist `docs/research/SETUP_VALIDATION_CHECKLIST.md` cochée avec valeurs mesurées.
4. **Optionnel** : modernisation du script `scripts/check-doc-impact.mjs` pour retirer les noms racine obsolètes de son matcher (faux positifs identifiés depuis PR #228).
5. **Optionnel** : archivage des outputs `tools/backtests/output/*.md` (hors gouvernance documentaire).

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

- Migration physique des fichiers Markdown (racine → `/docs/`) : **terminée**. Consolidation Markdown finalisée par la PR de nettoyage final (`claude/final-doc-stub-cleanup`).
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
