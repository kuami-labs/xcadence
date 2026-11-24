import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  BottleneckPullRequest,
  BottleneckWorkflow,
  BottlenecksResponse,
  MetricKey,
  MetricsResponse,
  SyncStatusResponse,
  WeeklySummaryView,
} from '@xcadence/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import type { MetricsQueryDto } from './metrics-query.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const day = (d: Date) => d.toISOString().slice(0, 10);
const LIST_LIMIT = 50;

/** Lecture du tableau de bord : métriques précalculées et goulots (docs/03-BACKEND.md). */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(organizationId: string, query: MetricsQueryDto): Promise<MetricsResponse> {
    const to = query.to ? new Date(`${query.to.slice(0, 10)}T00:00:00Z`) : new Date();
    const from = query.from
      ? new Date(`${query.from.slice(0, 10)}T00:00:00Z`)
      : new Date(to.getTime() - 12 * 7 * DAY_MS);
    if (from > to) {
      throw new BadRequestException('from doit précéder to');
    }
    const repositoryId = query.repo ?? null;
    const rows = await this.prisma.client.weeklyMetric.findMany({
      // organization_id en premier : un dépôt d'une autre organisation ne renvoie rien.
      where: { organizationId, repositoryId, weekStart: { gte: from, lte: to } },
      orderBy: [{ weekStart: 'asc' }, { metricKey: 'asc' }],
    });
    return {
      repositoryId,
      from: day(from),
      to: day(to),
      metrics: rows.map((m) => ({
        metricKey: m.metricKey as MetricKey,
        weekStart: day(m.weekStart),
        value: m.value,
        sampleSize: m.sampleSize,
      })),
    };
  }

  async bottlenecks(organizationId: string): Promise<BottlenecksResponse> {
    const now = Date.now();
    const open = await this.prisma.client.pullRequest.findMany({
      where: { state: 'open', repository: { organizationId, isTracked: true } },
      select: {
        number: true,
        isDraft: true,
        createdAt: true,
        firstReviewAt: true,
        additions: true,
        deletions: true,
        repository: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const view = (pr: (typeof open)[number]): BottleneckPullRequest => ({
      repositoryId: pr.repository.id,
      repositoryName: pr.repository.name,
      number: pr.number,
      createdAt: pr.createdAt.toISOString(),
      ageHours: Math.round(((now - pr.createdAt.getTime()) / HOUR_MS) * 10) / 10,
      size: pr.additions + pr.deletions,
    });

    const awaitingReview = open
      .filter(
        (pr) => !pr.isDraft && !pr.firstReviewAt && now - pr.createdAt.getTime() > 48 * HOUR_MS,
      )
      .slice(0, LIST_LIMIT)
      .map(view);
    const oldPullRequests = open
      .filter((pr) => now - pr.createdAt.getTime() > 7 * DAY_MS)
      .slice(0, LIST_LIMIT)
      .map(view);

    // Workflows de la branche principale sur 4 semaines : p90 de durée et taux d'échec.
    const slowWorkflows = await this.prisma.client.$queryRaw<BottleneckWorkflow[]>`
      SELECT r.id AS "repositoryId", r.name AS "repositoryName", w.workflow_name AS "workflowName",
        count(*)::int AS runs,
        round((percentile_cont(0.9) WITHIN GROUP (
          ORDER BY extract(epoch FROM (w.completed_at - w.started_at)) / 60))::numeric, 1)::float AS "p90Minutes",
        round((avg(CASE WHEN w.conclusion IN ('failure', 'timed_out') THEN 1 ELSE 0 END) * 100)::numeric, 1)::float
          AS "failureRate"
      FROM workflow_runs w
      JOIN repositories r ON r.id = w.repository_id
      WHERE r.organization_id = ${organizationId}::uuid
        AND r.is_tracked
        AND w.branch = r.default_branch
        AND w.completed_at IS NOT NULL
        AND w.started_at >= now() - interval '28 days'
      GROUP BY r.id, r.name, w.workflow_name
      ORDER BY "p90Minutes" DESC
      LIMIT 10`;

    return { awaitingReview, oldPullRequests, slowWorkflows };
  }

  /** Imports récents de l'organisation (suivi de l'onboarding). */
  async syncStatus(organizationId: string): Promise<SyncStatusResponse> {
    const jobs = await this.prisma.client.syncJob.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return {
      inProgress: jobs.some((j) => j.status === 'queued' || j.status === 'running'),
      jobs: jobs.map((j) => ({
        type: j.type,
        status: j.status,
        startedAt: j.startedAt?.toISOString() ?? null,
        finishedAt: j.finishedAt?.toISOString() ?? null,
      })),
    };
  }

  /** Dernier résumé hebdomadaire de l'organisation. */
  async latestSummary(organizationId: string): Promise<WeeklySummaryView | null> {
    const summary = await this.prisma.client.weeklySummary.findFirst({
      where: { organizationId },
      orderBy: { weekStart: 'desc' },
    });
    return summary
      ? { weekStart: day(summary.weekStart), content: summary.content, model: summary.model }
      : null;
  }
}
