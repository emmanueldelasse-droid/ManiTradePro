# PROVIDERS_MATRIX — Matrice des fournisseurs de données

> **Source de vérité unique pour le routage des données de marché.**
> Toute évolution du routage côté worker doit être reflétée ici **avant** le merge.
> Dernière vérification du code : 2026-05-15, après PR #158.

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

Routage déterminé par `getCurrencyForSymbol(symbol)` (worker.js L1078) qui dérive la devise du suffixe EODHD via `normalizeEodhdSymbol`.

| Devise | Bourses concernées | Provider quote primaire | Provider quote fallback 1 | Provider quote fallback 2 |
|---|---|---|---|---|
| USD | NYSE / Nasdaq / AMEX | **EODHD `/real-time`** (temps réel) | Yahoo v8 chart | Twelve |
| EUR | Euronext Paris/Amsterdam/Bruxelles/Lisbonne, Xetra, BME Madrid, Borsa Milan | **Yahoo v8 chart** | EODHD `/real-time` (différé 15 min) | Twelve |
| CHF | SIX Suisse | **Yahoo v8 chart** | EODHD `/real-time` (différé 15 min) | Twelve |
| GBP | London Stock Exchange | **Yahoo v8 chart** | EODHD `/real-time` (différé 15 min) | Twelve |
| SEK / NOK / DKK | OMX Stockholm / Oslo / Nasdaq CPH | Yahoo v8 chart | EODHD `/real-time` | Twelve |

**Logique du dispatcher** (`resolveUnifiedMarketQuote`, worker.js L1603) :
1. Si crypto → `getCryptoQuote` (Binance)
2. Si action US (suffixe `.US` après `normalizeEodhdSymbol`) ET EODHD configuré → `getEodhdRealTimeBatchQuotes([symbol])`
3. Sinon ou si EODHD KO → `getYahooQuoteFromChart`
4. Sinon ou si Yahoo KO → filet EODHD (différé EU) via `getEodhdRealTimeBatchQuotes` (pour les non-US uniquement)
5. Sinon ou si tout précédent KO → `getTwelveQuote`
6. Sinon → `getStoredDailyQuoteFallback` (dernière bougie KV) via le caller

**Logique batch d'opportunités** (`handleOpportunities` Phase 1, worker.js L3287) :
1. Split symboles en `usSymbols` (suffixe `.US` côté EODHD) et `nonUsSymbols`
2. `getEodhdRealTimeBatchQuotes(usSymbols, env)` pour les US (1 appel HTTP)
3. `getYahooBatchQuotes(needYahoo)` pour les EU + symboles US non servis par EODHD
4. `getTwelveBatchQuotes(missingAfterYahoo, env, ctx)` en filet ultime

---

## Conventions de suffixe par provider

Sources différentes utilisent des suffixes de bourse différents. Le worker traduit automatiquement :

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

Fonction de traduction : `normalizeEodhdSymbol` (worker.js L1056). Tout symbole arrivant avec `.DE` ou `.L` est transformé avant l'appel EODHD.

---

## Cas particuliers connus

| Symbole | Problème | Solution actuelle |
|---|---|---|
| ASML | EODHD a `ASML.AS` (Amsterdam) ; Yahoo retourne par défaut le listing Nasdaq US | Mapping explicite : `ASML → ASML.AS` côté EODHD (mais `ASML` reste tagué USD sur certaines positions historiques — bug de devise mixée, garde-fou en place depuis PR #157) |
| LVMH | Ticker Yahoo / EODHD = `MC.PA`, pas `LVMH.PA` | Mapping explicite dans `normalizeYahooSymbol` (worker.js L687) et `normalizeEodhdSymbol` (L1050) |
| RACE.MI (Ferrari) | EODHD n'a pas le listing Milan, seulement NYSE | Utiliser `RACE` (= `RACE.US`) à l'ajout via `/api/user-assets` |
| STM.MI (STMicro) | Idem, EODHD a `STMPA.PA` (Paris) ou `STM` (NYSE) | Utiliser `STMPA.PA` (préféré pour user EUR) |
| ROG.SW (Roche) | EODHD `/real-time` renvoie vide hors heures SIX, mais `/eod` a 7898 bougies | Filet EOD dans `validateSymbolOnProviders` (PR #146) : accepte le symbole si `getEodhdCandles` retourne ≥ 1 bougie |

---

## Caches actifs (mémoire + KV)

Voir aussi **ARCHITECTURE.md > Section Caches** pour la liste exhaustive.

| Cache | TTL | Stocke | Provider concerné |
|---|---|---|---|
| `market:snapshot:${symbol}` | 2 min (mémoire) | Quote non-crypto résolue | Yahoo / EODHD / Twelve |
| `quote:twelve:${symbol}` | 2 min | Quote brute Twelve | Twelve |
| `candles:eodhd:${symbol}:${tf}` | 12 h (KV) | Bougies daily/weekly EODHD | EODHD |
| `candles:twelve:${symbol}:${tf}` | 12 h (KV) | Bougies daily/weekly Twelve | Twelve (et fallback Yahoo) |
| `route:opportunities:data` | 5 min (mémoire) | Snapshot complet du scan | Composite |
| `opportunities:snapshot` | 5 min (KV) | Idem côté KV | Composite |
| `route:detail:data:${symbol}` | 3 min (mémoire) | Fiche détail composite | Composite |
| `market:regime` | 1 h (KV) | Régime macro Risk-On/Off | Composite |
| `news:claudeKillSwitch` | 1 h (mémoire) | Poids Claude basé sur win rate | Claude API |

---

## Validation à l'ajout d'un actif

`/api/user-assets` POST → `validateSymbolOnProviders` (worker.js L9421).

Cascade testée dans `tryNonCrypto` :
1. **EODHD `/real-time`** — si la quote a un `price` > 0 → accepté
2. **EODHD `/eod`** — si au moins 1 bougie daily existe → accepté (utile pour SIX hors heures)
3. **Yahoo v8 chart** — si price > 0 → accepté
4. **Twelve quote** — si price > 0 → accepté
5. Aucun → 400 Bad Request "Symbole introuvable"

Cette cascade garantit qu'un symbole connu d'EODHD (qui sert les bougies) sera toujours acceptable même si la quote temps réel est temporairement vide.
