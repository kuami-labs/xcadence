import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JOBS, QUEUES, type ProcessWebhookEventJob } from '@xcadence/shared';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { InstallationHandler, type InstallationPayload } from './installation.handler.js';

export type ProcessResult = 'processed' | 'ignored' | 'already-processed' | 'missing';

/**
 * Consomme la file des webhooks GitHub : charge l'événement enregistré par l'API,
 * le confie au bon gestionnaire, puis le marque traité.
 */
@Processor(QUEUES.webhooks)
export class WebhookEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookEventsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly installation: InstallationHandler,
  ) {
    super();
  }

  async process(job: Job<ProcessWebhookEventJob>): Promise<ProcessResult> {
    if (job.name !== JOBS.processWebhookEvent) {
      throw new Error(`Job inconnu : ${job.name}`);
    }
    const { webhookEventId } = job.data;
    const event = await this.prisma.client.webhookEvent.findUnique({
      where: { id: webhookEventId },
    });
    if (!event) {
      return 'missing';
    }
    if (event.processedAt) {
      return 'already-processed';
    }

    // Jamais le payload dans les logs (docs/08-SECURITE.md) : seulement le type et l'identifiant.
    const handled = await this.installation.handle(
      event.eventType,
      event.payload as unknown as InstallationPayload,
    );
    if (!handled) {
      // Pas encore géré (#15, #21 à #23) : laissé non traité pour l'être plus tard.
      this.logger.log(`Événement ${event.eventType} ${event.id} ignoré pour l'instant`);
      return 'ignored';
    }
    // updateMany : une désinstallation supprime aussi l'événement lui-même (RGPD).
    await this.prisma.client.webhookEvent.updateMany({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });
    this.logger.log(`Événement ${event.eventType} ${event.id} traité`);
    return 'processed';
  }
}
