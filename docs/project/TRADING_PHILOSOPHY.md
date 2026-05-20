# TRADING_PHILOSOPHY.md — Architecture produit ManiTradePro

> **Statut** : OFFICIAL — formalise l'architecture produit cible et la philosophie de recherche pour ManiTradePro.
>
> **Cohérence** :
> - subordonné à `GOVERNANCE.md` (gouvernance projet, autorité absolue) ;
> - subordonné à `BOT_OBJECTIVE.md` (constitution produit, règles absolues) ;
> - subordonné à `RESEARCH_FRAMEWORK_FREEZE_V1.md` (méthodologie recherche) ;
> - source de vérité pour : l'architecture moteur cible, le rôle de chaque couche, la philosophie de setup, l'univers d'actifs cible, la séparation contexte/setup/timing/risk/mesure.
>
> **Date** : 2026-05-19.
>
> **PR origine** : PR-VISION (architecture produit + philosophie).

---

## 0. Lecture obligatoire pour le lecteur

Ce document ne décrit pas un état réalisé. Il décrit **où le moteur doit aller**. La distance entre l'état actuel et la cible est expliquée pour chaque couche dans § 8.

Le projet ManiTradePro n'est pas :

- un bot qui trouve automatiquement des trades gagnants ;
- un scanner qui mouline le marché entier ;
- un système de scoring universel ;
- une chasse aux patterns de bougies ;
- un système de trading haute fréquence.

Le projet ManiTradePro est :

> **Un moteur de détection de comportements marché exploitables, pour swing réactif et intraday lent, basé sur contexte → setup → timing → risk → mesure.**

Reformulation brutalement honnête : nous ne cherchons pas un edge qui marche tout le temps. Nous cherchons un mécanisme **contextuel** qui sait quand activer quel setup, sur quel actif, à quel moment, avec quel risque, et **qui mesure honnêtement** la différence entre la théorie et la réalité.

---

## 1. Principe central — un setup ≠ un edge

**Définition officielle projet (2026-05-19)** :

> **Un setup n'est pas un edge en soi. Un setup est une réponse conditionnelle à un contexte de marché.**

Un setup est :

- une **détection** d'une configuration technique (ex. RSI < 25 + close < EMA20 × 0.97) ;
- **associé à une hypothèse économique** (ex. "les ETF larges mean-revert grâce aux flux passifs") ;
- **conditionné à un contexte** (ex. régime RANGE) ;
- **mesurable** sous friction réaliste.

Un setup **devient un edge potentiel** si et seulement si :

1. L'hypothèse économique est défendable **avant test**.
2. L'edge survit à une exécution réaliste (NEXT_OPEN strict, friction systématique).
3. L'edge survit à un walk-forward sur 3 splits paramètres gelés.
4. L'edge n'est pas concentré (top 5 share < 60 %).
5. L'edge est diversifiable (PF sans top 5 > 1.05).
6. L'edge ne dépend pas de la microstructure inaccessible au projet (pas de spread capture, pas de latence, pas de tick-level).
7. L'edge ne nécessite pas plus de **4 filtres simultanés** pour survivre.

**Implications opérationnelles** :

- Le projet n'a **aucun** edge `VALIDATED_RESEARCH_CORE` à date (cf. `SETUPS_REGISTRY.md`).
- Le projet n'a **aucun** setup `LIVE_READY` à date.
- Les setups qui ont historiquement porté ces noms (Pullback Momentum, Breakout Expansion) sont actuellement **`DEAD` ou `DEAD_AGGREGATED`** dans leur instance historique — la priorité produit sur ces familles signifie **reconstruire** des variantes économiquement défendables, pas réactiver les anciennes.

**Garde-fou central (PR #235 / R3A, ratifié par PR-VISION)** :

> **Un setup qui nécessite trop de filtres pour survivre est potentiellement déjà mort.**

Maximum **4 filtres simultanés** justifiés indépendamment (typiquement : régime, signal technique principal, filtre direction/tendance, stop). Au-delà = fabrication d'un faux edge.

---

## 2. Architecture moteur cible — 5 couches

L'architecture logique cible de ManiTradePro est composée de **5 couches** séquentielles, chacune avec un rôle précis et une frontière nette :

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. Context Engine          quel setup a le droit d'être actif      │
│     ↓                                                                │
│  2. RS Rotation / Asset     quels actifs sont éligibles aujourd'hui │
│     Selection                                                        │
│     ↓                                                                │
│  3. Setup Activation        quel setup détecté sur ces actifs       │
│     ↓                                                                │
│  4. Candle Timing Engine    quand entrer précisément                │
│     ↓                                                                │
│  5. Paper Trading           mesurer l'edge réel vs théorique        │
│     Measurement                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

Chaque couche a une **responsabilité unique**. Une couche ne contamine pas les autres. Si une couche est faible, le moteur entier devient faux — mais on sait laquelle, et on peut la corriger isolément.

### 2.1 Context Engine — quel setup a le droit d'être actif

**Rôle** : déterminer, à chaque date, quels setups sont **autorisés** à proposer un trade.

**Inputs** :

- Régime macro (SPY/QQQ/SMH vs EMA200) — déjà partiellement présent dans le worker actuel.
- Breadth (% d'actifs au-dessus de leur EMA50) — non encore intégré.
- Volatility régime (VIX si disponible — actuellement non disponible dans le repo).
- Cycle saisonnier (optionnel, secondaire).

**Output** : un set de setups autorisés `{Setup_A, Setup_C, ...}` pour la date courante.

**Exemple** :

```text
Régime = RANGE        → autorisés : Mean Reversion (ETF), Compression
Régime = RISK_ON      → autorisés : RS Rotation, Breakout, Pullback Momentum
Régime = RISK_OFF     → autorisés : aucun setup long (cash / abstention)
```

**Principe directeur** : il n'existe **pas** de setup universel. Le contexte décide.

**État actuel** : embryon présent (le filtre `NO_RISK_OFF` dans plusieurs scripts), mais **pas industrialisé**. Pas de couche dédiée. Pas d'API contractuelle. Cf. § 8 pour la roadmap.

### 2.2 RS Rotation / Asset Selection — quels actifs sont éligibles

**Rôle** : sélectionner, parmi l'univers cible (cf. § 5), les actifs **en force relative** ou **structurellement intéressants** pour la date courante.

**Inputs** :

- Univers cible 40-120 actifs (cf. § 5).
- Momentum relatif (RS Rotation classique : ranking sur lookback fixe).
- Tier de qualité (cf. `ASSET_REGISTRY.md` — ELITE / CORE / TACTICAL / BLACKLIST).
- Filtre liquidité (volume minimum, spread inacceptable, etc.).

**Output** : un sous-ensemble d'actifs `{NVDA, SPY, XLE, ...}` éligibles à recevoir un signal setup.

**Principe directeur** : tous les actifs ne sont pas éligibles à tous les setups. RS Rotation est la sélection **structurelle** ; le setup activé sur ces actifs est le filtre **opportuniste**.

**État actuel** : `backtest-relative-strength-rotation-v1.mjs` + `rs-rotation-robustness-v1.mjs` existent. `asset-quality-engine-v1.mjs` produit la classification. Mais **pas d'orchestration** runtime entre ces deux modules. Cf. § 8.

### 2.3 Setup Activation — quel setup détecté

**Rôle** : pour chaque actif sélectionné par RS Rotation et chaque setup autorisé par le Context Engine, **détecter** si la configuration technique est présente aujourd'hui.

**Inputs** :

- Actifs filtrés par § 2.2.
- Setups autorisés par § 2.1.
- Bougies daily (et 4h/1h pour le timing, cf. § 2.4).

**Output** : pour chaque (actif, setup) éligible, un signal binaire `present | absent` + un score de qualité du signal.

**Principe directeur** : un signal n'est valide que s'il provient de l'intersection (RS Rotation autorise l'actif) ∩ (Context Engine autorise le setup). Hors de cette intersection, **aucun trade**.

**État actuel** : `detectConfiguration` côté worker détecte `pullback`, `breakout`, `mean_reversion`, etc. Mais sans la double filtration (Context Engine + RS Rotation) — donc des détections sont produites qui ne devraient pas être actionnables. **C'est exactement la zone à industrialiser.**

### 2.4 Candle Timing Engine — quand entrer précisément

**Rôle** : une fois un signal setup confirmé, déterminer le **moment exact** d'entrée.

**Inputs** :

- Bougies daily, 4h, 1h (selon l'actif et la disponibilité provider).
- Confirmation de retournement (ex. close > open après séquence baissière sur Mean Reversion).
- Confirmation de volume (ex. volume > moyenne 20j sur Breakout).
- Niveau de support / résistance (ex. retour à EMA20 sur Pullback).

**Output** : un prix d'entrée précis (= NEXT_OPEN par défaut, OU close 1h avec confirmation, OU ouverture jour bourse suivant si signal post-market).

**Principe directeur** : un setup détecté en fin de jour n'est **pas** un ordre à passer immédiatement. Le timing fait partie du setup. Un mauvais timing = perte d'edge même sur un setup valide.

**État actuel** : pas industrialisé. Les backtests utilisent NEXT_OPEN strict par convention Freeze § 3.1. Le moteur runtime utilise des entrées plus floues. À harmoniser.

### 2.5 Paper Trading Measurement — mesurer l'edge réel

**Rôle** : exécuter les trades en paper sur prix live réels, mesurer l'écart entre l'edge backtest et l'edge live, identifier les biais d'exécution résiduels.

**Inputs** :

- Signaux validés par § 2.1 → § 2.4.
- Prix live (cf. `PROVIDERS_MATRIX.md`).
- Friction réelle observée (spread, slippage, retards d'exécution).

**Output** : trades clos (`mtp_trades`) avec `quality = ok | suspect | invalid`, alimentant le système d'apprentissage adaptatif (`computeLearningStats`, règles correctives 1-6).

**Principe directeur** : le paper trading n'est **pas** une preuve d'edge. C'est une **mesure** de la divergence backtest / réel. Si le PF paper est très inférieur au PF backtest sur le même setup, il y a un biais d'exécution résiduel à identifier.

**État actuel** : infrastructure paper existe (`mtp_positions`, `mtp_trades` Supabase). Mais **aucun setup n'est branché en automatique sans supervision humaine** (cf. `SESSION.md`). La couche est en place techniquement, pas en mode auto-actif.

---

## 3. Logique d'exécution : Contexte → Setup → Timing → Risk → Mesure

Synthèse opérationnelle de l'architecture :

```
1. CONTEXTE
   Le marché est dans tel régime aujourd'hui.
   → Le Context Engine décide : seuls les setups X et Y sont autorisés.

2. SETUP
   RS Rotation sélectionne 12 actifs en force relative.
   Détection sur ces 12 actifs des setups X et Y.
   → 2 signaux émergent (NVDA × Pullback, XLE × Compression).

3. TIMING
   Sur NVDA × Pullback, le timing demande une bougie 1h de confirmation.
   Sur XLE × Compression, NEXT_OPEN suffit.
   → Prix d'entrée déterminés.

4. RISK
   Sizing dynamique (1 % du capital max par position).
   Stop défini par ATR.
   Cap sectoriel vérifié.
   Kill-switch portfolio actif.
   → Trade autorisé ou bloqué selon limites risk.

5. MESURE
   Paper trade ouvert.
   Suivi intra-trade.
   Sortie automatique sur stop / TP.
   Tag quality = ok / suspect / invalid à la fermeture.
   → Trade clos alimente l'apprentissage.
```

**Principe directeur** : chaque étape **filtre**. À aucun moment on ne court-circuite une étape pour "récupérer" un trade. Si une étape rejette, le trade n'a pas lieu. C'est exactement le contraire d'une logique de score unique qui agrège tout en une seule valeur.

---

## 4. Setups prioritaires — familles, pas instances

### 4.1 Posture méthodologique critique

Les **familles** de setups suivantes sont identifiées comme prioritaires pour la recherche future ManiTradePro. **Mais les instances historiques portant ces noms sont actuellement classées `DEAD` ou `DEAD_AGGREGATED`** dans `SETUPS_REGISTRY.md`.

**Conséquence directe** : la priorité produit signifie **reconstruire** des variantes économiquement défendables, **pas réactiver** les anciennes. Toute future PR de recherche sur ces familles doit :

- documenter une **nouvelle hypothèse économique** avant test (cf. `SETUP_VALIDATION_CHECKLIST.md` Section A) ;
- respecter le `RESEARCH_FRAMEWORK_FREEZE_V1.md` (NEXT_OPEN, friction, walk-forward, concentration) ;
- ne pas être présentée comme "réactivation" mais comme "nouvelle variante d'une famille morte" ;
- accepter l'issue `DEAD / ABANDONED` comme conclusion légitime si l'hypothèse économique nouvelle ne survit pas (cf. PR #235 / R3A pour la méthode).

### 4.2 Pullback Momentum (famille prioritaire 1)

**État actuel** : instance historique `pullback_rsi42_58_chg20_5_stop0.1` = **`DEAD / DO_NOT_TRADE`** (PR #207 INVALID_BACKTEST — look-ahead structurel `entry = ema20[i]`). Variante `TREND_PULLBACK_DYNAMIC_SUPPORT v1` = `FRAGILE`.

**Hypothèse économique candidate** (à documenter avant tout test futur) :

> Dans un marché en tendance haussière confirmée (régime RISK_ON, breadth > 50 %), les actifs en force relative connaissent des respirations courtes (3-7 jours) qui constituent des opportunités d'entrée moins risquées que le suivi de tendance pur. Le pullback retourne à un niveau de support technique (EMA20 ou trendline) avant la reprise de la tendance principale.

**Conditions de redémarrage recherche** :

- `entry = open[i+1]` strict (jamais `ema20[i]` ni intra-bar).
- Stop / TP sur fenêtres `[..., i-1]` excluant la bougie signal.
- Friction baseline projet obligatoire.
- Hypothèse régime explicite : RISK_ON uniquement, ou validation par walk-forward conditionnel régime.
- Univers : `ELITE` + `CORE` de `ASSET_REGISTRY.md` (pas penny stocks, pas crypto, pas leveraged).

**Risque dominant** : confusion entre Pullback Momentum (vrai retour à support) et entrées tardives sur extension (achat de la chandelle haute après plusieurs sessions baissières dans un upmove).

### 4.3 Breakout Expansion après compression (famille prioritaire 2)

**État actuel** : instance historique agrégée = **`DEAD_AGGREGATED`** (PR #208 PF agrégé 0.92). Seule exception : `GLD × breakout_h20_vol1.5_stop1_rr2` = `CONDITIONAL_RESEARCH_CANDIDATE` (n=47, single-symbol).

**Hypothèse économique candidate** (à documenter avant tout test futur) :

> Une période de compression de volatilité (ATR / range décroissant sur 20-30 jours) précède statistiquement une expansion. La cassure d'une résistance (Donchian high N-jours) en volume soutenu (> moyenne) après une telle compression a une probabilité augmentée de continuation directionnelle, par construction d'une "stored energy" libérée.

**Conditions de redémarrage recherche** :

- Compression mesurée explicitement (BB width, ATR ratio, range %).
- Cassure sur close (pas sur intra-bar high).
- Confirmation volume.
- Stop sous le pivot de compression (pas sous le low de la bougie signal).
- Friction baseline projet obligatoire.
- Univers : `ELITE` + `CORE` de tendances structurelles (semi, AI momentum, ETF tech, GLD pour défensifs).

**Risque dominant** : faux breakouts (cassure technique mais retour intra-bar) → exigence d'une bougie de confirmation, ou entry NEXT_OPEN avec stop sous le pivot.

**Composante "Compression Detection"** : la détection de compression elle-même est un sous-module distinct du Breakout, exploitable indépendamment. Elle peut alimenter :

- Breakout (entrée long après cassure haut) ;
- Breakdown (entrée short après cassure bas — non implémenté à date) ;
- attente (cash, attendre la résolution sans pari directionnel).

### 4.4 Mean Reversion (axe secondaire de recherche)

**État actuel** : `EXPERIMENTAL_ONLY / FRICTION_REQUIRED`. Diagnostic complet dans `docs/research/MEAN_REVERSION_DIAGNOSTIC_R3A.md` (PR #235).

**Conclusion R3A** :

- Mean Reversion **probablement cassé** sur single names momentum modernes (narratives AI, concentration retail, leveraged ETF, absence de mean-reverter institutionnel).
- Mean Reversion **possiblement viable** sur ETF larges passifs (flux passifs, arbitrage NAV, compression dispersion, rebalancing institutionnel).
- 3 variantes candidates : V1 ETF RANGE SHORT (piste prioritaire), V2 QUALITY/DEFENSIVE (suspicion momentum déguisé), V3 OVERSOLD RECOVERY (présomption d'overfit).
- Séquence stricte PR-R3B → PR-R3C → PR-R3D, pas de parallélisation.
- Issue `DEAD / ABANDONED` explicitement acceptable.

**Statut produit officiel** : **axe secondaire**. Pas prioritaire. Le projet peut décider d'abandonner Mean Reversion sans dégradation produit.

### 4.5 RS Rotation (couche d'infrastructure, pas un setup)

**État actuel** : `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED` (PR #234). Walk-forward 3/3 PASS robust, concentration 48.66 %, edge diversifiable, **mais** caveat 2022 PF 0.14.

**Statut conceptuel** : RS Rotation n'est **pas** un setup au sens § 4.1-4.4. C'est une **couche d'infrastructure** (couche 2 § 2.2) — un mécanisme de sélection d'actifs sur lequel les setups (pullback, breakout, etc.) peuvent ensuite s'appliquer.

**Conséquence** : RS Rotation seul **n'est pas un système de trading complet**. C'est un filtre amont. La promotion `CONDITIONAL_EDGE` ou `VALIDATED_RESEARCH_CORE` de RS Rotation comme système autonome reste subordonnée à 10 items listés dans `SETUPS_REGISTRY.md` Setup 3 (stress friction ×2/×3, transitions régime, etc.).

### 4.6 Setups officiellement morts (rappel)

Cf. `SETUPS_REGISTRY.md` :

- `PULLBACK_MOMENTUM` instance historique : `DEAD / DO_NOT_TRADE`.
- `BREAKOUT_EXPANSION` agrégé : `DEAD_AGGREGATED` (sauf exception GLD).
- `VOLATILITY_COMPRESSION` : `DEAD / ABANDONED`.
- `SECTOR_RS v1` : `FRAGILE / CONCENTRATION_EXCESSIVE`.
- `TREND_PULLBACK_DYNAMIC_SUPPORT v1` : `FRAGILE`.

Ces classements **restent** valides. La priorisation des familles Pullback et Breakout (§ 4.2-4.3) n'invalide pas ces statuts ; elle dit que **la recherche future** doit prioritairement attaquer ces familles avec de nouvelles hypothèses, pas réactiver les anciennes instances.

---

## 5. Univers d'actifs cible — 40 à 120 actifs liquides

### 5.1 Principe

> **Qualité structurelle > quantité d'actifs** (rappel `ASSET_REGISTRY.md` § Règle stratégique).

Le projet **n'a pas pour vocation** de scanner tout le marché US ou mondial. L'univers cible raisonnable est **40 à 120 actifs liquides**, sélectionnés sur :

- **liquidité** (volume moyen > seuil exploitable en paper realistic) ;
- **couverture sectorielle** (ne pas concentrer sur un seul thème) ;
- **historique disponible** (≥ 5 ans OHLC daily pour validation walk-forward) ;
- **compatibilité avec les setups prioritaires** (tier `ELITE` ou `CORE` de `ASSET_REGISTRY.md`).

### 5.2 Composition cible (40-120 actifs)

| Catégorie | Cible | Source `ASSET_REGISTRY.md` actuelle |
|---|---:|---|
| **ETF US indices** | 5-10 | SPY, QQQ, IWM, DIA, MDY |
| **ETF sectoriels** | 10-15 | XLE, XLF, XLV, XLI, XLP, XLY, XLB, XLU, XLRE, XLC |
| **ETF thématiques** (semis, cyber, AI) | 5-10 | SMH, SOXX, SOXQ, XSD, PSI, CIBR, BOTZ |
| **Leaders US grandes capitalisations** | 10-20 | NVDA, AAPL, MSFT, AMZN, GOOGL, META, AVGO, ASML, TSM, etc. |
| **Quality / defensive** | 5-10 | COST, LLY, JNJ, PG, KO, MSCI, SPGI, WM |
| **Crypto majeures uniquement** | 3-5 | BTC, ETH, SOL (BNB, AVAX optionnels selon liquidité) |
| **Total cible** | **40-70** | actifs sélectionnés (extension max 120 si justification stricte) |

**Exclusions de l'univers cible (par défaut)** :

- Penny stocks (< 5 USD ou < 50 M volume jour).
- Small caps spéculatives sans historique stable.
- Crypto altcoins illiquides ou récentes.
- Tokens / FX exotiques.
- ETF à effet de levier (`SOXL`, `TQQQ`, `USD`, `ROM`) **par défaut** — réintégration possible si setup le justifie, mais avec friction et risque ajustés.
- Actifs `BLACKLIST` de `ASSET_REGISTRY.md` (54 actifs actuellement).

### 5.3 Pourquoi scanner « tout le marché » est une mauvaise direction

**Argument 1 — Bruit statistique** : sur 5000 tickers US, la probabilité d'observer un faux signal "par chance" sur un setup donné explose. Sur 60 actifs sélectionnés et qualifiés, le signal/bruit est dramatiquement meilleur.

**Argument 2 — Friction et liquidité** : 80 % des tickers US ont une liquidité inexploitable pour du swing (spread > 0.5 %, volume < 1M USD/jour). Tester sur ces actifs = backtests artificiellement positifs irréalisables en paper trading réel.

**Argument 3 — Survivorship aggravé** : un univers très large maximise le survivorship bias (tickers vivants seulement, pas les radiés / fusionnés / faillis).

**Argument 4 — Coût d'observation** : scanner 5000 tickers en daily est techniquement possible. Le faire en intraday lent (1h, 4h) sur les providers actuels (Yahoo, Twelve Data free tier rate-limité) est **inutilisable** — quotas dépassés en quelques minutes.

**Argument 5 — Cohérence avec la stratégie** : ManiTradePro est un moteur **contextuel** (cf. § 2). Le contexte se calcule sur les indices majeurs (SPY, QQQ, SMH). Les setups s'activent sur les leaders structurels. Élargir à 5000 tickers contredit la logique contextuelle — ce serait revenir à un score universel.

**Conclusion** : 40-120 actifs maximum. Tout au-delà est une **dilution** du moteur, pas une amélioration.

---

## 6. Horizons de trading — swing réactif et intraday lent uniquement

### 6.1 Horizons cibles

| Horizon | Définition | Frequency d'exécution | Setups concernés |
|---|---|---|---|
| **Swing réactif** | Trades de 3-20 jours bourse | Décision quotidienne (close daily) | Pullback, Breakout, RS Rotation, Mean Reversion |
| **Intraday lent** | Entrées sur bougies 1h/4h, sorties dans la journée ou le lendemain | Décision plusieurs fois/jour (close 1h/4h) | Candle Timing Engine (couche 2.4), confirmation des setups swing |

### 6.2 Horizons **refusés explicitement**

| Horizon | Pourquoi refusé |
|---|---|
| **Scalping** (secondes à minutes) | Pas l'infrastructure (latence, DMA, carnet d'ordres). Pas l'avantage compétitif. |
| **HFT** (microsecondes) | Pas de co-location, pas de feed temps réel, pas de capacité technique. |
| **Tick trading** | Données tick-level non disponibles dans le repo. |
| **Microstructure / market making** | ManiTradePro n'a ni l'accès au carnet d'ordres, ni les feeds, ni la latence requise. |
| **Daily-only à très long horizon** (> 60 jours) | La friction projet `(0.30 + 0.02 × holdDays) / 5` consomme l'edge au-delà de 60 jours typiquement. |
| **Buy-and-hold passif** | Pas un setup, pas un edge mesurable, hors périmètre d'un moteur quant actif. |

### 6.3 Conséquence sur les data feeds

- **Daily** : suffisant pour 80 % des décisions setup (RS Rotation, détection pullback, détection breakout).
- **4h / 1h** : nécessaire pour Candle Timing Engine § 2.4 — données déjà disponibles partiellement (Twelve Data, EODHD intraday).
- **Tick / sub-second** : **non requis, non utilisé, non recherché**.

---

## 7. Patterns de bougies — ne constituent pas un edge

### 7.1 Définition projet (2026-05-19)

> **Les patterns de bougies seuls (hammer, doji, engulfing, morning star, etc.) ne constituent pas un edge exploitable pour ManiTradePro.**

Un pattern de bougie peut être :

- une **composante** d'un signal Candle Timing Engine § 2.4 (ex. "confirmation par bougie de retournement sur Mean Reversion") ;
- un **filtre** secondaire (ex. "ne pas entrer si la bougie précédente est un doji parfait sur volume faible") ;
- une **observation contextuelle** (ex. "marubozu haussier en fin de séance sur SPY → momentum confirmé pour le jour suivant").

Un pattern de bougie **ne peut pas** être :

- un setup à lui seul ;
- la base d'une décision de trade ;
- un edge documenté isolément.

### 7.2 Pourquoi

**Argument 1 — Trop fréquent** : sur 60 actifs × 5 ans, des centaines de "hammer" se produisent. La majorité sont du bruit dans des contextes non favorables.

**Argument 2 — Pas d'hypothèse économique propre** : un hammer en bear violent vs un hammer après une compression vs un hammer en pullback haussier sont 3 situations économiques différentes. Le pattern seul ne discrimine rien.

**Argument 3 — Faux signal asymétrique** : les patterns de bougies sont **observables a posteriori** sur des backtests propres, mais leur **utilisation prédictive** en live est très bruitée — biais de confirmation rétrospective.

**Argument 4 — Confusion contexte / forme** : un hammer "réussi" sur un actif tendanciel n'est pas un edge du pattern, c'est un edge du contexte ("acheter ce qui monte").

**Conclusion** : les patterns de bougies vivent **dans le Candle Timing Engine** (couche 2.4) comme confirmation **secondaire** d'un setup déjà validé par le contexte et la détection. Jamais en tant que setup primaire.

---

## 8. État actuel vs cible — roadmap par couche

Le tableau suivant explicite la distance entre l'état actuel (2026-05-19) et la cible architecture § 2 :

| Couche | État actuel | Cible | Distance |
|---|---|---|---|
| **1. Context Engine** | Filtre `NO_RISK_OFF` éparse dans plusieurs scripts (`backtest-relative-strength-rotation-regime-v1.mjs`, `rs-rotation-robustness-v1.mjs`, etc.). Pas de couche dédiée runtime. | Module dédié calculant régime + breadth + (futur) VIX, exposant un set de setups autorisés par date. | **Moyenne** — concept déjà présent, à industrialiser en module worker dédié. PR séparée future. |
| **2. RS Rotation / Asset Selection** | `backtest-relative-strength-rotation-v1.mjs` + `rs-rotation-robustness-v1.mjs` + `asset-quality-engine-v1.mjs` existent. Statut RS Rotation : `RESEARCH_CANDIDATE / ROBUSTNESS_REQUIRED` (PR #234). | Orchestration runtime de RS Rotation comme filtre amont des setups détectés. Tier ELITE/CORE consommé par le détecteur. | **Moyenne** — composants quant existent, orchestration runtime à construire. Subordonnée à l'avancement des 10 items RS Rotation. |
| **3. Setup Activation** | `detectConfiguration` côté worker détecte 7 setups (pullback, breakout, mean_reversion, continuation, etc.) sans la double filtration Context + RS Rotation. Note "détecteur runtime ≠ setup validé" ajoutée PR #233. | Détection conditionnée à (Context Engine autorise le setup) ∩ (RS Rotation autorise l'actif). Hors intersection = pas de signal. | **Élevée** — détection actuelle est trop permissive. Refactor majeur du worker à prévoir. |
| **4. Candle Timing Engine** | Pas industrialisé. NEXT_OPEN strict dans les backtests, entrées plus floues dans le runtime. | Module 1h/4h confirmant le timing après signal daily. | **Élevée** — couche absente, à construire. Pas avant que les setups primaires aient été validés. |
| **5. Paper Trading** | Infrastructure existe (`mtp_positions`, `mtp_trades` Supabase). Aucun setup branché auto sans supervision humaine. `tradeValidationEngine` tagge `quality = ok/suspect/invalid`. | Activation auto **uniquement** après qu'au moins un setup soit `VALIDATED_RESEARCH_CORE` + shadow live 1 mois. Mesure d'écart backtest/réel par setup. | **Faible technique, élevée méthodologique** — l'infrastructure est prête, mais aucun setup n'est qualifié pour la brancher. |

**Synthèse** : la cible architecturale est cohérente mais **lointaine**. La priorité court terme reste la **recherche quant** (PR-R3B Mean Reversion V1, RS Rotation stress tests, nouvelles hypothèses Pullback/Breakout). L'industrialisation du Context Engine et du Candle Timing Engine est **subordonnée** à l'obtention d'au moins un setup robuste — il n'y a pas de sens à industrialiser les couches d'orchestration si aucun setup ne mérite encore d'être orchestré.

---

## 9. Principe directeur — moins de setups, mais meilleurs setups

### 9.1 Énoncé

> **Moins de setups bien validés > plus de setups marginaux.**

ManiTradePro **n'a pas vocation** à offrir 20 setups différents. Un système quant qui traite **2 ou 3 setups robustes** sur un univers ciblé est statistiquement et opérationnellement supérieur à un système qui traite 15 setups marginaux.

### 9.2 Conséquences opérationnelles

- **Cap de 4-5 setups maximum** en production runtime (jamais activés simultanément — le contexte décide).
- **Refus d'ajouter un nouveau setup** s'il ne complète pas significativement un trou de couverture identifié (régime non couvert, actif non couvert, comportement non couvert).
- **Acceptation explicite** que la conclusion d'une PR de recherche soit `DEAD / ABANDONED` (cf. cadrage R3A).
- **Priorité à l'approfondissement** d'un setup existant **avant** l'exploration d'un nouveau setup (10 items RS Rotation > nouvelle famille).

### 9.3 Plus de profondeur, moins de largeur

Le projet bascule de :

```text
Avant — "chercher des setups qui gagnent"
- multiplication d'idées ;
- chaque idée est testée superficiellement ;
- les statuts deviennent flous ;
- la hiérarchie de preuves est faible ;
- les faux edges survivent.
```

vers :

```text
Maintenant — "chercher des hypothèses économiques survivables"
- moins d'idées, mieux qualifiées ;
- chaque idée est attaquée structurellement ;
- les statuts sont durs (`DEAD / ABANDONED` autorisé) ;
- la hiérarchie de preuves est explicite ;
- les faux edges sont éliminés activement.
```

Cf. PR #233 (truth-sync vocabulaire), PR #234 (RS Rotation hardening), PR #235 (Mean Reversion diagnostic R3A) pour la trajectoire concrète.

---

## 10. Interdictions absolues (rappel)

Ce document hérite des interdictions du `GOVERNANCE.md`, du `BOT_OBJECTIVE.md`, du `RESEARCH_FRAMEWORK_FREEZE_V1.md`. Rappel des plus structurelles pour cette architecture :

- **Pas d'IA magique** : aucune annonce de "modèle prédictif", "deep learning", "AI signal" sans implémentation transparente et auditée.
- **Pas de score universel** : la décision de trade dépend de l'intersection des 5 couches, jamais d'un score agrégé unique.
- **Pas de promesse** : aucun setup n'est annoncé comme "rentable", "validé", "LIVE_READY" sans satisfaire les 10 critères Freeze § 4 + shadow live + paper live prolongé.
- **Pas de microstructure inaccessible** : pas de spread capture, pas de latence, pas de tick-level, pas d'execution priority, pas de rebonds news ultra courts.
- **Pas de pseudo-market-making déguisé** : pas de scalping masqué, pas de stratégies dépendantes du spread, pas de "skim the noise".
- **Pas d'empilement de filtres** : maximum 4 filtres simultanés justifiés indépendamment pour qu'un setup soit considéré comme défendable.
- **Pas de "ça devrait marcher"** : tout est mesuré. Tout est falsifiable. Tout statut est défendable contre challenge ChatGPT.

---

## 11. Reformulation finale du projet

> **Avant** : ManiTradePro est un bot qui trouve automatiquement des trades gagnants.
>
> **Maintenant** : ManiTradePro est un moteur de détection de comportements marché exploitables, organisé en 5 couches (contexte → setup → timing → risk → mesure), restreint à 40-120 actifs liquides, validant ses hypothèses économiques avant de tester ses paramètres, acceptant explicitement qu'un setup peut être mort.

C'est moins séduisant. C'est beaucoup plus honnête. C'est défendable.

---

## 12. Sources

- `GOVERNANCE.md` — gouvernance projet, autorité absolue.
- `BOT_OBJECTIVE.md` — constitution produit, conditions avant argent réel.
- `PROJECT_RULES.md` — règles techniques structurelles non négociables.
- `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md` — gel méthodologique recherche quant.
- `docs/research/MEAN_REVERSION_DIAGNOSTIC_R3A.md` — diagnostic Mean Reversion (PR #235), méthodologie de cadrage produit appliquée.
- `docs/quant/SETUPS_REGISTRY.md` — statuts officiels setups (Setup 1-8).
- `docs/quant/ASSET_REGISTRY.md` — classification actifs ELITE/CORE/TACTICAL/BLACKLIST.
- `docs/quant/TRADING_LOGIC.md` — logique quant détaillée (scoring, modulateurs, apprentissage).
- `docs/project/TRADING_ENGINE.md` — logique moteur / exécution / safety / sizing.
- Directives ChatGPT 2026-05-19 — cadrage architecture produit + setups prioritaires + univers cible.

---

> **Conclusion-mémo** : ManiTradePro est une architecture en 5 couches contextuelle, non un système de scoring universel. La direction est claire, la distance à la cible est documentée, et les setups prioritaires (Pullback Momentum, Breakout Expansion) sont des **familles** à reconstruire, pas des instances à réactiver. Mean Reversion reste un axe secondaire. RS Rotation est une couche d'infrastructure, pas un setup. Univers cible 40-120 actifs liquides. Pas de scalping, pas de HFT, pas de microstructure. Moins de setups, mieux validés.
