# PRD – XCadence, radar de santé de l'équipe tech

> Document produit : vision, utilisateurs, fonctionnalités, métriques et plan.
> Fichiers liés : `02-STACK.md`, `03-BACKEND.md`, `04-FRONTEND.md`, `05-DATABASE.md`.

## Vision et problème

**XCadence** — le « X » est la variable : n'importe quel projet, n'importe quelle équipe. XCadence mesure et pilote la cadence de livraison de chacun.

Il donne à un CTO, en 5 minutes par semaine, l'état de santé de son équipe tech : vitesse de livraison, stabilité et goulots, calculés automatiquement depuis GitHub.

**Le problème.** Dans une startup ou une PME de 5 à 50 développeurs, le CTO pilote souvent « au ressenti ». Il ne sait pas si l'équipe livre plus vite ou plus lentement qu'il y a un mois, ni où le travail bloque. Les métriques DORA sont la référence pour mesurer une équipe tech, mais les calculer à la main est long, et les outils existants (LinearB, Swarmia, Jellyfish) sont pensés pour les grandes équipes.

**La promesse.** Connecter une organisation GitHub en 2 minutes, et recevoir chaque lundi un tableau de bord et un résumé écrit qui dit quoi regarder.

## Utilisateurs, objectifs et périmètre

La v1 sert un seul rôle prioritaire, le CTO, sur une seule source, GitHub.

| Utilisateur               | Besoin principal                                 | Priorité v1 |
| ------------------------- | ------------------------------------------------ | ----------- |
| CTO / Head of Engineering | Voir la tendance et les goulots, décider où agir | Principal   |
| Tech Lead                 | Suivre les PR bloquées et la CI de son équipe    | Secondaire  |
| Développeur               | Voir ses PR en attente de revue                  | Hors v1     |

**Objectifs de la v1**

- Connecter une organisation GitHub et importer 90 jours d'historique en moins de 10 minutes.
- Afficher les 4 métriques DORA et 3 indicateurs de flux, par dépôt et par semaine.
- Envoyer un résumé hebdomadaire de 5 lignes maximum, généré par l'IA.

**Dans le périmètre :** GitHub (PR, commits, déploiements, GitHub Actions), tableau de bord web, résumé par email.

**Hors périmètre v1 :** GitLab, Jira et Linear, incidents (PagerDuty), métriques individuelles par développeur, facturation.

**Principe éthique :** l'outil mesure l'équipe et le processus, jamais la performance individuelle. Aucun classement de développeurs.

## Fonctionnalités et user stories

| #   | Fonctionnalité            | User story                                                                                       | Critère d'acceptation                                 | Priorité |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | -------- |
| F1  | Connexion GitHub          | En tant que CTO, je connecte mon organisation via une GitHub App et je choisis les dépôts suivis | Installation en moins de 2 min, dépôts listés         | Must     |
| F2  | Import et synchronisation | En tant que CTO, je vois 90 jours d'historique dès la connexion, puis les nouveautés en continu  | Import initial < 10 min ; webhooks traités < 1 min    | Must     |
| F3  | Tableau de bord DORA      | En tant que CTO, je vois les 4 métriques DORA et leur tendance                                   | Filtres par dépôt et période (4, 12 semaines)         | Must     |
| F4  | Goulots d'étranglement    | En tant que Tech Lead, je vois les PR bloquées, les revues lentes et la CI qui ralentit          | Liste des PR en attente > 48 h, tri par ancienneté    | Must     |
| F5  | Résumé hebdomadaire IA    | En tant que CTO, je reçois chaque lundi 5 lignes qui disent ce qui a changé et quoi regarder     | Chaque phrase cite un chiffre réel du tableau de bord | Should   |
| F6  | Alertes                   | En tant que CTO, je suis prévenu quand une métrique se dégrade fortement                         | Seuil configurable, email ou Slack                    | Could    |
| F7  | Tests instables           | En tant que Tech Lead, je vois les jobs de CI qui échouent puis passent sans changement          | Top 10 des jobs instables                             | Could    |

## Métriques calculées

Toutes les métriques sont calculées par semaine et par dépôt, à partir des seules données GitHub.

| Métrique                            | Définition                                                                       | Source GitHub                                                    | Unité                  |
| ----------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------- |
| Fréquence de déploiement (DORA)     | Nombre de déploiements réussis en production                                     | Deployments, ou runs Actions d'un workflow marqué « production » | déploiements / semaine |
| Délai de livraison (DORA)           | Temps entre le premier commit d'une PR et son déploiement en production          | Commits, PR, Deployments                                         | heures (médiane)       |
| Taux d'échec des changements (DORA) | Part des déploiements suivis d'un rollback, d'un hotfix ou d'un revert sous 48 h | Deployments, PR étiquetées hotfix, reverts                       | %                      |
| Temps de rétablissement (DORA)      | Temps entre un déploiement en échec et le déploiement correctif suivant          | Deployments                                                      | heures (médiane)       |
| Temps avant première revue          | Temps entre l'ouverture d'une PR (hors brouillon) et la première revue           | PR, Reviews                                                      | heures (médiane)       |
| Durée de vie des PR                 | Temps entre l'ouverture et la fusion d'une PR                                    | PR                                                               | heures (médiane)       |
| Durée de la CI                      | Durée des runs GitHub Actions sur la branche principale                          | Workflow runs                                                    | minutes (p50 et p90)   |

### Définitions retenues pour le calcul

Les calculs vivent dans `apps/worker/src/metrics`, couverts à 100 % par des tests.

- **Semaine** : du lundi 00:00 UTC au dimanche ; chaque valeur garde son nombre d'éléments (`sample_size`).
- **Production** : environnement `production` ou `prod` (une règle par dépôt viendra avec `deploy_rule`). Un déploiement **réussi** a le statut `success`, ou `inactive` (réussi puis remplacé) ; **en échec** : `failure` ou `error`. Les déploiements non terminés sont ignorés.
- **Fréquence de déploiement** : déploiements réussis en production, par semaine.
- **Délai de livraison** : premier commit de la PR (son ouverture à défaut) → premier déploiement réussi en production **après sa fusion** ; semaine du déploiement. Sans lien commit par commit, c'est une approximation.
- **Taux d'échec des changements** : un changement échoue s'il est en échec, ou s'il est **annulé par un rollback** : redéploiement, sous 48 h, d'un commit déjà déployé avant lui. Les hotfix et reverts ne sont pas encore détectés : XCadence ne stocke ni titres ni labels de PR.
- **Temps de rétablissement** : déploiement en échec (ou annulé) → déploiement réussi suivant ; semaine de l'échec ; les échecs pas encore rétablis sont exclus.
- **Temps avant première revue** : par semaine d'ouverture ; brouillons et PR sans revue exclus ; les revues de l'auteur ne comptent pas.
- **Durée de vie des PR** : ouverture → fusion, par semaine de fusion.
- **Durée de la CI** : runs terminés sur la branche principale, p50 et p90, par semaine de démarrage.

### Niveaux DORA (Elite à Low) : vérification de novembre 2026

Le PRD prévoyait de vérifier les seuils sur la dernière édition du rapport avant l'implémentation (issue #44). Constat :

- Le **rapport 2024** est la dernière édition à publier des groupes Elite, High, Medium et Low avec des seuils.
- Le **rapport 2025** (_State of AI-assisted Software Development_) et la mise à jour du **Quick Check** d'avril 2026 n'en publient plus : un score de 0 à 10 et une comparaison à des repères issus de la recherche 2025, sans seuils fixes. Les profils d'équipes (7 archétypes) mêlent performance, stabilité et bien-être.
- DORA suit désormais **cinq métriques** : délai de livraison (_change lead time_), fréquence de déploiement, temps de rétablissement après un déploiement en échec (_failed deployment recovery time_), taux d'échec des changements (_change fail rate_) et **taux de reprise des déploiements** (_deployment rework rate_, nouveau).
- Le guide DORA met en garde contre le **classement** et la **comparaison** d'équipes, et contre le mélange des métriques de contextes différents.

**Décision (novembre 2026)** : pas de niveau Elite à Low. Chaque métrique affiche sa valeur et sa **tendance** par rapport à la période précédente ; l'objectif est que chaque équipe progresse, pas de la comparer.

Sources : [guide des métriques DORA](https://dora.dev/guides/dora-metrics-four-keys/), [mise à jour du Quick Check](https://dora.dev/insights/quickcheck-updates/), [rapport 2024](https://dora.dev/research/2024/dora-report/), [rapport 2025](https://cloud.google.com/resources/content/2025-dora-ai-assisted-software-development-report).

Les médianes sont préférées aux moyennes : une PR oubliée un mois ne doit pas fausser toute la semaine.

## Sécurité et RGPD

- GitHub App en lecture seule : métadonnées, pull requests, actions, déploiements. Aucun accès en écriture au code.
- Signature de chaque webhook vérifiée (HMAC SHA-256) avant tout traitement.
- Clé privée de la GitHub App et secrets dans des variables d'environnement, jamais dans le dépôt.
- Chaque requête API filtrée par organisation (guard NestJS) : un utilisateur ne voit jamais les données d'une autre organisation.
- Données personnelles limitées aux logins GitHub ; suppression complète à la désinstallation de l'App.

## Exigences non fonctionnelles

- Tableau de bord affiché en moins de 1 s, grâce aux métriques précalculées.
- Respect des quotas de l'API GitHub : file d'attente avec reprise automatique quand la limite est atteinte.
- Import idempotent : relancer un import ne crée aucun doublon.
- Calculs de métriques couverts par des tests unitaires sur des jeux de données fixes.

## Plan sur 4 semaines

1. **Semaine 1 – Fondations :** monorepo, Docker Compose (PostgreSQL, Redis), schéma Prisma, GitHub App, connexion GitHub, webhook vérifié.
2. **Semaine 2 – Données :** import des 90 derniers jours (PR, revues, déploiements, runs), traitement des webhooks, suivi dans `sync_jobs`.
3. **Semaine 3 – Métriques et interface :** calcul des 7 métriques avec tests, API, pages `/dashboard`, `/repositories` et `/bottlenecks`.
4. **Semaine 4 – Finition :** résumé IA hebdomadaire, email, déploiement sur Coolify, README avec schéma et ADR, démo sur des dépôts open source, vidéo d'une minute.

## Questions ouvertes

- Comment détecter un déploiement quand une équipe n'utilise pas l'API Deployments de GitHub : workflow nommé, tag, ou fusion sur `main` ?
- Quels dépôts open source utiliser pour la démo publique ?
