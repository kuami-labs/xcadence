import { Injectable } from '@nestjs/common';
import type { Octokit } from 'octokit';
import { PrismaService } from '../prisma/prisma.service.js';
import { reviewState, pullRequestData, type GithubPullRequest } from './mapping.js';

export interface RepositoryTarget {
  id: string;
  owner: string;
  name: string;
}

/**
 * Import des PR et de leurs revues sur une période (docs/03-BACKEND.md, backfill-repository).
 * Idempotent : upsert par identifiant GitHub, un import rejoué ne duplique rien.
 */
@Injectable()
export class PullRequestsImporter {
  constructor(private readonly prisma: PrismaService) {}

  /** Importe les PR mises à jour depuis `since` ; retourne leur nombre. */
  async import(octokit: Octokit, repo: RepositoryTarget, since: Date): Promise<number> {
    const base = { owner: repo.owner, repo: repo.name };
    let count = 0;
    // Tri par dernière mise à jour décroissante : on s'arrête à la première PR trop ancienne.
    for await (const { data } of octokit.paginate.iterator(octokit.rest.pulls.list, {
      ...base,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    })) {
      for (const summary of data) {
        if (new Date(summary.updated_at) < since) {
          return count;
        }
        await this.importOne(octokit, repo, summary.number);
        count += 1;
      }
    }
    return count;
  }

  private async importOne(octokit: Octokit, repo: RepositoryTarget, number: number) {
    const params = { owner: repo.owner, repo: repo.name, pull_number: number };
    const [{ data: pr }, commits, reviews] = await Promise.all([
      octokit.rest.pulls.get(params),
      octokit.paginate(octokit.rest.pulls.listCommits, { ...params, per_page: 100 }),
      octokit.paginate(octokit.rest.pulls.listReviews, { ...params, per_page: 100 }),
    ]);
    const data = pullRequestData(pr as GithubPullRequest, commits, reviews);

    await this.prisma.client.$transaction(async (tx) => {
      const saved = await tx.pullRequest.upsert({
        where: { githubPrId: BigInt(pr.id) },
        create: { repositoryId: repo.id, githubPrId: BigInt(pr.id), ...data },
        update: { repositoryId: repo.id, ...data },
      });
      for (const review of reviews) {
        const fields = {
          reviewerLogin: review.user?.login ?? 'ghost',
          state: reviewState(review.state),
          submittedAt: review.submitted_at ? new Date(review.submitted_at) : null,
        };
        await tx.review.upsert({
          where: { githubReviewId: BigInt(review.id) },
          create: { pullRequestId: saved.id, githubReviewId: BigInt(review.id), ...fields },
          update: { pullRequestId: saved.id, ...fields },
        });
      }
    });
  }
}
