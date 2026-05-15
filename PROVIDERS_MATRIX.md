# PROVIDERS_MATRIX — Matrice des fournisseurs de données

## Explication simple

Ce fichier explique **quelle source de données est utilisée pour quel actif et quel type d'information**. C'est la référence unique pour comprendre où les prix, les bougies et les cotations sont récupérés.

---

## Vue d'ensemble par type de donnée

| Donnée | Crypto | Action US (`.US`) | Action EU (`.PA`/`.AS`/`.XETRA`/`.MI`) | Action UK (`.L`) | Action SIX (`.SW`) | Forex | Commodity |
|---|---|---|---|---|---|---|---|
| **Quote temps réel** | Binance | EODHD `/real-time` | Yahoo v8 chart | Yahoo v8 chart | Yahoo v8 chart | Twelve / Yahoo | Twelve / Yahoo |
| **Quote différé (filet)** | — | Yahoo v8 chart | EODHD `/real-time` (15 min différé) | EODHD `/real-time` (15 min différé) | EODHD `/real-time` (15 min différé) | Alpha Vantage | Twelve |
| **Filet ultime** | — | Twelve | Twelve | Twelve | Twelve | — | — |
| **Bougies daily/weekly** | Binance | EODHD `/eod` | EODHD `/eod` | EODHD `/eod` | EODHD `/eod` | Twelve | Twelve |
| **Bougies 4h/1h** | Binance | Twelve | Twelve | Twelve | Twelve | Twelve | Twelve |
| **Snapshot fallback** (si tout pète) | — | KV daily | KV daily | KV daily | KV daily | — | — |

---

## Quotes — Détail par devise

Routage déterminé par `getCurrencyForSymbol(symbol)` dans `cloudflare-worker/worker.js`, qui dérive la devise du suffixe EODHD via `normalizeEodhdSymbol`.

| Devise | Bourses concernées | Provider primaire | Fallback 1 | Fallback 2 |
|---|---|---|---|---|
| USD | NYSE / Nasdaq / AMEX | **EODHD `/real-time`** (temps réel) | Yahoo v8 chart | Twelve |
| EUR | Euronext Paris/Amsterdam/Bruxelles/Lisbonne, Xetra, BME Madrid, Borsa Milan | **Yahoo v8 chart** | EODHD `/real-time` (différé 15 min) | Twelve |
| CHF | SIX Suisse | **Yahoo v8 chart** | EODHD `/real-time` (différé 15 min) | Twelve |
| GBP | London Stock Exchange | **Yahoo v8 chart** | EODHD `/real-time` (différé 15 min) | Twelve |
| SEK / NOK / DKK | OMX Stockholm / Oslo / Nasdaq CPH | Yahoo v8 chart | EODHD `/real-time` | Twelve |

### Logique du dispatcher

Fonction `resolveUnifiedMarketQuote` dans `cloudflare-worker/worker.js` :
1. Si crypto → `getCryptoQuote` (Binance)
2. Si action US (suffixe `.US` après `normalizeEodhdSymbol`) ET EODHD configuré → `getEodhdRealTimeBatchQuotes`
3. Sinon → `getYahooQuoteFromChart`
4. Si Yahoo KO et symbole non-US → filet EODHD différé
5. Si tout précédent KO → `getTwelveQuote`
6. En dernier recours → `getStoredDailyQuoteFallback` (dernière bougie KV)

### Logique batch d'opportunités

Phase 1 de `handleOpportunities` dans `cloudflare-worker/worker.js` :
1. Split symboles en `usSymbols` (suffixe `.US` côté EODHD) et `nonUsSymbols`
2. `getEodhdRealTimeBatchQuotes` pour les US (1 appel HTTP)
3. `getYahooBatchQuotes` pour les EU + symboles US non servis par EODHD
4. `getTwelveBatchQuotes` en filet ultime

---

## Conventions de suffixe par provider

| Yahoo / Twelve | EODHD | Bourse |
|---|---|---|
| `.PA` | `.PA` | Euronext Paris |
| `.AS` | `.AS` | Euronext Amsterdam |
| `.BR` | `.BR` | Euronext Bruxelles |
| `.LS` | `.LS` | Euronext Lisbonne |
| `.MI` | `.MI` | Borsa Italiana Milan |
| `.MC` | `.MC` | BME Madrid |
| `.DE` | **`.XETRA`** (traduit auto) | Xetra Francfort |
| `.L` | **`.LSE`** (traduit auto) | London Stock Exchange |
| `.SW` | `.SW` | SIX Suisse |
| `.ST` | `.ST` | OMX Stockholm |
| `.OL` | `.OL` | Oslo |
| `.CO` | `.CO` | Nasdaq Copenhague |

Traduction automatique dans la fonction `normalizeEodhdSymbol`. Tout symbole arrivant avec `.DE` ou `.L` est transformé avant l'appel EODHD.

---

## Cas particuliers connus

| Symbole | Problème | Solution actuelle |
|---|---|---|
| ASML | EODHD a `ASML.AS` (Amsterdam) ; Yahoo retourne par défaut le listing Nasdaq US | Mapping explicite `ASML → ASML.AS` côté EODHD |
| LVMH | Ticker Yahoo / EODHD = `MC.PA`, pas `LVMH.PA` | Mapping explicite dans `normalizeYahooSymbol` et `normalizeEodhdSymbol` |
| RACE.MI (Ferrari) | EODHD n'a pas le listing Milan, seulement NYSE | Utiliser `RACE` (= `RACE.US`) à l'ajout via `/api/user-assets` |
| STM.MI (STMicro) | Idem, EODHD a `STMPA.PA` (Paris) ou `STM` (NYSE) | Utiliser `STMPA.PA` (préféré pour user EUR) |
| ROG.SW (Roche) | EODHD `/real-time` renvoie vide hors heures SIX, mais `/eod` a l'historique complet | Filet EOD dans `validateSymbolOnProviders` : accepte le symbole si `getEodhdCandles` retourne ≥ 1 bougie |

---

## Caches actifs liés aux providers

| Cache | TTL | Stocke | Provider |
|---|---|---|---|
| `market:snapshot:${symbol}` | 2 min (mémoire) | Quote non-crypto résolue | Yahoo / EODHD / Twelve |
| `quote:twelve:${symbol}` | 2 min | Quote brute Twelve | Twelve |
| `candles:eodhd:${symbol}:${tf}` | 12 h (KV) | Bougies daily/weekly EODHD | EODHD |
| `candles:twelve:${symbol}:${tf}` | 12 h (KV daily) / 2 h (4h) / 30 min (1h) | Bougies Twelve | Twelve (fallback Yahoo) |
| `route:opportunities:data` | 5 min (mémoire) | Snapshot complet du scan | Composite |
| `opportunities:snapshot` | 5 min (KV) | Mirror du scan opp | Composite |
| `route:detail:data:${symbol}` | 3 min (mémoire) | Fiche détail composite | Composite |
| `market:regime` | 1 h (KV) | Régime macro Risk-On/Off | Composite |
| `news:claudeKillSwitch` | 1 h (mémoire) | Poids Claude basé sur win rate | Claude API |

---

## Validation à l'ajout d'un actif

`/api/user-assets` POST → `validateSymbolOnProviders`. Cascade testée dans `tryNonCrypto` :
1. **EODHD `/real-time`** — si la quote a un `price > 0` → accepté
2. **EODHD `/eod`** — si au moins 1 bougie daily existe → accepté (utile pour SIX hors heures)
3. **Yahoo v8 chart** — si price > 0 → accepté
4. **Twelve quote** — si price > 0 → accepté
5. Aucun → 400 Bad Request "Symbole introuvable"

---

## Non encore fait

- **`quoteQualityEngine`** : pas implémenté. Aucune vérification systématique de l'âge max d'une quote (120 s par exemple), de l'écart inter-providers, ou du refus de quote sans `currency` explicite. Prévu en vague B.6 de la refonte.
- **Suivi de quota par provider** : EODHD a un quota mensuel, Twelve a 4 clés en rotation, Alpha Vantage a 25 appels/jour. Aucun suivi automatique, pas d'alerte si quota atteint.
- **Sources broker réel** : aucune source d'exécution réelle (Interactive Brokers, Alpaca, etc.) — le projet est encore en paper trading.

---

## Limites de fiabilité

- Le filet "EODHD différé" pour les EU n'a pas été testé en panne réelle de Yahoo prolongée. À surveiller le jour où Yahoo aura une vraie panne.
- Le mapping de symboles non listés ici (ex. nouvelles actions ajoutées par l'utilisateur) repose sur le défaut `.US` de `normalizeEodhdSymbol` — peut être faux pour des actifs non-US sans suffixe explicite.
