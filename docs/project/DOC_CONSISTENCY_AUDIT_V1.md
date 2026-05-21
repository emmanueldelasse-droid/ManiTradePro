# DOC_CONSISTENCY_AUDIT_V1 — Audit de cohérence documentaire ManiTradePro

> **Type** : audit + plan de nettoyage. **Pas** une PR de nettoyage massif.
>
> **Date** : 2026-05-19.
>
> **PR origine** : `docs(audit): documentation consistency audit V1`.
>
> **Mission** (brief créateur 2026-05-19) : auditer tous les `.md` du projet pour identifier obsolescences, contradictions, doublons, règles mortes, références invalidées, docs inutiles, statuts setups incohérents, mauvaise séparation recherche/runtime. **NE RIEN INVENTER. NE RIEN SUPPRIMER ici** — audit + plan, exécution par PR ultérieures.
>
> **Périmètre** : 44 fichiers `.md` du repo (hors `.git`, `node_modules`, et `tools/backtests/output/*.md` qui sont des artefacts régénérables).

---

## 0. Méthodologie

Lecture directe (21 fichiers déjà lus en session courante) + inventaire ciblé via Explore agent (23 fichiers restants). Vérification croisée des statuts setups, univers, paramètres baselines entre tous les fichiers canoniques.

Drapeaux utilisés :

- 🚩 **OBSOLETE_SUSPECT** : contenu probablement obsolète vs état réel post-PR #236+.
- 🚩 **STUB_VIDE** : "_À remplir_" sans contenu opérationnel.
- 🚩 **REDONDANT** : information répétée dans plusieurs fichiers canoniques.
- 🚩 **CONTRADICTION** : indique un statut/règle qui contredit une autre source.
- 🚩 **RUNTIME_RECHERCHE_CONFUS** : mélange recherche et runtime.
- 🚩 **HISTORIQUE_ARCHIVE** : note historique qui pourrait être archivée.
- ✅ **CANONIQUE_PROPRE** : pas de drapeau.

---

## 1. Inventaire complet — 44 fichiers

### 1.1 Racine (6 fichiers — sources canoniques transversales)

| Fichier | Lignes | Type | Rôle | Statut | Drapeaux | Action |
|---|---:|---|---|---|---|---|
| `GOVERNANCE.md` | ~1090 | Contenu actif | Gouvernance projet, autorité absolue, rôles, validation, merge, agents/skills, gouvernance quant | OFFICIAL | ✅ | **Conserver** |
| `BOT_OBJECTIVE.md` | ~330 | Contenu actif | Constitution produit, objectif réel, règles absolues 1-10, conditions argent réel | OFFICIAL | ✅ | **Conserver** (cible migration future vers `docs/project/PROJECT_VISION.md` — arbitrage assumé `GOVERNANCE` § *Arbitrages assumés*) |
| `PROJECT_RULES.md` | ~205 | Contenu actif | Règles techniques structurelles R1-R12 (séparation analytique/live, snapshotId, R3-ter safety gate, R4 resolveLiveQuote, etc.) | OFFICIAL | ✅ | **Conserver** |
| `SESSION.md` | ~150 | Carnet de bord | État actuel, PR en cours, prochaines priorités | OFFICIAL (mis à jour par chaque PR) | 🚩 **HISTORIQUE_ARCHIVE** (sections "Dernière session bis" obsolètes lignes 31-51) | **Réduire** — extraire historique des PR mergées dans `docs/decisions/` ou archive (priorité ChatGPT post-#233 listée mais non exécutée) |
| `CLAUDE.md` | ~225 | Contenu actif | Manuel opérationnel Claude Code (stack, contraintes, vocabulaire, agents/skills) | OFFICIAL | ✅ | **Conserver** |
| `CHECKLIST_MERGE.md` | ~185 | Contenu actif | Checklist obligatoire avant merge (doc impact, base de données, impact, qualité, cohérence, git, escalades, gouvernance IA) | OFFICIAL | ✅ | **Conserver** |

### 1.2 `docs/project/` (12 fichiers)

| Fichier | Lignes | Type | Rôle | Statut | Drapeaux | Action |
|---|---:|---|---|---|---|---|
| `ARCHITECTURE.md` | ~344 | Contenu actif | Architecture code réel (front ~8200l, worker ~9800l, routes API, paper trading, affichage prix) | CANONIQUE | ✅ | **Conserver** |
| `DATA_PIPELINE.md` | ~640 | Contenu actif | Flux données par écran, `resolveLiveQuote` mémoire/KV/cascade, filet EOD, TTL, fallbacks | CANONIQUE | ✅ | **Conserver** |
| `TRADING_ENGINE.md` | ~307 | Contenu actif | Moteur exécution : couches décision/exécution, snapshotId, quoteQuality, règles ouverture (17 filtres), safety gate, sizing | CANONIQUE | ✅ | **Conserver** |
| `TRADING_PHILOSOPHY.md` | ~580 | Contenu actif | Architecture produit cible 5 couches, principe "un setup ≠ un edge", setups familles, univers cible 40-120, refus scalping/HFT/patterns | OFFICIAL (PR #236) | ✅ | **Conserver** |
| `PROJECT_VISION.md` | ~220 | Contenu actif | Vision produit consolidée (PR #236 rempli depuis squelette) | OFFICIAL | ✅ | **Conserver** |
| `DOC_IMPACT_MATRIX.md` | ~92 | Contenu actif | Matrice impact documentaire par type PR | CANONIQUE | ✅ | **Conserver** |
| `MARKDOWN_CONSOLIDATION_PLAN.md` | ~120 | Contenu actif | Plan audit & migration docs (historique de la consolidation 2026-05-19) | CANONIQUE | 🚩 **HISTORIQUE_ARCHIVE** partiel (le plan a été exécuté, sections "Étapes" résolues) | **Réduire** — archiver les sections de plan exécutées, garder l'inventaire final |
| `AI_WORKFLOW.md` | ~58 | Stub squelette | Workflow GPT ↔ Claude — "_À remplir_", renvoi vers `GOVERNANCE.md` | À REMPLIR | 🚩 **STUB_VIDE**, 🚩 **REDONDANT** | **Supprimer** ou **transformer en pointeur** (contenu déjà 100 % dans `GOVERNANCE.md` § *Gouvernance ChatGPT ↔ Claude*) |
| `MERGE_PROTOCOL.md` | ~84 | Stub squelette | Workflow PR, GO/NOGO, rollback — "_À remplir_" depuis `CHECKLIST_MERGE.md` + `GOVERNANCE.md` | À REMPLIR | 🚩 **STUB_VIDE**, 🚩 **REDONDANT** | **Supprimer** ou **transformer en pointeur** (contenu déjà dans `CHECKLIST_MERGE.md` + `GOVERNANCE.md` § *Workflow validation avant merge*) |
| `PROD_SAFETY_RULES.md` | ~74 | Stub squelette | Protections prod, rollback, observabilité, recovery — "_À remplir_" | À REMPLIR | 🚩 **STUB_VIDE** | **Conserver vide** (squelette utile pour future PR de remplissage quand on prépare le broker réel) OU **archiver** si pas de plan court terme |
| `CALIBRATION_RULES.md` | ~70 | Stub squelette | Conditions recalibration, validations, anti curve-fitting — "_À remplir_" | À REMPLIR | 🚩 **STUB_VIDE** | **Conserver vide** OU **enrichir** (pourrait absorber des règles dispersées : Freeze § 4 critères de promotion + R3A garde-fou anti-empilement + RS Rotation hardening verdicts) |
| `EXPERIMENTAL_FEATURES.md` | ~50 | Stub squelette | Features expérimentales, hypothèses, statuts — "_À remplir_" (template fourni) | À REMPLIR | 🚩 **STUB_VIDE** | **Conserver vide** OU **transformer en pointeur** vers `SETUPS_REGISTRY.md` (qui assume déjà ce rôle pour les setups) |

### 1.3 `docs/quant/` (10 fichiers)

| Fichier | Lignes | Type | Rôle | Statut | Drapeaux | Action |
|---|---:|---|---|---|---|---|
| `SETUPS_REGISTRY.md` | ~700 | Contenu actif | Registre officiel statuts setups (8 setups documentés post-audit + 4 sections d'évolution PR-R3B/R3B-v2/R3B-v3) | OFFICIAL | ✅ | **Conserver** — c'est la source canonique des statuts |
| `TRADING_LOGIC.md` | ~265 | Contenu actif | Logique quant scoring + setups détectés + modulateurs + apprentissage | CANONIQUE | ✅ | **Conserver** |
| `ASSET_REGISTRY.md` | ~210 | Contenu actif | Classification ELITE/CORE/TACTICAL/BLACKLIST + univers cible + pointeur vers `UNIVERSE_CORE_V1.md` | CANONIQUE | ✅ | **Conserver** |
| `UNIVERSE_CORE_V1.md` | ~310 | Contenu actif | Liste figée 78 actifs Core V1 + exclusions + règle d'évolution (PR #241) | OFFICIAL | ✅ | **Conserver** |
| `BACKTEST_RULES.md` | ~76 | Stub squelette | Contraintes backtests, reproductibilité, exclusions, anti-lookahead — "_À remplir_" | À REMPLIR | 🚩 **STUB_VIDE**, 🚩 **REDONDANT** | **Réduire ou supprimer** — contenu déjà dans `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md` § 3 + `ANTI_LOOKAHEAD_RULES.md` + `DATASET_GOVERNANCE.md`. Si on garde, transformer en index/pointeur. |
| `WALK_FORWARD_RULES.md` | ~66 | Stub squelette | Validation séquentielle, train/test, robustesse — "_À remplir_" | À REMPLIR | 🚩 **STUB_VIDE**, 🚩 **REDONDANT** | **Réduire** — méthodologie WF déjà codifiée dans `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 3.5 et démontrée par `rs-rotation-robustness-v1.mjs` + `rs-rotation-hardening-v1.mjs`. Pointeur suffisant. |
| `FRICTION_MODEL.md` | ~83 | Stub squelette | Spread, slippage, frais, délais, gaps, liquidité — "_À remplir_" | À REMPLIR | 🚩 **STUB_VIDE** | **Enrichir prioritairement** (la formule canonique `(0.30 + 0.02 × holdDays) / 5` vit actuellement éparse dans 4 scripts + note R3A § 5 — devrait être canonisée ici) |
| `ALLOCATION_RULES.md` | ~65 | Stub squelette | Sizing, caps secteur/crypto, allocation — "_À remplir_" | À REMPLIR | 🚩 **STUB_VIDE** | **Conserver vide** OU **enrichir** (cf. Phase 3 exposure control du brief Hardening V1) |
| `REGIME_RULES.md` | ~60 | Stub squelette | Régimes, filtres, transitions — "_À remplir_" | À REMPLIR | 🚩 **STUB_VIDE** | **Enrichir prioritairement** (la définition opérationnelle 4 régimes RISK_ON/RANGE/RISK_OFF/HIGH_VOL est éparse dans `rs-rotation-hardening-v1.mjs` + brief créateur — devrait être canonisée ici) |
| `RISK_ENGINE_RULES.md` | ~79 | Stub squelette | Kill switch, max perte, drawdown, cooldown — "_À remplir_" | À REMPLIR | 🚩 **STUB_VIDE** | **Conserver vide** OU **enrichir** (Phase 3 brief Hardening + caveat 2022 RS Rotation → mécanisme protection bear à concevoir) |

### 1.4 `docs/monitoring/` (3 fichiers)

| Fichier | Lignes | Type | Rôle | Statut | Drapeaux | Action |
|---|---:|---|---|---|---|---|
| `KNOWN_ISSUES.md` | ~335 | Contenu actif | 14 issues + risques d'architecture + non encore fait | CANONIQUE | ✅ partiellement obsolète (issue #14 SESSION.md oversized = 3393 lignes mentionnée, alors qu'actuellement ~150 lignes après nettoyages) | **Conserver** + corriger #14 |
| `PROVIDERS_MATRIX.md` | ~125 | Contenu actif | Matrice dispatching providers (crypto/US/EU/UK/CHF/forex, routage, caches, fallbacks) | CANONIQUE | ✅ | **Conserver** |
| `DATA_QUALITY.md` | ~50 | Stub squelette | Qualité données par provider — "_À remplir_" | À REMPLIR | 🚩 **STUB_VIDE** | **Conserver vide** (cible légitime, à remplir quand `quoteQualityEngine` retours observables se stabilisent) |

### 1.5 `docs/research/` (6 fichiers)

| Fichier | Lignes | Type | Rôle | Statut | Drapeaux | Action |
|---|---:|---|---|---|---|---|
| `RESEARCH_FRAMEWORK_FREEZE_V1.md` | ~285 | Contenu actif | Gel méthodologique recherche quant (12 sections : règles obligatoires, critères promotion, interdictions, pipeline 10 étapes, classification) | OFFICIAL | ✅ | **Conserver** |
| `SETUP_VALIDATION_CHECKLIST.md` | ~180 | Contenu actif | Checklist 13 sections (A hypothèse, B données, C exécution, D métriques, E stabilité, F walk-forward, G concentration, H anti-lookahead, I friction, J corrélation, K classification, L gouvernance, M interdictions) | OFFICIAL | ✅ | **Conserver** |
| `ANTI_LOOKAHEAD_RULES.md` | ~250 | Contenu actif | Règles techniques anti-lookahead (définitions, fenêtres, indicateurs, test validation, cas particuliers, erreurs types) | OFFICIAL | ✅ | **Conserver** |
| `DATASET_GOVERNANCE.md` | ~220 | Contenu actif | Gouvernance datasets recherche (OHLC OK, earnings manquant, critères acceptation, pipeline ingestion) | CANONIQUE | ✅ | **Conserver** |
| `PEAD_DATA_REQUIREMENTS.md` | ~275 | Contenu actif | Spec PEAD (earnings dates, EPS, sources SEC/Alpha V./Yahoo, comparaison coûts) | CANONIQUE RECHERCHE | ✅ | **Conserver** |
| `POST_EARNINGS_DRIFT_FOUNDATION.md` | ~273 | Contenu actif | Foundation PEAD (concept, priorité vs momentum, architecture signal/entrée/exits, anti-look-ahead, timing earnings) | CANONIQUE RECHERCHE | ✅ | **Conserver** |
| `MEAN_REVERSION_DIAGNOSTIC_R3A.md` | ~650 | Contenu actif | Diagnostic Mean Reversion R3A (PR #235) | OFFICIAL RECHERCHE | ✅ | **Conserver** |

### 1.6 `docs/setups/` (1 fichier)

| Fichier | Lignes | Type | Rôle | Statut | Drapeaux | Action |
|---|---:|---|---|---|---|---|
| `SECTOR_RELATIVE_STRENGTH.md` | ~280 | Contenu actif | Fiche technique détaillée SECTOR_RS v1, recalibrée `FRAGILE / CONCENTRATION_EXCESSIVE` (PR #233 truth-sync) | OFFICIAL | ✅ | **Conserver** |

### 1.7 `docs/decisions/` (2 fichiers)

| Fichier | Lignes | Type | Rôle | Statut | Drapeaux | Action |
|---|---:|---|---|---|---|---|
| `README.md` | ~40 | Contenu actif | Format canonique des décisions structurantes | CANONIQUE | ✅ | **Conserver** |
| `DECISION-001-gpt-role-merged-into-governance.md` | ~90 | Contenu actif | Décision historique : fusion `GPT_ROLE.md` → `GOVERNANCE.md` | ACTIVE | ✅ | **Conserver** |

### 1.8 Spécialisés (4 fichiers — hors zone documentaire principale)

| Fichier | Lignes | Type | Rôle | Statut | Drapeaux | Action |
|---|---:|---|---|---|---|---|
| `.claude/agents/bug-hunter.md` | ~100 | Contenu spécialisé | Agent debug UI/UX ManiTradePro (6 classes bugs récurrentes) | ACTIF | ✅ | **Conserver** |
| `.claude/skills/ui-ux-pro-max/SKILL.md` | ~100 | Contenu spécialisé | Skill design UX (styles, palettes, pairings, règles) | ACTIF | ✅ | **Conserver** |
| `cloudflare-worker/README.md` | ~50 | Contenu actif | Doc technique déploiement Worker (secrets, routes, `wrangler deploy`) | CANONIQUE | ✅ | **Conserver** |

### 1.9 Synthèse de l'inventaire

- **Conservé tel quel** : 25 fichiers (canoniques propres, sources de vérité).
- **À réduire/archiver** : 2 fichiers (`SESSION.md` historique, `MARKDOWN_CONSOLIDATION_PLAN.md` exécuté).
- **Stubs vides à conserver vides** (squelettes utiles pour future PR de remplissage) : 5 (`DATA_QUALITY`, `PROD_SAFETY_RULES`, `CALIBRATION_RULES`, `ALLOCATION_RULES`, `RISK_ENGINE_RULES`).
- **Stubs vides à enrichir prioritairement** (info canonique existe ailleurs) : 2 (`FRICTION_MODEL`, `REGIME_RULES`).
- **Stubs vides à supprimer ou transformer en pointeurs** (redondants) : 4 (`AI_WORKFLOW`, `MERGE_PROTOCOL`, `BACKTEST_RULES`, `WALK_FORWARD_RULES`, `EXPERIMENTAL_FEATURES`).

---

## 2. Table des contradictions

| # | Fichier A | Fichier B | Contradiction | Source canonique proposée | Sévérité |
|---|---|---|---|---|---|
| C1 | `docs/monitoring/KNOWN_ISSUES.md` issue #14 ("SESSION.md 3393 lignes") | `SESSION.md` actuel (~150 lignes) | Issue cite une situation résolue. SESSION.md a déjà été réduit (PR #222, et nettoyages successifs cette session). | `KNOWN_ISSUES.md` : marquer issue #14 résolue ou supprimer | Mineur |
| C2 | `MARKDOWN_CONSOLIDATION_PLAN.md` § "Étapes" | État réel post-PR #232 | Le plan décrit des étapes "à exécuter" qui sont toutes exécutées (PR #226 à #232 mergées). | `MARKDOWN_CONSOLIDATION_PLAN.md` : archiver les étapes exécutées, garder uniquement l'inventaire final. | Mineur |
| C3 | `docs/project/AI_WORKFLOW.md` (stub vide) | `GOVERNANCE.md` § *Gouvernance ChatGPT ↔ Claude* + § *Format obligatoire* | Le stub annonce un contenu déjà entièrement présent dans `GOVERNANCE.md`. Pas vraiment une contradiction — c'est un placeholder qui peut induire en erreur. | Supprimer `AI_WORKFLOW.md` ou le réduire à pointeur 5 lignes. | Mineur |
| C4 | `docs/project/MERGE_PROTOCOL.md` (stub vide) | `CHECKLIST_MERGE.md` + `GOVERNANCE.md` § *Workflow validation avant merge* | Idem C3 — placeholder vide alors que le contenu existe ailleurs canoniquement. | Supprimer ou pointeur. | Mineur |
| C5 | `docs/quant/BACKTEST_RULES.md` (stub vide) | `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 3 + `ANTI_LOOKAHEAD_RULES.md` + `DATASET_GOVERNANCE.md` | Idem — placeholder vide. | Pointeur. | Mineur |
| C6 | `docs/quant/WALK_FORWARD_RULES.md` (stub vide) | `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 3.5 + démos `rs-rotation-robustness-v1.mjs` + `rs-rotation-hardening-v1.mjs` | Idem — placeholder vide. | Pointeur ou enrichissement. | Mineur |
| C7 | `docs/setups/SECTOR_RELATIVE_STRENGTH.md` § 5 "critères de validation officiels" (PF ≥ 1.3, etc.) | `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 4 (10 critères, PF post-friction ≥ 1.3, etc.) | La fiche SECTOR_RS reprend partiellement les critères Freeze mais sans tous (manque concentration < 60 %, single-symbol < 25 %, etc.). Cohérent en direction mais incomplet. | `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 4 = source canonique (10 critères complets). La fiche peut pointer vers § 4 au lieu de répéter. | Mineur (cohérence préservée tant que la fiche est honnête) |
| C8 | `docs/research/POST_EARNINGS_DRIFT_FOUNDATION.md` § "priorité vs momentum setups morts" | `docs/project/TRADING_PHILOSOPHY.md` § 4.2-4.3 ("Pullback et Breakout sont familles prioritaires à reconstruire") | Le foundation PEAD positionne PEAD comme **plus** prioritaire que les momentum morts. TRADING_PHILOSOPHY positionne Pullback Momentum + Breakout Expansion comme familles prioritaires à reconstruire. | Ce n'est pas une vraie contradiction : PEAD prioritaire **en tant qu'axe structurellement distinct**, Pullback/Breakout prioritaires **en tant que familles à reconstruire**. La nuance "axe distinct vs famille à reconstruire" mérite une clarification dans `TRADING_PHILOSOPHY.md` § 4. | Mineur (à clarifier mais pas urgent) |
| C9 | `docs/quant/SETUPS_REGISTRY.md` Setup 3 § "Mises à jour 2026-05-19" multiples (PR-R1, PR-R3B-v2, PR-R3B-v3 dans le même fichier Setup 4, PR-RS-HARDENING Phase 1 dans Setup 3) | Bonne pratique "1 update = 1 section claire" | Le Setup 3 et le Setup 4 accumulent des updates chronologiques en mode "patch sur patch". Lisibilité dégrade. Pas une contradiction, une dette de structure. | Restructurer en sous-sections datées clairement (Setup 3 : Update PR-R1 / Update PR-RS-HARDENING / etc.) ; alternativement, déplacer l'historique récent dans `docs/decisions/`. | Mineur structurel |
| C10 | `tools/backtests/rs-rotation-robustness-lab-v1.mjs` (formule friction inline) | `tools/backtests/rs-rotation-robustness-v1.mjs` (formule inline) | `tools/backtests/meanrev-etf-range-v1.mjs` (formule inline) | `tools/backtests/rs-rotation-hardening-v1.mjs` (formule inline) | La formule canonique `frictionR = (0.30 + 0.02 × holdDays) / 5` est dupliquée dans 4 scripts. Risque de désynchro si quelqu'un modifie un seul. | Canoniser dans `docs/quant/FRICTION_MODEL.md` + extraire dans `tools/backtests/lib/friction-v1.mjs` partagé. | Mineur (les 4 scripts sont aujourd'hui identiques, audité par git diff session courante) |
| C11 | Aucune contradiction de **statut setup** détectée | — | Vérifié : statuts identiques entre `SETUPS_REGISTRY.md`, `SESSION.md` § Statuts setups officiels, `TRADING_PHILOSOPHY.md` § 4, `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 2. La PR #233 truth-sync a réglé les contradictions historiques. | — | ✅ Pas de contradiction |
| C12 | Aucune contradiction d'**univers** détectée | — | Vérifié : `TRADING_PHILOSOPHY.md` § 5 (40-120 fourchette) + `ASSET_REGISTRY.md` § univers cible + `UNIVERSE_CORE_V1.md` (78 figés) sont cohérents. `universe-v2.mjs` (181 actifs technique large) explicitement séparé. | — | ✅ Pas de contradiction |
| C13 | Aucune contradiction de **paramètres baseline RS Rotation** | — | Vérifié : `rs_90d_top10_hold20` baseline identique dans `backtest-relative-strength-rotation-v1.mjs`, `rs-rotation-robustness-v1.mjs`, `rs-rotation-robustness-lab-v1.mjs`, `rs-rotation-hardening-v1.mjs`, `SETUPS_REGISTRY` Setup 3. | — | ✅ Pas de contradiction |

**Synthèse contradictions** : aucune contradiction **majeure** détectée. Les 10 items identifiés sont de niveau **mineur** (stubs redondants avec sources canoniques + historique dépassé + duplication de formule entre scripts). La PR #233 truth-sync a éliminé les contradictions de statut. Le projet n'a plus de "plusieurs vérités documentaires" sur les sujets centraux (statuts setups, univers, paramètres).

---

## 3. Table des obsolescences

| # | Fichier | Section | Pourquoi obsolète | Impact | Action recommandée |
|---|---|---|---|---|---|
| O1 | `SESSION.md` | Sections "Dernière session / dernière PR mergée" (et bis) lignes ~31-51 | Référencent PR #222 et PR #231 comme dernières mergées. **18+ PR mergées depuis**. La section est devenue un historique partiel et trompeur. | Lecteur peut croire que projet est figé à PR #231 | **Supprimer** ces 2 sections (l'historique des PR mergées vit dans `git log` et `docs/decisions/` pour les décisions structurantes). |
| O2 | `SESSION.md` | Section "Décisions actives" | Reprend partiellement le contenu de `GOVERNANCE.md` § *Document canonical sources* + `docs/decisions/`. Redondance assumée d'aide-mémoire. | Faible | **Réduire** à 3-5 lignes pointeurs vers `GOVERNANCE.md` et `docs/decisions/`. |
| O3 | `docs/monitoring/KNOWN_ISSUES.md` | Issue #14 "SESSION.md oversized 3393 lignes" | SESSION.md actuel ~150 lignes après PR #222 + nettoyages successifs cette session. Issue résolue. | Mineur | **Marquer résolue** ou **supprimer**. |
| O4 | `docs/project/MARKDOWN_CONSOLIDATION_PLAN.md` | Sections "Étape 1 à 5" du plan | Plan totalement exécuté (PR #226 à #232 mergées). Le contenu décrit des actions passées. | Mineur | **Archiver les étapes exécutées** (déplacer en bas avec mention "exécuté"), garder uniquement l'inventaire final + état post-nettoyage. |
| O5 | `docs/project/TRADING_PHILOSOPHY.md` § 8 "État actuel vs cible — roadmap par couche" | Tableau écrit fin PR #236. Depuis : RS Rotation Hardening Phase 1 mergée (PR #240), Univers Core V1 figé (PR #241). | Lecteur ne voit pas l'avancement réel | **Mettre à jour** le tableau avec les nouveautés Phase 1 (couche 2 hardening avancé) et Phase 2 (couche 1 univers OK, module à venir). |
| O6 | `docs/quant/SETUPS_REGISTRY.md` Setup 4 Mean Reversion | "Décision" historique "Ne pas intégrer pour l'instant. Ne pas supprimer l'idée définitivement, mais ne pas prioriser." | Section "Décision" historique antérieure aux PR #235 (R3A diagnostic) et #239 (R3B v3) qui ont apporté beaucoup plus d'information. La décision actuelle vit dans les "Mise à jour" successives. | Lisibilité dégradée | **Réorganiser** : déplacer la "Décision" historique vers une sous-section "Historique" et faire remonter le verdict actuel (V1 non testable + décision A/B/C en attente). |
| O7 | `docs/quant/SETUPS_REGISTRY.md` Setup 4 Mean Reversion | Section "Exception légère — IWM montrait des signes positifs" | Pré-PR #208/audit, jamais formellement validée. Cassée par PR-R3B v1/v2/v3 (0 signal puis 7 trades PF marginal). | Mineur | **Marquer historique** ou **supprimer**. |
| O8 | `docs/setups/SECTOR_RELATIVE_STRENGTH.md` § 9 "Future stress tests (framework, non exécutés dans cette PR)" | Liste 9 stress tests à exécuter. PR-RS-HARDENING Phase 1 (PR #240) a exécuté 6+ de ces stress sur RS Rotation (pas SECTOR_RS, mais la méthodologie est portable). | Lecteur ne voit pas l'avancement transverse | **Ajouter une note de renvoi** vers PR #240 et `tools/backtests/rs-rotation-hardening-v1.mjs` comme template applicable à SECTOR_RS. |
| O9 | `docs/research/PEAD_DATA_REQUIREMENTS.md` + `POST_EARNINGS_DRIFT_FOUNDATION.md` | Sections "à valider" | Le sujet PEAD est en suspens depuis brief Freeze (sourcing data politique). Les fichiers sont des spécifications utiles mais ne donnent pas l'état actuel. | Mineur | **Ajouter en tête une note "Statut au 2026-05-19"** : projet PEAD bloqué par sourcing dataset earnings. |
| O10 | Mention `KNOWN_ISSUES.md` racine en tant que "stub temporaire de redirection" dans `GOVERNANCE.md` (cherchable) | — | La consolidation Markdown a supprimé le stub racine. Aucune mention résiduelle détectée à la lecture, mais à reverifier. | Mineur | **Vérifier** + **supprimer** toute mention résiduelle dans `GOVERNANCE.md` ou `CLAUDE.md` si présente. |

**Synthèse obsolescences** : aucune obsolescence **critique**. 10 items identifiés, tous de niveau mineur. Principalement liés à :
- l'évolution rapide du projet entre PR #222 (réduction SESSION.md) et aujourd'hui (PR #241+) ;
- l'accumulation de "Mise à jour" successives dans SETUPS_REGISTRY ;
- la roadmap TRADING_PHILOSOPHY qui mériterait un refresh post-Phases 1 et 2 démarrées.

---

## 4. Table des redondances

| # | Information | Localisations | Source canonique proposée | Action |
|---|---|---|---|---|
| R1 | "Univers cible 40-120 actifs liquides" + composition par catégorie | `TRADING_PHILOSOPHY.md` § 5 + `ASSET_REGISTRY.md` § *Univers cible stratégique* + `PROJECT_VISION.md` § 3.4 + `UNIVERSE_CORE_V1.md` | `UNIVERSE_CORE_V1.md` = source canonique liste figée. `TRADING_PHILOSOPHY` § 5 = règle stratégique (fourchette). Les autres deviennent pointeurs. | Réduire `PROJECT_VISION` § 3.4 et `ASSET_REGISTRY` § univers cible à pointeurs courts. |
| R2 | Refus "scalping, HFT, tick trading, microstructure, market making déguisé, patterns bougies seuls, score universel" | `BOT_OBJECTIVE.md` § 5 *Règles absolues* + `PROJECT_VISION.md` § 5 *Ce qu'on refuse* + `TRADING_PHILOSOPHY.md` § 6 + § 7 + § 10 | `TRADING_PHILOSOPHY.md` = source canonique détaillée (§ 6 horizons, § 7 patterns). `BOT_OBJECTIVE` et `PROJECT_VISION` peuvent référencer en pointeur. | Réduire la duplication dans `PROJECT_VISION` § 5 et `BOT_OBJECTIVE` § 5. |
| R3 | Garde-fou "un setup qui nécessite trop de filtres pour survivre est potentiellement déjà mort" | `TRADING_PHILOSOPHY.md` § 1 + `MEAN_REVERSION_DIAGNOSTIC_R3A.md` § 6.4 + cité dans plusieurs PR bodies | `TRADING_PHILOSOPHY.md` § 1 = source canonique projet. R3A peut pointer vers § 1. | Mineur — référence cohérente. |
| R4 | Formule friction canonique `frictionR = (0.30 + 0.02 × holdDays) / 5` | `tools/backtests/rs-rotation-robustness-lab-v1.mjs` (inline) + `rs-rotation-robustness-v1.mjs` (inline) + `meanrev-etf-range-v1.mjs` (inline) + `rs-rotation-hardening-v1.mjs` (inline). **Pas dans `FRICTION_MODEL.md` qui est vide.** | `docs/quant/FRICTION_MODEL.md` doit devenir la source canonique. Code partagé via `tools/backtests/lib/friction-v1.mjs`. | **Prioritaire** : enrichir `FRICTION_MODEL.md` + factoriser dans lib. |
| R5 | Définition régimes 4 états (RISK_ON / RANGE / RISK_OFF / HIGH_VOL) | `rs-rotation-hardening-v1.mjs` (inline) + brief créateur PHASE QUANT HARDENING V2 + `SESSION.md` § Statuts setups officiels (mention) | `docs/quant/REGIME_RULES.md` (actuellement stub vide) doit devenir la source canonique. | **Prioritaire** : enrichir `REGIME_RULES.md`. |
| R6 | Critères Freeze § 4 (PF post-friction ≥ 1.3, friction ×2 ≥ 1.10, etc.) | `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 4 + `SETUP_VALIDATION_CHECKLIST.md` § D-I + `docs/setups/SECTOR_RELATIVE_STRENGTH.md` § 5 + cités dans plusieurs scripts/PR bodies | `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 4 = source canonique unique (déjà acquis). | Mineur — déjà bien articulé. La fiche SECTOR_RS peut pointer au lieu de répéter (cf. C7). |
| R7 | "Article 5 couches Context → Asset Selection → Setup → Timing → Risk → Mesure" | `TRADING_PHILOSOPHY.md` § 2 + `PROJECT_VISION.md` § 3.2 + `SESSION.md` (mention multiple) + brief créateur PHASE V2 | `TRADING_PHILOSOPHY.md` § 2 = source canonique. Autres pointeurs OK. | Mineur. |
| R8 | "0 setup VALIDATED_RESEARCH_CORE / 0 LIVE_READY" | `SETUPS_REGISTRY.md` (multiple mentions) + `SESSION.md` § État actuel + `RESEARCH_FRAMEWORK_FREEZE_V1.md` § 2 + chaque rapport `tools/backtests/output/*.md` | `SETUPS_REGISTRY.md` = source canonique des statuts. Autres mentions sont des rappels acceptables (anti-promotion). | Mineur. |

**Synthèse redondances** : 8 redondances identifiées. Aucune critique. 2 sont **prioritaires à canoniser** :
- **R4 friction model** → enrichir `FRICTION_MODEL.md` + factoriser dans lib partagée.
- **R5 régimes 4 états** → enrichir `REGIME_RULES.md`.

Les autres redondances sont des **répétitions assumées d'aide-mémoire** entre fichiers stratégiques (BOT_OBJECTIVE/PROJECT_VISION/TRADING_PHILOSOPHY). Le projet accepte une certaine duplication pour la lisibilité.

---

## 5. Mauvaise séparation recherche / runtime

Audit dédié — aucune confusion **majeure** détectée. Le projet a fait un effort significatif pour cette séparation (PR #233 truth-sync ajoute la note "détecteur runtime ≠ setup validé" dans `TRADING_LOGIC.md`).

| # | Fichier | Section | Confusion détectée | Action |
|---|---|---|---|---|
| RR1 | `docs/quant/TRADING_LOGIC.md` § *Setups détectés* (tableau) | Liste 7 setups runtime (`pullback`, `breakout`, `mean_reversion`, etc.) | **Bien traité** : note en tête "Détecteur runtime ≠ setup validé" + rappel statut DEAD pour chacun (PR #233). ✅ | Maintenir. |
| RR2 | `docs/project/TRADING_ENGINE.md` | Décrit "couches décision/exécution, sizing, fermetures, 17 filtres" | Description **runtime réel** (état actuel du worker). N'est pas confondu avec la cible. ✅ | Maintenir. Garder distinct de `TRADING_PHILOSOPHY.md` qui décrit la cible. |
| RR3 | `docs/setups/SECTOR_RELATIVE_STRENGTH.md` | Fiche technique d'un setup `FRAGILE / CONCENTRATION_EXCESSIVE` | Risque qu'un lecteur prenne la fiche détaillée pour un "setup actif". **Mitigé** par note de tête recalibration (PR #233). ✅ | Maintenir. |
| RR4 | `docs/research/POST_EARNINGS_DRIFT_FOUNDATION.md` | Décrit architecture signal/entrée/exits PEAD | Fichier **recherche / spec** clairement marqué. Pas de confusion. ✅ | Maintenir. Ajouter note "Statut : projet bloqué par sourcing dataset" (cf. O9). |

**Synthèse** : la séparation recherche/runtime est globalement respectée. Pas d'action prioritaire.

---

## 6. Plan de nettoyage

### 6.1 Priorité CRITIQUE

**Aucune action critique identifiée.** Le projet n'a pas de "plusieurs vérités documentaires" sur les sujets centraux (statuts setups, univers, paramètres). Les contradictions détectées sont toutes mineures.

### 6.2 Priorité IMPORTANTE

#### CLEAN-1 — Canoniser le modèle friction (R4)

- **Quoi** : enrichir `docs/quant/FRICTION_MODEL.md` avec la formule canonique `frictionR = (0.30 + 0.02 × holdDays) / 5`, ses hypothèses, son périmètre d'application, et son interprétation. Factoriser dans `tools/backtests/lib/friction-v1.mjs` (module partagé). Mettre à jour les 4 scripts pour consommer le module au lieu d'inliner.
- **Pourquoi** : la formule est dupliquée 4 fois actuellement. Risque de désynchro silencieuse.
- **Périmètre** : 5 fichiers modifiés (1 doc + 1 lib + 3 scripts). Test : exécuter chaque script et vérifier sorties JSON identiques byte-à-byte (sauf timestamp).
- **PR proposée** : `docs(friction): canonise friction model V1 + factor into shared lib`.

#### CLEAN-2 — Canoniser la définition régimes 4 états (R5)

- **Quoi** : enrichir `docs/quant/REGIME_RULES.md` avec la définition opérationnelle 4 régimes (RISK_ON / RANGE / RISK_OFF / HIGH_VOL), incluant les seuils numériques (SPY ±5 % EMA200, slope < 0.5 %/20j, rvol > 25 % annualisée HIGH_VOL prioritaire). Référencer dans tous les scripts qui calculent un régime.
- **Pourquoi** : la définition vit éparse dans `rs-rotation-hardening-v1.mjs` + brief créateur. À canoniser avant Phase 2 Context Engine.
- **PR proposée** : `docs(regime): canonise 4-state regime definition + thresholds`.

#### CLEAN-3 — Réduire `SESSION.md` (cf. priorité ChatGPT post-#233 listée mais non exécutée)

- **Quoi** : supprimer les sections "Dernière session / dernière PR mergée" (et bis) — obsolète (O1). Réduire "Décisions actives" à 3-5 lignes pointeurs (O2). Cible : ~80-100 lignes.
- **Pourquoi** : SESSION.md doit rester un carnet de bord court (`GOVERNANCE.md` § *Rôle des fichiers*). La cible est atteinte par "État actuel + PR en cours + Prochaines priorités + Points de vigilance" — pas d'historique des PR mergées.
- **PR proposée** : `docs(session): clean obsolete sections + reduce to short logbook`.

### 6.3 Priorité MINEURE

#### CLEAN-4 — Supprimer ou transformer en pointeurs les 4 stubs redondants

- **Quoi** : `docs/project/AI_WORKFLOW.md`, `docs/project/MERGE_PROTOCOL.md`, `docs/quant/BACKTEST_RULES.md`, `docs/quant/WALK_FORWARD_RULES.md`. Soit suppression complète (contenu déjà 100 % ailleurs), soit transformation en pointeurs 5-10 lignes.
- **Pourquoi** : stubs "_À remplir_" qui ne remplissent rien et créent du bruit dans l'arborescence.
- **PR proposée** : `docs(stubs): replace redundant stubs with canonical pointers`.

#### CLEAN-5 — Mettre à jour `TRADING_PHILOSOPHY.md` § 8 roadmap

- **Quoi** : refresher le tableau § 8 "État actuel vs cible — roadmap par couche" avec l'avancement Phase 1 (RS Rotation hardening avancé) et Phase 2 (Univers Core V1 figé).
- **PR proposée** : `docs(philosophy): refresh layer roadmap with Phase 1/2 progress`.

#### CLEAN-6 — Restructurer `SETUPS_REGISTRY.md` Setup 3 et Setup 4

- **Quoi** : déplacer les "Mise à jour 2026-05-19" successives dans une sous-section "Historique des évolutions" + faire remonter le verdict actuel en haut de chaque setup. Garder les chiffres et les liens vers les PR.
- **PR proposée** : `docs(registry): restructure Setup 3 and Setup 4 evolution history`.

#### CLEAN-7 — Marquer issue #14 résolue dans `KNOWN_ISSUES.md`

- **Quoi** : marquer issue #14 "SESSION.md oversized" comme résolue (après CLEAN-3 idéalement).
- **PR proposée** : peut être incluse dans CLEAN-3.

#### CLEAN-8 — Ajouter notes statuts dans `PEAD_DATA_REQUIREMENTS.md` et `POST_EARNINGS_DRIFT_FOUNDATION.md`

- **Quoi** : ajouter en tête une note "Statut au 2026-05-19 : projet PEAD bloqué par sourcing dataset earnings". Pointer vers `SESSION.md` § Points de vigilance.
- **PR proposée** : `docs(pead): add status note (blocked by dataset sourcing)`.

#### CLEAN-9 — Archiver les étapes exécutées de `MARKDOWN_CONSOLIDATION_PLAN.md`

- **Quoi** : déplacer les sections "Étape 1 à 5" exécutées vers une sous-section "Historique du nettoyage Markdown" + garder l'inventaire final actif.
- **PR proposée** : `docs(consolidation): archive executed steps`.

#### CLEAN-10 — Vérifier mention résiduelle "KNOWN_ISSUES.md stub temporaire"

- **Quoi** : grep dans tous les fichiers actifs pour s'assurer qu'aucune mention résiduelle de stubs racine supprimés ne traîne.
- **PR proposée** : peut être incluse dans n'importe quel autre cleanup.

### 6.4 Stubs vides à laisser **vides** (par décision assumée)

- `docs/project/PROD_SAFETY_RULES.md` : utile quand le broker réel sera préparé. Squelette préservé.
- `docs/project/CALIBRATION_RULES.md` : utile pour Phase 3+4 hardening (sample confidence, edge durability, fragility score). Squelette préservé.
- `docs/quant/ALLOCATION_RULES.md` : utile pour Phase 3 exposure control. Squelette préservé.
- `docs/quant/RISK_ENGINE_RULES.md` : utile pour Phase 3 exposure control. Squelette préservé.
- `docs/project/EXPERIMENTAL_FEATURES.md` : possiblement utile, sinon à transformer en pointeur vers `SETUPS_REGISTRY.md`.
- `docs/monitoring/DATA_QUALITY.md` : utile quand `quoteQualityEngine` retours observables se stabilisent (broker réel).

Décision : **garder vides plutôt que supprimer** — ils servent d'ancres connues + cohérence avec `GOVERNANCE.md` § *Structure dossiers obligatoire*.

---

## 7. Synthèse globale

### 7.1 État de la documentation

**Bonne nouvelle** : le projet n'a **pas** de "plusieurs vérités documentaires" sur les sujets centraux. Les actions des PR #233 truth-sync + #236 vision + #241 univers core ont consolidé la cohérence.

**Distribution** :

- 25 fichiers canoniques propres ✅
- 9 stubs vides (dont 4 prioritaires à enrichir/supprimer, 5 à laisser pour future PR)
- 2 fichiers à réduire (SESSION.md, MARKDOWN_CONSOLIDATION_PLAN.md)
- 13 fichiers spécialisés (agents/skills/decisions/research) tous propres

**Total** : 44 fichiers, dont **environ 90 % en bon état**.

### 7.2 Priorité d'exécution

Si le créateur veut un nettoyage rapide :

1. **CLEAN-1** (canoniser friction) — touche du code, vrai impact.
2. **CLEAN-2** (canoniser régimes) — prerequisite Phase 2 Context Engine.
3. **CLEAN-3** (réduire SESSION.md) — priorité déjà listée par ChatGPT, non exécutée.

Les autres CLEAN sont du polissage. Aucun ne bloque la trajectoire produit.

### 7.3 Risques résiduels

- **R-DESYNC-FORMULE-FRICTION** : tant que CLEAN-1 n'est pas fait, modifier un seul des 4 scripts crée une désynchro silencieuse. **Mitigation** : convention de revue à appliquer.
- **R-SESSION-DRIFT** : SESSION.md continue d'accumuler du contenu à chaque PR — j'ai fait 3-4 nettoyages cette session. Sans CLEAN-3 structurel, le problème reviendra.
- **R-PHASE-2-CONTEXT-ENGINE-DUPLICATIONS** : Phase 2 va produire du code qui consomme la définition régimes — sans CLEAN-2, le code re-inlinera la définition. **Mitigation** : faire CLEAN-2 **avant** PR-CTX-2.

---

## 8. Ce qui n'est **pas** fait dans cette PR

- ❌ Aucune modification de contenu (audit + plan **uniquement**).
- ❌ Aucun fichier supprimé.
- ❌ Aucun fichier déplacé.
- ❌ Aucun statut setup modifié.
- ❌ Aucune règle quant modifiée.
- ❌ Aucun runtime touché.

Cette PR pose le diagnostic et propose les PR de nettoyage. Chaque CLEAN-1 à CLEAN-10 fera l'objet d'une PR dédiée (`une PR = un objectif`).

---

## 9. Conformité gouvernance

- ✅ `une PR = un objectif` : objectif unique = produire le diagnostic.
- ✅ Aucune contradiction avec `BOT_OBJECTIVE.md`, `RESEARCH_FRAMEWORK_FREEZE_V1.md`, `SETUPS_REGISTRY.md`.
- ✅ Aucun changement runtime.
- ✅ Aucune promotion de setup.
- ✅ Aucun verdict quantitatif touché.
- ✅ Vocabulaire strictement documentaire.

---

## 10. Sources de l'audit

- Lecture directe en session courante : 21 fichiers `.md` (déjà connus).
- Inventaire ciblé via Explore agent : 23 fichiers `.md` restants.
- Vérifications croisées :
  - Statuts setups : `SETUPS_REGISTRY` vs `SESSION` vs `TRADING_PHILOSOPHY` vs `RESEARCH_FRAMEWORK_FREEZE_V1` vs `MEAN_REVERSION_DIAGNOSTIC_R3A` vs `SECTOR_RELATIVE_STRENGTH` → ✅ cohérents.
  - Univers : `TRADING_PHILOSOPHY` § 5 vs `ASSET_REGISTRY` vs `UNIVERSE_CORE_V1` → ✅ cohérents.
  - Paramètres baseline RS Rotation : `backtest-relative-strength-rotation-v1` vs `rs-rotation-robustness-v1` vs `rs-rotation-hardening-v1` vs `SETUPS_REGISTRY` Setup 3 → ✅ cohérents.
  - Formule friction : 4 scripts inlinent la même formule → ⚠ duplication identifiée (CLEAN-1).
  - Définition régimes : `rs-rotation-hardening-v1.mjs` + brief créateur → ⚠ duplication identifiée (CLEAN-2).
- Brief créateur 2026-05-19 « MISSION — DOCUMENTATION CONSISTENCY AUDIT V1 ».

---

> **Conclusion-mémo** : la documentation ManiTradePro est **globalement saine** post-PR #233 truth-sync. Pas de contradiction critique. 10 obsolescences mineures + 8 redondances dont 2 prioritaires à canoniser (friction, régimes). 10 actions de cleanup proposées en PR séparées, dont 3 importantes (friction, régimes, session). Le projet n'a **plus** "plusieurs vérités documentaires" sur les sujets centraux. Discipline acquise.
