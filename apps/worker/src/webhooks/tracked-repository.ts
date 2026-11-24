import type { PrismaService } from '../prisma/prisma.service.js';

/** Dépôt suivi correspondant à un identifiant GitHub ; null s'il est inconnu ou non suivi. */
export async function trackedRepository(prisma: PrismaService, githubRepoId: number) {
  const repo = await prisma.client.repository.findUnique({
    where: { githubRepoId: BigInt(githubRepoId) },
  });
  return repo?.isTracked ? repo : null;
}
