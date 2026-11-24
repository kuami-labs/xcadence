import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@xcadence/db';
import {
  JOBS,
  QUEUES,
  isProductionEnvironment,
  parseDeployRule,
  type BackfillRepositoryJob,
  type RecentPullRequest,
  type RecomputeWeeklyMetricsJob,
  type RepositoryEnvironment,
  type RepositoryView,
} from '@xcadence/shared';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UpdateRepositoryDto } from './update-repository.dto.js';

/** Ce que l'API expose d'un dépôt (pas d'identifiant GitHub, aucune donnée de code). */
const publicFields = {
  id: true,
  name: true,
  defaultBranch: true,
  isTracked: true,
  deployRule: true,
} as const;

const toView = (repository: Omit<RepositoryView, 'deployRule'> & { deployRule: unknown }) => ({
  ...repository,
  deployRule: parseDeployRule(repository.deployRule),
});

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.sync) private readonly sync: Queue<BackfillRepositoryJob>,
    @InjectQueue(QUEUES.metrics) private readonly metrics: Queue<RecomputeWeeklyMetricsJob>,
  ) {}

  async list(organizationId: string): Promise<RepositoryView[]> {
    const repositories = await this.prisma.client.repository.findMany({
      where: { organizationId },
      select: publicFields,
      orderBy: { name: 'asc' },
    });
    return repositories.map(toView);
  }

  /** Met à jour un dépôt de l'organisation ; le passer en suivi lance l'import des 90 derniers jours. */
  async update(
    organizationId: string,
    id: string,
    dto: UpdateRepositoryDto,
  ): Promise<RepositoryView> {
    const current = await this.prisma.client.repository.findFirst({
      where: { id, organizationId },
      select: { isTracked: true, deployRule: true },
    });
    if (!current) {
      throw new NotFoundException();
    }
    const repository = await this.prisma.client.repository.update({
      where: { id },
      data: {
        isTracked: dto.isTracked,
        deployRule:
          dto.deployRule === null
            ? Prisma.DbNull
            : dto.deployRule && { productionEnvironments: dto.deployRule.productionEnvironments },
      },
      select: publicFields,
    });
    if (
      dto.deployRule !== undefined &&
      JSON.stringify(parseDeployRule(dto.deployRule)) !==
        JSON.stringify(parseDeployRule(current.deployRule))
    ) {
      // Nouvelle règle : les métriques DORA de l'organisation sont recalculées.
      await this.metrics.add(
        JOBS.recomputeWeeklyMetrics,
        { organizationId },
        {
          deduplication: { id: `recompute-${organizationId}` },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
    }
    if (dto.isTracked && !current.isTracked) {
      // Un ancien import terminé garde son identifiant dans Redis et bloquerait le nouveau :
      // suivre de nouveau un dépôt doit relancer son import.
      const previous = await this.sync.getJob(`backfill-${id}`);
      if (previous && ((await previous.isCompleted()) || (await previous.isFailed()))) {
        await previous.remove();
      }
      await this.sync.add(
        JOBS.backfillRepository,
        { repositoryId: id },
        {
          // Un seul import en attente par dépôt.
          jobId: `backfill-${id}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
    }
    return toView(repository);
  }

  /** Environnements vus dans les déploiements importés du dépôt, les plus fréquents d'abord. */
  async environments(organizationId: string, id: string): Promise<RepositoryEnvironment[]> {
    const repo = await this.prisma.client.repository.findFirst({
      where: { id, organizationId },
      select: { deployRule: true },
    });
    if (!repo) {
      throw new NotFoundException();
    }
    const rule = parseDeployRule(repo.deployRule);
    const groups = await this.prisma.client.deployment.groupBy({
      by: ['environment'],
      where: { repositoryId: id },
      _count: { _all: true },
    });
    return groups
      .map((g) => ({
        name: g.environment,
        deployments: g._count._all,
        isProduction: isProductionEnvironment(g.environment, rule),
      }))
      .sort((a, b) => b.deployments - a.deployments || a.name.localeCompare(b.name));
  }

  /** Les 20 PR les plus récentes d'un dépôt de l'organisation ; 404 s'il n'en fait pas partie. */
  async recentPullRequests(organizationId: string, id: string): Promise<RecentPullRequest[]> {
    const repo = await this.prisma.client.repository.findFirst({ where: { id, organizationId } });
    if (!repo) {
      throw new NotFoundException();
    }
    const prs = await this.prisma.client.pullRequest.findMany({
      where: { repositoryId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return prs.map((pr) => ({
      number: pr.number,
      state: pr.state,
      isDraft: pr.isDraft,
      createdAt: pr.createdAt.toISOString(),
      mergedAt: pr.mergedAt?.toISOString() ?? null,
      size: pr.additions + pr.deletions,
      timeToFirstReviewHours: pr.firstReviewAt
        ? Math.round(((pr.firstReviewAt.getTime() - pr.createdAt.getTime()) / 3_600_000) * 10) / 10
        : null,
    }));
  }
}
