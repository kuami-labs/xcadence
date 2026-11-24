# 0005. Envoi des emails : SMTP avec nodemailer, Resend en production

- Statut : acceptée
- Date : 2026-11-24
- Décideurs : Kuami (mainteneur)

## Contexte

Le résumé du lundi (F5) part par email aux adresses choisies dans `/settings`. En développement, aucun email ne doit sortir : Mailpit les capture déjà ([06-ENVIRONNEMENT.md](../06-ENVIRONNEMENT.md)). En production, il faut un service d'envoi fiable, gratuit au démarrage, et une désinscription en un clic (RGPD, exigences de Gmail et Yahoo pour les envois réguliers).

## Options

1. **SMTP avec `nodemailer`** : un seul code pour Mailpit et pour n'importe quel fournisseur ; Resend en production via `smtp.resend.com`. Une dépendance, très répandue, sans dépendance transitive.
2. **SDK `resend`** : API HTTP de Resend. Mailpit ne la parle pas : il faudrait un second chemin pour le développement et les tests.
3. **`fetch` vers l'API de Resend** : aucune dépendance, mais même problème de double chemin, et le projet serait lié à un fournisseur.

## Décision

Nous choisissons l'option 1, avec Resend comme fournisseur de production (offre gratuite suffisante pour la bêta). Changer de fournisseur ne demande que de changer `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` et `SMTP_PASSWORD`.

- Les destinataires vivent dans `summary_recipients`, supprimés avec l'organisation.
- Chaque email porte un jeton de désinscription aléatoire, dans le lien du message et dans les en-têtes `List-Unsubscribe` et `List-Unsubscribe-Post` (RFC 8058) ; la route publique répond pareil que le jeton existe ou non.
- Un job par destinataire : un échec est réessayé seul (3 essais) sans renvoyer l'email aux autres ; `weekly_summaries.sent_at` empêche un second envoi du même résumé.

## Conséquences

- Positives : les tests et le développement passent par le vrai code d'envoi (Mailpit) ; aucun verrouillage sur un fournisseur.
- Négatives, à accepter : SMTP est un peu plus lent qu'une API HTTP, sans importance pour quelques emails par semaine ; le domaine d'envoi devra être vérifié chez Resend (SPF, DKIM) avant la mise en ligne.
- À revoir si : le volume d'envoi dépasse l'offre gratuite, ou s'il faut suivre les rebonds (webhooks Resend).
