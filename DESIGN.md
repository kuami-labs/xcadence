# Système de design – XCadence

Ce document décrit l'interface de XCadence : ses jetons, ses composants et ses règles. Il fait foi pour toute nouvelle page ou tout nouveau composant du front (`apps/web`). L'organisation du code est dans [docs/04-FRONTEND.md](docs/04-FRONTEND.md).

## Principes

1. **Calme et précis.** Un outil que le CTO lit en cinq minutes : peu de couleurs, des chiffres lisibles, rien de décoratif qui ne serve la lecture.
2. **Les données d'abord.** Chaque chiffre affiche sa période et sa variation. Pas de jauge, de note ni de niveau inventé.
3. **Jamais de chiffre inventé.** Une information que l'API ne fournit pas ne s'affiche pas. Les exemples (landing, captures) viennent du jeu de test et le disent.
4. **L'équipe, jamais les personnes.** Aucun classement, aucune métrique ni aucun visuel par développeur.
5. **Accessible par défaut.** Contraste, clavier, lecteurs d'écran, animations réduites : prévus dès le premier jet, pas ajoutés après.

## Fondations

### Couleurs

Thème **Azure Flow** de 21st.dev (serafimcloud), repris tel quel dans `apps/web/app/globals.css`, sous forme de variables shadcn/ui. On n'écrit jamais une couleur en dur dans un composant : on utilise la classe Tailwind du jeton (`bg-primary`, `text-muted-foreground`…).

| Jeton                                     | Clair                 | Sombre                | Usage                                             |
| ----------------------------------------- | --------------------- | --------------------- | ------------------------------------------------- |
| `--background`                            | `#ffffff`             | `#171717`             | Fond de page                                      |
| `--foreground`                            | `#333333`             | `#e5e5e5`             | Texte courant                                     |
| `--card`                                  | `#ffffff`             | `#262626`             | Cartes, panneaux                                  |
| `--muted`                                 | `#f9fafb`             | `#1f1f1f`             | Fonds secondaires, en-têtes de tableau, onglets   |
| `--muted-foreground`                      | `#677184`             | `#a3a3a3`             | Texte secondaire, libellés, unités                |
| `--secondary`                             | `#f2f4f7`             | `#262626`             | Boutons secondaires, pastilles neutres, compteurs |
| `--secondary-foreground`                  | `#465468`             | `#e5e5e5`             | Texte sur `--secondary`                           |
| `--accent`                                | `#dff2ff`             | `#2b74e9`             | Mise en avant douce (bandeau de démo, état actif) |
| `--accent-foreground`                     | `#0830a0`             | `#bedbff`             | Texte sur `--accent`                              |
| `--primary`                               | `#3280ff`             | `#3280ff`             | Action principale, lien, onglet actif             |
| `--destructive`                           | `#ff3434`             | `#ff3434`             | Erreur, dégradation, retard                       |
| `--border`                                | `#e4e7ec`             | `#404040`             | Bordures et séparateurs                           |
| `--ring`                                  | `#3280ff`             | `#3280ff`             | Anneau de focus                                   |
| `--chart-1` à `--chart-5`                 | bleus                 | bleus                 | Séries de graphiques, décor de la landing         |
| `--sidebar`, `--sidebar-accent`…          | voir CSS              | voir CSS              | Barre latérale et élément actif                   |
| `--bar-current` / `--bar-past` (XCadence) | `#3280ff` / `#dff2ff` | `#5ba4ff` / `#333a47` | Barres : période affichée / semaines précédentes  |

**Sens des couleurs de tendance.** La charte n'a pas de vert : une amélioration est en `--chart-3` (bleu), une dégradation en `--destructive` (rouge). La couleur ne porte jamais l'information seule : elle s'accompagne d'une flèche, du signe et du texte (« en amélioration », lu par les lecteurs d'écran).

### Typographie

Polices chargées par `next/font` dans `app/layout.tsx` : **Inter** (texte) et **JetBrains Mono** (identifiants, axes, commandes). Chiffres en `tabular-nums` pour qu'ils restent alignés.

| Rôle                       | Taille / graisse                         | Classes                                                   |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| Titre de landing           | 34 à 56 px / 600, interlettrage −0,045em | `text-[clamp(2.1rem,7vw,3.5rem)] font-semibold`           |
| Titre de section (landing) | 26 à 36 px / 600                         | `text-[clamp(1.6rem,4.5vw,2.25rem)] font-semibold`        |
| Titre de page              | 20 px / 600                              | `text-xl font-semibold tracking-tight` (via `PageHeader`) |
| Titre de carte             | 15 px / 600                              | `text-[15px] font-semibold tracking-tight`                |
| Chiffre clé                | 28 px / 600 (24 px en grille dense)      | `text-[28px] font-semibold tracking-tight tabular-nums`   |
| Texte courant              | 14 px / 400                              | `text-sm`                                                 |
| Libellé, légende           | 12 à 13 px                               | `text-xs` / `text-[13px] text-muted-foreground`           |
| Identifiant (PR, branche)  | 13 px, mono                              | `font-mono text-[13px]`                                   |

### Rayons, bordures, ombres

- `--radius` vaut 1.15rem (18 px), l'échelle est ajustée dans `@theme inline` : cartes `rounded-xl` (18 px), boutons et champs `rounded-lg` (12 px), petits éléments `rounded-md`, pastilles `rounded-full`.
- Cartes : bordure fine (`border`) et ombre légère (`shadow-sm`, soit 0 1px 3px à 10 %). Pas d'ombre portée forte, pas de dégradé décoratif.
- Séparateurs : `border-t` / `divide-y` en `--border`. Pour une grille de cases séparées par un trait (bandeaux de chiffres), le motif `gap-px bg-border` avec des cases `bg-card` évite les bordures orphelines quand la grille passe à la ligne.

### Espacement

Grille de 4 px (échelle Tailwind). Repères : 16 px de marge latérale sur mobile, 32 px sur bureau ; 20 px entre cartes ; 24 px de padding de carte ; 28 px (pages) à 112 px (sections de landing) entre blocs.

### Logo

Le X de XCadence, fait de deux chevrons de code qui se font face (`><`). Fichiers, construction, couleurs et règles d'usage : [docs/brand/](docs/brand/README.md). Dans l'interface, toujours le composant `Logo` / `LogoSymbol` (version petite taille, couleurs `--logo-1`, `--logo-2` et `--logo-word`, clair et sombre) ; jamais une image recolorée. Favicon : la tuile bleue.

### Icônes

[Lucide](https://lucide.dev) (`lucide-react`), trait de 2 px, 16 px dans la navigation et les boutons, 14 px dans les tendances. Décoratives : `aria-hidden`. Bouton icône seul : `aria-label` obligatoire. Pas d'emoji dans l'interface.

## Mise en page

- **Groupes de routes** (sans effet sur les URL) : `(app)` pour l'application et la démo, avec la barre latérale ; `(focus)` pour la connexion et l'installation, avec un en-tête simple ; `/` pour la landing.
- **Barre latérale** (`components/shell/sidebar.tsx`) : 240 px à partir de 1024 px ; en dessous, barre du haut et menu en tiroir (Dialog de Base UI : focus piégé, Échap).
- **Page** : `PageHeader` (titre, contexte, filtres, séparé par un trait), puis `PageBody` (largeur max 1152 px, centré) ; `PageState` pour un état à la place du contenu.
- **Points de rupture** : `sm` 640 px (marges), `md` 768 px (menu de la landing, réglages sur deux colonnes), `lg` 1024 px (barre latérale, grilles à 4 colonnes).

## Composants

Composants shadcn/ui (sur Base UI) dans `components/ui/`, habillés par les jetons. Composants XCadence :

| Composant                             | Fichier                                        | Usage                                                                   |
| ------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| `PageHeader`, `PageBody`, `PageState` | `components/page-header.tsx`                   | Structure de toute page de l'application                                |
| `ClientPage`                          | `components/client-page.tsx`                   | Page lue avec la session : rendue après l'hydratation                   |
| `MetricsPanel`                        | `components/dashboard/metrics-panel.tsx`       | Métriques en onglets et graphique de la métrique choisie                |
| `MetricFigure`                        | idem                                           | Libellé, valeur, unité et tendance d'une métrique                       |
| `WeeklyBars`                          | idem                                           | Une métrique semaine par semaine (recharts), période en `--bar-current` |
| `BottlenecksSummary`                  | `components/dashboard/bottlenecks-summary.tsx` | Goulots en bref                                                         |
| `SettingsSection`                     | `components/settings/settings-section.tsx`     | Réglage : explication à gauche, carte à droite                          |
| `Logo`, `LogoSymbol`                  | `components/logo.tsx`                          | Logo à chevrons (docs/brand) : symbole seul ou avec le nom              |
| `ThemeButton`, `ThemeSwitch`          | `components/theme-toggle.tsx`                  | Bascule de thème (en-têtes simples, barre latérale)                     |
| `DemoBanner`                          | `components/demo-banner.tsx`                   | Rappel de la démo publique en lecture seule                             |

### Motifs

- **Bouton** : `Button` ou, pour un lien, `buttonVariants()` sur un `<a>` / `Link`. Une seule action principale (`default`) par zone ; les autres en `secondary`, `outline` ou `ghost`.
- **Onglets** : boutons `role="tab"` avec `aria-selected` ; l'onglet actif est souligné par un trait de 2 px en `--primary`.
- **Bouton segmenté** (période) : fond `--secondary`, option choisie en `bg-card` avec ombre, `aria-pressed`.
- **Pastille** : `rounded-full px-2 py-0.5 text-xs font-medium`, en `--accent` (positif, actif), `--secondary` (neutre) ou bordure seule (inactif).
- **Tableau** : en-tête sur `--muted`, chiffres alignés à droite en `tabular-nums`, défilement horizontal dans sa carte sur mobile (`min-w-[560px]`).
- **Graphique** : barres arrondies en haut (6 px), grille horizontale en pointillés, axes en mono, valeurs au format français, info-bulle « Semaine du … ».
- **Lien dans le texte** : `font-medium text-primary hover:underline`.

## États

Chaque vue gère les quatre états de docs/04 : **chargement** (« Chargement… »), **import en cours** (indicateur animé et texte), **vide** (message qui dit quoi faire, avec un lien) et **erreur** (`role="alert"`, en `--destructive`, avec la marche à suivre). Un état remplace le contenu dans un `PageState` en pointillés, ou s'affiche à sa place dans une carte.

## Mode sombre

- Classe `dark` sur `<html>`, posée avant l'affichage par `lib/theme-script.ts` : pas de flash. Par défaut, le thème du système ; le choix de l'utilisateur est retenu (`localStorage`, clé `xc-theme`).
- Tout composant utilise les jetons : il fonctionne dans les deux thèmes sans `dark:` explicite. Exception tolérée : atténuer un fond trop vif en sombre (`dark:bg-accent/20`).
- Toute nouvelle vue se vérifie dans les deux thèmes.

## Mouvement

- Transitions courtes (200 à 300 ms) : en-tête de la landing, tiroir, onglets.
- Décor 3D de la landing (`components/landing/hero-scene.tsx`) en CSS seul, masqué aux lecteurs d'écran.
- Tout mouvement s'arrête avec `prefers-reduced-motion` (`motion-safe:`, `motion-reduce:`).

## Accessibilité

- Contraste du texte de 4,5:1 au moins. Exception connue et assumée : texte blanc sur `--primary` (`#3280ff`), à 3,4:1.
- Tout est utilisable au clavier, avec un anneau de focus visible (`focus-visible:ring-3 ring-ring/50`).
- Vrais éléments : `<button>`, `<a href>`, `<label>` lié à son champ ; jamais un `onClick` sur un `div`.
- Graphiques : `role="img"` et `aria-label` qui résume la tendance ; les valeurs restent lisibles dans l'info-bulle et les onglets.
- Zones tactiles de 36 à 44 px sur mobile.

## Contenu

- Français, phrases courtes et concrètes ; on écrit ce que l'utilisateur obtient, pas ce que fait le code.
- Chiffres au format français (`7,9`, `18,5 h`, `−21 %` avec le vrai signe moins), toujours avec leur unité et leur période.
- Pas de faux clients, témoignages ni statistiques marketing.

## Pièges connus

- `buttonVariants({ className })` concatène les classes sans les fusionner : `hidden` ne l'emporte pas sur le `inline-flex` du bouton. Pour masquer un bouton selon la largeur, l'envelopper (`<span className="hidden sm:contents">`).
- Une page qui lit l'API avec la session passe par `ClientPage` : sinon une requête partagée avec la barre latérale peut finir avant l'hydratation et ne plus correspondre au HTML du serveur.
- `useSearchParams` impose une `Suspense` autour du composant.

## Ajouter un écran

1. Partir de `PageHeader` / `PageBody` et des composants ci-dessus ; un nouveau composant générique va dans `components/`, documenté ici.
2. N'afficher que des données servies par l'API.
3. Vérifier en clair et en sombre, à 390 px et sur bureau, au clavier.
4. Mettre à jour ce document si un jeton, un composant ou une règle change.
