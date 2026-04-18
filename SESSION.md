# SESSION – ManiTradePro
> **Fichier de continuité de session — à lire en PREMIER à chaque nouvelle session IA**

---

## Métadonnées
| Champ | Valeur |
|-------|--------|
| **Dernière mise à jour** | À REMPLIR |
| **IA utilisée** | À REMPLIR (Claude / ChatGPT / Codex) |
| **Branche active** | main |
| **Repo GitHub** : | emmanueldelasse-droid / [nom du repo ManiTradePro] |
| **Déployé sur** | GitHub Pages |

---

## Stack technique
- **Type** : PWA — iPhone + web, vanilla JS, zéro dépendances
- **Bundle** : Tout en un seul fichier `app-bundle.js` (~5000 lignes)
- **APIs** : Binance, Twelve Data (4 clés en rotation), Yahoo Finance, CoinGecko, Alpha Vantage, Finnhub, Claude AI
- **Sync cross-device** : Supabase (dont quota Claude AI partagé)
- **Proxy CORS** : Cloudflare Worker (pour Binance iOS Safari)
- **EUR/USD** : Sourcé depuis Yahoo Finance `EURUSD=X` (PAS Binance EURUSDT — erreur systématique de 32% corrigée)

## Indicateurs du moteur d'analyse (8)
ADX · EMA 50/100 · Donchian 55/20 · RSI · ATR · Momentum · Volume · Volatilité
→ Score de risque 0–100

## Règle absolue
> ❌ **JAMAIS** afficher un prix fictif, périmé ou inventé — toujours un état de chargement si les données ne sont pas disponibles

---

## État actuel du projet
<!-- ✏️ À mettre à jour à chaque fin de session -->

### Ce qui fonctionne
- [ ] À compléter

### Ce qui est cassé / en cours
- [ ] À compléter

---

## Dernière session
<!-- ✏️ Écraser à chaque nouvelle fin de session -->

**Date** : À REMPLIR
**IA** : À REMPLIR

### Tâches accomplies
- 

### Bugs résolus
- 

### Décisions techniques prises
- 

### Sections de app-bundle.js modifiées
| Section / Ligne approx. | Changement |
|------------------------|------------|
| | |

---

## Prochaine étape prioritaire
<!-- ✏️ La chose la plus importante à faire au prochain démarrage -->

> **TODO #1** : À définir

**Fonctionnalités planifiées (backlog)**
- [ ] Alertes de prix
- [ ] Graphiques en chandeliers
- [ ] Journal de trading
- [ ] Rapports PDF hebdomadaires

---

## Contraintes de déploiement
- Déploiement via **GitHub web UI uniquement** (pas de Git en local sur PC bureau)
- Réseau corporate bloque les API externes
- Tout doit rester dans `app-bundle.js` — pas de séparation en modules

---

## Historique des sessions

| Date | IA | Résumé |
|------|----|--------|
| | | |
