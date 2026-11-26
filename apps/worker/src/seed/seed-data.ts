/**
 * Jeu de test (pnpm db:seed) : une organisation fictive et 90 jours d'activité, sans GitHub.
 * Génération déterministe : même date de référence et même graine, mêmes données.
 * Les identifiants GitHub sont négatifs : aucun identifiant réel ne l'est, aucune collision possible.
 */

export const SEED_GITHUB_ORG_ID = -1n;
export const SEED_ORGANIZATION_NAME = 'acme (jeu de test)';
export const SEED_DAYS = 90;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const AUTHORS = ['dev-a', 'dev-b', 'dev-c', 'dev-d', 'dev-e'];
const REVIEWERS = ['relecteur-a', 'relecteur-b', 'relecteur-c'];

export interface SeedPullRequest {
  githubPrId: bigint;
  number: number;
  authorLogin: string;
  state: 'open' | 'closed' | 'merged';
  isDraft: boolean;
  createdAt: Date;
  firstCommitAt: Date;
  firstReviewAt: Date | null;
  mergedAt: Date | null;
  closedAt: Date | null;
  additions: number;
  deletions: number;
  review: { githubReviewId: bigint; reviewerLogin: string; submittedAt: Date } | null;
}

export interface SeedWorkflowRun {
  githubRunId: bigint;
  workflowName: string;
  branch: string;
  conclusion: 'success' | 'failure';
  startedAt: Date;
  completedAt: Date;
}

export interface SeedDeployment {
  githubDeploymentId: bigint;
  sha: string;
  environment: string;
  status: 'success' | 'failure';
  createdAt: Date;
  finishedAt: Date;
}

export interface SeedRepository {
  githubRepoId: bigint;
  name: string;
  pullRequests: SeedPullRequest[];
  workflowRuns: SeedWorkflowRun[];
  deployments: SeedDeployment[];
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rand: () => number, min: number, max: number) => min + rand() * (max - min);
const pick = <T>(rand: () => number, items: T[]): T => items[Math.floor(rand() * items.length)];
const weekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

/** Deux dépôts : une API qui livre souvent, un front plus irrégulier. */
export function seedRepositories(now: Date, seed = 42): SeedRepository[] {
  return [
    seedRepository(now, random(seed), 1, 'api', { prsPerDay: 2, deploysPerDay: 1.2, ciMinutes: 7 }),
    seedRepository(now, random(seed + 1), 2, 'web', {
      prsPerDay: 1.4,
      deploysPerDay: 0.6,
      ciMinutes: 4,
    }),
  ];
}

function seedRepository(
  now: Date,
  rand: () => number,
  index: number,
  name: string,
  profile: { prsPerDay: number; deploysPerDay: number; ciMinutes: number },
): SeedRepository {
  // Identifiants négatifs, distincts par dépôt : -(index * 1e6 + compteur).
  let counter = 0;
  const id = () => -BigInt(index * 1_000_000 + ++counter);
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - SEED_DAYS * DAY,
  );
  const pullRequests: SeedPullRequest[] = [];
  const workflowRuns: SeedWorkflowRun[] = [];
  const deployments: SeedDeployment[] = [];
  let number = 0;

  for (let day = 0; day < SEED_DAYS; day++) {
    const date = new Date(start.getTime() + day * DAY);
    if (weekend(date)) continue;
    // L'équipe s'améliore : revues et CI plus rapides au fil des semaines.
    const progress = day / SEED_DAYS;

    const prs = Math.round(between(rand, 0, profile.prsPerDay * 2));
    for (let i = 0; i < prs; i++) {
      const createdAt = new Date(date.getTime() + between(rand, 8, 18) * HOUR);
      if (createdAt >= now) continue;
      const firstCommitAt = new Date(createdAt.getTime() - between(rand, 1, 30) * HOUR);
      const reviewDelay = between(rand, 1, 40 - 25 * progress) * HOUR;
      const reviewed = rand() > 0.05;
      const firstReviewAt = reviewed ? new Date(createdAt.getTime() + reviewDelay) : null;
      const outcome = rand();
      const mergeAt = new Date(
        (firstReviewAt ?? createdAt).getTime() + between(rand, 1, 20) * HOUR,
      );
      const finished = mergeAt < now;
      const state = !finished ? 'open' : outcome < 0.88 ? 'merged' : 'closed';
      const additions = Math.round(between(rand, 5, 500) ** 1.1);
      pullRequests.push({
        githubPrId: id(),
        number: ++number,
        authorLogin: pick(rand, AUTHORS),
        state,
        isDraft: false,
        createdAt,
        firstCommitAt,
        firstReviewAt: firstReviewAt && firstReviewAt < now ? firstReviewAt : null,
        mergedAt: state === 'merged' ? mergeAt : null,
        closedAt: state === 'open' ? null : mergeAt,
        additions,
        deletions: Math.round(additions * between(rand, 0.1, 0.6)),
        review:
          firstReviewAt && firstReviewAt < now
            ? {
                githubReviewId: id(),
                reviewerLogin: pick(rand, REVIEWERS),
                submittedAt: firstReviewAt,
              }
            : null,
      });

      // CI de la PR, puis de la fusion sur main.
      for (const [branch, at] of [
        [`feature/${number}`, createdAt],
        ...(state === 'merged' ? [['main', mergeAt] as const] : []),
      ] as const) {
        const minutes = between(rand, 0.7, 1.3) * profile.ciMinutes * (1.2 - 0.4 * progress);
        if (at.getTime() + minutes * 60_000 >= now.getTime()) continue;
        workflowRuns.push({
          githubRunId: id(),
          workflowName: 'CI',
          branch,
          conclusion: rand() < 0.1 ? 'failure' : 'success',
          startedAt: at,
          completedAt: new Date(at.getTime() + minutes * 60_000),
        });
      }
    }

    // Déploiements de production : un échec est suivi d'un correctif déployé quelques heures après.
    const deploys = Math.round(between(rand, 0, profile.deploysPerDay * 2));
    for (let i = 0; i < deploys; i++) {
      const createdAt = new Date(date.getTime() + between(rand, 10, 19) * HOUR);
      if (createdAt.getTime() + 10 * 60_000 >= now.getTime()) continue;
      const failed = rand() < 0.08;
      deployments.push(deployment(id(), name, createdAt, failed ? 'failure' : 'success'));
      if (failed) {
        const fixAt = new Date(createdAt.getTime() + between(rand, 1, 6) * HOUR);
        if (fixAt.getTime() + 10 * 60_000 < now.getTime()) {
          deployments.push(deployment(id(), name, fixAt, 'success'));
        }
      }
    }
  }

  // Quelques PR oubliées, pour la page des goulots.
  for (const daysAgo of [9, 12, 16]) {
    const createdAt = new Date(now.getTime() - daysAgo * DAY);
    pullRequests.push({
      githubPrId: id(),
      number: ++number,
      authorLogin: pick(rand, AUTHORS),
      state: 'open',
      isDraft: false,
      createdAt,
      firstCommitAt: new Date(createdAt.getTime() - 2 * HOUR),
      firstReviewAt: null,
      mergedAt: null,
      closedAt: null,
      additions: Math.round(between(rand, 200, 900)),
      deletions: Math.round(between(rand, 10, 200)),
      review: null,
    });
  }

  return { githubRepoId: -BigInt(index), name, pullRequests, workflowRuns, deployments };
}

function deployment(
  githubDeploymentId: bigint,
  repo: string,
  createdAt: Date,
  status: 'success' | 'failure',
): SeedDeployment {
  return {
    githubDeploymentId,
    sha: `${repo}-${-githubDeploymentId}`,
    environment: 'production',
    status,
    createdAt,
    finishedAt: new Date(createdAt.getTime() + 8 * 60_000),
  };
}
