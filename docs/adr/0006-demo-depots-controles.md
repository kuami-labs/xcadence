# 0006. Démo publique : uniquement des dépôts que nous contrôlons

- Statut : acceptée
- Date : 2026-11-25
- Décideurs : Kuami (mainteneur)

## Contexte

Le plan prévoyait une démo publique « sur des dépôts open source » (docs/01-PRD.md). Un essai d'import de dépôts publics de tiers (dub, shadcn/ui, umami) avec le jeton d'une installation de l'App a montré que c'était techniquement possible, mais XCadence afficherait alors publiquement des métriques d'équipes qui ne l'ont pas demandé, sans webhooks ni accord de leur part.

## Options

1. **Dépôts publics de tiers** : démo riche tout de suite, mais données d'équipes tierces exposées sans leur accord, et un chemin d'import à part (installation désignée, propriétaire différent de l'organisation).
2. **Une de nos organisations, App installée** : les données passent par le chemin normal (installation, import, webhooks) ; seuls ses dépôts publics sont montrés.
3. **Données fictives** : aucun dépôt réel, mais une démo moins crédible.

## Décision

Nous choisissons l'option 2 : XCadence ne lit que des dépôts dont nous sommes administrateurs, c'est-à-dire là où la GitHub App est installée. L'organisation de démo est `kuami-labs`.

- `organizations.is_demo` marque l'organisation montrée, une seule à la fois (`demo:enable <organisation>`, `demo:disable`).
- `repositories.is_private` vaut `true` tant que la visibilité n'est pas connue ; elle est relevée à l'installation, à chaque import, à chaque événement et par `demo:enable`. La démo n'affiche que les dépôts publics et suivis.

## Conséquences

- Positives : aucun code d'import spécial, données toujours à jour (webhooks), aucune donnée de tiers.
- Négatives, à accepter : la démo dépend de l'activité de nos propres dépôts, plus modeste que celle de grands projets.
- À revoir si : une équipe tierce demande explicitement à figurer dans la démo (elle installe alors l'App elle-même).
