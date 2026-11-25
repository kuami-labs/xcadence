import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JOBS, QUEUES, type RecomputeWeeklyMetricsJob } from '@xcadence/shared';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { organizationMetrics } from './organization-metrics.js';
import { ReportedWorkerHost } from '../observability/reported-worker-host.js';

/**
 * recompute-weekly-metrics (docs/03-BACKEND.md) : recalcule weekly_metrics d'une organisation,
 * ou de toutes chaque nuit ; le passage nocturne purge aussi les sessions expirées (ADR 0003).
 * Idempotent : les métriques de l'organisation sont remplacées dans une transaction.
 */
@Processor(QUEUES.metrics)
export class RecomputeProcessor extends ReportedWorkerHost {
  private readonly logger = new Logger(RecomputeProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(
    job: Job<RecomputeWeeklyMetricsJob>,
  ): Promise<{ organizations: number; rows: number }> {
    if (job.name !== JOBS.recomputeWeeklyMetrics) {
      throw new Error(`Job inconnu : ${job.name}`);
    }
    const organizationIds = job.data.organizationId
      ? [job.data.organizationId]
      : (await this.prisma.client.organization.findMany({ select: { id: true } })).map((o) => o.id);

    // Recalcul ciblé : une erreur fait échouer le job, que BullMQ réessaie.
    if (job.data.organizationId) {
      return { organizations: 1, rows: await this.recompute(job.data.organizationId) };
    }

    // Passage nocturne : l'échec d'une organisation (interblocage avec une désinstallation en
    // cours, par exemple) n'empêche ni les autres ni la purge des sessions ; le job est marqué en
    // échec à la fin, et donc signalé, sans données ni identifiant de l'organisation.
    let rows = 0;
    let failures = 0;
    for (const organizationId of organizationIds) {
      try {
        rows += await this.recompute(organizationId);
      } catch (error) {
        failures++;
        this.logger.error(
          `Passage nocturne : recalcul d'une organisation en échec : ${(error as Error).message}`,
        );
      }
    }
    const { count } = await this.prisma.client.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    this.logger.log(
      `Passage nocturne : ${organizationIds.length} organisations, ${count} sessions expirées purgées`,
    );
    if (failures > 0) {
      throw new Error(
        `Passage nocturne : ${failures} organisation(s) en échec sur ${organizationIds.length}`,
      );
    }
    return { organizations: organizationIds.length, rows };
  }

  recompute(organizationId: string): Promise<number> {
    return recomputeOrganization(this.prisma, organizationId);
  }
}

/**
 * Remplace les métriques hebdomadaires d'une organisation par celles recalculées depuis ses
 * données brutes (dépôts suivis). Partagé par le job et le jeu de test (pnpm db:seed).
 */
export async function recomputeOrganization(
  prisma: PrismaService,
  organizationId: string,
): Promise<number> {
  const repos = await prisma.client.repository.findMany({
    where: { organizationId, isTracked: true },
    select: {
      id: true,
      defaultBranch: true,
      deployRule: true,
      pullRequests: {
        select: {
          isDraft: true,
          createdAt: true,
          firstCommitAt: true,
          firstReviewAt: true,
          mergedAt: true,
        },
      },
      workflowRuns: { select: { branch: true, startedAt: true, completedAt: true } },
      deployments: {
        select: { sha: true, environment: true, status: true, createdAt: true, finishedAt: true },
      },
    },
  });
  const metrics = organizationMetrics(repos);
  try {
    await prisma.client.$transaction([
      // Un recalcul à la fois par organisation (passage nocturne et recalcul ciblé simultanés).
      prisma.client
        .$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`recompute:${organizationId}`}))`,
      prisma.client.weeklyMetric.deleteMany({ where: { organizationId } }),
      prisma.client.weeklyMetric.createMany({
        data: metrics.map((m) => ({ organizationId, ...m })),
      }),
    ]);
  } catch (error) {
    // Organisation supprimée entre la lecture et l'écriture (désinstallation) : rien à recalculer,
    // et le passage nocturne continue avec les autres.
    // Code de l'erreur plutôt qu'instanceof : la classe peut venir d'une autre copie du client.
    if ((error as { code?: unknown } | null)?.code === 'P2003') return 0;
    throw error;
  }
  return metrics.length;
}
