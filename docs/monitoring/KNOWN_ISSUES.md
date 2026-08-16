# KNOWN_ISSUES — Bugs, incohérences, dette technique

> Fichier canonique des problèmes encore utiles au pilotage courant. L'historique complet antérieur au 2026-08-16 est conservé dans `KNOWN_ISSUES_ARCHIVE_2026-08-16.md`.

## Légende

| Niveau | Description |
|---|---|
| 🔴 CRITIQUE | Pollue le paper trading / apprentissage ou casse une fonction critique |
| 🟠 ÉLEVÉ | Peut induire en erreur ou dégrader fortement les décisions |
| 🟡 MOYEN | Dette ou incohérence limitée |
| 🟢 BAS | Cosmétique / dette propre |

## Issues actuelles

### #17 🔴 V2 — doublons de positions ouvertes sur un même symbole

**Découverte** : 2026-08-16 pendant l'audit des 121 trades V2.

**Symptôme** : plusieurs positions quasi identiques ont été enregistrées simultanément sur un même symbole, notamment CRWD, ORCL et PANW. Cela multiplie le risque d'une même idée et gonfle artificiellement le nombre d'observations statistiques.

**Cause confirmée dans le code** : `worker-v2.js` utilise `openBySymbol` comme garde en mémoire, mais deux cycles concurrents peuvent tous deux charger l'état avant que l'un des deux ait inséré sa position. La garde applicative n'est donc pas atomique.

**Correctif PR #270** : migration V2 `003_one_open_position_per_symbol.sql` créant un index unique partiel PostgreSQL sur `mtp_v2_positions(symbol) WHERE status='open'`. La base devient l'autorité finale contre la course concurrente. La garde `openBySymbol` reste la première ligne de défense.

**Sécurité migration** : non destructive. Si des doublons sont encore ouverts au moment de l'application, la migration lève explicitement une erreur avec les symboles concernés et ne ferme/supprime aucune position.

**Impact statistique** : les 121 trades V2 existants sont classés `V2_PRE_ANTI_DUP_FIX`. Ils restent conservés mais ne doivent pas être mélangés à la cohorte post-fix pour valider un edge.

**État** : correctif code préparé ; **non considéré résolu en runtime tant que la migration 003 n'est pas appliquée sur Supabase**.

**Dette résiduelle** : un conflit d'INSERT empêché par la contrainte peut encore être comptabilisé comme `errors++` par le Worker. Le risque trading est bloqué ; le reporting pourra être nettoyé dans une micro-PR séparée.

---

### #15 🟠 Données ajustées / splits sur certains ETF sectoriels

**État** : OPEN. Les séries XLY/XLE/XLU ont déjà été signalées comme non fiables pour certaines analyses sectorielles. Toute utilisation de leadership sectoriel dépendant de ces séries doit rester non bloquante tant que la ré-ingestion ajustée n'est pas validée.

---

### #2 🟠 Fallback FX `fxRateUsdToEur` hardcodé

**État** : OPEN côté V1. En cas d'échec du provider FX, le fallback historique peut rendre les conversions et PnL affichés inexacts. Ne pas utiliser cette valeur comme vérité d'exécution.

---

### #3 🟠 `capital_base` historique USD vs affichage EUR

**État** : OPEN côté V1. L'architecture historique peut provoquer une dérive d'affichage liée au taux FX. À traiter séparément ; aucun impact direct sur la PR #270 V2.

---

### #7 🟡 Validation broker réel absente

**État** : volontairement OPEN / non applicable actuellement. ManiTradePro reste strictement paper trading. Aucun passage en argent réel ne doit être engagé tant que les conditions de `BOT_OBJECTIVE.md` ne sont pas remplies.

## Issues résolues / historique

L'historique détaillé des anciennes vagues, corrections de quote quality, snapshots, tombstones, analytics, etc. est conservé intégralement dans `docs/monitoring/KNOWN_ISSUES_ARCHIVE_2026-08-16.md` afin que ce fichier canonique reste court et exploitable.
