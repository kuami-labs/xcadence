import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@xcadence/db';
import { JOBS, QUEUES, type ProcessWebhookEventJob } from '@xcadence/shared';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';

export interface IncomingWebhook {
  deliveryId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.webhooks) private readonly queue: Queue<ProcessWebhookEventJob>,
  ) {}

  /**
   * Enregistre l'événement une seule fois par delivery_id, puis enfile son traitement.
   * Retourne false si cette livraison avait déjà été reçue (rejeu de GitHub).
   */
  async record(event: IncomingWebhook): Promise<boolean> {
    const { count } = await this.prisma.client.webhookEvent.createMany({
      data: [event],
      skipDuplicates: true,
    });
    const stored = await this.prisma.client.webhookEvent.findUniqueOrThrow({
      where: { deliveryId: event.deliveryId },
      select: { id: true, processedAt: true },
    });
    // Enfilé tant que l'événement n'est pas traité : si Redis était indisponible au premier
    // envoi, le rejeu de GitHub le remet en file. jobId = id de l'événement : jamais deux jobs.
    if (!stored.processedAt) {
      await this.queue.add(
        JOBS.processWebhookEvent,
        { webhookEventId: stored.id },
        {
          jobId: stored.id,
          attempts: 5,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: 1_000,
          removeOnFail: 5_000,
        },
      );
    }
    return count === 1;
  }
}
