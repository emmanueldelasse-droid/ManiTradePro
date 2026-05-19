# Décisions structurantes — ManiTradePro

Objectif : conserver l'historique court et exploitable des décisions importantes du projet.

Ce dossier ne remplace pas :
- `GOVERNANCE.md` pour les règles actives ;
- `SESSION.md` pour l'état courant ;
- les fichiers spécialisés pour les détails métier ou techniques.

Il sert à répondre à une question simple :

> Pourquoi cette décision a-t-elle été prise ?

## Format recommandé pour chaque décision

Chaque décision est un fichier `DECISION-NNN-slug.md` (numéro séquentiel à 3 chiffres + slug court en kebab-case anglais) avec les sections suivantes :

- statut ;
- date ;
- contexte ;
- décision ;
- raisons ;
- conséquences ;
- fichiers concernés ;
- PR liées ;
- état actuel ;
- suite éventuelle.

Statuts possibles : `ACTIVE` (adoptée et toujours en vigueur), `SUPERSEDED par DECISION-MMM` (remplacée par une décision postérieure), `REVERTED` (annulée).

## Règle

Une décision historique **ne doit pas être modifiée pour réécrire le passé**.

Si une décision change, créer une **nouvelle décision** (`DECISION-MMM-...`) qui remplace ou annule l'ancienne, et marquer l'ancienne comme `SUPERSEDED par DECISION-MMM` ou `REVERTED`.

## Décisions actuelles

- `DECISION-001-gpt-role-merged-into-governance.md` — fusion de `GPT_ROLE.md` dans `GOVERNANCE.md` (2026-05-19, ACTIVE).
