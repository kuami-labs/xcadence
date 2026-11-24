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

    let rows = 0;
    for (const organizationId of organizationIds) {
      rows += await this.recompute(organizationId);
    }
    if (!job.data.organizationId) {
      const { count } = await this.prisma.client.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      this.logger.log(
        `Passage nocturne : ${organizationIds.length} organisations, ${count} sessions expirées purgées`,
      );
    }
    return { organizations: organizationIds.length, rows };
  }

  async recompute(organizationId: string): Promise<number> {
    const repos = await this.prisma.client.repository.findMany({
      where: { organizationId, isTracked: true },
      select: {
        id: true,
        defaultBranch: true,
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
    await this.prisma.client.$transaction([
      this.prisma.client.weeklyMetric.deleteMany({ where: { organizationId } }),
      this.prisma.client.weeklyMetric.createMany({
        data: metrics.map((m) => ({ organizationId, ...m })),
      }),
    ]);
    return metrics.length;
  }
}
