# Architecture frontend – XCadence

L'application Next.js compte 6 pages ; elle lit uniquement l'API NestJS et ne parle jamais directement à GitHub.

| Route                        | Page              | Contenu principal                                                                   |
| ---------------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `/login`                     | Connexion         | Bouton « Se connecter avec GitHub »                                                 |
| `/onboarding`                | Installation      | Installer la GitHub App, choisir les dépôts, suivre l'import                        |
| `/dashboard`                 | Vue d'ensemble    | 4 cartes DORA (valeur, tendance), résumé de la semaine, courbes sur 12 semaines     |
| `/repositories/[id]`         | Détail d'un dépôt | Métriques du dépôt, durée de la CI, environnements de production, PR récentes       |
| `/bottlenecks`               | Goulots           | PR en attente de revue, PR anciennes, jobs de CI lents ou instables                 |
| `/settings`                  | Paramètres        | Dépôts suivis, détection des déploiements, destinataires du résumé, seuils d'alerte |
| `/demo`, `/demo/bottlenecks` | Démo publique     | Vue d'ensemble et goulots de l'organisation de démo, sans connexion (ADR 0006)      |

## Organisation du code (`apps/web`)

- `app/` : routes et mises en page (App Router), composants serveur pour le premier affichage. Deux groupes de routes, sans effet sur les URL : `(app)` (application et démo, avec la barre latérale) et `(focus)` (connexion et installation, avec un en-tête simple).
- `components/shell/` : barre latérale (organisation, navigation, thème, compte) et, sous 1024 px, barre du haut avec menu en tiroir.
- `components/` : `MetricCard`, `TrendChart`, `PrTable`, `PeriodFilter`, `RepoFilter`.
- `lib/api/` : client HTTP typé, avec les types partagés depuis `packages/shared`.
- `hooks/` : requêtes TanStack Query (`useDoraMetrics`, `useBottlenecks`).

## Règles d'interface

- Chaque chiffre affiche sa période (« 4 dernières semaines ») et sa variation par rapport à la période précédente.
- Les filtres (dépôt, période) vivent dans l'URL, pour partager une vue par lien.
- États gérés partout : chargement, import en cours, aucune donnée, erreur.

## Thème et mise en page

- Composants shadcn/ui, habillés avec le thème « Azure Flow » de 21st.dev (serafimcloud), repris tel quel dans `app/globals.css`. Polices Inter et JetBrains Mono (`next/font`).
- Rayons : cartes `--radius` (18 px), boutons et champs 12 px. Cartes : bordure fine et ombre légère.
- Couleurs de tendance : `--chart-3` (bleu) pour une amélioration, `--destructive` pour une dégradation, toujours avec le texte ou une flèche, jamais la couleur seule.
- Mode sombre : classe `dark` sur `<html>`, posée avant l'affichage par un court script (`lib/theme-script.ts`). Par défaut, le thème du système ; le choix fait avec l'interrupteur est retenu dans le navigateur (`localStorage`, clé `xc-theme`). Aucune dépendance ajoutée.
- Contraste : le bleu primaire `#3280ff` avec un texte blanc atteint 3,4:1, sous le seuil AA de 4,5:1 pour du texte courant ; choix assumé de la charte.
- Responsive : barre latérale à partir de 1024 px, menu en tiroir en dessous ; marges réduites sous 640 px.
