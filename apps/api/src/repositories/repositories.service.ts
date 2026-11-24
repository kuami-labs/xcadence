import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@xcadence/db';
import { JOBS, QUEUES, type BackfillRepositoryJob, type RepositoryView } from '@xcadence/shared';
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
}
