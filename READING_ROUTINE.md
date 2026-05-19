# READING_ROUTINE.md — Routine de lecture ManiTradePro

> Ordre obligatoire de lecture au début de chaque session ManiTradePro.
>
> Court par construction. Le protocole complet (règles, cas multi-domaines, sortie attendue) vit dans `GOVERNANCE.md` § *Session start protocol — reprise officielle de session*.

## Lire en premier

Dans cet ordre :

1. `GOVERNANCE.md`
2. `BOT_OBJECTIVE.md`
3. `PROJECT_RULES.md`
4. Fichiers spécialisés nécessaires (selon le sujet, cf. table ci-dessous)
5. `SESSION.md`

## Fichiers spécialisés par sujet

| Sujet | Fichiers à lire |
|---|---|
| Architecture / worker / front / Supabase / données | `docs/project/ARCHITECTURE.md`, `docs/project/DATA_PIPELINE.md`, `docs/monitoring/PROVIDERS_MATRIX.md` |
| Trading / bot / paper trading / setups / scores / régimes / actifs | `docs/quant/TRADING_LOGIC.md`, `docs/project/TRADING_ENGINE.md`, `docs/quant/SETUPS_REGISTRY.md`, `docs/quant/ASSET_REGISTRY.md` |
| Recherche quant / backtests / validation de setup | `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`, `docs/research/SETUP_VALIDATION_CHECKLIST.md`, `docs/research/ANTI_LOOKAHEAD_RULES.md`, `docs/research/DATASET_GOVERNANCE.md`, `docs/quant/SETUPS_REGISTRY.md`, `docs/quant/ASSET_REGISTRY.md` |
| PR / merge / validation / livraison | `CHECKLIST_MERGE.md`, `CLAUDE.md`, `docs/project/DOC_IMPACT_MATRIX.md` |
| Bugs / dette / incidents | `docs/monitoring/KNOWN_ISSUES.md` |
| Workflow ChatGPT ↔ Claude / agents / skills / règles IA | `GOVERNANCE.md` (source unique) |

## Règles

- Ne jamais partir uniquement de `SESSION.md` ou de la mémoire.
- Si le sujet touche plusieurs domaines, lire tous les groupes concernés.
- Si une information est absente ou contradictoire, ne pas inventer : signaler et indiquer quel fichier manque.
- Détail complet et règles : `GOVERNANCE.md` § *Session start protocol — reprise officielle de session*.
