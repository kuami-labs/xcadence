import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@xcadence/db';
import {
  JOBS,
  QUEUES,
  type BackfillRepositoryJob,
  type RecentPullRequest,
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

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.sync) private readonly sync: Queue<BackfillRepositoryJob>,
  ) {}

  list(organizationId: string): Promise<RepositoryView[]> {
    return this.prisma.client.repository.findMany({
      where: { organizationId },
      select: publicFields,
      orderBy: { name: 'asc' },
    });
  }

  /** Met à jour un dépôt de l'organisation ; le passer en suivi lance l'import des 90 derniers jours. */
  async update(
    organizationId: string,
    id: string,
    dto: UpdateRepositoryDto,
  ): Promise<RepositoryView> {
    const current = await this.prisma.client.repository.findFirst({
      where: { id, organizationId },
      select: { isTracked: true },
    });
    if (!current) {
      throw new NotFoundException();
    }
    const repository = await this.prisma.client.repository.update({
      where: { id },
      data: {
        isTracked: dto.isTracked,
        deployRule:
          dto.deployRule === null ? Prisma.DbNull : (dto.deployRule as Prisma.InputJsonValue),
      },
      select: publicFields,
    });
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
    return repository;
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
