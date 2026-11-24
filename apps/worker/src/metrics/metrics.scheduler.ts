import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { JOBS, QUEUES, type RecomputeWeeklyMetricsJob } from '@xcadence/shared';
import type { Queue } from 'bullmq';

/** Attente avant le recalcul après un événement : les événements rapprochés sont regroupés. */
export const RECOMPUTE_DELAY_MS = 60_000;
/** Passage nocturne, 3 h UTC. */
export const NIGHTLY_PATTERN = '0 3 * * *';

@Injectable()
export class MetricsScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUES.metrics) private readonly queue: Queue<RecomputeWeeklyMetricsJob>,
  ) {}

  /** Planifie (ou met à jour) le passage nocturne au démarrage du worker. */
  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'nightly-recompute',
      { pattern: NIGHTLY_PATTERN },
      { name: JOBS.recomputeWeeklyMetrics, data: {} },
    );
  }

  /** Recalcul d'une organisation après un import ou un webhook, regroupé (un seul job en attente). */
  async scheduleFor(organizationId: string): Promise<void> {
    await this.queue.add(
      JOBS.recomputeWeeklyMetrics,
      { organizationId },
      {
        delay: RECOMPUTE_DELAY_MS,
        deduplication: { id: `recompute-${organizationId}` },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }
}
