import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JOBS, QUEUES, type BackfillRepositoryJob } from '@xcadence/shared';
import type { Job } from 'bullmq';
import { GithubService } from '../github/github.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PullRequestsImporter } from './pull-requests.importer.js';
import { WorkflowRunsImporter } from './workflow-runs.importer.js';

/** Profondeur de l'import initial (docs/01-PRD.md, F2). */
export const BACKFILL_DAYS = 90;

export type BackfillResult = { skipped: string } | { pullRequests: number; workflowRuns: number };

/** backfill-repository : import des 90 derniers jours d'un dépôt suivi, suivi dans sync_jobs. */
@Processor(QUEUES.sync)
export class BackfillProcessor extends WorkerHost {
  private readonly logger = new Logger(BackfillProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GithubService,
    private readonly pullRequests: PullRequestsImporter,
    private readonly workflowRuns: WorkflowRunsImporter,
  ) {
    super();
  }

  async process(job: Job<BackfillRepositoryJob>): Promise<BackfillResult> {
    if (job.name !== JOBS.backfillRepository) {
      throw new Error(`Job inconnu : ${job.name}`);
    }
    const repo = await this.prisma.client.repository.findUnique({
      where: { id: job.data.repositoryId },
      include: { organization: true },
    });
    if (!repo || !repo.isTracked) {
      return { skipped: 'dépôt absent ou non suivi' };
    }
    const installationId = repo.organization.installationId;
    if (!installationId) {
      return { skipped: 'organisation sans installation' };
    }

    const syncJob = await this.prisma.client.syncJob.create({
      data: {
        organizationId: repo.organizationId,
        type: 'backfill',
        status: 'running',
        startedAt: new Date(),
      },
    });
    try {
      const octokit = await this.github.forInstallation(installationId);
      const owner = repo.organization.name;
      const { data } = await octokit.rest.repos.get({ owner, repo: repo.name });
      await this.prisma.client.repository.update({
        where: { id: repo.id },
        data: { defaultBranch: data.default_branch },
      });

      const since = new Date(Date.now() - BACKFILL_DAYS * 24 * 60 * 60 * 1000);
      const target = { id: repo.id, owner, name: repo.name };
      const pullRequests = await this.pullRequests.import(octokit, target, since);
      const workflowRuns = await this.workflowRuns.import(octokit, target, since);

      await this.prisma.client.syncJob.update({
        where: { id: syncJob.id },
        data: { status: 'succeeded', finishedAt: new Date() },
      });
      this.logger.log(`Dépôt ${repo.id} importé : ${pullRequests} PR, ${workflowRuns} runs`);
      return { pullRequests, workflowRuns };
    } catch (error) {
      await this.prisma.client.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          error: (error instanceof Error ? error.message : String(error)).slice(0, 500),
        },
      });
      throw error; // BullMQ réessaie le job (5 tentatives).
    }
  }
}
