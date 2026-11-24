import { Injectable } from '@nestjs/common';
import type { Octokit } from 'octokit';
import { PrismaService } from '../prisma/prisma.service.js';
import { deploymentData, type GithubDeployment } from './mapping.js';
import type { RepositoryTarget } from './pull-requests.importer.js';

/**
 * Import des déploiements créés depuis `since` (API Deployments de GitHub) et de leur dernier statut.
 * Upsert par identifiant GitHub. La détection par workflow viendra ensuite (question ouverte du PRD).
 */
@Injectable()
export class DeploymentsImporter {
  constructor(private readonly prisma: PrismaService) {}

  async import(octokit: Octokit, repo: RepositoryTarget, since: Date): Promise<number> {
    const base = { owner: repo.owner, repo: repo.name };
    let count = 0;
    // Les déploiements arrivent du plus récent au plus ancien : on s'arrête au premier trop ancien.
    for await (const { data } of octokit.paginate.iterator(octokit.rest.repos.listDeployments, {
      ...base,
      per_page: 100,
    })) {
      for (const deployment of data as GithubDeployment[]) {
        if (new Date(deployment.created_at) < since) {
          return count;
        }
        const { data: statuses } = await octokit.rest.repos.listDeploymentStatuses({
          ...base,
          deployment_id: deployment.id,
          per_page: 1,
        });
        const fields = deploymentData(deployment, statuses[0]);
        await this.prisma.client.deployment.upsert({
          where: { githubDeploymentId: BigInt(deployment.id) },
          create: { repositoryId: repo.id, githubDeploymentId: BigInt(deployment.id), ...fields },
          update: { repositoryId: repo.id, ...fields },
        });
        count += 1;
      }
    }
    return count;
  }
}
