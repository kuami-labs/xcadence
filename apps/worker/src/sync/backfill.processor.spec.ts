import { randomInt } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { JOBS } from '@xcadence/shared';
import type { Job } from 'bullmq';
import { GithubService } from '../github/github.service.js';
import { MetricsScheduler } from '../metrics/metrics.scheduler.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BackfillProcessor } from './backfill.processor.js';
import { DeploymentsImporter } from './deployments.importer.js';
import { PullRequestsImporter } from './pull-requests.importer.js';
import { WorkflowRunsImporter } from './workflow-runs.importer.js';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

/** Faux client Octokit : réponses fixes, aucun appel à GitHub. */
function fakeOctokit(base: number) {
  const pr = (n: number, updatedDaysAgo: number, merged: boolean) => ({
    id: base + n,
    number: n,
    state: merged ? 'closed' : 'open',
    draft: false,
    user: { id: 1, login: 'auteur' },
    created_at: daysAgo(updatedDaysAgo + 1),
    updated_at: daysAgo(updatedDaysAgo),
    merged_at: merged ? daysAgo(updatedDaysAgo) : null,
    closed_at: merged ? daysAgo(updatedDaysAgo) : null,
    additions: 10 * n,
    deletions: n,
  });
  // Deux pages, triées par mise à jour décroissante ; la PR 3 a plus de 90 jours.
  const pages = [[pr(1, 2, true), pr(2, 10, false)], [pr(3, 120, true)]];
  const all = pages.flat();
  const reviewsOf: Record<number, unknown[]> = {
    1: [
      {
        id: base + 101,
        state: 'APPROVED',
        user: { id: 2, login: 'relecteur' },
        submitted_at: daysAgo(2),
      },
    ],
    2: [],
  };
  const runs = [
    {
      id: base + 201,
      name: 'CI',
      head_branch: 'main',
      status: 'completed',
      conclusion: 'success',
      created_at: daysAgo(3),
      updated_at: daysAgo(3),
      run_started_at: daysAgo(3),
    },
    {
      id: base + 202,
      name: 'CI',
      head_branch: 'feature/x',
      status: 'in_progress',
      conclusion: null,
      created_at: daysAgo(1),
      updated_at: daysAgo(1),
    },
  ];
  // Du plus récent au plus ancien ; le dernier a plus de 90 jours.
  const deployments = [
    { id: base + 301, sha: 'abc', environment: 'production', created_at: daysAgo(1) },
    { id: base + 302, sha: 'def', environment: 'production', created_at: daysAgo(4) },
    { id: base + 303, sha: 'old', environment: 'production', created_at: daysAgo(100) },
  ];
  const statusesOf: Record<number, unknown[]> = {
    [base + 301]: [{ state: 'in_progress', created_at: daysAgo(1) }],
    [base + 302]: [{ state: 'failure', created_at: daysAgo(4) }],
  };
  const rest = {
    actions: { listWorkflowRunsForRepo: vi.fn() },
    repos: {
      get: vi.fn().mockResolvedValue({ data: { default_branch: 'main', private: false } }),
      listDeployments: vi.fn(),
      listDeploymentStatuses: vi.fn(async ({ deployment_id }: { deployment_id: number }) => ({
        data: statusesOf[deployment_id] ?? [],
      })),
    },
    pulls: {
      list: vi.fn(),
      get: vi.fn(async ({ pull_number }: { pull_number: number }) => ({
        data: all.find((p) => p.number === pull_number),
      })),
      listCommits: vi.fn(),
      listReviews: vi.fn(),
    },
  };
  const paginate = Object.assign(
    vi.fn(async (fn: unknown, params: { pull_number: number }) => {
      if (fn === rest.pulls.listReviews) return reviewsOf[params.pull_number] ?? [];
      return [{ commit: { author: { date: daysAgo(5) }, committer: null } }];
    }),
    {
      iterator: vi.fn(async function* (fn: unknown) {
        if (fn === rest.actions.listWorkflowRunsForRepo) {
          yield { data: runs };
          return;
        }
        if (fn === rest.repos.listDeployments) {
          yield { data: deployments };
          return;
        }
        for (const data of pages) yield { data };
      }),
    },
  );
  return { rest, paginate };
}

// Intégration sur PostgreSQL (DATABASE_URL), comme dans la CI.
describe.skipIf(!process.env.DATABASE_URL)('BackfillProcessor', () => {
  let module: TestingModule;
  let processor: BackfillProcessor;
  let prisma: PrismaService['client'];
  const base = randomInt(1_000_000, 900_000_000) * 1000;
  const octokit = fakeOctokit(base);
  const github = { forInstallation: vi.fn().mockResolvedValue(octokit) };
  const scheduleFor = vi.fn();
  let repoId: string;
  let orgId: string;

  const job = (repositoryId: string, name: string = JOBS.backfillRepository) =>
    ({ name, data: { repositoryId } }) as Job;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        BackfillProcessor,
        PullRequestsImporter,
        WorkflowRunsImporter,
        DeploymentsImporter,
        PrismaService,
        { provide: GithubService, useValue: github },
        { provide: MetricsScheduler, useValue: { scheduleFor } },
      ],
    }).compile();
    processor = module.get(BackfillProcessor);
    prisma = module.get(PrismaService).client;
    const org = await prisma.organization.create({
      data: { githubOrgId: BigInt(base), name: 'org-test', installationId: BigInt(base) },
    });
    orgId = org.id;
    repoId = (
      await prisma.repository.create({
        data: {
          organizationId: org.id,
          githubRepoId: BigInt(base),
          name: 'depot',
          isTracked: true,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await module.close();
  });

  it('importe 90 jours de PR, de revues et de runs, et le note dans sync_jobs', async () => {
    await expect(processor.process(job(repoId))).resolves.toEqual({
      pullRequests: 2,
      workflowRuns: 2,
      deployments: 2,
    });

    const prs = await prisma.pullRequest.findMany({
      where: { repositoryId: repoId },
      orderBy: { number: 'asc' },
      include: { reviews: true },
    });
    expect(prs.map((p) => [p.number, p.state])).toEqual([
      [1, 'merged'],
      [2, 'open'],
    ]);
    expect(prs[0].reviews).toHaveLength(1);
    expect(prs[0].firstReviewAt).not.toBeNull();
    expect(prs[0].firstCommitAt).not.toBeNull();
    expect(prs[0].additions).toBe(10);

    const storedRuns = await prisma.workflowRun.findMany({
      where: { repositoryId: repoId },
      orderBy: { startedAt: 'asc' },
    });
    expect(storedRuns.map((r) => [r.branch, r.conclusion, r.completedAt !== null])).toEqual([
      ['main', 'success', true],
      ['feature/x', null, false],
    ]);

    const storedDeployments = await prisma.deployment.findMany({
      where: { repositoryId: repoId },
      orderBy: { createdAt: 'asc' },
    });
    expect(storedDeployments.map((d) => [d.sha, d.status, d.finishedAt !== null])).toEqual([
      ['def', 'failure', true],
      ['abc', 'in_progress', false],
    ]);

    const repo = await prisma.repository.findUniqueOrThrow({ where: { id: repoId } });
    expect(repo.defaultBranch).toBe('main');
    expect(repo.isPrivate).toBe(false);
    const syncJobs = await prisma.syncJob.findMany({ where: { organizationId: orgId } });
    expect(syncJobs.map((s) => [s.type, s.status])).toEqual([['backfill', 'succeeded']]);
    expect(scheduleFor).toHaveBeenCalledWith(orgId);
  });

  it('un import rejoué ne crée aucun doublon', async () => {
    await processor.process(job(repoId));
    expect(await prisma.pullRequest.count({ where: { repositoryId: repoId } })).toBe(2);
    expect(await prisma.review.count({ where: { pullRequest: { repositoryId: repoId } } })).toBe(1);
    expect(await prisma.workflowRun.count({ where: { repositoryId: repoId } })).toBe(2);
    expect(await prisma.deployment.count({ where: { repositoryId: repoId } })).toBe(2);
  });

  it("note l'échec dans sync_jobs et laisse BullMQ réessayer", async () => {
    octokit.rest.repos.get.mockRejectedValueOnce(new Error('GitHub indisponible'));
    await expect(processor.process(job(repoId))).rejects.toThrow('GitHub indisponible');
    const failed = await prisma.syncJob.findFirst({
      where: { organizationId: orgId, status: 'failed' },
    });
    expect(failed?.error).toBe('GitHub indisponible');
  });

  it('ignore un dépôt non suivi et un job inconnu', async () => {
    await prisma.repository.update({ where: { id: repoId }, data: { isTracked: false } });
    await expect(processor.process(job(repoId))).resolves.toEqual({
      skipped: 'dépôt absent ou non suivi',
    });
    await expect(processor.process(job(repoId, 'autre'))).rejects.toThrow('Job inconnu');
  });
});
