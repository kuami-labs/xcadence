import { randomInt } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GLOBAL_TEST_LOCK, holdTestLock } from '@xcadence/db';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/configure-app.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const LOCK_TIMEOUT_MS = 120_000;

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

// Intégration : PostgreSQL et Redis réels, comme dans la CI. Aucune session dans ce fichier.
describe.skipIf(!process.env.DATABASE_URL || !process.env.REDIS_URL)('GET /demo (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService['client'];
  let demoId: string;
  let otherId: string;
  let publicRepo: string;
  let privateRepo: string;
  // Une seule démo à la fois : celles déjà en base (développement local) sont mises de côté.
  let previousDemos: string[] = [];
  let releaseLock: (() => Promise<void>) | undefined;
  const base = BigInt(randomInt(1_000_000, 900_000_000)) * 1000n;

  const get = (path: string) => request(app.getHttpServer()).get(path);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService).client;
    // Démo globale (une seule) : sérialisé avec les tests du worker qui la modifient.
    releaseLock = await holdTestLock(prisma, GLOBAL_TEST_LOCK);

    previousDemos = (
      await prisma.organization.findMany({ where: { isDemo: true }, select: { id: true } })
    ).map((o) => o.id);
    await prisma.organization.updateMany({ where: { isDemo: true }, data: { isDemo: false } });

    demoId = (
      await prisma.organization.create({
        data: { githubOrgId: base, name: 'demo-org', installationId: base, isDemo: true },
      })
    ).id;
    otherId = (
      await prisma.organization.create({
        data: { githubOrgId: base + 1n, name: 'autre', installationId: base + 1n },
      })
    ).id;
    const repo = (organizationId: string, n: bigint, name: string, isPrivate: boolean) =>
      prisma.repository.create({
        data: {
          organizationId,
          githubRepoId: base + n,
          name,
          isPrivate,
          isTracked: true,
          defaultBranch: 'main',
        },
      });
    publicRepo = (await repo(demoId, 0n, 'public', false)).id;
    privateRepo = (await repo(demoId, 1n, 'prive', true)).id;
    const otherRepo = (await repo(otherId, 2n, 'secret', false)).id;
    await prisma.repository.create({
      data: {
        organizationId: demoId,
        githubRepoId: base + 3n,
        name: 'non-suivi',
        isPrivate: false,
      },
    });

    const metric = (organizationId: string, repositoryId: string | null, value: number) =>
      prisma.weeklyMetric.create({
        data: {
          organizationId,
          repositoryId,
          weekStart: new Date('2026-11-23'),
          metricKey: 'lead_time',
          value,
          sampleSize: 3,
        },
      });
    await metric(demoId, null, 10);
    await metric(demoId, publicRepo, 6);
    await metric(demoId, privateRepo, 14);
    await metric(otherId, null, 99);

    let n = 0n;
    for (const repositoryId of [publicRepo, privateRepo, otherRepo]) {
      n += 1n;
      await prisma.pullRequest.create({
        data: {
          repositoryId,
          githubPrId: base * 10n + n,
          number: Number(n),
          authorLogin: 'a',
          state: 'open',
          isDraft: false,
          createdAt: ago(10),
          additions: 5,
          deletions: 1,
        },
      });
    }
    // Attente possible du verrou, tenu par un autre fichier de test.
  }, LOCK_TIMEOUT_MS);

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: [demoId, otherId] } } });
    await prisma.organization.updateMany({
      where: { id: { in: previousDemos } },
      data: { isDemo: true },
    });
    await releaseLock?.();
    await app.close();
  });

  it('se lit sans session et ne liste que les dépôts suivis et publics', async () => {
    const res = await get('/demo').expect(200);
    expect(res.body).toEqual({
      organization: { name: 'demo-org' },
      repositories: [{ id: publicRepo, name: 'public' }],
      organizationMetrics: false,
    });
  });

  it("sert les métriques d'un dépôt public, jamais celles d'un dépôt privé ou d'une autre organisation", async () => {
    const res = await get(`/demo/metrics?repo=${publicRepo}&from=2026-11-01&to=2026-11-30`).expect(
      200,
    );
    expect(res.body.metrics.map((m: { value: number }) => m.value)).toEqual([6]);
    await get(`/demo/metrics?repo=${privateRepo}`).expect(404);
    const other = await prisma.repository.findFirstOrThrow({ where: { organizationId: otherId } });
    await get(`/demo/metrics?repo=${other.id}`).expect(404);
  });

  it("ne sert l'agrégat de l'organisation que s'il ne contient aucun dépôt privé", async () => {
    await get('/demo/metrics').expect(404);
    await prisma.repository.update({ where: { id: privateRepo }, data: { isTracked: false } });
    try {
      expect((await get('/demo').expect(200)).body.organizationMetrics).toBe(true);
      const res = await get('/demo/metrics?from=2026-11-01&to=2026-11-30').expect(200);
      expect(res.body.metrics.map((m: { value: number }) => m.value)).toEqual([10]);
    } finally {
      await prisma.repository.update({ where: { id: privateRepo }, data: { isTracked: true } });
    }
  });

  it('limite les goulots aux dépôts publics de la démo', async () => {
    const res = await get('/demo/bottlenecks').expect(200);
    expect(
      res.body.oldPullRequests.map((p: { repositoryName: string }) => p.repositoryName),
    ).toEqual(['public']);
    expect(JSON.stringify(res.body)).not.toMatch(/prive|secret/);
  });

  it('refuse toute écriture, et les routes privées restent fermées sans session', async () => {
    await request(app.getHttpServer()).post('/demo').expect(404);
    await request(app.getHttpServer()).patch('/demo/metrics').expect(404);
    await request(app.getHttpServer())
      .patch(`/orgs/${demoId}/repositories/${publicRepo}`)
      .send({ isTracked: false })
      .expect(401);
    await get(`/orgs/${demoId}/metrics`).expect(401);
    await get(`/orgs/${demoId}/summaries/latest`).expect(401);
  });

  it("répond 404 quand aucune organisation n'est la démo", async () => {
    await prisma.organization.update({ where: { id: demoId }, data: { isDemo: false } });
    try {
      await get('/demo').expect(404);
      await get('/demo/bottlenecks').expect(404);
    } finally {
      await prisma.organization.update({ where: { id: demoId }, data: { isDemo: true } });
    }
  });
});
