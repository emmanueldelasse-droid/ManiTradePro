# SESSION.md — ManiTradePro

> Carnet de bord court et exploitable du projet. Source de l'état **actuel**, pas un historique complet.
>
> Les règles, registres et détails techniques font autorité dans les fichiers spécialisés (cf. § *Fichiers sources à consulter*). `SESSION.md` ne fait que résumer.
>
> **Mise à jour obligatoire avant chaque demande de `GO MERGE`** (cf. `CHECKLIST_MERGE.md` et `GOVERNANCE.md` § *Règles synchronisation mémoire*).

## État actuel

- **Projet** : ManiTradePro — moteur quant de sélection / allocation / gestion du risque, orienté swing / rotation / momentum structurel multi-jours.
- **Date dernière mise à jour** : 2026-05-19.
- **Branche / PR active** : `claude/setup-manitradepro-docs-gUwP1` (en cours — PR-RS-HARDENING Phase 1 : nouveau script `tools/backtests/rs-rotation-hardening-v1.mjs`. 8 stress tests A.1-A.8 + matrice 4 régimes officiels v1 (RISK_ON, RANGE, RISK_OFF, HIGH_VOL). Findings : friction résistante jusqu'à ×3 (PF 1.30), RANGE = régime optimal (PF 2.04), HIGH_VOL très positif petit sample (PF 5.64 n=10), 2022 PF 0.146 catastrophique. Survival 21/25 SURVIVES, 2 MARGINAL, 2 KILLED. Verdict `HARDENED_FRAGILE` (un seul critère fail : bear 2022). Statut Setup 3 inchangé `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED`).
- **Dernier merge connu** : PR #239 `research(meanrev): PR-R3B-v3 strict rerun on completed 15 ETF dataset` (commit `c91a23a` sur `main`). Précédents : `cdbc1cb` (créateur ETF SPDR), PR #238 (`f826acc`).
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

- **PR** : PR-RS-HARDENING Phase 1 — stress tests + regime validation — branche `claude/setup-manitradepro-docs-gUwP1`.
- **Mission créateur** : phase "RS Rotation Hardening" — robustesse, survivabilité, stabilité multi-régime, résistance friction, contrôle concentration, gestion exposition. Cette PR couvre la **Phase 1** (A stress tests + B regime validation). Les phases C (exposure control) et D (quality metrics) sont des designs d'architecture qui méritent des PR séparées (`une PR = un objectif`).
- **Scope Phase 1** :
  - A. 8 stress tests : A.1 friction ×1/×2/×3, A.2 slippage 0.05/0.10/0.20 %, A.3 délai +1d/+2d/+5d, A.4 sans top 5/10 symboles + sans top 3 dates + combinés, A.5 stress sectoriel (sans secteur dominant), A.6 bear 2022 isolé, A.7 concentration sweep topN 5/10/20, A.8 volatility expansion (rvol SPY > 25 % annualisée).
  - B. Matrice par régime 4 états officiels v1 (RISK_ON, RANGE, RISK_OFF, HIGH_VOL).
- **Paramètres baseline gelés** ex-ante (identiques `rs-rotation-robustness-v1.mjs` PR #234).
- **Fichiers créés** :
  - `tools/backtests/rs-rotation-hardening-v1.mjs` (~780 lignes, focal sur Phase 1).
  - `tools/backtests/output/rs-rotation-hardening-v1.json` (~25 KB).
  - `tools/backtests/output/rs-rotation-hardening-v1.md` (~18 sections, survival map + verdict).
- **Fichiers modifiés** :
  - `docs/quant/SETUPS_REGISTRY.md` — Setup 3 enrichi d'une note PR-RS-HARDENING Phase 1 (résultats stress + matrice régime + findings + implications produit). **Statut officiel Setup 3 inchangé** : `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED`.
  - `SESSION.md` — branche/PR active, dernier merge, PR en cours, priorités.
- **Résultat synthétique** :
  - **Friction stress** : PF ×1=**1.53**, ×2=**1.41**, ×3=**1.30** → RS Rotation résiste à friction extrême (critères Freeze § 4 I2 ≥ 1.10 et I3 ≥ 1.00 passés).
  - **Matrice régime** :
    - RANGE : 390 trades, PF **2.04** — **régime optimal** confirmé.
    - RISK_ON : 530 trades, PF 1.28 (marginal positif).
    - RISK_OFF : 0 trades (filtré baseline NO_RISK_OFF).
    - HIGH_VOL : 10 trades, PF 5.64 (sample faible).
  - **Survival map** : **21/25 SURVIVES**, 2 MARGINAL, 2 KILLED (8 % killed).
  - **Caveat unique structurel** : 2022 PF **0.146** (catastrophique) — confirme le seul point fragile déjà identifié PR #234.
  - **Verdict** : `HARDENED_FRAGILE` — un seul critère structurel critique fail (2022).
- **Findings majeurs** :
  1. Friction n'est **pas** le problème de RS Rotation. Hypothèse historique "friction tue l'edge" invalidée.
  2. RANGE est le **régime optimal** (PF 2.04), pas RISK_ON. Confirme la conclusion historique de SETUPS_REGISTRY Setup 3.
  3. HIGH_VOL minoritaire mais positif (à confirmer en condition de moindre exclusion baseline).
  4. 2022 reste le seul point structurel catastrophique. Le filtre NO_RISK_OFF n'immunise pas — c'est l'année entière qui est fragile.
- **Implications produit** (à confirmer dans PR séparée Context Engine) :
  - Context Engine devrait **autoriser RS Rotation prioritairement en RANGE**, secondairement en RISK_ON, **désactiver** en RISK_OFF.
  - Filtre HIGH_VOL à étudier séparément (sample faible actuel à cause de NO_RISK_OFF override).
  - Mécanisme "protection bear" explicite (kill switch / exposure scaling) reste à concevoir — couche C "exposure control" du brief, hors scope Phase 1.
- **Impact runtime** : aucun.
- **Impact quant (fond)** : aucun. Aucun paramètre setup modifié. Aucun nouveau setup. Aucune promotion.
- **Impact documentation** : oui. Setup 3 enrichi note Phase 1 + findings + implications produit. Statut officiel inchangé.
- **Non inclus** : Phases C (exposure control : max positions secteur, max concentration, volatility scaling, risk budget, correlation caps, allocation dynamique) et D (quality metrics : confiance statistique, sample confidence, regime confidence, edge durability, fragility score, concentration risk score) — réservées à PR séparées avec design d'architecture dédié.
- **Conformité brief créateur + Research Framework Freeze v1** : OUI. Stress tests systématiques, aucune optimisation, aucun cherry-picking, paramètres baseline gelés, vocabulaire ne permet pas de promotion (`CONDITIONAL_EDGE`/`VALIDATED_RESEARCH_CORE`/`LIVE_READY` interdits en sortie).
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
9. 🟡 **PR-RS-HARDENING Phase 1** (en cours) — stress tests A.1-A.8 + matrice 4 régimes. Verdict `HARDENED_FRAGILE`. Findings : friction résistante ×3, RANGE régime optimal (PF 2.04), 2022 PF 0.146 caveat unique.
10. **PR-RS-HARDENING Phase 2** (subordonnée GO Phase 1) — design Context Engine couche 2.1.
11. **PR-RS-HARDENING Phase 3** (subordonnée Phase 2) — design Exposure Control couche C du brief (max positions secteur, vol scaling, risk budget, correlation caps).
12. **PR-RS-HARDENING Phase 4** (subordonnée Phase 3) — Quality Metrics couche D (sample confidence, regime confidence, edge durability, fragility score, concentration risk score).
13. **Décision A/B/C Mean Reversion** : en attente ChatGPT/créateur (classement V1 DATA_INSUFFICIENT_BUT_STRUCTURALLY_WEAK / DEAD_AGGREGATED / PR-R3A bis V1bis).
14. **GLD Breakout isolated validation** : audit anti-look-ahead spécifique, friction ×1/×2/×3, walk-forward 3 splits sur la variante unique. n=47 plafonne le statut maximal à `EXPERIMENTAL_ONLY`.
15. **Pullback reconstruction** : **uniquement si** hypothèse économique nouvelle documentée. Sinon, ne pas lancer.
16. **Documentaire** : enrichir les stubs `docs/quant/WALK_FORWARD_RULES.md`, `FRICTION_MODEL.md`, `BACKTEST_RULES.md`.
17. **Décomposition `SESSION.md`** : extraction blocs vers `docs/project/`, `docs/quant/`, `docs/decisions/`, retour à un carnet de bord court.
11. **RS Rotation hardening complement** (uniquement après PR-R3A/B/C/D décidée) : exécuter au moins 1-2 des 10 items listés dans `SETUPS_REGISTRY.md` Setup 3 § PR-R1 update (stress friction ×2/×3 prioritaire — plus rapide à exécuter et critère Freeze § 4 I2/I3 explicite).

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
