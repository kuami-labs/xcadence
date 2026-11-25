import type { PrismaClient } from './generated/prisma/client.js';

/**
 * Pour les tests d'intégration : tient un verrou consultatif PostgreSQL jusqu'à l'appel de la
 * fonction retournée. Sérialise les tests qui modifient ou parcourent un état global de la base,
 * même entre paquets lancés en parallèle (API et worker en CI).
 */
export async function holdTestLock(
  client: PrismaClient,
  name: string,
): Promise<() => Promise<void>> {
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  let acquired!: () => void;
  const ready = new Promise<void>((resolve) => (acquired = resolve));
  const transaction = client.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${name}))`;
      acquired();
      await released;
    },
    { maxWait: 60_000, timeout: 10 * 60_000 },
  );
  // Échec avant l'obtention du verrou : l'erreur remonte au lieu d'attendre indéfiniment.
  await Promise.race([ready, transaction]);
  return async () => {
    release();
    await transaction;
  };
}

/**
 * Nom du verrou des tests qui touchent un état global de la base : `organizations.is_demo`, le jeu
 * de test (suppression en cascade) ou le passage nocturne sur toutes les organisations.
 */
export const GLOBAL_TEST_LOCK = 'xcadence:test:global';
