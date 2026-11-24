import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JOBS, QUEUES, type ProcessWebhookEventJob } from '@xcadence/shared';
import type { Job } from 'bullmq';

/**
 * Consomme la file des webhooks GitHub.
 * Le traitement par type d'événement arrive avec les tâches suivantes (#14, #15, #21 à #23).
 */
@Processor(QUEUES.webhooks)
export class WebhookEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookEventsProcessor.name);

  async process(job: Job<ProcessWebhookEventJob>): Promise<{ webhookEventId: string }> {
    if (job.name !== JOBS.processWebhookEvent) {
      throw new Error(`Job inconnu : ${job.name}`);
    }
    // Jamais le payload dans les logs (docs/08-SECURITE.md) : seulement l'identifiant.
    this.logger.log(`Événement ${job.data.webhookEventId} reçu`);
    return { webhookEventId: job.data.webhookEventId };
  }
}
