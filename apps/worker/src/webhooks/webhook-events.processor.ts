import { Processor } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JOBS, QUEUES, type ProcessWebhookEventJob } from '@xcadence/shared';
import type { Job } from 'bullmq';
import { MetricsScheduler } from '../metrics/metrics.scheduler.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DeploymentStatusEventsHandler } from './deployment-status-events.handler.js';
import { InstallationHandler } from './installation.handler.js';
import { PullRequestEventsHandler } from './pull-request-events.handler.js';
import type { WebhookHandler } from './webhook-handler.js';
import { WorkflowRunEventsHandler } from './workflow-run-events.handler.js';
import { ReportedWorkerHost } from '../observability/reported-worker-host.js';

export type ProcessResult = 'processed' | 'ignored' | 'already-processed' | 'missing';

/**
 * Consomme la file des webhooks GitHub : charge l'événement enregistré par l'API,
 * le confie au bon gestionnaire, puis le marque traité.
 */
@Processor(QUEUES.webhooks)
export class WebhookEventsProcessor extends ReportedWorkerHost {
  private readonly logger = new Logger(WebhookEventsProcessor.name);

  private readonly handlers: WebhookHandler[];

  constructor(
    private readonly prisma: PrismaService,
    installation: InstallationHandler,
    pullRequests: PullRequestEventsHandler,
    workflowRuns: WorkflowRunEventsHandler,
    deployments: DeploymentStatusEventsHandler,
    private readonly metrics: MetricsScheduler,
  ) {
    super();
    this.handlers = [installation, pullRequests, workflowRuns, deployments];
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
    let handled = false;
    for (const handler of this.handlers) {
      if (await handler.handle(event.eventType, event.payload)) {
        handled = true;
        break;
      }
    }
    if (!handled) {
      // Pas géré (par exemple installation.suspend) : laissé non traité.
      this.logger.log(`Événement ${event.eventType} ${event.id} ignoré pour l'instant`);
      return 'ignored';
    }
    // updateMany : une désinstallation supprime aussi l'événement lui-même (RGPD).
    await this.prisma.client.webhookEvent.updateMany({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });
    await this.scheduleRecompute(event.payload);
    this.logger.log(`Événement ${event.eventType} ${event.id} traité`);
    return 'processed';
  }

  /** Après un événement sur un dépôt suivi, recalcul (regroupé) des métriques de son organisation. */
  private async scheduleRecompute(payload: unknown): Promise<void> {
    const githubRepoId = (payload as { repository?: { id?: number } } | null)?.repository?.id;
    if (!githubRepoId) {
      return;
    }
    const repo = await this.prisma.client.repository.findUnique({
      where: { githubRepoId: BigInt(githubRepoId) },
      select: { organizationId: true, isTracked: true },
    });
    if (repo?.isTracked) {
      await this.metrics.scheduleFor(repo.organizationId);
    }
  }
}
