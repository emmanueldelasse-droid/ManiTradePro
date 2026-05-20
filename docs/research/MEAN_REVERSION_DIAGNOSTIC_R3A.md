# Mean Reversion — diagnostic and adjustment candidate review (PR-R3A)

> **Type** : rapport exploratoire / recherche. Aucune décision moteur. Aucune validation. Aucune promotion. Aucun changement de statut officiel.
>
> **Cible** : RS de la famille `MEAN_REVERSION` actuellement classée `EXPERIMENTAL_ONLY / FRICTION_REQUIRED` dans `docs/quant/SETUPS_REGISTRY.md` Setup 4.
>
> **Date** : 2026-05-19.
>
> **Statut PR** : PR-R3A, en attente de `GO MERGE` ChatGPT.

---

## 0. Lecture obligatoire pour le lecteur

Ce rapport ne cherche **pas** à rendre Mean Reversion "rentable". Il ne cherche **pas** à sauver le setup.

Il cherche à répondre à **une seule question** :

> **Existe-t-il encore une version économiquement défendable de Mean Reversion swing pour ManiTradePro ?**

Et la question qui doit traverser tout le rapport :

> **Le marché moderne a-t-il structurellement cassé le mean reversion swing sur single names ?**

La conclusion `aucune version crédible trouvée` est **explicitement autorisée** et sera traitée comme un résultat positif, pas comme un échec à masquer. Cf. principe directeur projet 2026-05-19 :

> Échec honnête > faux edge optimisé.

Et le garde-fou méthodologique central de ce rapport :

> Un setup qui nécessite trop de filtres pour survivre est potentiellement déjà mort.

---

## 1. Contexte — état actuel de Mean Reversion dans le repo

### 1.1 Statut officiel

- `docs/quant/SETUPS_REGISTRY.md` Setup 4 : **`EXPERIMENTAL_ONLY / FRICTION_REQUIRED`**.
- `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md` § 2 : `EXPERIMENTAL_ONLY` (PF 1.21 en exécution réaliste).
- `SESSION.md` § statuts setups : `EXPERIMENTAL_ONLY / FRICTION_REQUIRED`, "friction à valider".
- Détection runtime : `mean_reversion` listé dans `docs/quant/TRADING_LOGIC.md` § *Setups détectés* avec note explicite "détecteur runtime ≠ setup validé" depuis PR #233.

### 1.2 Code existant

`tools/backtests/backtest-meanrev-v1.mjs` :

- **Univers actuel** : 6 symboles uniquement — `SPY`, `QQQ`, `XLK`, `VGT`, `IWM`, `GLD`. Tous des ETF larges ou sectoriels.
- **3 variantes** : `mr_rsi30_ema5` (RSI < 30, prix < EMA20-5%, RR 1.2, stop 1×ATR), `mr_rsi25_ema7` (RSI < 25, plus extrême, RR 1.5), `mr_rsi35_ema4` (RSI < 35, plus permissif, RR 1).
- **Logique signal** : RSI bas + prix sous EMA20 d'un certain % + entry (à reconfirmer dans code complet : entry timing exact, NEXT_OPEN ou close ?).
- **Régime** : pas de filtre régime macro côté code existant (non vérifié exhaustivement — point à confirmer si la PR-R3 d'exécution est lancée).

### 1.3 Audit PR #208 — résultats factuels disponibles

L'audit `setup-execution-bias-audit-v1` (PR #208) classait `MEAN_REVERSION` comme `MEDIUM_RISK` : PF agrégé brut **1.43** → **1.21** en NEXT_OPEN strict. Inflation ×1.18, dans la zone "biais modéré". L'edge n'est pas absent, mais il est marginal.

Verdict historique consigné dans `SETUPS_REGISTRY.md` Setup 4 :

> "trop peu de trades, expectancy faible, faible robustesse, mauvais comportement sur leaders momentum, pas assez complémentaire pour justifier l'intégration."

### 1.4 Faiblesses immédiates du backtest existant

Sans implémenter aucun nouveau script (le rapport est strictement analytique), on peut déjà observer :

1. **Faits observés** : l'univers `backtest-meanrev-v1.mjs` est déjà restreint à 6 ETF larges (SPY, QQQ, XLK, VGT, IWM, GLD). Donc l'idée que "le problème de Mean Reversion serait qu'on le teste sur les mauvais actifs" est partiellement déjà invalidée — le code historique a été testé sur des ETF, pas sur des AI hypergrowth.
2. **Faits observés** : PF 1.21 NEXT_OPEN strict mais **sans friction**. Avec friction baseline projet `frictionR = (0.30 + 0.02 × holdDays) / 5`, un horizon typique de 5-10 jours coûte 0.07-0.10 R par trade. Si l'expectancy bruts est < 0.1 R, l'edge est **mathématiquement consommé**.
3. **Faits observés** : 6 symboles = sample faible. Statistiquement, "trop peu de trades" est cohérent — 6 actifs × signals rares (RSI < 30 ETF) ≈ < 100 trades sur 5 ans probable.
4. **Hypothèse plausible** : les 3 variantes existantes balayent RSI 25-35 et distance EMA 4-7 % — soit une grille interne déjà sentant l'optimisation de seuil. Le repo a évité le grid massif (interdit Freeze § 6.1), mais les 3 variantes sont des points proches sans hypothèse économique différente entre elles — c'est de la sensibilité, pas de la diversité d'hypothèses.

---

## 2. Diagnostic — pourquoi Mean Reversion échoue actuellement

Sont listées toutes les causes plausibles. Pour chacune : **faits observés** (F), **hypothèses plausibles** (H), **intuitions** (I), **spéculations** (S), **zones non testées** (NT).

### 2.1 Mauvais actifs ?

- **F** : univers actuel = 6 ETF larges. Donc l'hypothèse "mauvais actifs" est partiellement invalide a priori — on est déjà sur des actifs qui devraient mean-revert.
- **H** : mais le sample est trop faible. 6 actifs ne permettent ni diversification statistique, ni couverture sectorielle. Étendre aux ETF sectoriels et ETF obligataires pourrait augmenter le sample sans dégrader la nature mean-reverting.
- **NT** : pas testé sur les ETF sectoriels individuels (XLE, XLF, XLV, etc.), pas sur ETF bonds (TLT, IEF), pas sur ETF world (EWZ, FXI, EEM).

### 2.2 Mauvais régime ?

- **NT** : le backtest existant ne semble pas avoir de filtre régime explicite. Donc on ne sait pas si Mean Reversion marche en RANGE et casse en TREND, ou s'il marche partout faiblement.
- **H** : intuitivement, mean reversion classique fonctionne par construction en RANGE (le prix revient à sa moyenne), et casse en TREND (le prix continue sa direction). Tester `regime=RANGE_ONLY` est l'hypothèse économique la plus défendable.
- **H** : `regime=RISK_OFF` peut être encore pire — en bear violent, "acheter ce qui baisse" = catch a falling knife.

### 2.3 Mauvais RSI ?

- **F** : 3 seuils testés (25, 30, 35). RSI 25 est déjà "extrême" pour un ETF large.
- **H** : RSI 20 ou 15 sur ETF large = quasiment jamais déclenché (sample insuffisant garanti).
- **I** : sur les ETF, le RSI 14 a déjà perdu une partie de sa puissance discriminante depuis l'arrivée des flux ETF passifs réguliers. Un excès RSI ETF large = souvent une vente forcée institutionnelle ou un choc macro — pas forcément une opportunité.
- **S** : sur les ETF sectoriels (XLE, XLF), les excès RSI peuvent être plus exploitables car la rotation sectorielle crée des oscillations naturelles. **Non testé**.

### 2.4 Mauvais stop ?

- **F** : 3 variantes testent stop ATR 0.8, 1.0, 1.0. Range étroit.
- **I** : stop ATR trop serré sur un setup contrarian = sortie sur le bruit de fond, justement quand le marché extrapole brièvement l'excès. Stop ATR 2 ou 3 plus probable pour donner de l'air au signal.
- **NT** : pas testé.

### 2.5 Mauvais take profit ?

- **F** : 3 variantes RR 1, 1.2, 1.5. Plage limitée.
- **H** : un setup contrarian ETF doit cibler le retour à la moyenne court terme (EMA20 ou SMA20). Cibler RR > 2 = sortir du périmètre "retour à la moyenne" et entrer dans "rebond directionnel" — qui est un autre setup.
- **NT** : pas testé "exit sur retour à EMA20" qui est l'exit théorique de Mean Reversion.

### 2.6 Mauvais horizon ?

- **F** : pas explicitement paramétré dans les 3 variantes (à reconfirmer dans le code complet — probablement laissé au TP / stop pour fermer).
- **H** : horizon "tant que la position est ouverte jusqu'à TP ou stop" = horizon variable. Friction projet `(0.30 + 0.02 × holdDays) / 5` pénalise les holds longs. Un setup mean reversion qui prend 30 jours à revenir à la moyenne paie 0.18 R de friction — l'edge est mort.
- **H** : si Mean Reversion existe, il doit être **rapide** (3-10 jours typiquement). Au-delà, ce n'est plus du retour à la moyenne, c'est un autre setup.

### 2.7 Friction trop forte ?

- **F** : la formule projet `frictionR = (0.30 + 0.02 × holdDays) / 5` est uniforme pour tous les actifs. ETF SPY = friction réelle probablement plus faible (spread serré, volume énorme). Crypto = friction probablement plus forte.
- **H** : sur ETF large, la friction réelle est probablement **inférieure** à la friction modèle. Tester avec friction calibrée par classe d'actif pourrait débloquer un peu d'edge. **Mais** c'est une amélioration marginale, pas une réinvention.
- **Garde-fou** : modifier la friction baseline = changer la règle, pas l'utiliser. **Interdit** sans PR séparée.

### 2.8 Signal trop tôt ?

- **F** : RSI sous seuil + prix sous EMA20-X%. Le signal se déclenche dès que les 2 conditions sont vraies.
- **I** : "trop tôt" = on achète pendant que le prix continue à descendre. Filtres de confirmation possibles : (a) bougie de retournement (close > open après séquence baissière), (b) divergence RSI haussière, (c) volume de capitulation. **Non testé**.
- **Garde-fou anti-fabrication** : ajouter 3 filtres de confirmation = potentiellement fabriquer un faux edge. **Suspect.**

### 2.9 Signal contre tendance trop violente ?

- **F** : 6 ETF larges = relativement peu de tendances violentes. SPY/QQQ tendent mais lentement. GLD oscille. XLK suit QQQ.
- **H** : si on étend l'univers aux secteurs (XLE en 2022, XLF en 2023), on rencontre des tendances violentes occasionnellement. Le filtre régime macro NO_RISK_OFF n'est pas une protection suffisante car une rotation sectorielle peut casser un secteur en RISK_ON.
- **H** : un filtre supplémentaire "ne pas entrer si tendance LT négative forte" (ex. prix sous SMA200 ET pente SMA200 descendante) est défendable économiquement — il interdit le catch-falling-knife sur trend baissier structurel.

### 2.10 Synthèse du diagnostic

Le setup Mean Reversion actuel souffre **simultanément** de :

- **sample insuffisant** (6 actifs) ;
- **paramètres en grille étroite** sans hypothèses économiques distinctes (les 3 variantes sont des perturbations, pas des thèses) ;
- **friction marginale** qui consomme l'edge probable ;
- **absence de filtre régime** (probablement) ;
- **absence d'exit "retour à la moyenne" explicite** ;
- **absence de test sur horizons courts** (3-5 jours) où l'edge mean-reverting est typiquement présent.

C'est **beaucoup de défauts en même temps**. Le diagnostic ne pointe pas une cause unique. C'est pourquoi la conclusion par défaut doit être **"hypothèse économique fragile"**, pas **"setup mal réglé"**.

---

## 3. Pourquoi Mean Reversion pourrait quand même exister

> Section ajoutée à la demande explicite ChatGPT 2026-05-19. Objectif : séparer "setup mauvais aujourd'hui" de "hypothèse économique impossible".

### 3.1 Argument microstructurel — flux passifs ETF

**Fait observé (général)** : les ETF larges (SPY, IWM, sectoriels SPDR) reçoivent des flux passifs réguliers (mensuels via 401k, hebdomadaires via robo-advisors, etc.). Ces flux **rachètent mécaniquement** après une baisse brève, indépendamment du contenu.

**Hypothèse plausible** : un excès baissier court terme sur un ETF large déclenche statistiquement un afflux d'achats passifs dans les jours qui suivent (rebalancing 60/40, achats programmés). Cet effet existe encore, **par construction**, tant que les flux passifs continuent à dominer (≈ 50 % des flux US actuels).

**Inférence** : sur ETF larges → inefficience persistante structurelle. Sur single names → cet effet n'existe pas.

**Limite** : effet probablement de petite amplitude. Ne crée pas un PF 2.0. Crée peut-être un PF 1.2-1.3 net de friction si bien isolé.

### 3.2 Argument arbitrage création/rachat ETF

**Fait observé** : les ETF ont un mécanisme de création/rachat qui contraint l'ETF à coller à son NAV. Si l'ETF descend significativement sous son NAV, des arbitragistes achètent l'ETF et rachètent les sous-jacents — pression haussière mécanique.

**Hypothèse plausible** : ce mécanisme limite la profondeur des excès baissiers ETF par rapport aux excès baissiers single-name. Un excès RSI < 25 sur SPY est plus rare et plus rapidement corrigé qu'un excès RSI < 25 sur NVDA.

**Inférence** : Mean Reversion sur ETF larges = paris sur l'arbitrage NAV. Mean Reversion sur single name = paris sur la psychologie des intervenants. Les deux ont des durées de vie différentes.

### 3.3 Argument compression de dispersion

**Fait observé** : un ETF large dilue la dispersion idiosyncratique (une mauvaise nouvelle sur un constituant représente < 1 % de l'ETF). Un excès baissier ETF ne reflète donc pas un choc spécifique à un actif, mais un mouvement de marché.

**Hypothèse plausible** : les mouvements de marché ont historiquement un caractère plus moyenne-revenant que les chocs idiosyncratiques (lesquels peuvent être des changements de régime permanents — Lehman 2008, Enron, etc.). Donc l'excès baissier ETF a une espérance de retour plus mesurable que l'excès baissier single name.

**Limite** : ce n'est qu'une espérance — pas une garantie. 2022 a montré que les ETF larges peuvent baisser longtemps sans rebond significatif.

### 3.4 Argument rebalancing institutionnel

**Fait observé** : les fonds de pension, assurances, gestionnaires 60/40 rebalancent périodiquement (trimestriellement souvent). Après une baisse actions, ils achètent mécaniquement pour rééquilibrer.

**Hypothèse plausible** : cet effet crée un biais haussier statistique post-baisse sur les ETF larges, particulièrement en fin de trimestre.

**Limite** : effet faible, dilué dans le bruit. Pas exploitable seul, peut-être en confirmation.

### 3.5 Pourquoi cet effet n'existe plus sur single names momentum

**Fait observé** : les leaders momentum modernes (NVDA, AVGO, PLTR, etc.) ont des structures de flux radicalement différentes :

- **Pas de flux passifs régulier** entrants stables (sauf via leur poids dans QQQ/SPY) ;
- **Narratives narratives extrêmes** : "AI revolution", "this time is different" — créent des conviction trades qui ne se débouclent pas mécaniquement ;
- **Concentration retail extrême** : un excès baissier déclenche du panic selling retail, pas du rebalancing institutionnel ;
- **Convexité explosive** : les leaders peuvent passer de +200 % / an à -50 % / an et revenir — leur volatilité ne reverse pas, elle régime-switch.

**Inférence** : Mean Reversion sur AI hypergrowth single names = mathématiquement absurde. Le setup ne peut pas exister là.

### 3.6 Réponse provisoire à la question centrale

> "Le marché moderne a-t-il structurellement cassé le mean reversion swing sur single names ?"

**Probablement oui, sur single names.** Pour 3 raisons cumulatives :

1. **Narratives narratives modernes** (AI, biotech, crypto-equity) créent des conviction trades qui dépassent la durée d'un setup mean reversion typique.
2. **Concentration retail + leveraged ETF** amplifie les directions au lieu de les compenser.
3. **Absence de mean-reverter institutionnel** sur les leaders : les fonds momentum vendent quand un leader sous-performe, ils n'achètent pas le creux.

**Probablement non, sur ETF larges passifs.** Les flux passifs + arbitrage ETF + rebalancing institutionnel + compression dispersion constituent un ensemble de mécanismes microstructurels qui **devraient encore** générer une légère réversion à la moyenne sur excès court terme.

**Conséquence pour la suite** : seul un setup `V1 ETF RANGE SHORT` a un fondement microstructurel défendable. Les autres variantes sont des tentatives de sauver un setup mort sur le terrain où il est mort.

---

## 4. Hypothèses économiques candidates — examen

Examen de chaque hypothèse listée par ChatGPT + sourcing :

| Hypothèse | Plausibilité économique a priori | Source du raisonnement |
|---|---|---|
| Mean reversion uniquement sur ETF larges | **Forte** (cf. § 3.1-3.4) | Microstructure flux passifs + arbitrage NAV + compression dispersion |
| Mean reversion uniquement en RANGE | **Forte** (par construction) | Définition même du setup : retour à la moyenne implique oscillation, pas tendance |
| Mean reversion uniquement après excès court terme | **Plausible** (3-5 jours) | Tout excès > 10 jours commence à ressembler à une nouvelle tendance |
| Mean reversion interdit en RISK_OFF | **Plausible** (catch-falling-knife) | En bear violent, les excès se prolongent — exemple 2022 |
| Mean reversion interdit sur momentum hypergrowth/crypto | **Très forte** (cf. § 3.5) | Conviction trades + narratives + concentration retail = pas de mean reversion |

**Conclusion partielle** : 5 hypothèses, 4 fortes/plausibles, 1 très forte (l'interdiction crypto/hypergrowth). Le rapport peut donc construire des variantes candidates en combinant ces hypothèses, sans les optimiser après coup.

---

## 5. Variantes candidates

> **Maximum 3.** Chacune avec hypothèse économique en 1 paragraphe **avant** tout test. Aucune optimisation post-hoc. Aucune grille massive.

### 5.1 V1 — `meanrev_etf_range_short` (piste prioritaire)

**Hypothèse économique (avant test)** :

> Les ETF larges (`SPY`, `IWM`, `QQQ`, ETF sectoriels SPDR) sont structurellement plus mean-reverting que les single names parce que (a) ils reçoivent des flux passifs réguliers qui rachètent mécaniquement les baisses, (b) leur arbitrage création/rachat les ramène vers le NAV, (c) leur composition dilue les chocs idiosyncratiques. Ces 3 mécanismes microstructurels ne dépendent pas d'une narration de marché — ils sont permanents tant que la passivisation reste massive (> 40 % des flux US).
>
> **Inefficience exploitable supposée** : un excès baissier court (RSI < 25 sur 5 jours) en régime RANGE (pas de tendance LT négative violente) déclenche un afflux d'achats passifs + arbitrage NAV + rebalancing trimestriel qui ramène l'ETF vers sa moyenne mobile en 3-7 jours.

**Paramètres candidats (gel ex-ante avant tout test)** :

- **Univers** : `ETFs_US_INDEX` (`SPY`, `QQQ`, `IWM`, `DIA`, `MDY`) + `ETFs_US_SECTORS` (`XLE`, `XLF`, `XLV`, `XLI`, `XLP`, `XLY`, `XLB`, `XLU`, `XLRE`, `XLC`). Soit **15 actifs**. Pas d'ETF tech narrowly-focused (XLK, SOXX, SMH — déjà testés et résultat marginal).
- **Régime** : `RANGE` (SPY ni clairement bull ni clairement bear). Critère opérationnel à définir : SPY entre EMA200 ± 5 %, pente EMA200 plate (< 0.05 % / jour). À documenter précisément avant test.
- **Signal** : RSI(14) < 25 sur close[i] + prix < EMA20 × 0.97 (excès -3 % sous EMA20).
- **Entry** : NEXT_OPEN (open[i+1]).
- **Stop** : -1.5 × ATR(14) sous l'entry. Plus large que le baseline historique (0.8-1.0) pour donner de l'air sur le bruit.
- **Take profit / exit** : exit à la première bougie qui clôture **au-dessus** d'EMA20. Horizon max 10 jours bourse — au-delà, exit forcé (l'hypothèse "retour rapide" est invalide si > 10j).
- **Friction** : formule projet `frictionR = (0.30 + 0.02 × holdDays) / 5`. Pas négociable.

**Critère d'invalidation a priori** :

- Sample < 50 trades sur 5 ans → setup non testable.
- PF post-friction < 1.20 → invalidation.
- Sans top 3 ETF (`SPY`, `QQQ`, `IWM` typiquement les plus liquides), PF < 1.05 → edge non diversifiable.
- Catch-falling-knife : si max DD > 2 × Total R → setup trop risqué.
- 2022 PF < 0.5 → setup catastrophique en bear, à invalider.

**Source de l'hypothèse** : observation factuelle (flux passifs > 40 % US 2025 — données publiques ICI), mécanisme d'arbitrage ETF documenté (cf. ICI Research, BlackRock white papers), expérience markets standard. **Pas de littérature académique précise citée ici** — c'est une intuition microstructurelle reposant sur des faits sectoriels, à valider si V1 passe en test.

### 5.2 V2 — `meanrev_quality_no_risk_off` (suspicion méthodologique élevée)

**Hypothèse économique (avant test)** :

> Les leaders quality / defensive (`COST`, `LLY`, `JNJ`, `PG`, `KO`, `MSCI`, `SPGI`, `WM`, etc.) ont des cash-flows stables et une faible sensibilité macro court terme. Après une respiration baissière modérée (RSI < 30, distance EMA20 < -5 %), leur retour à la moyenne devrait être plus probable que sur un leader momentum, car leur valorisation est ancrée dans des fondamentaux non-narratifs.

**⚠ Suspicion méthodologique élevée (ChatGPT 2026-05-19)** :

Le risque que cette variante soit en réalité **un momentum pullback déguisé** est très élevé. Les leaders quality/defensive de l'univers projet (`QUALITY_DEFENSIVE` + sous-set `BIG_TECH` + sous-set `FINANCIALS`) sont **par construction** sélectionnés sur la performance long terme — ils sont en tendance haussière de fond. Un signal "RSI bas + sous EMA20" sur ces noms = signal "respiration courte dans une tendance haussière" = **momentum pullback**, pas mean reversion.

**Vérification anti-déguisement obligatoire (si la variante est testée)** :

Pour qu'on puisse appeler V2 "Mean Reversion", il faut **prouver** que :

- la pente EMA200 au moment du signal n'est **pas** significativement positive (sinon = pullback dans tendance) ;
- le retour à la moyenne se fait par retour vers EMA20 **sans** continuation au-delà (sinon = trend continuation) ;
- les statistiques de sortie sont compatibles avec un retour borné (moyenne ≈ EMA20), pas avec un breakout haussier post-rebond.

Si l'une de ces conditions n'est pas remplie : **V2 est explicitement hors périmètre Mean Reversion**, et le rapport doit l'écrire en toutes lettres :

> "V2 dérive vers un setup momentum-pullback et sort du périmètre Mean Reversion."

V2 sera alors **retirée** des candidates Mean Reversion, pas requalifiée discrètement comme une nouvelle variante quelque part ailleurs.

**Paramètres candidats (gel ex-ante)** :

- **Univers** : `QUALITY_DEFENSIVE` ∪ `FINANCIALS` ∪ `ETFs_US_INDEX`. **Pas** de `BIG_TECH` ni `AI_MOMENTUM` (interdits — cf. § 6).
- **Régime** : `regime ≠ RISK_OFF` (NO_RISK_OFF).
- **Signal** : RSI(14) < 28, prix < EMA20 × 0.95, **ET** pente EMA200 ≤ 0 (filtre anti-pullback déguisé).
- **Entry** : NEXT_OPEN.
- **Stop** : -1.5 × ATR(14).
- **Take profit / exit** : retour à EMA20, horizon max 15 jours.
- **Friction** : formule projet.

**Critère d'invalidation a priori** :

- Pente EMA200 positive sur > 60 % des trades → variante dérive momentum, **invalidée**.
- PF sans top 3 contributeurs > 1.05 ET concentration analyse OK → si malgré ça la pente EMA200 est positive sur > 60 % des trades, sortie de périmètre.
- Sample < 50 trades sur 5 ans → setup non testable.
- PF post-friction < 1.20 → invalidation.

**Source de l'hypothèse** : intuition que les actifs à beta faible et fondamentaux stables ont des oscillations plus prévisibles. Non vérifiée formellement dans la littérature dans le contexte exact ManiTradePro. Risque d'overfit méthodologique modéré.

### 5.3 V3 — `meanrev_oversold_recovery` (présomption d'overfit par défaut)

**Hypothèse économique (avant test)** :

> Sur l'ensemble du marché US, après une chute violente court terme (> 3 ATR sur 5 jours), la pression vendeuse forcée (margin calls, stops déclenchés, panic selling) crée un excès qui se résorbe statistiquement dans les 5-10 jours suivants. Filtres : régime `∈ {RANGE, RISK_ON}` (pas de bear structurel) + RSI < 30 (excès confirmé par indicateur indépendant).

**⚠ Présomption d'overfit par défaut (ChatGPT 2026-05-19)** :

Le rapport traite V3 comme **suspect par défaut, jusqu'à preuve du contraire**. Raisons documentées :

- **Paradis des faux edges** : "acheter ce qui a beaucoup baissé" est l'un des biais les plus connus en backtests retail. Sample biaisé par construction sur historique = survivors qui ont rebondi.
- **Survivorship structurel** : on ne voit pas dans le dataset les actifs qui ont baissé de 3 ATR et ont continué de baisser jusqu'à la faillite ou la radiation. L'univers v2 = survivants 2021-2025.
- **Crash rebounds non reproductibles** : les gros rebonds historiques (mars 2020 COVID, octobre 2022 fin du bear) sont des événements rares. Un backtest qui contient 2-3 de ces événements peut afficher un PF artificiellement élevé.
- **Optimisation cachée du seuil ATR** : le choix de "3 ATR sur 5 jours" est arbitraire. Tester ce seuil + l'autres seuils dans la même PR = mini grid search.
- **Dépendance crash ponctuels** : si 80 % du Total R vient de 3 événements identifiés (COVID, fin 2022, été 2024), c'est une dépendance à des conditions non reproductibles.

**Hiérarchie de preuve** : la charge de preuve pour V3 est **plus lourde** que pour V1.

**Paramètres candidats (gel ex-ante)** :

- **Univers** : `mixed` filtré pour exclure `AI_MOMENTUM`, `CRYPTO`, `LEVERAGED` (cf. § 6).
- **Régime** : `regime ∈ {RANGE, RISK_ON}`.
- **Signal** : `(close[i] - close[i-5]) / ATR(14) < -3` ET RSI(14) < 30.
- **Entry** : NEXT_OPEN.
- **Stop** : -2 × ATR(14) (large pour absorber le bruit après la chute).
- **Take profit / exit** : retour à EMA20 ou +1.5 × ATR(14) depuis entry, horizon max 10 jours.
- **Friction** : formule projet.

**Critère d'invalidation a priori (durci)** :

- Sample < 100 trades sur 5 ans → setup non testable.
- PF post-friction < 1.30 → invalidation (seuil durci vs V1/V2).
- Plus de 60 % du Total R concentré sur 3 dates identifiées (COVID 2020 partial — hors période projet, mars 2020 N/A car période 2021-2025, fin 2022, été 2024, octobre 2023 mini-correction) → dépendance crash non reproductible, invalidation.
- Max DD > 1 × Total R → setup catch-falling-knife.
- Stress "sans top 3 dates" PF < 1.0 → invalidation.

**Source de l'hypothèse** : folklore retail + littérature comportementale sur les excès courts. **Pas de mécanisme microstructurel propre comme V1**. C'est un pattern statistique, pas une inefficience structurelle. Risque d'overfit méthodologique **maximum**.

---

## 6. Variables et axes interdits explicitement

Le rapport interdit les axes suivants pour toute PR-R3 d'exécution suivante. Ces interdictions sont **non négociables**.

### 6.1 Univers interdits (faux edges historiquement explosifs)

- **Mean reversion crypto** (`BTC`, `ETH`, `SOL`, `AVAX`, `BNB`, `LINK`, `MSTR`, `IBIT`, `COIN`).
- **Mean reversion small caps spéculatives** (`AEHR`, `ACLS`, `BBAI`, `SOUN`, `WOLF`, etc.).
- **Mean reversion hypergrowth IA** (`PLTR`, `SMCI`, `NBIS`, `APLD`, `APP`, `UPST`, `AI`).
- **Mean reversion penny stocks** (aucun dans l'univers projet — interdiction préventive).
- **Mean reversion leveraged ETF** (`SOXL`, `TQQQ`, `USD`, `ROM`).

**Raison commune** : ces actifs ont historiquement détruit les setups mean reversion par narratives extrêmes, manque de retour à la moyenne, ou amplification levier.

### 6.2 Méthodologies interdites

- **Mean reversion sans filtre régime** : par construction, on doit séparer RANGE / TREND.
- **Mean reversion sans friction baseline** : formule projet `frictionR = (0.30 + 0.02 × holdDays) / 5` obligatoire.
- **Mean reversion intraday ultra-fréquent** : ManiTradePro est swing daily, pas HFT.

### 6.3 Microstructure inaccessible au projet — sous-bloc obligatoire (ChatGPT 2026-05-19)

> **Le setup ne doit pas dépendre de la microstructure inaccessible au projet.**

Interdictions explicites :

- **Spread capture** (faire de l'argent sur le bid-ask) — ManiTradePro n'a pas l'accès direct au carnet d'ordres.
- **Latence** (HFT, co-location) — pas d'infrastructure projet.
- **Rebonds tick-level** (intra-bougie, sub-second) — données daily uniquement.
- **Execution priority** (priorité dans la file de l'order book) — pas de DMA.
- **Rebonds news ultra courts** (réaction sub-30s à une dépêche) — pas de feed news temps réel.

**Raison** : ManiTradePro n'a ni l'infrastructure, ni les coûts, ni les feeds, ni la latence, ni les conditions réelles pour survivre sur ce terrain. Tout setup qui en dépend implicitement est une illusion en backtest.

### 6.4 Garde-fou central — anti-empilement de filtres

> **Un setup qui nécessite trop de filtres pour survivre est potentiellement déjà mort.**

Si une variante Mean Reversion nécessite plus de **4 filtres simultanés** (par exemple : régime + RSI + distance EMA + ATR + tendance LT + volume + breadth + saisonnalité), c'est probablement de la fabrication d'un faux edge. Le rapport recommande de ne pas accepter une variante au-delà de 4 filtres économiquement justifiés indépendamment.

### 6.5 Garde-fou — pseudo-market-making

Aucune variante ne doit, en pratique, ressembler à du market-making algorithmique déguisé :

- pas de stratégies dépendantes du spread ;
- pas de scalping masqué ;
- pas de stratégies de "skim the noise".

---

## 7. Risques d'overfit identifiés + mécanismes de protection

### 7.1 Risques identifiés

| Risque | Variante concernée | Mécanisme de protection ex-ante |
|---|---|---|
| Sélection univers favorable post-hoc | V1, V2, V3 | Univers gelé AVANT test, listé dans § 5 ; pas de modification après lecture des résultats |
| Optimisation seuils (RSI 25 vs 30, ATR 1.5 vs 2.0) | V1, V2, V3 | 1 seul jeu de paramètres par variante, choisi ex-ante avec hypothèse économique |
| Cherry-picking de période | Toutes | Test 2021-2025 obligatoire complet, pas de filtre années |
| Survivorship | V3 surtout | Documenter explicitement, ne pas extrapoler au futur ; idéalement intégrer delistés (zone non testée actuelle) |
| Momentum déguisé en MR | V2 surtout | Vérification anti-déguisement obligatoire § 5.2 ; sortie de périmètre si pente EMA200 > 0 trop souvent |
| Dépendance crash ponctuels | V3 | Stress "sans top 3 dates" + critère invalidation > 60 % concentration dates |
| Optimisation cachée (3 variantes ≈ grid 3 points) | V1+V2+V3 | Les 3 variantes ont **hypothèses économiques différentes**, pas des perturbations de paramètres |
| Pollution par friction sous-estimée | Toutes | Formule projet obligatoire, pas négociable ; stress ×2/×3 prévu dans PR-R3 suivante |
| Empilement de filtres | V2, V3 | Garde-fou § 6.4 — max 4 filtres simultanés |

### 7.2 Mécanismes de protection structurels

- **Hypothèse économique avant test** : chaque variante a un raisonnement microstructurel ou comportemental documenté **avant** la lecture des résultats. Si les résultats sont positifs mais le mécanisme économique n'est pas réel, on rejette quand même.
- **Critères d'invalidation a priori** : chaque variante a une liste de seuils d'échec écrits **avant** le test. Pas de déplacement post-hoc.
- **Walk-forward strict** : 3 splits paramètres gelés (cf. modèle PR-R1 RS Rotation).
- **Concentration analyse** : top 5 share, PF sans top 5, single-symbol max.
- **Présomption d'overfit pour V3** : la variante est considérée fausse par défaut. Charge de preuve élevée.

---

## 8. Plan de test friction / walk-forward suivant

Si — et **seulement si** — ChatGPT donne `GO MERGE` sur ce diagnostic ET autorise la poursuite, les PR suivantes auront la séquence :

### 8.1 PR-R3B — `meanrev_etf_range_short` test isolé (V1 uniquement)

- Création d'un script `tools/backtests/meanrev-v1-etf-range-test.mjs` testant **uniquement V1** avec paramètres gelés.
- Friction baseline projet appliquée.
- Walk-forward 3 splits stricts (S1 2021-22 → 2023, S2 2021-23 → 2024, S3 2021-24 → 2025).
- Concentration top 5.
- Drawdown deep-dive.
- Critère PASS : ≥ 2/3 splits PF test ≥ 1.20, top 5 share < 60 %, PF sans top 5 > 1.05, max DD < 1 × Total R, 2022 PF > 0.5.
- Décision en sortie : `KEEP_RESEARCH_CANDIDATE` (si OK), `DEAD_AGGREGATED` (si échec), `NEEDS_MORE_DATA` (si sample insuffisant).
- **Aucune promotion automatique** — décision finale ChatGPT.

### 8.2 PR-R3C — vérification V2 anti-déguisement (uniquement si V1 passe)

- Test V2 avec **vérification stricte anti-déguisement** § 5.2.
- Si pente EMA200 positive sur > 60 % des trades → conclusion explicite "V2 hors périmètre Mean Reversion, à reclasser comme momentum pullback potentiel".
- Sinon : critères identiques V1.
- Décision en sortie possible : `OUT_OF_SCOPE_MR` (variante reclassée), `KEEP_RESEARCH_CANDIDATE`, `DEAD_AGGREGATED`.

### 8.3 PR-R3D — V3 oversold recovery (uniquement si V1 ET V2 montrent un edge réel)

- Test V3 avec **présomption d'overfit par défaut**.
- Stress tests obligatoires : sans top 3 dates, sans top 5 tickers, friction ×2.
- Si une seule de ces dégradations stress fait passer PF sous 1.0 → invalidation.
- Décision en sortie : `KEEP_RESEARCH_CANDIDATE` (si tous stress survivent), `DEAD_AGGREGATED` (si un seul stress échoue).

### 8.4 Si V1 (et a fortiori V2, V3) ne passe pas

Conclusion à acter dans `SETUPS_REGISTRY.md` Setup 4 : **`DEAD / ABANDONED`**. Mean Reversion classé définitivement comme setup non viable pour ManiTradePro dans sa version swing actuelle.

Note : cette conclusion est **explicitement autorisée** par ChatGPT (2026-05-19) — "Mean Reversion n'est peut-être plus un axe prioritaire pour ManiTradePro."

---

## 9. Conclusion du diagnostic

### 9.1 Réponse à la question centrale

> "Le marché moderne a-t-il structurellement cassé le mean reversion swing sur single names ?"

**Réponse provisoire fondée sur le diagnostic § 1-3** : **probablement oui** sur les single names momentum / AI / crypto. **Probablement pas** sur les ETF larges passifs.

Cette réponse est une **hypothèse**, pas une certitude. Elle reste à confirmer par les tests PR-R3B suivants (si autorisés).

### 9.2 Verdict du diagnostic

Une **seule** variante a une logique microstructurelle réellement défendable : **V1 ETF RANGE SHORT**. Les arguments microstructurels (flux passifs, arbitrage ETF, compression dispersion, rebalancing institutionnel) constituent un faisceau de mécanismes permanents et observables, indépendants des narratives de marché.

V2 (QUALITY/DEFENSIVE) est suspecte de momentum déguisé. À tester **uniquement** avec vérification anti-déguisement stricte.

V3 (OVERSOLD RECOVERY) est présumée fausse jusqu'à preuve du contraire. À tester **uniquement** si V1 ET V2 montrent un edge réel.

### 9.3 Implication pour ManiTradePro

- **Court terme (PR-R3B)** : tester V1 isolément. Décision binaire — soit l'edge ETF est réel et exploitable, soit Mean Reversion est officiellement classé `DEAD / ABANDONED`.
- **Moyen terme** : si V1 passe, Mean Reversion devient un **complément** de RS Rotation (le setup principal recherche), pas un remplacement. Les deux setups sont décorrélés par construction (l'un est trend-following, l'autre contrarian sur ETF).
- **Cohérence projet** : si V1 ne passe pas, l'abandon de Mean Reversion **simplifie** le repo et libère du temps pour la suite (priorités ChatGPT validées : RS Rotation stress tests friction ×2/×3, transitions régime, rolling glissant).

### 9.4 Conclusion brutalement honnête

**Mean Reversion n'est probablement pas un setup universel pour ManiTradePro.** Si une version viable existe, elle sera lente, rare, contextuelle, limitée aux ETF larges en régime RANGE. Si elle n'existe pas, le classement `DEAD / ABANDONED` est une issue **acceptable**, voire **souhaitable** — c'est un signal d'honnêteté méthodologique.

**Le rapport recommande à ChatGPT** :

1. Valider ce diagnostic.
2. Autoriser la PR-R3B (test isolé V1 uniquement).
3. Ne **pas** autoriser V2 et V3 en parallèle — séquentialité stricte.
4. Accepter explicitement la possibilité que V1 elle-même échoue, et que Mean Reversion soit classé `DEAD / ABANDONED` à terme.

---

## 10. Interdictions générales rappelées

- **Aucune promotion de statut** depuis ce diagnostic — le statut officiel Mean Reversion reste `EXPERIMENTAL_ONLY / FRICTION_REQUIRED`.
- **Aucune activation paper** sur Mean Reversion.
- **Aucune activation live** sur Mean Reversion.
- **Aucun nouveau setup créé** par ce diagnostic — il ne fait que cadrer les variantes futures à tester.
- **Aucun script créé** dans cette PR — uniquement un rapport markdown.
- **Aucun backtest exécuté** dans cette PR — uniquement du diagnostic analytique fondé sur le code et les outputs existants.
- **Aucune modification runtime** (worker, front, providers, broker, paper trading, sw.js, assets/, cloudflare-worker/).
- **Aucun changement de statut** officiel dans `SETUPS_REGISTRY.md` — Setup 4 reste `EXPERIMENTAL_ONLY / FRICTION_REQUIRED`.
- **Aucune extrapolation implicite** — toute affirmation au-delà du dataset 2021-2025 est explicitement étiquetée comme intuition, spéculation, ou zone non testée.

---

## 11. Méthodologie — séparation faits / hypothèses / intuitions / spéculations / zones non testées

Ce rapport sépare explicitement :

- **(F) Faits observés** : ce qui est dans les fichiers du repo (code, outputs, registry, audits). Vérifiable par relecture.
- **(H) Hypothèses plausibles** : raisonnements appuyés sur des mécanismes économiques connus + faits observés. Pas vérifiés dans le contexte exact ManiTradePro.
- **(I) Intuitions** : raisonnements appuyés sur l'expérience markets standard. Pas formellement vérifiables sans test.
- **(S) Spéculations** : hypothèses sur des mécanismes possibles mais non démontrables sans données externes (carnets d'ordres, flux institutionnels détaillés, données de flux ETF en temps réel).
- **(NT) Zones non testées** : ce que le repo ne couvre pas. Pas de validation possible sans nouveau dataset / nouveau script.

Toute affirmation forte (qui guide une décision) doit s'appuyer sur **F** ou **H**. **I** et **S** ne peuvent justifier qu'une orientation de recherche. **NT** ne peut justifier aucune conclusion — uniquement une priorité à investiguer.

---

## 12. Sources

- `docs/quant/SETUPS_REGISTRY.md` Setup 4 (Mean Reversion V1).
- `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md` § 2, § 4, § 6.
- `docs/research/ANTI_LOOKAHEAD_RULES.md`.
- `docs/research/SETUP_VALIDATION_CHECKLIST.md`.
- `docs/quant/TRADING_LOGIC.md` § Setups détectés (note "détecteur runtime ≠ setup validé" PR #233).
- `tools/backtests/backtest-meanrev-v1.mjs` (code existant, univers 6 ETF, 3 variantes RSI 25-35).
- `tools/backtests/universe-v2.mjs` (groupes d'actifs disponibles).
- `tools/backtests/rs-rotation-robustness-v1.mjs` (modèle méthodologique walk-forward + friction + concentration adopté pour les PR-R3B/C/D futures).
- Audit PR #208 résultats Mean Reversion (PF 1.43 → 1.21, MEDIUM_RISK).
- Directives ChatGPT 2026-05-19 (cadrage méta-projet + posture par variante + section "Pourquoi MR pourrait quand même exister" + microstructure inaccessible + garde-fou anti-empilement).

---

> **Conclusion-mémo** : Mean Reversion n'est probablement plus un setup universel. V1 ETF RANGE SHORT est la seule piste avec un fondement microstructurel défendable. La conclusion `DEAD / ABANDONED` à terme reste explicitement acceptable. Cette PR ne change aucun statut officiel ; elle prépare une décision binaire claire pour la PR-R3B suivante.
