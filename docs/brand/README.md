# Logo XCadence

<p>
  <img src="png/xcadence-logo-horizontal-1200.png" alt="Logo XCadence" width="480">
</p>

## L'idée

Quatre facettes, les **4 métriques DORA**, éclairées du haut comme un bloc en relief. Le creux qui les sépare dessine le **X** ; la facette de droite, creusée d'un arc, forme le **C** : XC, les initiales de XCadence. Le symbole est déjà une icône d'app : plein, carré, lisible à 16 px.

## Construction

- Grille de 256 ; carré de 224 (marge de 16), coins de rayon 56.
- Trouée en X de 20 de large, à 45° exactement.
- C : morsure de rayon 48 et dos de rayon 84, centrés sur le milieu du bord droit.
- **Version petite taille** (`symbole-petit`), pour 48 px et moins : trouée de 32, morsure de 50, dos de 82. C'est elle qu'utilisent le favicon et l'interface.
- Nom : Inter Bold (licence OFL), interlettrage −3,5 %, paire « XC » resserrée à la main, **vectorisé** : aucun fichier ne dépend d'une police installée.

## Couleurs

Les bleus du thème Azure Flow (voir [DESIGN.md](../../DESIGN.md)).

| Facette    | Sur fond clair | Sur fond sombre |
| ---------- | -------------- | --------------- |
| Haut       | `#5ba4ff`      | `#bedbff`       |
| Droite (C) | `#115cff`      | `#3280ff`       |
| Bas        | `#0830a0`      | `#115cff`       |
| Gauche     | `#3280ff`      | `#5ba4ff`       |
| Nom        | `#0b1220`      | `#ffffff`       |

Versions une couleur : bleu `#3280ff` (`mono`), noir, blanc. Le X et le C y restent lisibles : ils sont faits de vides, pas de couleurs.

## Fichiers

| Fichier (`svg/`)                      | Usage                                                    |
| ------------------------------------- | -------------------------------------------------------- |
| `xcadence-logo-horizontal-*.svg`      | Logo principal : en-têtes, documents, README             |
| `xcadence-logo-empile-*.svg`          | Formats carrés ou étroits                                |
| `xcadence-symbole-*.svg`              | Symbole seul, quand le nom est déjà présent ou implicite |
| `xcadence-symbole-petit-*.svg`        | Symbole à 48 px et moins (favicon, interface)            |
| `xcadence-mot-*.svg`                  | Nom seul, quand le symbole est déjà présent              |
| `xcadence-icone-app-clair/sombre.svg` | Icône d'app (iOS, Android, PWA) : fond plein, zone sûre  |

Déclinaisons : `color` (fond clair), `dark` (fond sombre), `mono`, `black`, `white`. Les PNG de `png/` (symbole de 16 à 1024 px, icônes d'app de 180 à 1024 px, logos en 1200 px) et `xcadence-favicon.ico` (16, 32, 48 px) en sont tirés.

Dans l'application : `apps/web/components/logo.tsx` (couleurs `--logo-1` à `--logo-4` et `--logo-word` dans `globals.css`, clair et sombre), `apps/web/app/icon.svg`, `favicon.ico` et `apple-icon.png`.

## Règles d'usage

- **Zone de protection** : autour du logo, un espace libre égal au quart de la hauteur du symbole.
- **Tailles minimales** : symbole 16 px (version petite taille sous 48 px) ; logo horizontal 120 px de large ; logo empilé 64 px de large.
- **Fonds** : blanc ou très clair avec la version `color` ; fond sombre (`#171717`, `#0b1220`) avec `dark` ; photo ou couleur vive avec `white` ou `black`.
- **À ne pas faire** : changer les couleurs ou leur ordre (la lumière vient du haut), recolorer une seule facette, ajouter ombre, contour ou dégradé, déformer, faire pivoter, recomposer le nom dans une autre police, poser le logo couleur sur un fond bleu.

## Limites

Aucune recherche d'antériorité n'a été faite : avant tout dépôt de marque, faire une recherche professionnelle (bases de marques, recherche d'image inversée).
