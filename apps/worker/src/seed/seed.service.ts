import { Injectable } from '@nestjs/common';
import { recomputeOrganization } from '../metrics/recompute.processor.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SEED_GITHUB_ORG_ID, SEED_ORGANIZATION_NAME, seedRepositories } from './seed-data.js';

export interface SeedResult {
  organizationId: string;
  isDemo: boolean;
  pullRequests: number;
  workflowRuns: number;
  deployments: number;
  metrics: number;
}

/**
 * Charge le jeu de test (docs/06-ENVIRONNEMENT.md) : remplace l'organisation fictive et ses
 * données, sans toucher aux autres, puis calcule ses métriques avec le code du worker.
 * Elle devient la démo publique (/demo) s'il n'y en a pas déjà une.
 */
@Injectable()
export class SeedService {
  constructor(private readonly prisma: PrismaService) {}

  async run(now = new Date()): Promise<SeedResult> {
    const db = this.prisma.client;
    // Cascade : dépôts, PR, revues, runs, déploiements et métriques du jeu précédent.
    await db.organization.deleteMany({ where: { githubOrgId: SEED_GITHUB_ORG_ID } });
    const otherDemo = await db.organization.count({ where: { isDemo: true } });
    const org = await db.organization.create({
      data: {
        githubOrgId: SEED_GITHUB_ORG_ID,
        name: SEED_ORGANIZATION_NAME,
        isDemo: otherDemo === 0,
      },
    });

    const totals = { pullRequests: 0, workflowRuns: 0, deployments: 0 };
    for (const repo of seedRepositories(now)) {
      const { id: repositoryId } = await db.repository.create({
        data: {
          organizationId: org.id,
          githubRepoId: repo.githubRepoId,
          name: repo.name,
          isPrivate: false,
          isTracked: true,
          defaultBranch: 'main',
        },
      });
      await db.pullRequest.createMany({
        // La revue part dans sa propre table.
        data: repo.pullRequests.map((pr) => {
          const row: Omit<typeof pr, 'review'> & { review?: unknown } = { ...pr };
          delete row.review;
          return { repositoryId, ...row };
        }),
      });
      const ids = new Map(
        (
          await db.pullRequest.findMany({
            where: { repositoryId },
            select: { id: true, number: true },
          })
        ).map((p) => [p.number, p.id]),
      );
      await db.review.createMany({
        data: repo.pullRequests.flatMap((pr) =>
          pr.review
            ? [{ pullRequestId: ids.get(pr.number)!, state: 'approved' as const, ...pr.review }]
            : [],
        ),
      });
      await db.workflowRun.createMany({
        data: repo.workflowRuns.map((run) => ({ repositoryId, ...run })),
      });
      await db.deployment.createMany({
        data: repo.deployments.map((d) => ({ repositoryId, ...d })),
      });
      totals.pullRequests += repo.pullRequests.length;
      totals.workflowRuns += repo.workflowRuns.length;
      totals.deployments += repo.deployments.length;
    }

    const metrics = await recomputeOrganization(this.prisma, org.id);
    return { organizationId: org.id, isDemo: org.isDemo, ...totals, metrics };
  }
}
