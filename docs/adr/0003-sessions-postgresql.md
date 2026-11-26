# 0003. Sessions de connexion stockées dans PostgreSQL

- Statut : acceptée
- Date : 2026-11-24
- Décideurs : Kuami (mainteneur)

## Contexte

La connexion se fait avec GitHub (OAuth de la GitHub App). Il faut ensuite reconnaître l'utilisateur à chaque requête, avec des cookies `HttpOnly`, `Secure`, `SameSite=Lax`, une expiration, et pouvoir révoquer une session (déconnexion, désinstallation de l'App, RGPD) ([08-SECURITE.md](../08-SECURITE.md)).

## Options

1. **PostgreSQL** : une table `sessions` ; le cookie porte un jeton aléatoire, la base n'en garde que l'empreinte SHA-256. Une dépendance (`cookie-parser`).
2. **Redis** avec `express-session` et `connect-redis` : solution répandue, Redis est déjà là pour BullMQ. Trois dépendances, et un second endroit à nettoyer à la suppression d'un utilisateur.
3. **Cookie signé sans stockage** : aucune dépendance. Impossible de révoquer une session avant son expiration.

## Décision

Nous choisissons l'option 1. Supprimer un utilisateur supprime ses sessions (clé étrangère en cascade), la déconnexion est immédiate, et une fuite de la base ne donne aucune session utilisable.

## Conséquences

- Positives : une seule source de vérité ; nettoyage RGPD simple ; testé de bout en bout avec la base réelle.
- Négatives, à accepter : une lecture en base par requête authentifiée ; les sessions expirées sont supprimées à la lecture (une purge périodique viendra avec le worker).
- À revoir si : le nombre de requêtes authentifiées rend cette lecture coûteuse (cache Redis devant la table).
