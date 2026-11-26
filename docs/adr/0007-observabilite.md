# 0007. Observabilité : logs JSON (pino) et Sentry optionnel

- Statut : acceptée
- Date : 2026-11-25
- Décideurs : Kuami (mainteneur)

## Contexte

Un import GitHub qui échoue, un webhook rejeté ou un job BullMQ en erreur doivent se comprendre sans accès à la machine. Ces traces ne doivent pourtant contenir aucun secret ni aucune donnée personnelle : jetons GitHub, cookies de session, en-têtes `Authorization`, payloads de webhooks, adresses email (docs/08-SECURITE.md). La décision avait été prise avec #70, sans être consignée.

## Options

1. **Logger de NestJS** : rien à ajouter, mais du texte libre, sans masquage des champs sensibles ni format JSON exploitable par un hébergeur.
2. **`nestjs-pino`** (pino) : logs JSON structurés, masquage de chemins (`redact`), lisibles en développement avec `pino-pretty`.
3. **OpenTelemetry complet** (traces, métriques, logs) : plus riche, mais demande un collecteur et un backend à héberger, disproportionné pour la bêta.

Pour les erreurs : **Sentry** (offre gratuite, SDK NestJS) ou rien de plus que les logs.

## Décision

Nous choisissons l'option 2, plus Sentry **optionnel**.

- Logs JSON en production (`NODE_ENV=production` ou `LOG_FORMAT=json`), lisibles en développement. Champs sensibles masqués (`authorization`, `cookie`, `token`, `payload`…) ; une requête HTTP n'est journalisée que par sa méthode, son chemin sans paramètres et son statut ; `/health` ne l'est pas.
- Sentry ne s'active que si `SENTRY_DSN` est défini. Sa collecte (`dataCollection` de Sentry 11) est entièrement coupée et `beforeSend` retire encore la requête : seule l'erreur et sa pile partent. Les erreurs HTTP attendues (4xx) ne sont pas envoyées.
- Côté worker, chaque job en échec est journalisé et signalé à Sentry avec seulement le nom de la file et du job, jamais ses arguments.

## Conséquences

- Positives : erreurs comprises sans rien exposer ; aucun compte externe requis pour contribuer ou héberger ; toute plateforme qui lit la sortie standard exploite les logs JSON.
- Négatives, à accepter : pas de traces distribuées entre l'API et le worker ; sans `SENTRY_DSN`, les erreurs ne se voient que dans les logs.
- À revoir si : plusieurs instances tournent en parallèle et qu'il faut suivre une requête de l'API jusqu'au job, ou si les logs deviennent trop volumineux pour être lus sans outil.
