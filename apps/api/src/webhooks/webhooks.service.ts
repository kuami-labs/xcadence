import { Injectable } from '@nestjs/common';
import { Prisma } from '@xcadence/db';
import { PrismaService } from '../prisma/prisma.service.js';

export interface IncomingWebhook {
  deliveryId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enregistre l'événement une seule fois par delivery_id.
   * Retourne false si cette livraison a déjà été reçue (rejeu de GitHub).
   */
  async record(event: IncomingWebhook): Promise<boolean> {
    const { count } = await this.prisma.client.webhookEvent.createMany({
      data: [event],
      skipDuplicates: true,
    });
    return count === 1;
  }
}
