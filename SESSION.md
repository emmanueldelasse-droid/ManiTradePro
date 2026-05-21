# SESSION.md — ManiTradePro

> Carnet de bord court et exploitable du projet. Source de l'état **actuel**, pas un historique complet.
>
> Les règles, registres et détails techniques font autorité dans les fichiers spécialisés (cf. § *Fichiers sources à consulter*). `SESSION.md` ne fait que résumer.
>
> **Mise à jour obligatoire avant chaque demande de `GO MERGE`** (cf. `CHECKLIST_MERGE.md` et `GOVERNANCE.md` § *Règles synchronisation mémoire*).

## État actuel

- **Projet** : ManiTradePro — moteur quant de sélection / allocation / gestion du risque, orienté swing / rotation / momentum structurel multi-jours.
- **Date dernière mise à jour** : 2026-05-19.
- **Branche / PR active** : `claude/setup-manitradepro-docs-gUwP1` (en cours — PR-CTX-1 documentation Univers Core officiel V1 : création `docs/quant/UNIVERSE_CORE_V1.md` qui fige 78 actifs (27 ETF + 35 leaders US + 10 Europe + 6 crypto) comme liste opérationnelle pour Phase 2 Context Engine. PR strictement documentaire. Aucun script. Aucun runtime. Aucun changement de statut setup).
- **Dernier merge connu** : PR #240 `research(rs-rotation): PR-RS-HARDENING Phase 1 — 8 stress tests + 4-state regime matrix` (commit `17113b6` sur `main`).
- **Statut global** : phase de recherche quantitative active, sous **gel méthodologique** (Research Framework Freeze v1, cf. `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`).
- **Mode actuel** : recherche + documentation. Pas de capital réel. Pas de bot live actif.
- **Ce qui est réel** : aucun trading capital réel. Rien.
- **Ce qui est paper trading** : infrastructure paper existe (`mtp_positions`, `mtp_trades` Supabase) mais aucun setup n'est branché en automatique sans supervision humaine.
- **Ce qui est recherche** : tous les setups quantitatifs en cours d'évaluation, sous le pipeline 10 étapes du Framework Freeze v1.
- **Statuts setups officiels** (vocabulaire `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 8, détails dans `docs/quant/SETUPS_REGISTRY.md`) :
  - RS Rotation simple → **`RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED`**
  - Mean Reversion → **`EXPERIMENTAL_ONLY / FRICTION_REQUIRED`**
  - SECTOR_RELATIVE_STRENGTH v1 → **`FRAGILE / CONCENTRATION_EXCESSIVE`** (top 5 tickers = 103 % du PnL, edge non diversifiable)
  - TREND_PULLBACK_DYNAMIC_SUPPORT v1 → **`FRAGILE`**
  - GLD Breakout isolated → **`CONDITIONAL_RESEARCH_CANDIDATE`** (n=47, single-symbol)
  - Pullback Momentum → **`DEAD / DO_NOT_TRADE`** (PR #207 INVALID_BACKTEST)
  - Breakout agrégé → **`DEAD_AGGREGATED`** (PR #208)
  - Volatility Compression → **`DEAD / ABANDONED`**
- **Ce qui n'est pas encore live** : tout. **Aucun setup `VALIDATED_RESEARCH_CORE`** au 2026-05-19. **Aucun setup `LIVE_READY`** au 2026-05-19.

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

- **PR** : PR-CTX-1 documentation Univers Core officiel V1 — branche `claude/setup-manitradepro-docs-gUwP1`.
- **Objectif unique** : figer la liste opérationnelle des 78 actifs de l'Univers Core V1 (sous-ensemble curé des 181 classifiés `ASSET_REGISTRY`, conforme à la fourchette 40-120 de `TRADING_PHILOSOPHY` § 5). Prerequisite documentaire pour la Phase 2 Context Engine. PR strictement documentaire.
- **Fichiers créés** :
  - `docs/quant/UNIVERSE_CORE_V1.md` (~310 lignes, 12 sections) — liste exacte par catégorie, exclusions explicites, règle d'évolution, articulation avec autres docs canoniques, stats couverture dataset.
- **Fichiers modifiés** :
  - `docs/quant/ASSET_REGISTRY.md` — section "Univers cible stratégique" enrichie d'un pointeur vers `UNIVERSE_CORE_V1.md` (liste opérationnelle figée). Pas de modification de la classification ELITE/CORE/TACTICAL/BLACKLIST.
  - `SESSION.md` — branche/PR active, dernier merge, PR en cours, priorités.
- **Composition figée Univers Core V1** :
  - ETF macro / sectoriels / thématiques : **27** (5 indices US + 11 SPDR sectoriels + 11 thématiques tech/IA/cyber/cloud).
  - Leaders US large cap : **35** (10 mega tech + 8 semi structurels + 10 software/cyber/cloud + 5 quality/defensive + 2 financial).
  - Europe limitée et contrôlée : **10** (LVMH, AIR, ASML, SAP, SIE, NESN, RMS, TTE, CAP, DSY).
  - Crypto majeures uniquement : **6** (BTC, ETH, SOL, BNB, LINK, AVAX).
  - **Total : 78 actifs** (sous le plafond 80 du brief).
- **Couverture dataset** : 78/78 actifs présents dans `data/*_2025.json` avec 1255 candles 2021-01-04 → 2025-12-31. Vérifié 2026-05-19.
- **Exclusions explicites documentées** : ETF leveraged (SOXL, TQQQ, USD, ROM), penny stocks, small caps spéculatives (AEHR, ACLS, BBAI, SOUN, WOLF, APLD, NBIS, etc.), AI hypergrowth single-name volatile (SMCI, AI, UPST), crypto altcoins illiquides, FX exotiques (EURUSD/GBPUSD/USDJPY = BLACKLIST), 54 actifs `BLACKLIST` de `ASSET_REGISTRY.md`.
- **Articulation** : `BOT_OBJECTIVE` → `PROJECT_VISION` → `TRADING_PHILOSOPHY` § 5 (fourchette 40-120) → `ASSET_REGISTRY` § univers cible (règle stratégique) → `UNIVERSE_CORE_V1.md` (liste figée). `universe-v2.mjs` reste l'univers technique large 181 actifs pour backtests historiques recherche — **inchangé** par cette PR.
- **Règle d'évolution** : ajout/retrait d'actif = PR documentaire dédiée. Aucune modification silencieuse.
- **Impact runtime** : aucun.
- **Impact quant (fond)** : aucun. Aucun setup modifié. Aucune promotion. Aucun verdict quantitatif touché. PR-RS-HARDENING Phase 1, MR R3B v3, etc. tous inchangés.
- **Impact documentation** : oui. Liste opérationnelle figée pour Phase 2+.
- **Non inclus** : Phase 2 Context Engine analytical module (réservé PR-CTX-2), Phase 2 Setup Authorization Matrix (PR-CTX-3), Phase 2 Architecture diagram (PR-CTX-4), Phase 5 Runtime Authorization Layer (PR-CTX-5 — nécessite escalade créateur pour décision worker vs pure-recherche).
- **Conformité brief créateur + Freeze v1** : OUI. Approche progressive et contrôlée, refus scanner géant, exclusions explicites, articulation claire avec docs canoniques existantes, vocabulaire strictement documentaire.
- **Statut merge** : attente `GO MERGE explicite de ChatGPT` (et/ou créateur).

## Décisions actives

- **Gouvernance** : `GOVERNANCE.md` = source canonique unique (IA, projet, validation, merge, agents/skills, gouvernance quant). `GPT_ROLE.md` a été supprimé après période de transition ; l'historique de sa fusion dans `GOVERNANCE.md` est conservé dans `docs/decisions/DECISION-001-gpt-role-merged-into-governance.md`. `CLAUDE.md` = manuel opérationnel Claude Code.
- **Provider principal** : EODHD (daily / swing). Détails et fallbacks dans `docs/monitoring/PROVIDERS_MATRIX.md`.
- **Capital réel** : interdit tant que les conditions de `BOT_OBJECTIVE.md` § *Conditions avant passage en bot réel* ne sont pas remplies (walk-forward, frictions, sizing, kill switch, paper trading prolongé, etc.).
- **Research Framework Freeze v1** : actif. Toute PR de recherche doit s'y conformer ou marquer explicitement `⚠ DÉVIATION FRAMEWORK FREEZE v1` + justification.
- **Cadence imposée** : maximum 1 nouvelle famille de setup par 2 semaines. Pas de PR « polissage » sans valeur incrémentale claire.
- **Anti-hallucination** : aucun résultat « qui semble bon » n'est valide sans walk-forward + multi-régimes + multi-années (cf. `GOVERNANCE.md` § *Règle anti-hallucination*).

## Points de vigilance

- **Aucun setup `VALIDATED_RESEARCH_CORE`** au 2026-05-19.
- **Aucun setup `LIVE_READY`** au 2026-05-19. Détail des statuts dans `docs/quant/SETUPS_REGISTRY.md`.
- **SECTOR_RS v1** : `FRAGILE / CONCENTRATION_EXCESSIVE`. PF brut 2.16 séduisant **mais** top 5 tickers = 103 % du PnL (sans eux PF = 0.94). Edge non diversifiable. À ne pas activer paper / live. Correction concentration + stress tests + audit `sectorMomentum` requis avant toute promotion.
- **PEAD** : seule piste structurellement distincte de momentum, mais bloquée par absence de dataset earnings.
- **RS Rotation simple** : crédible côté exécution mais fragile temporellement (0 cellule ROBUST/STABLE rolling). Walk-forward conditionnel régime + friction obligatoires avant tout passage paper / live.
- **Détecteur runtime ≠ setup validé** : `detectConfiguration` côté worker continue d'exposer `pullback`, `breakout`, `mean_reversion`, etc. Aucun de ces détecteurs n'est `VALIDATED_RESEARCH_CORE` au sens Freeze v1. Aucun trade automatique sur ces détecteurs sans `GO MERGE` ChatGPT dédié. Cf. `docs/quant/TRADING_LOGIC.md` § *Setups détectés*.
- **Biais d'exécution historiques** : les anciens PF / winrate antérieurs aux audits PR #207 et #208 sont annulés. Voir bannière en tête de `docs/quant/SETUPS_REGISTRY.md`.
- **Dépendance KV `MTP_CACHE`** : la cohérence prix cross-worker dépend du binding KV. Sans lui, bug cross-worker silencieux (cf. `PROJECT_RULES.md` R4).
- **`buildSnapshotId`** : purement analytique, aucune dépendance live autorisée. Toute modif casse l'historique des snapshots.
- **Documentation** : `SESSION.md` doit refléter l'état réel **après** chaque merge. Ne jamais y mettre une intention non livrée.

## Prochaines priorités

Plan PR par PR validé par ChatGPT (réponse Q3 message 2026-05-19, ordre ajusté post-PR #233) :

1. ✅ **PR documentaire truth-sync** mergée (PR #233, commit `19872ac` sur `main`).
2. ✅ **PR-R1 RS Rotation robustness improvement evidence** mergée (PR #234, commit `1641abf` sur `main`).
3. ✅ **PR-R3A Mean Reversion diagnostic** mergée (PR #235, commit `fc622fa` sur `main`).
4. ✅ **PR-VISION Architecture produit + philosophie** mergée (PR #236, commit `44a39e6` sur `main`).
5. ❌ **PR-R3B v1 test isolé V1 Mean Reversion** (PR #237 fermée NOGO ChatGPT — univers incomplet 4/15 ETF).
6. ✅ **PR-R3B-v2 dataset integrity fix** mergée (PR #238, commit `f826acc`) — cause racine identifiée, SYMBOL_MAP fixé.
7. ✅ **Dataset SPDR complété** (commit `cdbc1cb` créateur) — 11 ETF SPDR ajoutés (DIA + 10 sectoriels).
8. ✅ **PR-R3B-v3 rerun strict 15 ETF** mergée (PR #239, commit `c91a23a`) — verdict NEEDS_MORE_DATA + indicateurs qualitatifs catastrophiques. Décision A/B/C Mean Reversion en attente.
9. ✅ **PR-RS-HARDENING Phase 1** mergée (PR #240, commit `17113b6`) — stress tests A.1-A.8 + matrice 4 régimes. Verdict `HARDENED_FRAGILE`. Findings : friction ×3 OK (PF 1.30), RANGE régime optimal (PF 2.04), 2022 PF 0.146 caveat unique.
10. 🟡 **PR-CTX-1 documentation Univers Core officiel V1** (en cours) — 78 actifs figés (27 ETF + 35 leaders US + 10 Europe + 6 crypto). Prerequisite Phase 2.
11. **PR-CTX-2 Context Engine V1 analytical module** (subordonnée GO PR-CTX-1) — analyse SPY/QQQ/secteurs/VIX-proxy/TLT/GLD, classification régime 4 états officiels, tests cohérence régimes.
12. **PR-CTX-3 Setup authorization matrix** (subordonnée PR-CTX-2) — déclarations `{allowedMarkets, allowedRegimes, blockedRegimes, preferredConditions}` par setup.
13. **PR-CTX-4 Architecture diagram + doc flux décisionnel** (subordonnée PR-CTX-3) — synthèse Phase 2.
14. **PR-CTX-5 Runtime authorization layer** (subordonnée escalade créateur) — décision worker.js vs pure-recherche.
15. **PR-RS-HARDENING Phase 3** (subordonnée GO Phase 2) — design Exposure Control couche C du brief (max positions secteur, vol scaling, risk budget, correlation caps).
16. **PR-RS-HARDENING Phase 4** (subordonnée Phase 3) — Quality Metrics couche D (sample confidence, regime confidence, edge durability, fragility score, concentration risk score).
17. **Décision A/B/C Mean Reversion** : en attente ChatGPT/créateur (classement V1 DATA_INSUFFICIENT_BUT_STRUCTURALLY_WEAK / DEAD_AGGREGATED / PR-R3A bis V1bis).
18. **GLD Breakout isolated validation** : audit anti-look-ahead spécifique, friction ×1/×2/×3, walk-forward 3 splits sur la variante unique. n=47 plafonne le statut maximal à `EXPERIMENTAL_ONLY`.
19. **Pullback reconstruction** : **uniquement si** hypothèse économique nouvelle documentée. Sinon, ne pas lancer.
20. **Documentaire** : enrichir les stubs `docs/quant/WALK_FORWARD_RULES.md`, `FRICTION_MODEL.md`, `BACKTEST_RULES.md`.
21. **Décomposition `SESSION.md`** : extraction blocs vers `docs/project/`, `docs/quant/`, `docs/decisions/`, retour à un carnet de bord court.

Autres :

- **Décision politique sur le sourcing PEAD** (quant) : trouver / abandonner le dataset earnings nécessaire pour valider PEAD.
- **Toute PR future de recherche** : doit référencer `RESEARCH_FRAMEWORK_FREEZE_V1.md` et joindre la checklist `docs/research/SETUP_VALIDATION_CHECKLIST.md` cochée avec valeurs mesurées.
- **Optionnel** : modernisation du script `scripts/check-doc-impact.mjs` pour retirer les noms racine obsolètes de son matcher (faux positifs identifiés depuis PR #228).
- **Optionnel** : archivage des outputs `tools/backtests/output/*.md` (hors gouvernance documentaire).

## Fichiers sources à consulter

- **Gouvernance projet (priorité absolue)** : `GOVERNANCE.md`.
- **Manuel opérationnel Claude Code** : `CLAUDE.md`.
- **Objectif produit / constitution** : `BOT_OBJECTIVE.md`.
- **Règles techniques structurelles** : `PROJECT_RULES.md`.
- **Architecture code** : `docs/project/ARCHITECTURE.md`.
- **Pipeline de données** : `docs/project/DATA_PIPELINE.md`.
- **Logique quant / scoring / setups** : `docs/quant/TRADING_LOGIC.md`.
- **Moteur trading / exécution / safety / sizing** : `docs/project/TRADING_ENGINE.md`.
- **Setups quantitatifs** : `docs/quant/SETUPS_REGISTRY.md`.
- **Classification actifs** : `docs/quant/ASSET_REGISTRY.md`.
- **Providers** : `docs/monitoring/PROVIDERS_MATRIX.md`.
- **Bugs / dette** : `docs/monitoring/KNOWN_ISSUES.md`.
- **Checklist merge** : `CHECKLIST_MERGE.md`.
- **Matrice d'impact documentaire** : `docs/project/DOC_IMPACT_MATRIX.md` (aide anti-oubli : `npm run check:doc-impact`).
- **Plan de consolidation Markdown** : `docs/project/MARKDOWN_CONSOLIDATION_PLAN.md`.
- **Décisions structurantes historiques** : `docs/decisions/` (format dans `docs/decisions/README.md`).
- **Framework recherche (gel actif)** : `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`, `docs/research/SETUP_VALIDATION_CHECKLIST.md`, `docs/research/ANTI_LOOKAHEAD_RULES.md`, `docs/research/DATASET_GOVERNANCE.md`.

## Non encore fait

- Migration physique des fichiers Markdown (racine → `/docs/`) : **terminée**. Consolidation Markdown finalisée par la PR de nettoyage final (`claude/final-doc-stub-cleanup`).
- Sourcing dataset PEAD : décision politique en attente.
- Walk-forward conditionnel régime sur RS Rotation simple : non lancé.
- Migration physique racine → `/docs/` : terminée pour les 7 fichiers concernés ; les arbitrages restants (`BOT_OBJECTIVE.md`, `PROJECT_RULES.md`, `CHECKLIST_MERGE.md`) restent intentionnellement à la racine (cf. `GOVERNANCE.md` § *Arbitrages assumés*).
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
