# Cloudflare Worker

Ce dossier contient la source du backend Cloudflare Worker utilise par ManiTradePro.

## Fichiers

- `worker.js` : logique backend live
- `wrangler.toml` : configuration de deploiement Cloudflare

## Secrets

Les secrets ne sont pas versionnes dans GitHub. Ils doivent rester configures dans Cloudflare ou via `wrangler secret put`.

Variables attendues par le worker :

- `TWELVE_KEY_1`
- `TWELVE_KEY_2`
- `TWELVE_KEY_3`
- `TWELVE_KEY_4`
- `ALPHAVANTAGE_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `CLAUDE_API_KEY`
- `CLAUDE_MODEL`

## Deploiement

Depuis ce dossier :

```powershell
wrangler deploy --keep-vars
```

Le binding KV `MTP_CACHE` est deja declare dans `wrangler.toml`.
