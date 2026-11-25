import { randomInt } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { GLOBAL_TEST_LOCK, holdTestLock } from '@xcadence/db';
import { JOBS, METRIC_KEYS } from '@xcadence/shared';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { RecomputeProcessor } from './recompute.processor.js';

// Intégration sur PostgreSQL (DATABASE_URL), données fixes.
describe.skipIf(!process.env.DATABASE_URL)('RecomputeProcessor', () => {
  let module: TestingModule;
  let processor: RecomputeProcessor;
  let prisma: PrismaService['client'];
  const base = randomInt(1_000_000, 900_000_000) * 1000;
  let orgId: string;
  let repoId: string;
  let userId: string;
  const job = (data: { organizationId?: string }, name: string = JOBS.recomputeWeeklyMetrics) =>
    ({ name, data }) as Job;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [RecomputeProcessor, PrismaService],
    }).compile();
    processor = module.get(RecomputeProcessor);
    prisma = module.get(PrismaService).client;
    orgId = (await prisma.organization.create({ data: { githubOrgId: BigInt(base), name: 'o' } }))
      .id;
    repoId = (
      await prisma.repository.create({
        data: {
          organizationId: orgId,
          githubRepoId: BigInt(base),
          name: 'r',
          isTracked: true,
          defaultBranch: 'main',
        },
      })
    ).id;
    await prisma.pullRequest.create({
      data: {
        repositoryId: repoId,
        githubPrId: BigInt(base),
        number: 1,
        authorLogin: 'a',
        state: 'merged',
        createdAt: new Date('2026-11-23T08:00:00Z'),
        firstReviewAt: new Date('2026-11-23T10:00:00Z'),
        mergedAt: new Date('2026-11-23T12:00:00Z'),
      },
    });
    await prisma.deployment.create({
      data: {
        repositoryId: repoId,
        githubDeploymentId: BigInt(base),
        sha: 'a',
        environment: 'production',
        status: 'success',
        createdAt: new Date('2026-11-23T14:00:00Z'),
        finishedAt: new Date('2026-11-23T14:00:00Z'),
      },
    });
    userId = (await prisma.user.create({ data: { githubId: BigInt(base), login: 'u' } })).id;
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await module.close();
  });

  const metrics = () =>
    prisma.weeklyMetric.findMany({
      where: { organizationId: orgId },
      orderBy: { metricKey: 'asc' },
    });

  it("écrit les métriques par dépôt et pour toute l'organisation, sans doublon au rejeu", async () => {
    await processor.process(job({ organizationId: orgId }));
    const first = await metrics();
    await processor.process(job({ organizationId: orgId }));
    const second = await metrics();

    expect(second).toHaveLength(first.length);
    const keys = (repositoryId: string | null) =>
      second.filter((m) => m.repositoryId === repositoryId).map((m) => m.metricKey);
    expect(keys(repoId)).toEqual(
      expect.arrayContaining([METRIC_KEYS.prLifetime, METRIC_KEYS.deploymentFrequency]),
    );
    expect(keys(null)).toEqual(keys(repoId));
    const lifetime = second.find(
      (m) => m.repositoryId === null && m.metricKey === METRIC_KEYS.prLifetime,
    );
    expect(lifetime).toMatchObject({ value: 4, sampleSize: 1 });
    expect(lifetime?.weekStart).toEqual(new Date('2026-11-23T00:00:00Z'));
  });

  it('passage nocturne : toutes les organisations et purge des sessions expirées', async () => {
    const expired = await prisma.session.create({
      data: { tokenHash: `expiree-${base}`, userId, expiresAt: new Date(Date.now() - 1000) },
    });
    const valid = await prisma.session.create({
      data: { tokenHash: `valide-${base}`, userId, expiresAt: new Date(Date.now() + 60_000) },
    });
    // Parcourt toutes les organisations : sérialisé avec les tests qui en créent ou en suppriment
    // massivement (jeu de test), sinon interblocage avec leur suppression en cascade.
    const release = await holdTestLock(prisma, GLOBAL_TEST_LOCK);
    let result: Awaited<ReturnType<RecomputeProcessor['process']>>;
    try {
      result = await processor.process(job({}));
    } finally {
      await release();
    }
    expect(result.organizations).toBeGreaterThanOrEqual(1);
    expect(await prisma.session.count({ where: { id: expired.id } })).toBe(0);
    expect(await prisma.session.count({ where: { id: valid.id } })).toBe(1);
  }, 120_000);

  it('refuse un job inconnu', async () => {
    await expect(processor.process(job({}, 'autre'))).rejects.toThrow('Job inconnu');
  });
});
