# CHECKLIST_MERGE — Validation obligatoire avant chaque merge

## Explication simple

Ce fichier est la **checklist à parcourir avant chaque merge** d'une PR sur `main`. Tout point coché doit être vérifié dans le code et dans la documentation. Un merge n'est pas considéré terminé tant que tous les points applicables ne sont pas validés.

À recopier dans la description de chaque PR (ou à parcourir mentalement avant le merge si la PR est très petite).

---

## Documentation

- [ ] **`SESSION.md` mis à jour** : nouvelle entrée dans la section session courante avec PR titre, résumé, fichiers modifiés.
- [ ] **`ARCHITECTURE.md` mis à jour** si la structure du code change (nouvelle route, nouveau cluster de fonctions, nouvelle table Supabase, modification de cache).
- [ ] **`DATA_PIPELINE.md` mis à jour** si le flux d'une donnée change (provider, cache, TTL, devise, freshness).
- [ ] **`TRADING_LOGIC.md` mis à jour** si le scoring, les setups, les règles d'ouverture/fermeture, ou l'apprentissage évoluent.
- [ ] **`PROVIDERS_MATRIX.md` mis à jour** si une source de données change ou un nouveau provider est ajouté.
- [ ] **`KNOWN_ISSUES.md` mis à jour** : ajouter un nouveau bug découvert, marquer un bug résolu comme tel, documenter une nouvelle dette identifiée.
- [ ] **`CLAUDE.md` mis à jour** si une règle de processus change (workflow git, déploiement, conventions).
- [ ] **`SETUPS_REGISTRY.md` mis à jour** si un setup change, si une nouvelle variante est validée, dépréciée ou abandonnée.
- [ ] **`ASSET_REGISTRY.md` mis à jour** si une nouvelle classification d'actifs est validée ou si un actif change de catégorie.

---

## Base de données

- [ ] **Migration SQL documentée** si une colonne ou table est ajoutée. Fichier `cloudflare-worker/migrations/NNN_xxxxx.sql` créé, idempotent (`if not exists`).
- [ ] **Migration appliquée sur Supabase** AVANT le merge si le worker en dépend immédiatement. Sinon, mentionner explicitement que la migration est requise avant le redéploiement worker.
- [ ] **Pas de migration destructrice** (DROP, TRUNCATE) sans demande explicite et sauvegarde.

---

## Impact

- [ ] **Impact utilisateur documenté** : qu'est-ce que l'utilisateur va voir / ne plus voir / faire différemment après ce merge ?
- [ ] **Impact trading documenté** : la décision du bot change-t-elle ? Le calcul de score change-t-il ? Les positions ouvertes sont-elles affectées ?
- [ ] **Impact apprentissage documenté** : les buckets sont-ils touchés ? Les règles correctives 1-6 ?
- [ ] **Risque de régression documenté** : ce qui peut casser silencieusement (cache stale, payload changé, route renommée). Liste explicite, pas "ça devrait aller".

---

## Qualité

- [ ] **Bug-hunter exécuté** sur les fichiers modifiés (agent `bug-hunter` ou check manuel des 6 patterns documentés dans `.claude/agents/bug-hunter.md`).
- [ ] **`node --check`** passe sur `cloudflare-worker/worker.js` et `assets/app.js` si modifiés.
- [ ] **Aucune donnée fictive ajoutée** : pas de prix inventé, pas de symbole fantôme, pas de bougie générée artificiellement.
- [ ] **Aucun comportement théorique présenté comme déjà livré** : si une fonction est ajoutée mais pas branchée, le dire explicitement dans la doc.
- [ ] **Aucun `console.log`** laissé dans `app.js` ou `worker.js`.
- [ ] **Aucun `!important` CSS** sans justification.
- [ ] **Aucun feature flag** ni code de transition (le brief utilisateur l'interdit).

---

## Cohérence

- [ ] **Front et worker synchronisés** si la modification touche un format de payload (ex. ajout d'un champ `quality`, `currency`, `quotedAt`).
- [ ] **Tailles de fichiers reflétées** dans `ARCHITECTURE.md` si elles ont sensiblement bougé (>500 lignes ajoutées/retirées).
- [ ] **Pas de référence à un numéro de ligne** dans la doc (`L1234`, `app.js#L908`). Préférer `fonction X dans fichier Y`.
- [ ] **Tous les `quality`, `currency`, `quotedAt` requis** sont effectivement présents dans le payload retourné par le worker.

---

## Section "Non encore fait"

- [ ] **Section "Non encore fait" mise à jour** dans le fichier de doc concerné si la PR vient livrer un point qui était listé comme planifié.
- [ ] **Ce qui n'est PAS livré dans cette PR est clairement marqué** comme reporté à une PR future, avec mention de la vague (A.1, B.4, etc.).

---

## Git

- [ ] **Branche** : `claude/resume-manitradepro-MeZLc` (ou la branche désignée par l'utilisateur en début de session). Jamais de push direct sur `main`.
- [ ] **Squash merge** activé (titre de la forme `<scope>: <résumé> (#<num>)`).
- [ ] **Body de la PR rempli** : sections Bug / Cause / Fix / Test plan / Non encore fait visibles.
- [ ] **Tests manuels listés** : étapes pour valider la PR côté utilisateur (Ctrl+F5, telle action, tel écran).

---

## Cas particuliers — escalade à l'utilisateur AVANT merge

Demander une validation explicite si :

- [ ] La PR touche un **broker réel** ou prépare le passage en argent réel.
- [ ] La PR contient une **migration SQL destructive** (DROP, TRUNCATE, modification de colonne existante).
- [ ] La PR **supprime un endpoint authentifié** ou **affaiblit l'auth admin** (PIN, HMAC).
- [ ] La PR **change la matrice `validateConfiguration`** du moteur de scoring.
- [ ] La PR **change le contrat du payload `/api/opportunities` ou `/api/opportunity-detail`** d'une manière qui peut casser un cache front existant.
- [ ] La PR **modifie `calcDetailScore`, `buildWorkerPlan` ou `computeTradeSafetyScore`** d'une manière qui change la valeur du score sur des inputs identiques (toute modif de pondération, seuil ou formule). Les ajouts strictement additifs de champs au payload (cf. vague A.1 `strategicAnalysis` / `liveContext`, vague B.4 `snapshotId` et timestamps analytiques) sont autorisés sans escalade s'ils ne touchent pas aux champs legacy.
- [ ] La PR **modifie `buildSnapshotId` ou ses inputs** (ajout/retrait d'une source analytique, changement de hash). Toute modif change tous les `snapshotId` historiques et casse la comparaison carte ↔ fiche. Escalade obligatoire.
- [ ] La PR **introduit une dépendance live dans `buildSnapshotId`** (price, change24h, volume24h, freshness, quotedAt, spread). C'est interdit par construction — vérification obligatoire.
- [ ] La PR **modifie `quoteQualityEngine`** (ajout/retrait de flag, changement de seuil, changement de logique `executionSafe`). Toute modif change la décision de validation live et potentiellement les futurs blocages broker — escalade obligatoire si on touche aux seuils.
- [ ] La PR **fait dépendre `strategicAnalysis` de `quoteQuality`** (interdit par construction — `quoteQuality` est purement live, `strategicAnalysis` purement analytique).
- [ ] La PR **introduit un nouvel appel direct à un provider de quote** (`getYahooQuote`, `getEodhdRealTimeBatchQuotes`, `getTwelveQuote`, `getCryptoQuote`, `resolveUnifiedMarketQuote`) dans un handler d'affichage. Tout affichage prix doit passer par `resolveLiveQuote` (cf. PROJECT_RULES.md R4).
- [ ] La PR **modifie `resolveLiveQuote`** (cascade, TTL, écriture KV). Escalade obligatoire — c'est le point d'entrée unique pour tous les écrans de prix.
- [ ] La PR **modifie `evaluateExecutionSafety`** (helper safety gate B.9 — décision blocage auto sur quote unsafe). Toute modif change la décision d'exécution automatique → escalade obligatoire.
- [ ] La PR **ajoute un nouveau point d'exécution automatique** (auto-cycle alternatif, futur broker réel, handler manuel transformé en auto) **sans** appeler `evaluateExecutionSafety` au préalable. Cf. PROJECT_RULES.md R3-ter.
- [ ] La PR **élargit le safety gate à `delayed` ou `marketClosed`** comme blocants (interdit par construction — ces champs sont informatifs, cf. règles B.6 / R3-bis).

---

## Auto-merge autorisé pour les PRs additives validées

Si la PR est :
- Purement additive (nouveau champ, nouvelle route, nouveau filtre additif)
- Validée par bug-hunter sans actionable bloquant
- Sans impact sur la décision du bot ou le sizing

...alors l'auto-merge est OK (squash, titre `<scope>: <résumé> (#<num>)`). Sinon, demander l'OK utilisateur avant `merge_pull_request`.

**Important** : l'auto-merge ci-dessus reste subordonné à la **gouvernance IA** (cf. section suivante). Pour toute PR non triviale, le `GO MERGE` explicite de ChatGPT est requis, quel que soit le statut "additif".

---

## Gouvernance IA — validation ChatGPT obligatoire

Pour toute PR importante (touchant le moteur, les setups, la classification d'actifs, l'architecture, la quant, l'exécution), avant `merge_pull_request` :

- [ ] Tous les fichiers `.md` impactés ont été mis à jour.
- [ ] Les impacts quantitatifs ont été documentés.
- [ ] Les impacts architecture ont été documentés.
- [ ] Les risques potentiels ont été documentés.
- [ ] Les diffs ont été fournis.
- [ ] Validation ChatGPT obtenue.
- [ ] `GO MERGE` explicite reçu.

Cf. `GPT_ROLE.md` pour le rôle de chaque IA et le workflow complet.

---

## Transparence agents Claude Code

Pour toute PR, indiquer explicitement si un agent ou skill Claude Code a été utilisé. Cela évite qu'une délégation invisible influence un merge.

- [ ] Agent ou skill utilisé : déclaré dans le body de la PR (ou absence explicite).
- [ ] Tâche réellement déléguée : décrite (rôle, périmètre, limites).
- [ ] Vérification humaine Claude effectuée après l'agent (relecture, tests).
- [ ] Pour une PR quant ou importante : validation ChatGPT obtenue malgré (ou en plus de) l'usage d'un agent.

Cf. `GPT_ROLE.md` section *Claude Code Agents & Skills Governance* pour la liste complète des agents disponibles, leurs limites, et les cas d'usage interdits.

---

## Mémo de fin

Quand la checklist est intégralement validée :
1. Créer la PR via `mcp__github__create_pull_request`
2. Si auto-merge autorisé : `mcp__github__merge_pull_request` immédiat
3. Sinon : signaler le lien à l'utilisateur, attendre son `go`
4. Une fois mergé : confirmer le déploiement (GitHub Pages 2-5 min, Cloudflare Worker 30-60 s via GitHub Action)
5. Si une migration SQL est requise et n'a pas encore été appliquée : le rappeler explicitement à l'utilisateur

---

## Non encore fait sur la checklist elle-même

- Pas de hook git automatique qui force la validation de cette checklist (à mettre en place quand l'équipe sera plus grande).
- Pas de modèle de PR GitHub (`.github/pull_request_template.md`) qui pré-remplit cette checklist — pourrait être ajouté plus tard pour automatiser le rappel.
