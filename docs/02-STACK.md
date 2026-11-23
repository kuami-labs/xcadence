# Stack technique – XCadence

La stack reprend les compétences existantes (TypeScript, NestJS, Next.js, PostgreSQL, Docker) et n'ajoute que Redis et BullMQ.

| Couche               | Choix                                                               | Pourquoi                                                                                 |
| -------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Langage              | TypeScript partout                                                  | Un seul langage, types partagés entre back et front                                      |
| Dépôt                | Monorepo pnpm + Turborepo                                           | `apps/api`, `apps/worker`, `apps/web`, `packages/shared`                                 |
| API                  | NestJS                                                              | Modules, injection de dépendances, guards : architecture lisible                         |
| Jobs                 | BullMQ + Redis                                                      | Import GitHub, calcul des métriques, résumés : tâches longues hors requête HTTP          |
| Base de données      | PostgreSQL 17 + Prisma                                              | Données relationnelles, agrégats SQL, migrations versionnées                             |
| Intégration GitHub   | GitHub App + Octokit                                                | Webhooks signés, droits en lecture seule, quotas d'API plus élevés qu'un token personnel |
| Front                | Next.js (App Router) + Tailwind + shadcn/ui                         | Pages serveur rapides, composants prêts à l'emploi                                       |
| Graphiques           | Recharts                                                            | Courbes et barres simples, bien intégrées à React                                        |
| Données côté front   | TanStack Query                                                      | Cache, rechargement, états de chargement                                                 |
| Authentification     | Connexion avec GitHub (OAuth) + sessions                            | Les utilisateurs ont déjà un compte GitHub                                               |
| Résumé IA            | Interface `SummaryProvider` : Ollama en local, API Claude en option | Coût nul en développement, modèle interchangeable                                        |
| Emails               | Resend ou SMTP (Mailpit en local)                                   | Résumé hebdomadaire et alertes                                                           |
| Tests                | Vitest + Supertest, Playwright pour 2 parcours                      | Calculs de métriques couverts à 100 %                                                    |
| CI/CD et déploiement | GitHub Actions, Docker Compose, Coolify sur un VPS                  | Outils déjà maîtrisés                                                                    |
| Observabilité        | Logs structurés (pino), Sentry                                      | Comprendre un import qui échoue                                                          |

## Structure du monorepo

```
xcadence/
├── apps/
│   ├── api/        # NestJS : auth, REST, réception des webhooks
│   ├── worker/     # NestJS : jobs BullMQ (import, métriques, résumés, emails)
│   └── web/        # Next.js : tableau de bord
├── packages/
│   ├── shared/     # types et DTO partagés
│   └── db/         # schéma Prisma, migrations, client
├── docs/           # PRD, architecture, ADR
├── compose.yaml
└── turbo.json
```
