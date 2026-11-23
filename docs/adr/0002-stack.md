# 0002. NestJS pour l'API et le worker, Next.js pour le front, en monorepo

- Statut : acceptée
- Date : 2026-11-22
- Décideurs : Kuami (mainteneur)

## Contexte

XCadence importe des données depuis GitHub, calcule des métriques en tâche de fond et les affiche dans un tableau de bord. Le projet est open source : le code doit être lisible et familier pour attirer des contributeurs. Le mainteneur maîtrise TypeScript, NestJS, Next.js et PostgreSQL.

## Options

1. **NestJS (API + worker) + Next.js, monorepo pnpm** : TypeScript partout, types partagés, architecture modulaire. Plus de code de structure.
2. **Next.js seul, avec ses routes d'API** : un seul projet. Pas adapté aux tâches longues (import, calculs) ni à une file de jobs.
3. **Fastify + Vite/React** : plus léger. Structure à inventer, moins guidée pour les contributeurs.
4. **Python (FastAPI) + Next.js** : écosystème data riche. Deux langages, deux chaînes qualité.

## Décision

Nous choisissons l'option 1 : NestJS pour `apps/api` et `apps/worker`, Next.js pour `apps/web`, dans un monorepo pnpm avec Turborepo. Parce que le mainteneur maîtrise ces outils, que NestJS impose une structure que les contributeurs retrouvent d'un module à l'autre, que l'API et le worker partagent le même code, et qu'un seul langage garde une seule chaîne qualité.

## Conséquences

- Positives : ESLint, Prettier et la CI couvrent tout le code ; types partagés via `packages/shared` ; contrat OpenAPI généré depuis le code NestJS.
- Négatives, à accepter : plus de code de structure (modules, décorateurs) ; trois processus à lancer en développement (`pnpm dev` les lance ensemble).
- À revoir si : les contributeurs trouvent NestJS trop lourd pour entrer dans le projet, ou si les calculs de métriques demandent un langage orienté données.
