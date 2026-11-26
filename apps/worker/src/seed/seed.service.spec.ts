import { randomInt } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { GLOBAL_TEST_LOCK, holdTestLock } from '@xcadence/db';
import { PrismaService } from '../prisma/prisma.service.js';
import { SEED_GITHUB_ORG_ID } from './seed-data.js';
import { SeedService } from './seed.service.js';

const LOCK_TIMEOUT_MS = 120_000;
/** Chaque chargement écrit quelques centaines de lignes. */
const SEED_TEST_TIMEOUT_MS = 60_000;

// Intégration sur PostgreSQL (DATABASE_URL), comme dans la CI ; aucun appel à GitHub.
describe.skipIf(!process.env.DATABASE_URL)('SeedService', () => {
  let module: TestingModule;
  let seed: SeedService;
  let prisma: PrismaService['client'];
  // Le jeu de test et la démo existants (développement local) sont restaurés après.
  let previousDemos: string[] = [];
  let hadSeed = false;
  let seedWasDemo = false;
  let releaseLock: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    module = await Test.createTestingModule({ providers: [SeedService, PrismaService] }).compile();
    seed = module.get(SeedService);
    prisma = module.get(PrismaService).client;
    releaseLock = await holdTestLock(prisma, GLOBAL_TEST_LOCK);
    const existing = await prisma.organization.findUnique({
      where: { githubOrgId: SEED_GITHUB_ORG_ID },
    });
    hadSeed = existing !== null;
    seedWasDemo = existing?.isDemo ?? false;
    previousDemos = (
      await prisma.organization.findMany({
        where: { isDemo: true, githubOrgId: { not: SEED_GITHUB_ORG_ID } },
        select: { id: true },
      })
    ).map((o) => o.id);
    // Attente possible du verrou, tenu par un autre fichier de test.
  }, LOCK_TIMEOUT_MS);

  afterAll(async () => {
    if (hadSeed) await seed.run();
    else await prisma.organization.deleteMany({ where: { githubOrgId: SEED_GITHUB_ORG_ID } });
    await prisma.organization.updateMany({ where: { isDemo: true }, data: { isDemo: false } });
    await prisma.organization.updateMany({
      where: { id: { in: previousDemos } },
      data: { isDemo: true },
    });
    if (seedWasDemo) {
      await prisma.organization.update({
        where: { githubOrgId: SEED_GITHUB_ORG_ID },
        data: { isDemo: true },
      });
    }
    await releaseLock?.();
    await module.close();
  });

  it(
    "charge l'organisation fictive, ses données et ses métriques DORA, et devient la démo",
    async () => {
      await prisma.organization.updateMany({ where: { isDemo: true }, data: { isDemo: false } });
      const result = await seed.run();
      expect(result.isDemo).toBe(true);
      expect(result.pullRequests).toBeGreaterThan(50);
      expect(result.metrics).toBeGreaterThan(0);
      const keys = await prisma.weeklyMetric.findMany({
        where: { organizationId: result.organizationId, repositoryId: null },
        distinct: ['metricKey'],
        select: { metricKey: true },
      });
      expect(keys.map((k) => k.metricKey)).toEqual(
        expect.arrayContaining([
          'deployment_frequency',
          'lead_time',
          'change_failure_rate',
          'time_to_restore',
        ]),
      );
    },
    SEED_TEST_TIMEOUT_MS,
  );

  it(
    "est rejouable et ne prend pas la place d'une démo existante",
    async () => {
      const other = await prisma.organization.create({
        data: {
          githubOrgId: -BigInt(randomInt(1_000, 1_000_000)),
          name: 'autre-demo',
          isDemo: true,
        },
      });
      try {
        const first = await seed.run();
        const second = await seed.run();
        expect(second).toMatchObject({ isDemo: false, pullRequests: first.pullRequests });
        expect(
          await prisma.organization.count({ where: { githubOrgId: SEED_GITHUB_ORG_ID } }),
        ).toBe(1);
        expect(
          await prisma.pullRequest.count({
            where: { repository: { organizationId: second.organizationId } },
          }),
        ).toBe(first.pullRequests);
      } finally {
        await prisma.organization.delete({ where: { id: other.id } });
      }
    },
    SEED_TEST_TIMEOUT_MS,
  );
});
