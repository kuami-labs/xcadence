import { existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// .env à la racine du monorepo (docs/06-ENVIRONNEMENT.md), s'il existe.
// Importé en premier par main.ts : en ESM, les imports s'exécutent avant le corps du module.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const envFile = resolve(root, '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

// Chemin relatif de la clé (./.secrets/…) : relatif à la racine, quel que soit le dossier courant
// (pnpm dev et pnpm --filter lancent le worker depuis apps/worker).
const keyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH;
if (keyPath && !isAbsolute(keyPath)) {
  process.env.GITHUB_APP_PRIVATE_KEY_PATH = resolve(root, keyPath);
}
