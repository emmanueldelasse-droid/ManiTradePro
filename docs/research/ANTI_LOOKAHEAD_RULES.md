# Anti-Look-Ahead Rules

> Règles techniques pour empêcher tout backtest de tricher avec de l'information future.
>
> Référence : `RESEARCH_FRAMEWORK_FREEZE_V1.md`.

---

## Pourquoi ce document

La PR #207 (pullback-lookahead-audit-v1) a révélé qu'un setup affiché PF 1.73 avait en réalité PF 0.98 en exécution réaliste. La cause : look-ahead structurel (`entry = ema20[i]`, fenêtres incluant la bougie signal).

Toute la pipeline en aval (tradable-universe, rolling validator, setup-performance-summary) consommait ce PF gonflé. Le projet a perdu 3 mois sur un faux setup.

Ce document liste les **règles techniques précises** pour éviter de répéter cette erreur.

---

## 1. Le look-ahead — définitions

| Type | Description | Exemple |
|---|---|---|
| **Direct future leakage** | Utiliser une bougie N+1 ou ultérieure dans le calcul du signal | `close[i+1]` lu pour décider si on entre à `i` |
| **Indirect future leakage** | Utiliser un indicateur calculé sur une fenêtre incluant la bougie signal **comme prix d'entrée** | `entry = ema20[i]` où ema20[i] inclut close[i] |
| **Window leakage** | Stop / TP calculés sur `max(high[i-N..i])` ou `min(low[i-N..i])` incluant la bougie signal | `swingHigh20 = max(high[-20..])` au lieu de `max(high[-20..-1])` |
| **Timing leakage** | Confondre signal-time (fin de bougie i) et execution-time (bougie i+1) | Décider l'entrée pendant la bougie i alors que le signal nécessite close[i] |
| **Earnings/news leakage** | Utiliser une info publiée après cloture du jour i pour décider une trade à i | Earnings post-market à 20h utilisés pour entrée à 16h le même jour |
| **Survivorship-implicit leakage** | Tester sur un univers de survivants, en supposant qu'ils étaient tous présents dès le début | Backtester depuis 2010 sur l'univers S&P 500 actuel |
| **Rebalance leakage** | Utiliser le close du jour de rebalance pour décider, supposer exécution intra-bar | Ranking à 15h59, exécution "au close" supposée gratuite |

---

## 2. Règles techniques de base

### 2.1 Convention de timing

- **Bougie i** : période close à `time[i]`, contient OHLC complet une fois cloturée.
- **Signal généré à la bougie i** : tous les calculs utilisant close[i] sont disponibles après cloture (16h ET pour US daily, etc.).
- **Exécution à i+1** : entrée au `open[i+1]` (NEXT_OPEN). C'est la règle par défaut.

### 2.2 Fenêtres autorisées

| Cas | Fenêtre | OK ? |
|---|---|---|
| Indicateur (EMA, RSI) jusqu'à i | `slice(0, i+1)` | ✓ (causal, close[i] connu en fin de jour) |
| Prix d'entrée | `candles[i+1].open` | ✓ |
| Stop sur swing low | `min(low) sur slice[i-N..i-1]` (exclut i) | ✓ |
| Stop sur swing low incluant i | `min(low) sur slice[i-N..i]` (inclut i) | ✗ |
| TP sur swing high | `max(high) sur slice[i-N..i-1]` | ✓ |
| TP sur swing high incluant i | `max(high) sur slice[i-N..i]` | ✗ |
| ATR pour stop | `avg(TR) sur slice[i-13..i]` | ✓ (TR utilise high[i], low[i], close[i-1], toutes connues à 16h) |
| Entry = close[i] | acceptable si MOC order ET stress-testé NEXT_OPEN | ⚠ |
| Entry = ema20[i] | inacceptable (prix théorique non garanti d'avoir été touché intraday) | ✗ |
| Entry = low[i] ou high[i] | inacceptable (prix intra-bar non garanti d'avoir été votre fill) | ✗ |

### 2.3 Indicateurs causaux vs non-causaux

Les indicateurs suivants sont **causaux** (calcul ne nécessite pas info future) :
- EMA (récurrence sur close passés)
- RSI (récurrence sur close passés)
- ATR (TR sur high/low/close passés)
- SMA
- Momentum sur lookback fixe
- Bollinger Bands
- MACD

Indicateurs **non-causaux** (ou suspects) :
- Pivot points "centered" (utilisent N bougies à droite ET à gauche d'un point central)
- Smoothing avec window centered
- Recalcul rétroactif (recompute global après chaque nouvelle bougie)
- ZigZag / fractal qui dépendent du futur

Règle : un indicateur n'est OK que si son calcul à l'instant i n'utilise que les bougies `[0..i]`.

---

## 3. Test de validation anti-look-ahead

Pour tout nouveau setup, exécuter ce test :

### 3.1 Méthode "double simulation"

1. Simuler avec le code actuel (modèle `CURRENT`).
2. Simuler avec **NEXT_OPEN strict** :
   - `entry = open[i+1]`
   - `stop / tp` calculés sur fenêtres `[i-N..i-1]` (excluant bougie i)
3. Comparer `PF_CURRENT / PF_NEXT_OPEN`.

| Inflation | Verdict |
|---|---|
| < ×1.05 | CLEAN — aucun look-ahead significatif |
| < ×1.30 | MEDIUM_RISK — biais modéré, à corriger |
| < ×1.70 | HIGH_RISK — biais important, setup à corriger |
| ≥ ×1.70 | **INVALID_BACKTEST** — setup invalidé |
| PF_NEXT_OPEN < 1.0 | INVALID_BACKTEST — edge inexistant en réalité |

### 3.2 Méthode "audit du code"

En complément, parcourir le code source du moteur de signal et vérifier :

- [ ] Aucune fonction n'a accès à `candles[i+1]` ou suivantes au moment du calcul du signal pour i.
- [ ] Toutes les fenêtres utilisent `slice(start, i+1)` pour les indicateurs, et `slice(start, i)` pour stop/TP.
- [ ] Le prix d'entrée n'est pas un indicateur calculé sur la bougie signal.
- [ ] La simulation post-signal commence à i+1.
- [ ] La fonction `simulateTrade` ne référence pas les candidats avant `i+1`.

### 3.3 Méthode "sanity check par sous-set"

Tirer 20 trades au hasard du backtest et :
- vérifier manuellement la cohérence entry/exit
- vérifier que les prix utilisés étaient bien disponibles à la date de décision
- comparer avec un dump CSV des bougies

Si > 1 trade incohérent sur 20 → look-ahead probable.

---

## 4. Cas particuliers

### 4.1 Données fondamentales (earnings, fundamentals)

Cas critique. Règles :

- **Timing de publication** : `publishedAt` doit avoir une timezone explicite (UTC ou ET).
- **Pre-market** (avant 9h30 ET) → l'info est connue à l'ouverture du jour T. Entry au open[T+1] (lendemain).
- **Post-market** (après 16h ET) → l'info est connue à la cloture du jour T. Entry au open[T+2] (surlendemain).
- **Intraday** : entrée au open du jour bourse suivant après la publication.
- **Consensus estimates** : doivent être figés AVANT `publishedAt`. Si la source met à jour rétroactivement, c'est un look-ahead silencieux.
- **Validation manuelle** : tirer 20 earnings random, vérifier que les estimates stockés étaient bien publics avant la date d'earnings.

### 4.2 Régime macro (filtre)

Le régime à la date i est calculé sur SPY/QQQ/SMH vs EMA200, tous causaux. OK.

Mais si on utilise un régime "futur" (ex. "savoir si on est en bear" sur les 30 prochains jours), c'est du look-ahead. À proscrire.

### 4.3 Survivorship bias

L'univers `tools/backtests/universe-v2.mjs` contient les symboles survivants. Pour les tests historiques :
- documenter que l'univers est ex-post.
- ne pas extrapoler les résultats à un univers point-in-time réel.
- si possible, utiliser un univers historique reconstruit (snapshots S&P 500 mensuels).

### 4.4 Données externes téléchargées

Toute donnée externe (CSV, JSON, API) doit être auditée pour look-ahead :
- Le timestamp documente bien la disponibilité historique ?
- La source met-elle à jour rétroactivement ?
- Le fichier a-t-il été modifié après son téléchargement initial ?

---

## 5. Anti-look-ahead — checklist par étape du pipeline

### 5.1 Génération du signal

- [ ] Le signal pour i n'utilise que les bougies `[0..i]`.
- [ ] Le close[i] est utilisable (il est public en fin de jour i).
- [ ] high[i] et low[i] sont utilisables (idem).
- [ ] Aucune référence à `candles[i+1]` ou suivantes.

### 5.2 Calcul entry / stop / TP

- [ ] Entry = `open[i+1]` ou MOC justifié.
- [ ] Stop calculé sur `[..., i-1]` ou avec ATR causal.
- [ ] TP calculé sur `[..., i-1]` ou en multiple de risk.
- [ ] Aucun usage de `min/max` sur fenêtre incluant la bougie signal.

### 5.3 Simulation des sorties

- [ ] La simulation commence à `i+1` (jamais à i).
- [ ] Si stop+TP touchés dans même bougie post-entry : règle déterministe documentée (typiquement LOSS prioritaire).
- [ ] Pour exit fixed_hold : exit = `open[exitIdx]`, pas close.

### 5.4 Agrégation et reporting

- [ ] Pas de filtrage rétroactif sur les trades (ex. "ne garder que les trades qui ont gagné").
- [ ] Pas de réoptimisation des paramètres après le backtest.
- [ ] Walk-forward strict : paramètres gelés entre les splits.

---

## 6. Erreurs typiques observées historiquement dans ManiTradePro

### 6.1 Pullback Momentum (PR #207, INVALID_BACKTEST)

```javascript
// CODE INCORRECT (ancien Pullback)
const ema20 = ema20Series.at(-1);  // EMA20 incluant close[i]
const entry = ema20;               // ← entry théorique
const swingLow10 = Math.min(...candles.slice(-10).map(c => c.low));  // ← inclut low[i]
const stop = swingLow10 - atr * stopAtr;
```

Problème : entry à un prix théorique non garanti d'avoir été touché intraday, et stop calculé sur fenêtre incluant le low[i].

**Correction** :

```javascript
const entry = candles[i + 1].open;                              // NEXT_OPEN
const swingLow10 = Math.min(...candles.slice(-11, -1).map(c => c.low));  // exclut bougie i
const stop = swingLow10 - atr * stopAtr;
```

### 6.2 Sector RS (PR #213/#214)

Le calcul du momentum sectoriel agrégé utilise close[i] de tous les symboles du secteur. C'est OK (causal, close[i] connu après 16h). L'entrée à open[i+1] est correcte.

**Mais** : la concentration top 5 à 103 % révèle qu'un look-ahead implicite peut exister si on assume que les "stars AI" actuelles seront les "stars AI" futures. C'est un biais ex-post, pas un look-ahead temporel pur.

---

## 7. Outils pour détecter le look-ahead

### 7.1 Audit automatique

Le moteur `tools/backtests/pullback-lookahead-audit-v1.mjs` (PR #207) et `tools/backtests/setup-execution-bias-audit-v1.mjs` (PR #208) sont les modèles à suivre. Pour tout nouveau setup :

1. Créer un audit symétrique.
2. Tester plusieurs modèles d'entrée (CURRENT, NEXT_OPEN, SIGNAL_CLOSE, etc.).
3. Mesurer l'inflation PF.

### 7.2 Audit manuel

Pour un setup critique, parcourir le code line-by-line avec ces 5 questions :
- Est-ce que cette ligne accède à `candles[i+k]` avec k > 0 ?
- Est-ce que cette fenêtre `slice(...)` inclut la bougie signal ?
- Est-ce qu'un indicateur est utilisé comme prix d'entrée ?
- Est-ce que l'exécution simule bien à partir de i+1 ?
- Est-ce que des paramètres ont été réoptimisés sur les données de test ?

---

## 8. Sanctions documentaires

Tout setup pour lequel un audit anti-look-ahead révèle :

- **Inflation PF ≥ ×1.05** : statut maximal `CONDITIONAL_EDGE`, mention "look-ahead non-négligeable détecté".
- **Inflation PF ≥ ×1.30** : statut maximal `FRAGILE` + correction obligatoire avant promotion.
- **Inflation PF ≥ ×1.70 OU PF NEXT_OPEN < 1.0** : statut `INVALID_BACKTEST`. Setup gelé jusqu'à correction. Tous les outputs en aval (tradable-universe, allocation) doivent être audités pour contamination.

---

## 9. Mise à jour de ce document

Ce document peut être étendu, mais **pas affaibli**. Ajouts par PR explicite. Pas de suppression sans débat ChatGPT.

---

> Ces règles sont la mémoire institutionnelle des erreurs passées. Les respecter, c'est éviter de répéter 3 mois de faux setups.
