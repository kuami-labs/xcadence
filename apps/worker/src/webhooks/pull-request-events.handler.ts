import { Injectable } from '@nestjs/common';
import { GithubService } from '../github/github.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PullRequestsImporter } from '../sync/pull-requests.importer.js';
import { trackedRepository } from './tracked-repository.js';
import type { WebhookHandler } from './webhook-handler.js';

/** Champs utilisés des événements `pull_request` et `pull_request_review`. */
export interface PullRequestEventPayload {
  installation?: { id: number };
  repository: { id: number; name: string; owner: { login: string } };
  pull_request: { number: number };
}

const EVENTS = new Set(['pull_request', 'pull_request_review']);

/**
 * Nouveautés en continu (F2) : à chaque événement de PR ou de revue d'un dépôt suivi,
 * la PR est réimportée depuis l'API (détails, commits, revues). Le payload seul est incomplet
 * (pas de dates de commits, pas de taille dans les événements de revue) ; l'API donne le même
 * résultat que l'import initial. Idempotent.
 */
@Injectable()
export class PullRequestEventsHandler implements WebhookHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GithubService,
    private readonly pullRequests: PullRequestsImporter,
  ) {}

  async handle(eventType: string, payload: unknown): Promise<boolean> {
    if (!EVENTS.has(eventType)) {
      return false;
    }
    const event = payload as PullRequestEventPayload;
    const repo = await trackedRepository(this.prisma, event.repository.id);
    // Dépôt inconnu ou non suivi : rien à enregistrer, l'événement est tout de même traité.
    if (!repo || !event.installation) {
      return true;
    }
    const octokit = await this.github.forInstallation(event.installation.id);
    await this.pullRequests.importPullRequest(
      octokit,
      { id: repo.id, owner: event.repository.owner.login, name: event.repository.name },
      event.pull_request.number,
    );
    return true;
  }
}
