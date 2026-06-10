# ManiTradePro V2 — Déploiement & démarrage

La V2 est **indépendante** de la V1. Rien de ce qui suit ne touche le worker V1,
le front V1 ou les tables `mtp_*`.

## 1. Base de données (Supabase) — optionnel mais recommandé

Dans Supabase Studio → SQL Editor, exécuter :

```
cloudflare-worker/migrations/v2/001_v2_learning_schema.sql
```

Crée 4 tables : `mtp_v2_positions`, `mtp_v2_trades`, `mtp_v2_cycles`,
`mtp_v2_setup_stats`. Idempotent. Aucune table V1 modifiée.

> Si Supabase n'est pas configuré, le Worker bascule automatiquement sur le KV
> Cloudflare (clés `v2:*`). Le bot fonctionne quand même ; les données ne sont
> simplement pas dans Postgres.

## 2. Worker V2

Le Worker réutilise les **mêmes secrets** que la V1 (déjà présents sur le compte
Cloudflare) : `EODHD_API_KEY`, `TWELVE_KEY_1..4`, `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `ADMIN_API_TOKEN`, `ADMIN_PIN`, `ALLOWED_ORIGINS`.

Déployer (depuis `cloudflare-worker/`) :

```bash
wrangler deploy -c wrangler-v2.toml
```

Cela publie le worker `manitradepro-v2` sur
`https://manitradepro-v2.<sous-domaine>.workers.dev` (le front pointe par défaut
sur `manitradepro-v2.emmanueldelasse.workers.dev`).

Vérifier les secrets visibles par ce worker :

```bash
wrangler secret list -c wrangler-v2.toml
```

Si un secret manque (chaque worker a ses propres secrets), le rajouter :

```bash
wrangler secret put EODHD_API_KEY -c wrangler-v2.toml
wrangler secret put ADMIN_API_TOKEN -c wrangler-v2.toml
# etc.
```

> Le cron (toutes les heures) lance un cycle automatiquement. Pour amorcer tout
> de suite : se connecter en admin dans le front et cliquer « Lancer un cycle »,
> ou `POST /api/v2/cycle` avec le token.

## 3. Front V2 — servi par le Worker lui-même

Le front est dans `v2/` et est **embarqué dans le déploiement du Worker** via
Workers Static Assets (`[assets] directory = "../v2"` dans `wrangler-v2.toml`).
Un seul `wrangler deploy -c wrangler-v2.toml` publie **l'app complète** :

- `https://manitradepro-v2.emmanueldelasse.workers.dev/` → interface V2
- `https://manitradepro-v2.emmanueldelasse.workers.dev/api/v2/*` → API

Aucun GitHub Pages requis, aucun merge requis. L'app détecte qu'elle tourne sur
`workers.dev` et appelle l'API en même origine (pas de CORS).

Accès depuis la V1 : un bouton **« Tester V2 »** existe dans Réglages →
*Compte & apparence* (visible sur Pages après merge de cette branche sur
`main` ; l'URL workers.dev marche dès maintenant sans merge).

Pour pointer sur un worker local :

```js
localStorage.setItem("v2_api", "http://127.0.0.1:8787");
```

## 4. Vérification rapide

```bash
curl https://manitradepro-v2.emmanueldelasse.workers.dev/api/v2/health
curl https://manitradepro-v2.emmanueldelasse.workers.dev/api/v2/universe
```

`health` doit renvoyer `universeSize: 47`. Après un premier cycle,
`/api/v2/opportunities` liste les setups ouvrables et `/api/v2/stats` les
résultats d'apprentissage.

## 5. Tests

```bash
node --test tools/v2/test/engine-v2.test.mjs
```

### Test manuel — modale « Accès admin »

1. Ouvrir l'app, cliquer **Admin** → la modale s'affiche.
2. Cliquer **Annuler** → la modale disparaît, le dashboard est de nouveau utilisable.
3. Cliquer **Admin** à nouveau, taper le PIN, valider → la modale **disparaît** (connexion OK).
4. Cliquer **Admin** une dernière fois → cette fois le panneau « Lancer un cycle » s'affiche directement (déjà connecté) ; **Fermer**, clic en dehors de la boîte, ou touche **Échap** referment la modale.

## 6. Critère de succès

Après déploiement et quelques cycles, le bot doit pouvoir dire : **quel setup
gagne, quel setup perd, sur quels actifs**. C'est la seule métrique qui compte.
