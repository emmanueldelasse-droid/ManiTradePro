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
- `ADMIN_API_TOKEN` (recommande pour verrouiller les routes sensibles)
- `ALLOWED_ORIGINS` (optionnel, liste separee par virgules des origines front autorisees)

## Protection d'acces

Le worker distingue maintenant :

- routes publiques : `GET /health` (version reduite), `GET /api/opportunities`, endpoints de lecture pure
- routes front protegees : `GET /api/trades/state`, `POST /api/trades/sync`, `POST /api/ai/trade-review`
- routes admin : `GET /api/debug/circuits`, `GET /api/training/*`, `POST /api/training/settings`, `POST /api/training/auto-cycle`, `GET /api/signals*`

Regles :

- si `ADMIN_API_TOKEN` est configure, les routes sensibles exigent `Authorization: Bearer <token>`
- si aucun token admin n'est configure, les routes front protegees basculent sur un controle d'origine (`ALLOWED_ORIGINS`) pour eviter de casser l'app
- les routes admin restent refusees tant qu'aucun token admin n'est configure

## Deploiement

Depuis ce dossier :

```powershell
wrangler deploy --keep-vars
```

Le binding KV `MTP_CACHE` est deja declare dans `wrangler.toml`.
