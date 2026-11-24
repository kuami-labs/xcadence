import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  deploymentData,
  type GithubDeployment,
  type GithubDeploymentStatus,
} from '../sync/mapping.js';
import { trackedRepository } from './tracked-repository.js';
import type { WebhookHandler } from './webhook-handler.js';

/** Champs utilisés de l'événement `deployment_status`. */
export interface DeploymentStatusEventPayload {
  repository: { id: number };
  deployment: GithubDeployment;
  deployment_status: GithubDeploymentStatus;
}

/**
 * Déploiements en continu (F2) : le payload contient le déploiement et son nouveau statut,
 * aucun appel à l'API. Upsert par identifiant GitHub.
 */
@Injectable()
export class DeploymentStatusEventsHandler implements WebhookHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(eventType: string, payload: unknown): Promise<boolean> {
    if (eventType !== 'deployment_status') {
      return false;
    }
    const event = payload as DeploymentStatusEventPayload;
    const repo = await trackedRepository(this.prisma, event.repository.id);
    if (!repo) {
      return true;
    }
    const { deployment } = event;
    const fields = deploymentData(deployment, event.deployment_status);
    await this.prisma.client.deployment.upsert({
      where: { githubDeploymentId: BigInt(deployment.id) },
      create: { repositoryId: repo.id, githubDeploymentId: BigInt(deployment.id), ...fields },
      update: { repositoryId: repo.id, ...fields },
    });
    return true;
  }
}
