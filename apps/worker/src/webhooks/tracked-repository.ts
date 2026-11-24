import type { PrismaService } from '../prisma/prisma.service.js';

/** Dépôt tel que décrit par un événement GitHub. */
export interface EventRepository {
  id: number;
  private?: boolean;
}

/**
 * Dépôt suivi correspondant à un dépôt d'événement ; null s'il est inconnu ou non suivi.
 * Met au passage sa visibilité à jour : un dépôt passé en privé disparaît aussitôt de la démo.
 */
export async function trackedRepository(prisma: PrismaService, repository: EventRepository) {
  const repo = await prisma.client.repository.findUnique({
    where: { githubRepoId: BigInt(repository.id) },
  });
  if (!repo?.isTracked) return null;
  if (typeof repository.private === 'boolean' && repository.private !== repo.isPrivate) {
    return prisma.client.repository.update({
      where: { id: repo.id },
      data: { isPrivate: repository.private },
    });
  }
  return repo;
}
