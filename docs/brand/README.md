# Logo XCadence

<p>
  <img src="png/xcadence-logo-horizontal-1200.png" alt="Logo XCadence" width="480">
</p>

## L'idée

Le **X** de XCadence, fait de deux **chevrons de code** qui se font face : `><`. Une lettre-symbole qui porte le nom et parle aux équipes de développement. Traits épais à bouts ronds : présent, doux, net en petit.

## Construction

- Grille de 256. Chaque chevron : un trait de 46 d'épaisseur, bras de 52 × 80 (pente de 1,54), bouts et sommet arrondis (rayon 23), angle intérieur net. Les deux chevrons sont symétriques autour de l'axe vertical.
- Sommets à 58 l'un de l'autre : 12 d'écart entre les chevrons. Emprise : 206 × 206, centrée.
- **Version petite taille** (`symbole-petit`), pour 48 px et moins : sommets à 68, soit 22 d'écart, pour que les chevrons ne se touchent pas.
- **Tuile** (`tuile`) : la version petite taille en blanc et bleu clair sur un carré bleu à coins de 56, chevrons à 70 % ; c'est le favicon et l'icône des onglets, lisible sur un fond clair comme sombre.
- Nom : Inter Bold (licence OFL), interlettrage −3,5 %, paire « XC » resserrée à la main, **vectorisé** : aucun fichier ne dépend d'une police installée.

## Couleurs

Les bleus du thème Azure Flow (voir [DESIGN.md](../../DESIGN.md)).

| Élément           | Sur fond clair | Sur fond sombre | Sur la tuile |
| ----------------- | -------------- | --------------- | ------------ |
| Chevron de gauche | `#3280ff`      | `#5ba4ff`       | `#ffffff`    |
| Chevron de droite | `#0830a0`      | `#bedbff`       | `#bedbff`    |
| Fond de la tuile  |                |                 | `#3280ff`    |
| Nom               | `#0b1220`      | `#ffffff`       |              |

Versions une couleur : bleu `#3280ff` (`mono`), noir, blanc.

## Fichiers

| Fichier (`svg/`)                      | Usage                                                    |
| ------------------------------------- | -------------------------------------------------------- |
| `xcadence-logo-horizontal-*.svg`      | Logo principal : en-têtes, documents, README             |
| `xcadence-logo-empile-*.svg`          | Formats carrés ou étroits                                |
| `xcadence-symbole-*.svg`              | Symbole seul, quand le nom est déjà présent ou implicite |
| `xcadence-symbole-petit-*.svg`        | Symbole à 48 px et moins (interface)                     |
| `xcadence-mot-*.svg`                  | Nom seul, quand le symbole est déjà présent              |
| `xcadence-tuile.svg`                  | Favicon, onglets, avatars                                |
| `xcadence-icone-app-clair/sombre.svg` | Icône d'app (iOS, Android, PWA) : fond plein, zone sûre  |

Déclinaisons : `color` (fond clair), `dark` (fond sombre), `mono`, `black`, `white`. Les PNG de `png/` (symbole de 64 à 1024 px, tuile de 16 à 64 px, icônes d'app de 180 à 1024 px, logos en 1200 px) et `xcadence-favicon.ico` (16, 32, 48 px) en sont tirés.

Dans l'application : `apps/web/components/logo.tsx` (couleurs `--logo-1`, `--logo-2` et `--logo-word` dans `globals.css`, clair et sombre), `apps/web/app/icon.svg` (la tuile), `favicon.ico` et `apple-icon.png`.

## Règles d'usage

- **Zone de protection** : autour du logo, un espace libre égal au quart de la hauteur du symbole.
- **Tailles minimales** : symbole 16 px (version petite taille ou tuile sous 48 px) ; logo horizontal 120 px de large ; logo empilé 64 px de large.
- **Fonds** : blanc ou très clair avec la version `color` ; fond sombre (`#171717`, `#0b1220`) avec `dark` ; photo ou couleur vive avec `white` ou `black`, ou la tuile.
- **À ne pas faire** : inverser les couleurs des chevrons, coller ou écarter les chevrons, changer leur angle, les faire pivoter (le X deviendrait `<>`), ajouter ombre, contour ou dégradé, recomposer le nom dans une autre police, poser la version `color` sur un fond bleu.

## Limites

Aucune recherche d'antériorité n'a été faite : avant tout dépôt de marque, faire une recherche professionnelle (bases de marques, recherche d'image inversée).
