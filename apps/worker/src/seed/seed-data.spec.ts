import { SEED_DAYS, random, seedRepositories } from './seed-data.js';

describe('seedRepositories', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  const repos = seedRepositories(now);
  const all = <T>(pick: (r: (typeof repos)[number]) => T[]) => repos.flatMap(pick);

  it('est déterministe', () => {
    expect(seedRepositories(now)).toEqual(repos);
    expect(random(1)()).toBe(random(1)());
  });

  it('produit 90 jours de PR, de runs et de déploiements de production', () => {
    expect(repos.map((r) => r.name)).toEqual(['api', 'web']);
    const since = now.getTime() - (SEED_DAYS + 1) * 86_400_000;
    for (const dates of [
      all((r) => r.pullRequests.map((p) => p.createdAt)),
      all((r) => r.workflowRuns.map((w) => w.startedAt)),
      all((r) => r.deployments.map((d) => d.createdAt)),
    ]) {
      expect(dates.length).toBeGreaterThan(50);
      expect(dates.every((d) => d.getTime() > since && d < now)).toBe(true);
    }
    expect(all((r) => r.deployments).every((d) => d.environment === 'production')).toBe(true);
    expect(all((r) => r.deployments).some((d) => d.status === 'failure')).toBe(true);
  });

  it('garde des dates cohérentes et rien dans le futur', () => {
    for (const pr of all((r) => r.pullRequests)) {
      expect(pr.firstCommitAt.getTime()).toBeLessThan(pr.createdAt.getTime());
      if (pr.firstReviewAt)
        expect(pr.firstReviewAt > pr.createdAt && pr.firstReviewAt < now).toBe(true);
      expect(pr.mergedAt === null).toBe(pr.state !== 'merged');
      if (pr.mergedAt) expect(pr.mergedAt < now).toBe(true);
    }
    for (const run of all((r) => r.workflowRuns)) {
      expect(run.completedAt > run.startedAt && run.completedAt < now).toBe(true);
    }
    // PR oubliées, pour les goulots.
    expect(
      all((r) => r.pullRequests).filter(
        (p) => p.state === 'open' && now.getTime() - p.createdAt.getTime() > 7 * 86_400_000,
      ).length,
    ).toBeGreaterThanOrEqual(6);
  });

  it("n'utilise que des identifiants GitHub négatifs et uniques", () => {
    const ids = [
      ...repos.map((r) => r.githubRepoId),
      ...all((r) =>
        r.pullRequests.flatMap((p) => [
          p.githubPrId,
          ...(p.review ? [p.review.githubReviewId] : []),
        ]),
      ),
      ...all((r) => r.workflowRuns.map((w) => w.githubRunId)),
      ...all((r) => r.deployments.map((d) => d.githubDeploymentId)),
    ];
    expect(ids.every((id) => id < 0n)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
