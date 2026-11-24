import { Injectable } from '@nestjs/common';
import type { Octokit } from 'octokit';
import { PrismaService } from '../prisma/prisma.service.js';
import { workflowRunData, type GithubWorkflowRun } from './mapping.js';
import type { RepositoryTarget } from './pull-requests.importer.js';

/** Import des runs GitHub Actions créés depuis `since` ; upsert par identifiant GitHub. */
@Injectable()
export class WorkflowRunsImporter {
  constructor(private readonly prisma: PrismaService) {}

  async import(octokit: Octokit, repo: RepositoryTarget, since: Date): Promise<number> {
    let count = 0;
    for await (const { data } of octokit.paginate.iterator(
      octokit.rest.actions.listWorkflowRunsForRepo,
      {
        owner: repo.owner,
        repo: repo.name,
        created: `>=${since.toISOString().slice(0, 10)}`,
        per_page: 100,
      },
    )) {
      for (const run of data as GithubWorkflowRun[]) {
        const fields = workflowRunData(run);
        await this.prisma.client.workflowRun.upsert({
          where: { githubRunId: BigInt(run.id) },
          create: { repositoryId: repo.id, githubRunId: BigInt(run.id), ...fields },
          update: { repositoryId: repo.id, ...fields },
        });
        count += 1;
      }
    }
    return count;
  }
}
