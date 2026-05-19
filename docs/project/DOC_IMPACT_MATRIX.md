# DOC_IMPACT_MATRIX.md — ManiTradePro

> Matrice d'impact documentaire officielle.
>
> Définit quels fichiers mémoire doivent être **mis à jour** ou **explicitement vérifiés** selon le type de modification d'une PR.
>
> Lecture obligatoire avant chaque demande de `GO MERGE` (cf. `GOVERNANCE.md` § *Matrice d'impact documentaire* et `CHECKLIST_MERGE.md` § *Matrice d'impact documentaire*).

## Règles générales

- `SESSION.md` doit **toujours** être mis à jour avant toute demande de `GO MERGE` (cf. `GOVERNANCE.md` § *Règles synchronisation mémoire*).
- Si une PR touche un domaine, **les fichiers sources de ce domaine doivent être vérifiés**.
- Si l'état réel change, le fichier source concerné **doit être mis à jour**.
- Si aucun changement documentaire n'est nécessaire dans un fichier normalement concerné, **le body de PR doit l'expliquer** dans une section `## Documentation impact`.
- La matrice est une **aide anti-oubli**, elle ne remplace pas la revue ChatGPT.

## Matrice par type de modification

| Type de modification | Fichiers à mettre à jour / vérifier obligatoirement | Raison |
|---|---|---|
| Gouvernance / règles projet | `GOVERNANCE.md`, `CHECKLIST_MERGE.md`, `SESSION.md`, `CLAUDE.md` si process Claude impacté | Éviter règles contradictoires |
| Reprise session / workflow GPT ↔ Claude | `GOVERNANCE.md`, `CLAUDE.md`, `SESSION.md`, `CHECKLIST_MERGE.md` | Garder le protocole actif |
| Objectif produit / passage réel | `BOT_OBJECTIVE.md`, `PROJECT_RULES.md`, `SESSION.md`, `docs/monitoring/KNOWN_ISSUES.md` si limite identifiée | Garder la boussole produit |
| Worker / routes API | `docs/project/ARCHITECTURE.md`, `docs/project/DATA_PIPELINE.md`, `SESSION.md`, `CHECKLIST_MERGE.md` | Documenter structure et flux |
| Front / UI / PWA | `docs/project/ARCHITECTURE.md`, `docs/project/DATA_PIPELINE.md` si flux modifié, `SESSION.md`, `docs/monitoring/KNOWN_ISSUES.md` si bug / dette | Éviter divergence front / back |
| Provider / prix / quote / TTL / fallback | `docs/monitoring/PROVIDERS_MATRIX.md`, `docs/project/DATA_PIPELINE.md`, `PROJECT_RULES.md` si règle changée, `SESSION.md`, `docs/monitoring/KNOWN_ISSUES.md` si limite | Éviter faux live / faux prix |
| Supabase / DB / migration | `docs/project/ARCHITECTURE.md`, `docs/project/DATA_PIPELINE.md`, `CHECKLIST_MERGE.md`, `SESSION.md`, fichier migration SQL si nécessaire | Éviter schéma invisible |
| Trading logic / scoring / décision | `docs/quant/TRADING_LOGIC.md` (scoring) ou `docs/project/TRADING_ENGINE.md` (exécution), `docs/quant/SETUPS_REGISTRY.md` si setup impacté, `docs/quant/ASSET_REGISTRY.md` si actifs impactés, `SESSION.md`, `CHECKLIST_MERGE.md` | Éviter régression quant |
| Setup nouveau / modifié / abandonné | `docs/quant/SETUPS_REGISTRY.md`, `docs/quant/TRADING_LOGIC.md`, `docs/research/SETUP_VALIDATION_CHECKLIST.md`, `SESSION.md` | Garder statut setup exact |
| Actif / univers / classification | `docs/quant/ASSET_REGISTRY.md`, `docs/quant/SETUPS_REGISTRY.md` si compatibilité setup impactée, `SESSION.md` | Éviter actifs mal classés |
| Recherche quant / backtest / walk-forward | `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`, `docs/research/SETUP_VALIDATION_CHECKLIST.md`, `docs/research/ANTI_LOOKAHEAD_RULES.md`, `docs/research/DATASET_GOVERNANCE.md`, `docs/quant/SETUPS_REGISTRY.md`, `SESSION.md` | Éviter overfit / lookahead |
| Risk / allocation / sizing / kill switch | fichiers risk / allocation si existants, `docs/project/TRADING_ENGINE.md`, `docs/quant/TRADING_LOGIC.md` si scoring impacté, `PROJECT_RULES.md`, `SESSION.md`, `CHECKLIST_MERGE.md` | Éviter risque non documenté |
| Broker réel / exécution argent réel | `BOT_OBJECTIVE.md`, `PROJECT_RULES.md`, `docs/project/ARCHITECTURE.md`, `docs/project/TRADING_ENGINE.md`, `CHECKLIST_MERGE.md`, `SESSION.md`, `docs/monitoring/KNOWN_ISSUES.md` | Escalade obligatoire |
| Bug corrigé / dette ajoutée | `docs/monitoring/KNOWN_ISSUES.md`, `SESSION.md`, fichier domaine concerné | Garder dette à jour |
| Documentation pure | `SESSION.md`, fichier documentaire concerné, `CHECKLIST_MERGE.md` si règle merge / process impactée | Garder trace claire |
| Évolution future de structure documentaire | `GOVERNANCE.md` § *Document canonical sources*, `SESSION.md`, `CLAUDE.md`, `CHECKLIST_MERGE.md`, `docs/project/MARKDOWN_CONSOLIDATION_PLAN.md`, `docs/decisions/` (nouvelle `DECISION-NNN-*.md` si la structure change), fichiers déplacés | La consolidation initiale est terminée ; toute évolution future suit la règle « une PR = un objectif » et est documentée comme décision structurante |
| Décision structurante / historique | `docs/decisions/` (nouvelle `DECISION-NNN-*.md` ou mise à jour de statut), `GOVERNANCE.md` si règle active impactée, `SESSION.md`, fichier domaine concerné | Garder la trace du pourquoi sans polluer `SESSION.md` |

## Règle de justification

Si un fichier source attendu pour le type de PR **n'est pas mis à jour**, la PR doit contenir une section `## Documentation impact` avec une **justification explicite** par fichier non modifié.

Exemples acceptables :

- `docs/quant/TRADING_LOGIC.md vérifié : aucun changement requis car la PR ne modifie pas le scoring.`
- `docs/monitoring/PROVIDERS_MATRIX.md non modifié : aucun provider / TTL / fallback touché.`
- `docs/quant/SETUPS_REGISTRY.md non modifié : la PR ne touche aucun setup, juste la documentation de gouvernance.`

Justification non acceptable :

- « rien à signaler » ;
- « pas nécessaire » sans raison ;
- absence pure de la section.

## Format obligatoire dans le body de PR

Le body de PR doit contenir une section `## Documentation impact` structurée :

```
## Documentation impact

- Type de modification : <ligne(s) de la matrice>
- Fichiers mémoire attendus : <liste>
- Fichiers mis à jour : <liste>
- Fichiers vérifiés mais non modifiés : <liste>
- Justification des non-modifications : <raison par fichier>
```

## Contrôle anti-oubli

Un script dev-only est disponible pour aider à détecter les oublis :

- `scripts/check-doc-impact.mjs` (exécution : `npm run check:doc-impact`).

Ce script :

- lit les fichiers modifiés depuis `origin/main` (fallback : working tree) ;
- affiche les fichiers mémoire à vérifier selon les domaines touchés ;
- ne modifie **aucun** fichier ;
- ne fait **aucun** appel réseau ;
- a un **exit code 0** (non bloquant) ;
- est une **aide anti-oubli, pas une garantie**.

Le script ne remplace ni la matrice ci-dessus, ni la revue ChatGPT, ni la `CHECKLIST_MERGE.md`. Il ne doit pas être branché dans CI comme gate bloquant sans validation explicite de ChatGPT.

## Limites de la matrice

- La matrice ne couvre pas tous les cas exotiques (mix multi-domaines profonds, refactor massif, dette transverse).
- En cas multi-domaines, **lire toutes les lignes concernées** et fusionner les listes.
- Si la matrice est incomplète pour un cas réel, **l'enrichir dans la même PR** plutôt que de bypass.
- La matrice doit rester **courte et lisible** ; les détails métier vivent dans les fichiers sources.
