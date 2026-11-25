import { Injectable, NotFoundException } from '@nestjs/common';
import type { BottlenecksResponse, DemoResponse, MetricsResponse } from '@xcadence/shared';
import { DashboardService } from '../dashboard/dashboard.service.js';
import type { MetricsQueryDto } from '../dashboard/metrics-query.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Démo publique en lecture seule (ADR 0006) : l'organisation marquée `is_demo`, une des nôtres
 * où la GitHub App est installée. Rien d'autre n'est exposé : ni autre organisation, ni dépôt
 * privé ou non suivi, ni résumé IA, ni état des imports.
 */
@Injectable()
export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
  ) {}

  async info(): Promise<DemoResponse> {
    const demo = await this.demo();
    return {
      organization: { name: demo.name },
      repositories: demo.publicRepositories,
      organizationMetrics: demo.organizationMetrics,
    };
  }

  async metrics(query: MetricsQueryDto): Promise<MetricsResponse> {
    const demo = await this.demo();
    if (
      query.repo
        ? !demo.publicRepositories.some((r) => r.id === query.repo)
        : !demo.organizationMetrics
    ) {
      // L'agrégat de l'organisation inclut ses dépôts privés suivis : jamais montré dans ce cas.
      throw new NotFoundException();
    }
    return this.dashboard.metrics(demo.id, query);
  }

  async bottlenecks(): Promise<BottlenecksResponse> {
    const demo = await this.demo();
    return this.dashboard.bottlenecks(demo.id, { publicOnly: true });
  }

  private async demo() {
    const org = await this.prisma.client.organization.findFirst({
      where: { isDemo: true, installationId: { not: null } },
      include: {
        repositories: {
          where: { isTracked: true },
          select: { id: true, name: true, isPrivate: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!org) throw new NotFoundException('Aucune démo publique');
    return {
      id: org.id,
      name: org.name,
      publicRepositories: org.repositories
        .filter((r) => !r.isPrivate)
        .map(({ id, name }) => ({ id, name })),
      organizationMetrics: org.repositories.every((r) => !r.isPrivate),
    };
  }
}
