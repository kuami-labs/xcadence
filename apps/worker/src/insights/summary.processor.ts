import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import {
  JOBS,
  QUEUES,
  type GenerateWeeklySummaryJob,
  type SendNotificationsJob,
} from '@xcadence/shared';
import type { Job, Queue } from 'bullmq';
import { weekStart } from '../metrics/stats.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildFacts } from './facts.js';
import { createSummaryProvider, type SummaryProvider } from './summary-provider.js';
import { fallbackSummary, validateSummary } from './validate.js';

/** Lundi 7 h UTC, après le recalcul nocturne des métriques (3 h). */
export const WEEKLY_SUMMARY_PATTERN = '0 7 * * 1';
/** Essais du modèle avant le résumé de repli. */
export const MODEL_ATTEMPTS = 2;
export const FALLBACK_MODEL = 'repli';

export type SummaryOutcome = 'written' | 'fallback' | 'exists' | 'no-data';

/**
 * generate-weekly-summary (F5) : résumé de la semaine écoulée pour chaque organisation.
 * Le modèle reçoit des métriques agrégées ; sa réponse est vérifiée (chiffres réels) avant
 * d'être enregistrée, sinon un résumé de repli sans IA est écrit.
 */
@Processor(QUEUES.insights)
export class SummaryProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(SummaryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.insights) private readonly queue: Queue<GenerateWeeklySummaryJob>,
    @InjectQueue(QUEUES.notifications)
    private readonly notifications: Queue<SendNotificationsJob>,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      'weekly-summary',
      { pattern: WEEKLY_SUMMARY_PATTERN },
      { name: JOBS.generateWeeklySummary, data: {} },
    );
  }

  async process(job: Job<GenerateWeeklySummaryJob>): Promise<Record<string, SummaryOutcome>> {
    if (job.name !== JOBS.generateWeeklySummary) {
      throw new Error(`Job inconnu : ${job.name}`);
    }
    const ids = job.data.organizationId
      ? [job.data.organizationId]
      : (await this.prisma.client.organization.findMany({ select: { id: true } })).map((o) => o.id);
    const results: Record<string, SummaryOutcome> = {};
    for (const id of ids) {
      results[id] = await this.summarize(id);
    }
    return results;
  }

  /** Résumé de la dernière semaine complète d'une organisation. */
  async summarize(
    organizationId: string,
    now = new Date(),
    provider?: SummaryProvider,
  ): Promise<SummaryOutcome> {
    const week = new Date(weekStart(now).getTime() - 7 * 24 * 60 * 60 * 1000);
    const exists = await this.prisma.client.weeklySummary.findUnique({
      where: { organizationId_weekStart: { organizationId, weekStart: week } },
    });
    if (exists) return 'exists';

    const rows = await this.prisma.client.weeklyMetric.findMany({
      where: {
        organizationId,
        repositoryId: null,
        weekStart: { gte: new Date(week.getTime() - 7 * 24 * 60 * 60 * 1000), lte: week },
      },
    });
    const facts = buildFacts(rows, week);
    if (facts.length === 0) return 'no-data';

    let content: string | null = null;
    let model = FALLBACK_MODEL;
    try {
      const writer = provider ?? createSummaryProvider();
      for (let attempt = 1; attempt <= MODEL_ATTEMPTS && content === null; attempt += 1) {
        const result = validateSummary(await writer.write(facts), facts);
        if (result.ok) {
          content = result.text;
          model = writer.model;
        } else {
          this.logger.warn(`Résumé refusé (${result.reason}), essai ${attempt}/${MODEL_ATTEMPTS}`);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Fournisseur IA indisponible : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const summary = await this.prisma.client.weeklySummary.create({
      data: { organizationId, weekStart: week, content: content ?? fallbackSummary(facts), model },
    });
    await this.notifications.add(
      JOBS.sendNotifications,
      { summaryId: summary.id },
      { jobId: summary.id, removeOnComplete: true },
    );
    return content === null ? 'fallback' : 'written';
  }
}
