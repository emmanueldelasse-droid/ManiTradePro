# SESSION.md — ManiTradePro

> Carnet de bord court et exploitable du projet. Source de l'état **actuel**, pas un historique complet.
>
> Les règles, registres et détails techniques font autorité dans les fichiers spécialisés (cf. § *Fichiers sources à consulter*). `SESSION.md` ne fait que résumer.
>
> **Mise à jour obligatoire avant chaque demande de `GO MERGE`** (cf. `CHECKLIST_MERGE.md` et `GOVERNANCE.md` § *Règles synchronisation mémoire*).

## État actuel

- **Projet** : ManiTradePro — moteur quant de sélection / allocation / gestion du risque, orienté swing / rotation / momentum structurel multi-jours.
- **Date dernière mise à jour** : 2026-05-19.
- **Branche / PR active** : `claude/setup-manitradepro-docs-gUwP1` (en cours — PR-R3B-v2 dataset integrity fix : PR #237 v1 fermée NOGO par ChatGPT. v2 corrige la cause racine du gap (désynchro `SYMBOL_MAP` de `download-eodhd-2025.mjs` avec `universe-v2.mjs`), ajoute les 11 ETF manquants au `SYMBOL_MAP`. Comblement effectif du dataset non exécutable depuis environnement Claude managé (pas de `EODHD_API_KEY` + allowlist réseau bloque eodhd.com/yahoo.com) → procédure documentée côté créateur. Aucun paramètre setup modifié. Verdict officiel : V1 non testable avec le dataset projet actuel).
- **Dernier merge connu** : PR #236 `docs(vision): formalise product architecture and trading philosophy` (commit `44a39e6` sur `main`).
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

- **PR** : PR-R3B-v2 dataset integrity fix Mean Reversion V1 ETF Range Short — branche `claude/setup-manitradepro-docs-gUwP1`.
- **Contexte** : PR-R3B v1 (PR #237) fermée NOGO par ChatGPT — verdict NEEDS_MORE_DATA pas considéré comme validation réelle de l'hypothèse V1 puisque univers incomplet. Mission v2 : combler l'univers ET rerun strict avec mêmes paramètres gelés.
- **Objectif unique** : corriger la cause racine du DATASET_GAP identifié par PR-R3B v1 (11 ETF de l'univers cible V1 absents du dataset projet). **Aucune autre modification autorisée** par le brief ChatGPT.
- **Cause racine identifiée et confirmée** : désynchronisation entre `tools/backtests/universe-v2.mjs` (qui contient DIA, XLE, XLF, XLV, XLI, XLP, XLY, XLB, XLU, XLRE, XLC dans ses groupes `ETFs_US_INDEX` + `ETFs_US_SECTORS`) et `tools/backtests/download-eodhd-2025.mjs` (dont le `SYMBOL_MAP` n'incluait pas ces 11 ETF). Bug d'inventaire, pas un bug provider ni un problème survivorship.
- **Fix appliqué dans v2** : ajout des 11 ETF au `SYMBOL_MAP` (suffixe `.US` standard EODHD).
- **Comblement effectif du dataset — non exécutable depuis l'environnement Claude managé** :
  - `.env` ne contient pas `EODHD_API_KEY`.
  - Allowlist réseau de l'environnement bloque eodhd.com (HTTP 403) et yahoo.com (HTTP 403).
  - Procédure de comblement documentée à exécuter côté créateur (cf. `SETUPS_REGISTRY.md` Setup 4 § Mise à jour PR-R3B-v2).
- **Rerun strict effectué** : `node tools/backtests/meanrev-etf-range-v1.mjs` re-exécuté **sans aucune modification de paramètres**. Résultat identique : 0 signal (logique — les ETF sectoriels restent absents tant que le créateur n'a pas lancé le download avec sa clé EODHD). Outputs JSON/MD régénérés cohérents.
- **Fichiers modifiés v2** :
  - `tools/backtests/download-eodhd-2025.mjs` — ajout des 11 ETF au `SYMBOL_MAP` + commentaire-procédure de comblement.
  - `docs/quant/SETUPS_REGISTRY.md` — Setup 4 enrichi d'une note PR-R3B-v2 : cause racine confirmée, fix script, procédure de comblement créateur, verdict officiel intermédiaire "V1 non testable avec le dataset projet actuel".
  - `SESSION.md` — état mis à jour.
- **Fichiers inchangés v2 (interdiction stricte par brief)** :
  - `tools/backtests/meanrev-etf-range-v1.mjs` (zéro changement — paramètres gelés inchangés).
  - Méthodologie inchangée. Hypothèse économique inchangée.
  - Aucun fichier runtime modifié.
- **Verdict officiel intermédiaire** : **V1 `meanrev_etf_range_short` n'est pas testable avec le dataset projet actuel.** Cohérent avec la directive brief ChatGPT § *Si les ETF sont introuvables*. Le verdict quantitatif réel attend l'exécution de la procédure de comblement côté créateur, puis une PR-R3B-v3 dédiée au rerun avec dataset complet.
- **Impact runtime** : aucun.
- **Impact quant (fond)** : aucun. Aucun paramètre setup modifié. Aucun nouveau setup. Aucune promotion.
- **Impact documentation** : oui. Setup 4 enrichi de la note PR-R3B-v2. Statut officiel inchangé `EXPERIMENTAL_ONLY / FRICTION_REQUIRED`.
- **Conformité brief ChatGPT** : OUI. Seule modification autorisée appliquée (ajout ETF au SYMBOL_MAP). Aucune optimisation, aucune dérive scope, aucune relâche de filtres, aucun "faire apparaître" de trades.
- **Statut merge** : attente `GO MERGE explicite de ChatGPT` sur PR-R3B-v2.

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
5. ❌ **PR-R3B test isolé V1 Mean Reversion** (PR #237 fermée NOGO par ChatGPT 2026-05-19 — univers incomplet, test non concluant).
6. 🟡 **PR-R3B-v2 dataset integrity fix** (en cours) : cause racine identifiée (désynchro SYMBOL_MAP / universe-v2), fix appliqué, procédure de comblement créateur documentée. Comblement effectif hors capacités env Claude (allowlist réseau + pas d'EODHD key). Verdict officiel intermédiaire : V1 non testable avec dataset projet actuel.
7. **PR-R3B-v3** (subordonné comblement dataset par créateur) : rerun strict après téléchargement 11 ETF par créateur, mêmes paramètres gelés, verdict quantitatif réel.
5. **PR-R3C V2 anti-déguisement** (uniquement si V1 passe) : vérification stricte momentum-pullback déguisé.
6. **PR-R3D V3 stress max** (uniquement si V1 ET V2 passent).
7. **GLD Breakout isolated validation** : audit anti-look-ahead spécifique, friction ×1/×2/×3, walk-forward 3 splits sur la variante unique. n=47 plafonne le statut maximal à `EXPERIMENTAL_ONLY`.
8. **Pullback reconstruction** : **uniquement si** hypothèse économique nouvelle documentée (cf. `SETUP_VALIDATION_CHECKLIST.md` section A). Sinon, ne pas lancer.
9. **Documentaire** : enrichir les stubs `docs/quant/WALK_FORWARD_RULES.md`, `FRICTION_MODEL.md`, `BACKTEST_RULES.md` avec la méthodologie canonique projet (PR dédiée, `une PR = un objectif`).
10. **Décomposition `SESSION.md`** (cf. priorité ChatGPT post-PR #233) : extraction blocs vers `docs/project/`, `docs/quant/`, `docs/decisions/`, retour à un carnet de bord court.
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
