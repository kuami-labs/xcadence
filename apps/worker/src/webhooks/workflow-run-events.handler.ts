import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { workflowRunData, type GithubWorkflowRun } from '../sync/mapping.js';
import { trackedRepository } from './tracked-repository.js';
import type { WebhookHandler } from './webhook-handler.js';

/** Champs utilisés de l'événement `workflow_run`. */
export interface WorkflowRunEventPayload {
  repository: { id: number; private?: boolean };
  workflow_run: GithubWorkflowRun;
}

/**
 * Runs de CI en continu (F2) : le payload contient le run complet, aucun appel à l'API.
 * Upsert par identifiant GitHub : chaque étape (demandé, en cours, terminé) met la ligne à jour.
 */
@Injectable()
export class WorkflowRunEventsHandler implements WebhookHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(eventType: string, payload: unknown): Promise<boolean> {
    if (eventType !== 'workflow_run') {
      return false;
    }
    const event = payload as WorkflowRunEventPayload;
    const repo = await trackedRepository(this.prisma, event.repository);
    if (!repo) {
      return true;
    }
    const run = event.workflow_run;
    const fields = workflowRunData(run);
    await this.prisma.client.workflowRun.upsert({
      where: { githubRunId: BigInt(run.id) },
      create: { repositoryId: repo.id, githubRunId: BigInt(run.id), ...fields },
      update: { repositoryId: repo.id, ...fields },
    });
    return true;
  }
}
