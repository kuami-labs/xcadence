# Architecture frontend – XCadence

L'application Next.js compte 6 pages ; elle lit uniquement l'API NestJS et ne parle jamais directement à GitHub.

| Route                | Page              | Contenu principal                                                                   |
| -------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `/login`             | Connexion         | Bouton « Se connecter avec GitHub »                                                 |
| `/onboarding`        | Installation      | Installer la GitHub App, choisir les dépôts, suivre l'import                        |
| `/dashboard`         | Vue d'ensemble    | 4 cartes DORA (valeur, tendance), résumé de la semaine, courbes sur 12 semaines     |
| `/repositories/[id]` | Détail d'un dépôt | Métriques du dépôt, durée de la CI, PR récentes                                     |
| `/bottlenecks`       | Goulots           | PR en attente de revue, PR anciennes, jobs de CI lents ou instables                 |
| `/settings`          | Paramètres        | Dépôts suivis, détection des déploiements, destinataires du résumé, seuils d'alerte |

## Organisation du code (`apps/web`)

- `app/` : routes et mises en page (App Router), composants serveur pour le premier affichage.
- `components/` : `MetricCard`, `TrendChart`, `PrTable`, `PeriodFilter`, `RepoFilter`.
- `lib/api/` : client HTTP typé, avec les types partagés depuis `packages/shared`.
- `hooks/` : requêtes TanStack Query (`useDoraMetrics`, `useBottlenecks`).

## Règles d'interface

- Chaque chiffre affiche sa période (« 4 dernières semaines ») et sa variation par rapport à la période précédente.
- Les filtres (dépôt, période) vivent dans l'URL, pour partager une vue par lien.
- États gérés partout : chargement, import en cours, aucune donnée, erreur.
