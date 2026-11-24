import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import {
  JOBS,
  QUEUES,
  type SendNotificationsJob,
  type SendSummaryEmailJob,
} from '@xcadence/shared';
import type { Job, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { MAILER, type Mailer } from './mailer.js';
import { summaryEmail } from './summary-email.js';

type NotificationJob = SendNotificationsJob | SendSummaryEmailJob;

/** Un email par destinataire, réessayé seul : un échec n'en bloque aucun autre. */
export const EMAIL_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 60_000 },
  removeOnComplete: true,
} as const;

/**
 * send-notifications : répartit l'envoi d'un résumé entre ses destinataires, une seule fois
 * (weekly_summaries.sent_at). send-summary-email : envoie un email.
 */
@Processor(QUEUES.notifications)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.notifications) private readonly queue: Queue<NotificationJob>,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<string> {
    if (job.name === JOBS.sendNotifications) {
      return this.dispatch((job.data as SendNotificationsJob).summaryId);
    }
    if (job.name === JOBS.sendSummaryEmail) {
      return this.sendOne(job.data as SendSummaryEmailJob);
    }
    throw new Error(`Job inconnu : ${job.name}`);
  }

  async dispatch(summaryId: string): Promise<string> {
    const summary = await this.prisma.client.weeklySummary.findUnique({
      where: { id: summaryId },
      select: { sentAt: true, organization: { select: { recipients: { select: { id: true } } } } },
    });
    if (!summary) return 'absent';
    if (summary.sentAt) return 'deja-envoye';
    const recipients = summary.organization.recipients;
    await this.queue.addBulk(
      recipients.map((r) => ({
        name: JOBS.sendSummaryEmail,
        data: { summaryId, recipientId: r.id },
        opts: { ...EMAIL_JOB_OPTIONS, jobId: `${summaryId}-${r.id}` },
      })),
    );
    await this.prisma.client.weeklySummary.update({
      where: { id: summaryId },
      data: { sentAt: new Date() },
    });
    return `${recipients.length} email(s)`;
  }

  async sendOne({ summaryId, recipientId }: SendSummaryEmailJob): Promise<string> {
    const recipient = await this.prisma.client.summaryRecipient.findUnique({
      where: { id: recipientId },
    });
    const summary = await this.prisma.client.weeklySummary.findUnique({
      where: { id: summaryId },
      include: { organization: { select: { id: true, name: true } } },
    });
    // Désinscrit ou organisation supprimée entre-temps : rien à envoyer.
    if (!recipient || !summary || recipient.organizationId !== summary.organizationId) {
      return 'ignore';
    }
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
    const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
    const unsubscribeUrl = `${apiUrl}/summary-recipients/unsubscribe?token=${encodeURIComponent(recipient.unsubscribeToken)}`;
    const email = summaryEmail({
      organizationName: summary.organization.name,
      weekStart: summary.weekStart,
      content: summary.content,
      dashboardUrl: `${webUrl}/dashboard?org=${summary.organization.id}`,
      unsubscribeUrl,
    });
    await this.mailer.send({ to: recipient.email, unsubscribeUrl, ...email });
    this.logger.log(`Résumé ${summaryId} envoyé à un destinataire`);
    return 'envoye';
  }
}
