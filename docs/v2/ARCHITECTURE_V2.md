# ManiTradePro V2 — Architecture du Learning Bot

> Reconstruction propre. La V2 **ne répare pas** la V1 : c'est un système neuf,
> volontairement minimal, dont la seule finalité est d'**apprendre quels setups
> sont réellement rentables** en prenant des paper trades et en mesurant les
> résultats.
>
> La V1 (`worker.js`, `assets/`, tables `mtp_*`) reste **intacte**. La V2 vit
> dans des fichiers séparés et des tables `mtp_v2_*`.

## 1. Philosophie

Règle absolue : **si un trade est affiché comme ouvrable, il doit pouvoir être
ouvert. Sinon il n'est pas affiché.** Pas de score, pas de note, pas de
confiance artificielle, pas de filtre caché. On privilégie **100 trades
analysables plutôt que 0 trade parfaitement filtré** — un bot qui ne prend
aucun trade n'apprend rien.

## 2. Pipeline unique

```
47 actifs
  ↓ récupération données (bougies daily)
  ↓ calcul indicateurs (EMA20, EMA50, RSI14, ATR14, volume moyen)
  ↓ détection setup (4 setups)
  ↓ validation du plan (entry/stop/tp/rr cohérents)
  ↓ création du plan + taille de position
  ↓ ouverture paper trade
  ↓ gestion position (stop / objectif / temps)
  ↓ fermeture + stockage du résultat
  ↓ recalcul des statistiques → apprentissage
```

Aucune autre couche. Un seul passage, déterministe, testable.

## 3. Fichiers

| Fichier | Rôle |
|---|---|
| `tools/v2/lib/engine-v2.mjs` | **Source de vérité unique** : univers, indicateurs, 4 setups, validation, sizing, résolution de position, statistiques. Pur (sans I/O), testé. |
| `tools/v2/test/engine-v2.test.mjs` | 31 tests `node:test`. |
| `cloudflare-worker/worker-v2.js` | Worker HTTP + cron. Récupération données, persistance, gestion du cycle. Importe le moteur. |
| `cloudflare-worker/wrangler-v2.toml` | Config de déploiement (`manitradepro-v2`). |
| `cloudflare-worker/migrations/v2/001_v2_learning_schema.sql` | Schéma des 4 tables V2. |
| `v2/index.html`, `v2/app.js`, `v2/styles.css`, `v2/sw.js`, `v2/manifest.webmanifest` | Front PWA V2 (vanilla, zéro build). |

Le Worker importe le moteur via `import` ; `wrangler` bundle automatiquement le
fichier `.mjs` au déploiement. Une seule implémentation des algorithmes, partagée
entre le Worker et les tests — pas de miroir à maintenir.

## 4. Univers (47 actifs)

Aucun actif favorisé : tous passent dans le même moteur. Répartition :

- **Crypto (6)** : BTC, ETH, SOL, BNB, XRP, AVAX
- **Actions US (20)** : NVDA, AAPL, MSFT, META, GOOGL, AMZN, TSLA, NFLX, AVGO, ORCL, AMD, PLTR, CRWD, PANW, NOW, CRM, COST, LLY, JPM, COIN
- **Actions Europe (5)** : ASML, LVMH, SAP, AIR, SIE
- **ETF (8)** : SPY, QQQ, XLK, XLF, XLV, SMH, IWM, DIA
- **Commodities (4)** : GLD, SLV, USO, UNG
- **Forex (4)** : EURUSD, GBPUSD, USDJPY, AUDUSD

Liste canonique : `V2_UNIVERSE` dans `engine-v2.mjs`.

## 5. Les 4 setups

Chaque détecteur retourne `null` ou un objet
`{ detected, setupType, direction, entry, stopLoss, takeProfit, rr, reason }`.

1. **Pullback** (achat) — tendance haussière (EMA20 > EMA50), repli sur l'EMA20
   puis reprise, volume non effondré. Stop sous le creux récent, objectif au
   dernier sommet.
2. **Breakout** (achat) — cassure du plus haut des 20 dernières bougies avec
   volume > 1,2× la moyenne. Stop sous le niveau cassé, objectif par projection
   de la base (« measured move ») depuis l'entrée.
3. **Mean Reversion** (achat ou vente) — RSI extrême (≤ 28 survente → achat ;
   ≥ 72 surachat → vente) et cours étiré hors de la moyenne. Objectif = retour
   à l'EMA20.
4. **GLD Breakout** — version spécialisée du breakout, calibrée pour l'or (GLD
   uniquement) : exigence de volume assouplie, objectif ATR ×2.

Quand plusieurs setups se déclenchent, on garde celui au **meilleur ratio
gain/risque**.

## 6. Règle d'ouverture

Un paper trade est ouvert **uniquement si** : setup détecté · plan valide
(`validatePlan`) · `rr ≥ rrMin` (1,5 par défaut) · données exploitables ·
aucune position déjà ouverte sur l'actif · capacité disponible
(`maxOpenPositions`). Sinon : « pas de setup » ou « setup invalide » — mais
**jamais** un trade affiché ouvrable sans ouverture possible.

## 7. Gestion et fermeture

À chaque cycle, chaque position ouverte est confrontée à la dernière bougie :
stop touché → sortie au stop (prioritaire) ; objectif touché → sortie à
l'objectif ; au-delà de `maxHoldDays` (25 j) → sortie au marché (raison
`time`). Le trade fermé est stocké avec tous ses champs.

## 8. Apprentissage

Pour chaque trade fermé on stocke : actif, setup, dates d'ouverture/fermeture,
entrée, sortie, stop, objectif, PnL, PnL %, durée, raison de sortie.

`computeStats` agrège, **par setup** et **par actif** : nombre de trades, taux
de réussite, facteur de profit, espérance (gain moyen par trade), gain moyen,
perte moyenne, P/L total, drawdown max. C'est la seule métrique qui compte :
quel setup gagne, quel setup perd, sur quels actifs.

## 9. Stockage

Supabase si configuré (`SUPABASE_URL` + `SUPABASE_ANON_KEY`), sinon repli
automatique sur le KV Cloudflare (clés préfixées `v2:`) pour que le bot
fonctionne immédiatement. Tables V2 : voir `001_v2_learning_schema.sql`. Les
tables V1 ne sont jamais touchées.

## 10. Endpoints (worker V2)

Base : `https://manitradepro-v2.emmanueldelasse.workers.dev`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/api/v2/health` | public | Santé du bot (actif, dernier cycle, scannés, détectés, ouverts). |
| GET | `/api/v2/universe` | public | Les 47 actifs. |
| GET | `/api/v2/opportunities` | public | Opportunités du dernier scan (ouvrables). |
| GET | `/api/v2/positions` | public | Positions paper ouvertes. |
| GET | `/api/v2/trades?limit=N` | public | Trades fermés. |
| GET | `/api/v2/stats` | public | Stats globales + par setup + par actif. |
| GET | `/api/v2/cycles` | public | Journal des cycles. |
| GET/POST | `/api/v2/settings` | GET public / POST admin | Lecture/écriture des réglages. |
| POST | `/api/v2/session/login` | public (PIN) | Échange PIN → token HMAC 24 h. |
| POST | `/api/v2/cycle` | admin | Lance un cycle complet maintenant. |
| POST | `/api/v2/reset` | admin | Vide les données paper V2 (V1 intacte). |

Auth admin identique à la V1 : PIN → token HMAC-SHA256 signé avec
`ADMIN_API_TOKEN`, en-tête `Authorization: Bearer <token>`.

## 11. Sources de données

Réutilise les clés existantes (aucun secret modifié ni exposé) :

- **Crypto** → Binance (`api.binance.com`, public), repli Yahoo.
- **Forex** → TwelveData (rotation `TWELVE_KEY_1..4`), repli Yahoo.
- **Actions / ETF / commodities** → EODHD (`EODHD_API_KEY`), repli TwelveData puis Yahoo.

Bougies daily mises en cache 6 h dans le KV. Aucun prix n'est jamais inventé :
si aucune source ne répond, l'actif est sauté (`no_data`).

## 12. Cron

`wrangler-v2.toml` déclenche un cycle complet toutes les heures (`0 * * * *`).
Les bougies étant daily, une fréquence horaire suffit largement.

## 13. Sécurité

Paper trading strict. Aucun broker, aucune exécution réelle, aucun argent réel.
Les brokers seront branchés plus tard, hors périmètre V2.

## 14. Tests

`node --test tools/v2/test/engine-v2.test.mjs` → 31/31. Couvre univers,
indicateurs, les 4 détecteurs (cas positifs et négatifs), validation, sizing,
résolution de position, PnL long/short, agrégation des statistiques et
drawdown. **Invariant testé** : tout setup détecté et validé est ouvrable.

## 15. Déploiement

Voir `docs/v2/README_V2.md`.
