import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Job } from 'bullmq';

/**
 * Base des processeurs BullMQ : chaque échec de job est journalisé et envoyé à Sentry
 * (si SENTRY_DSN est défini), avec la file, le nom du job et l'essai, jamais ses données
 * (payloads, adresses email).
 */
export abstract class ReportedWorkerHost extends WorkerHost {
  private readonly failureLogger = new Logger('Jobs');

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    const context = {
      queue: job?.queueName ?? 'inconnue',
      job: job?.name ?? 'inconnu',
      attempt: job?.attemptsMade ?? 0,
    };
    this.failureLogger.error(
      `Job ${context.job} (${context.queue}) en échec, essai ${context.attempt} : ${error.message}`,
    );
    Sentry.captureException(error, {
      tags: { queue: context.queue, job: context.job },
      extra: { attempt: context.attempt },
    });
  }
}
