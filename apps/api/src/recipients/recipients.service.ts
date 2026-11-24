import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { SummaryRecipientView } from '@xcadence/shared';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';

/** Destinataires du résumé hebdomadaire d'une organisation (docs/04 : /settings). */
@Injectable()
export class RecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string): Promise<SummaryRecipientView[]> {
    return this.prisma.client.summaryRecipient.findMany({
      where: { organizationId },
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
    });
  }

  async add(organizationId: string, email: string): Promise<SummaryRecipientView> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.client.summaryRecipient.findUnique({
      where: { organizationId_email: { organizationId, email: normalized } },
    });
    if (existing) {
      throw new ConflictException('Adresse déjà enregistrée');
    }
    return this.prisma.client.summaryRecipient.create({
      data: {
        organizationId,
        email: normalized,
        unsubscribeToken: randomBytes(24).toString('base64url'),
      },
      select: { id: true, email: true },
    });
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const { count } = await this.prisma.client.summaryRecipient.deleteMany({
      where: { id, organizationId },
    });
    if (count === 0) {
      throw new NotFoundException();
    }
  }

  /** Désinscription par le lien de l'email ; même réponse que le jeton existe ou non. */
  async unsubscribe(token: string): Promise<void> {
    await this.prisma.client.summaryRecipient.deleteMany({ where: { unsubscribeToken: token } });
  }
}
