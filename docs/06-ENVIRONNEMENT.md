# Environnement de développement – XCadence

> Objectif : n'importe quel contributeur clone le dépôt, l'ouvre dans VS Code et lance toute la stack **en 15 minutes**, sur macOS, Windows ou Linux.
> Décision correspondante : [ADR 0001 – Dev container](adr/0001-dev-container.md).

## Le principe

L'environnement est **du code**, versionné avec le projet. Un contributeur n'installe que **Docker** et **VS Code** ; tout le reste vient du dépôt.

| Fichier                           | Décrit                                                        |
| --------------------------------- | ------------------------------------------------------------- |
| `.devcontainer/Dockerfile`        | le système et les outils du poste de travail                  |
| `.devcontainer/devcontainer.json` | comment VS Code s'y attache : extensions, réglages, commandes |
| `compose.yaml`                    | les services : PostgreSQL, Redis, Mailpit, Ollama (optionnel) |
| `.env.example`                    | les variables d'environnement, sans secret                    |

## Parité dev / prod

|                      | Dev                             | Prod                                |
| -------------------- | ------------------------------- | ----------------------------------- |
| Système              | Debian trixie                   | Debian trixie                       |
| Node                 | 24                              | 24                                  |
| PostgreSQL           | 17                              | 17                                  |
| Redis                | 7                               | 7                                   |
| Configuration        | fichier `.env` local            | variables d'environnement (Coolify) |
| GitHub App           | une App de dev par contributeur | l'App officielle                    |
| Données              | jeu de test (`db/seed`)         | réelles                             |
| Résumé IA            | Ollama, ou fournisseur factice  | fournisseur choisi par l'instance   |
| Emails               | Mailpit (rien ne part)          | Resend ou SMTP                      |
| Rechargement à chaud | oui                             | non                                 |

Les cinq premières lignes sont **identiques**. Les autres diffèrent **exprès**.

## Prérequis

Sur votre machine, et rien d'autre :

| Outil                                                    | Version | Remarque                                                    |
| -------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| Docker Desktop (macOS, Windows) ou Docker Engine (Linux) | récente | au moins 6 Go de mémoire alloués à Docker                   |
| VS Code + extension **Dev Containers**                   | récente |                                                             |
| git, configuré **sur la machine**                        |         | nom, e-mail, clé SSH : VS Code les relaie dans le conteneur |

> **Sous Windows** : activez le moteur **WSL 2** de Docker Desktop et clonez le projet **dans WSL** (par exemple `~/projets`, depuis un terminal Ubuntu), jamais dans `C:\`. PostgreSQL refuse souvent de démarrer sur `C:\`, et l'accès aux fichiers y est beaucoup plus lent.

## Démarrer en 5 étapes

1. Forkez le dépôt sur GitHub (contributeurs externes), ou clonez-le directement (mainteneurs) :
   ```bash
   git clone git@github.com:VOTRE-COMPTE/xcadence.git
   ```
2. Ouvrez le dossier dans VS Code, puis **F1** → **Dev Containers: Reopen in Container**. Le premier build prend quelques minutes.
3. À la création, le conteneur installe les dépendances et copie `.env.example` en `.env`. Renseignez les variables de votre GitHub App de dev dans `.env` ([voir plus bas](#la-github-app-de-développement)).
4. Dans le terminal de VS Code :
   ```bash
   pnpm db:migrate      # crée les tables
   pnpm db:seed         # charge le jeu de test
   pnpm dev             # lance api, worker et web
   ```
5. Ouvrez http://localhost:3000 (web). L'API répond sur http://localhost:4000/health.

## Les fichiers

```text
xcadence/
├── .devcontainer/
│   ├── Dockerfile
│   └── devcontainer.json
├── apps/            # api, worker, web
├── packages/        # db (Prisma), shared
├── db/
│   └── data/        # données PostgreSQL locales, ignorées par git
├── compose.yaml
├── .env.example
├── .gitattributes
└── .gitignore
```

### .devcontainer/Dockerfile

```dockerfile
# Même base que l'image de production : Node 24 sur Debian trixie
FROM mcr.microsoft.com/devcontainers/typescript-node:24-trixie

# Client PostgreSQL 17 (psql), comme le serveur
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# pnpm, à la version fixée dans package.json (champ packageManager)
RUN corepack enable
```

### .devcontainer/devcontainer.json

```json
{
  "name": "XCadence",
  "dockerComposeFile": ["../compose.yaml"],
  "service": "dev",
  "workspaceFolder": "/workspace",
  "shutdownAction": "stopCompose",
  "remoteUser": "node",

  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },

  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "prisma.prisma",
        "bradlc.vscode-tailwindcss",
        "github.vscode-pull-request-github"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
      }
    }
  },

  // web, api, Mailpit, et PostgreSQL pour un client graphique
  "forwardPorts": [3000, 4000, "mailpit:8025", "db:5432"],

  // Une fois, à la création : dépendances et .env local (jamais écrasé)
  "postCreateCommand": "git config --global --add safe.directory /workspace && (test -f pnpm-lock.yaml && pnpm install --frozen-lockfile || true) && (test -f .env || cp .env.example .env)"
}
```

| Clé                            | Rôle                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| `dockerComposeFile`, `service` | la stack à démarrer, et le service auquel VS Code s'attache  |
| `features`                     | la CLI GitHub (`gh`), sans toucher au Dockerfile             |
| `customizations`               | les mêmes extensions et réglages pour tous les contributeurs |
| `forwardPorts`                 | les ports accessibles depuis votre navigateur                |
| `postCreateCommand`            | installe les dépendances et crée le `.env`, une seule fois   |

### compose.yaml

```yaml
# Stack de développement. Versions figées : les mêmes qu'en production.
name: xcadence

services:
  # Le poste de travail : VS Code s'y attache, on y lance api, worker et web
  dev:
    build:
      context: .
      dockerfile: .devcontainer/Dockerfile
    command: sleep infinity
    # Les commandes « docker compose exec dev … » tournent comme dans VS Code
    user: node
    working_dir: /workspace
    # web et API joignables depuis la machine hôte (navigateur), même sans VS Code
    ports:
      - 127.0.0.1:3000:3000
      - 127.0.0.1:4000:4000
    volumes:
      - .:/workspace:cached
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:17
    environment:
      POSTGRES_USER: xcadence
      POSTGRES_PASSWORD: xcadence
      POSTGRES_DB: xcadence
    volumes:
      # Données dans un dossier du projet, ignoré par git : elles survivent aux Rebuild
      - ./db/data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U xcadence -d xcadence']
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 10

  # Capture tous les emails envoyés en dev : http://localhost:8025
  mailpit:
    image: axllent/mailpit

  # IA locale en conteneur, optionnelle : docker compose --profile ollama up -d
  ollama:
    image: ollama/ollama
    profiles: [ollama]
    volumes:
      - ollama-data:/root/.ollama

volumes:
  ollama-data:
```

- **Le nom du service est le nom d'hôte** : depuis `dev`, la base est `db:5432`, Redis `redis:6379`, Mailpit `mailpit:1025`.
- **Identifiants de dev** (`xcadence` / `xcadence`) : ce ne sont pas des secrets.
- **`healthcheck` + `depends_on`** : le poste de travail attend que la base et Redis soient prêts.
- **`profiles: [ollama]`** : Ollama ne démarre qu'à la demande ; les autres contributeurs n'en paient pas le prix.
- Avant la première release, figez chaque image sur une version précise (`redis:7.x`, `axllent/mailpit:vX`, `ollama/ollama:X`), comme `postgres:17`.

### .env.example

```bash
# Copié en .env à la création du conteneur. Le .env n'est JAMAIS commité.

# Base et file de jobs (services du compose.yaml)
DATABASE_URL=postgres://xcadence:xcadence@db:5432/xcadence
REDIS_URL=redis://redis:6379

# Ports
API_PORT=4000
WEB_URL=http://localhost:3000

# Session : générez une valeur avec `openssl rand -hex 32`
SESSION_SECRET=

# GitHub App de développement (une par contributeur)
GITHUB_APP_ID=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_APP_PRIVATE_KEY_PATH=./.secrets/github-app.pem
# Nom de la GitHub App dans son adresse (github.com/apps/NOM) : lien d'installation de l'onboarding
GITHUB_APP_SLUG=
GITHUB_WEBHOOK_SECRET=

# Résumé IA : fake | openai | anthropic (ADR 0004)
SUMMARY_PROVIDER=fake
# openai : toute API compatible OpenAI (Ollama, Groq, OpenRouter, Gemini…)
# 1. Ollama installé sur votre machine
# AI_BASE_URL=http://host.docker.internal:11434/v1
# 2. Ollama en conteneur (profil ollama)
# AI_BASE_URL=http://ollama:11434/v1
# 3. API gratuite en ligne : son adresse compatible OpenAI et votre clé
# AI_BASE_URL=
# AI_API_KEY=
# AI_MODEL=llama3.2:1b
# anthropic : API Claude (plus tard)
# ANTHROPIC_API_KEY=

# Emails (ADR 0005) : Mailpit en dev, rien ne part (http://localhost:8025)
SMTP_HOST=mailpit
SMTP_PORT=1025
# Production avec Resend : SMTP_HOST=smtp.resend.com, SMTP_PORT=465, SMTP_USER=resend, SMTP_PASSWORD=<clé API Resend>
# SMTP_USER=
# SMTP_PASSWORD=
MAIL_FROM=XCadence <resume@xcadence.local>
# Adresse publique de l'API, pour le lien de désinscription des emails
API_URL=http://localhost:4000
```

- `SUMMARY_PROVIDER=fake` renvoie un résumé fixe : **aucun modèle ni aucune clé n'est nécessaire pour contribuer**.
- Le dossier `.secrets/` et le fichier `.env` sont dans `.gitignore`.

### .gitattributes et .gitignore

```text
# .gitattributes : fins de ligne LF pour tous, même sous Windows
* text=auto eol=lf
```

```text
# .gitignore
node_modules/
dist/
.next/
.turbo/
.env
.secrets/
db/data/
coverage/
next-env.d.ts
*.tsbuildinfo

# Consignes pour assistants IA générées par les frameworks (next dev les recrée)
apps/*/AGENTS.md
apps/*/CLAUDE.md

# Réglages personnels de Claude Code
.claude/settings.local.json
CLAUDE.local.md
```

## La GitHub App de développement

Chaque contributeur crée **sa propre** GitHub App de test (avec Claude Desktop : demandez à Claude de la créer dans le navigateur intégré, en suivant ce tableau ; vous restez seul à valider la connexion à GitHub), installée sur un dépôt ou une organisation de test. Elle ne touche jamais aux données des autres.

1. Sur github.com : **Settings** → **Developer settings** → **GitHub Apps** → **New GitHub App**.
2. Renseignez :

| Champ                       | Valeur                                                                           |
| --------------------------- | -------------------------------------------------------------------------------- |
| GitHub App name             | `kuami-labs-VOTRE-PSEUDO`                                                        |
| Homepage URL                | `http://localhost:3000`                                                          |
| Callback URL                | `http://localhost:4000/auth/github/callback`                                     |
| Webhook URL                 | l'URL publique de votre tunnel (voir ci-dessous) + `/webhooks/github`            |
| Webhook secret              | une valeur aléatoire, à recopier dans `GITHUB_WEBHOOK_SECRET`                    |
| Permissions (lecture seule) | Metadata, Pull requests, Actions, Deployments, Contents (lecture)                |
| Événements                  | Pull request, Pull request review, Deployment status, Workflow run, Installation |

3. Générez une **clé privée**, placez-la dans `.secrets/github-app.pem`.
4. Installez l'App sur un dépôt de test qui contient quelques PR.

**Recevoir les webhooks en local** : GitHub ne peut pas joindre `localhost`. Utilisez un relais, par exemple [smee.io](https://smee.io) (`pnpm dlx smee-client --url https://smee.io/VOTRE-CANAL --target http://localhost:4000/webhooks/github`).

> Vous travaillez sur le front ou sur les calculs de métriques ? `pnpm db:seed` suffit : les données de test remplacent GitHub, sans App ni webhook.

## Accéder aux services

| Service    | Depuis le conteneur     | Depuis votre machine                                           |
| ---------- | ----------------------- | -------------------------------------------------------------- |
| Web        | `http://localhost:3000` | `http://localhost:3000`                                        |
| API        | `http://localhost:4000` | `http://localhost:4000`                                        |
| PostgreSQL | `psql $DATABASE_URL`    | TablePlus, DBeaver : `127.0.0.1:5432`, `xcadence` / `xcadence` |
| Mailpit    | `mailpit:1025` (SMTP)   | `http://localhost:8025`                                        |

Web et API sont publiés sur `127.0.0.1` par `compose.yaml` : ils sont joignables depuis le navigateur même sans VS Code (Claude Desktop en session WSL). Si un port est déjà pris sur votre machine, changez le port de gauche dans `compose.yaml`.

## pnpm

Le projet utilise **pnpm** exclusivement, jamais npm ni yarn.

- La version est figée dans le `package.json` racine, champ `packageManager` (par exemple `"packageManager": "pnpm@10.x.x"`). **Corepack**, activé dans le Dockerfile, installe automatiquement cette version : tout le monde a la même.
- Les workspaces sont déclarés dans `pnpm-workspace.yaml` :
  ```yaml
  packages:
    - 'apps/*'
    - 'packages/*'
  ```
- `pnpm-lock.yaml` est commité ; à la création du conteneur, `pnpm install --frozen-lockfile` installe exactement ces versions.

| Au lieu de…                       | Utilisez…                                           |
| --------------------------------- | --------------------------------------------------- |
| `npm install`                     | `pnpm install`                                      |
| `npm install -D paquet` (racine)  | `pnpm add -D -w paquet`                             |
| `npm install paquet` dans une app | `pnpm --filter @xcadence/api add paquet`            |
| `npm run script`                  | `pnpm script`                                       |
| `npx outil`                       | `pnpm dlx outil` (ou `pnpm exec` s'il est installé) |
| `npm ci`                          | `pnpm install --frozen-lockfile`                    |

## Lancer les commandes depuis l'extérieur du conteneur

Claude Code (application desktop, session WSL) et tout terminal Ubuntu lancent les commandes du projet **dans le conteneur** avec `docker compose exec` :

```bash
docker compose ps                       # le service dev tourne-t-il ?
docker compose up -d                    # sinon, démarrer la stack
docker compose exec dev pnpm test       # toute commande projet passe par « exec dev »
```

Ainsi, le Node, pnpm et `psql` utilisés sont toujours ceux du conteneur.

## Commandes utiles

| Commande                    | Effet                                              |
| --------------------------- | -------------------------------------------------- |
| `pnpm dev`                  | lance api, worker et web avec rechargement à chaud |
| `pnpm build`                | compile tout, comme la CI                          |
| `pnpm test`                 | tests unitaires et d'intégration                   |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                                  |
| `pnpm db:migrate`           | applique les migrations Prisma                     |
| `pnpm db:seed`              | charge le jeu de test                              |
| `pnpm db:reset`             | vide la base, rejoue migrations et seed            |
| `pnpm db:studio`            | interface Prisma Studio                            |

## Vérifier l'environnement

```bash
node -v          # v24…
pnpm -v          # version de packageManager
psql --version   # 17…
psql $DATABASE_URL -c "SELECT 1"
redis-cli -u $REDIS_URL ping     # PONG (si redis-tools est installé)
curl http://localhost:4000/health   # {"status":"ok","db":"ok","redis":"ok"}
```

## Repartir de zéro

| Besoin                             | Action                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Base cassée ou schéma modifié      | `pnpm db:reset`                                                                                                 |
| Supprimer complètement les données | **Reopen Folder Locally**, supprimez `db/data` (`sudo rm -rf db/data` sous Linux), puis **Reopen in Container** |
| Dev container modifié              | **F1** → **Dev Containers: Rebuild Container**                                                                  |

## Les pièges multi-OS

| Piège                                           | Parade                                                          |
| ----------------------------------------------- | --------------------------------------------------------------- |
| Windows écrit des fins de ligne CRLF            | `.gitattributes` : `* text=auto eol=lf`, dès le premier commit  |
| Projet cloné dans `C:\` sous Windows            | le cloner dans WSL                                              |
| Mac Apple Silicon (arm64) et PC (amd64)         | des images multi-architectures ; jamais `platform: linux/amd64` |
| Modules natifs compilés pour le mauvais système | `pnpm install` **toujours dans le conteneur**                   |
| Versions de dépendances qui divergent           | `pnpm-lock.yaml` commité, `pnpm install --frozen-lockfile`      |
| Hook `pre-commit` qui échoue depuis WSL         | le conteneur `dev` doit tourner : `docker compose up -d`        |

## Dépannage

| Symptôme                        | Parade                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Le conteneur ne démarre pas     | **F1** → **Dev Containers: Show Container Log**                                                             |
| Conteneurs en conflit           | supprimez-les dans Docker Desktop, puis **Rebuild Container**                                               |
| `Author identity unknown`       | configurez git sur votre machine, puis **Rebuild Container**                                                |
| `Permission denied (publickey)` | sur votre machine, `ssh-add -l` doit lister votre clé ; sinon `ssh-add`                                     |
| Webhooks non reçus              | vérifiez le relais smee, l'URL et le secret de votre GitHub App                                             |
| Tout est cassé                  | `docker system prune -a --volumes` (supprime **toutes** les données Docker locales), puis redémarrez Docker |
