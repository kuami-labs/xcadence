import { randomInt } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { AuthService } from './../src/auth/auth.service.js';
import { configureApp } from './../src/configure-app.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

// Intégration : PostgreSQL et Redis réels, comme dans la CI.
describe.skipIf(!process.env.DATABASE_URL || !process.env.REDIS_URL)(
  'GET /orgs/:orgId/metrics et /bottlenecks (e2e)',
  () => {
    let app: INestApplication<App>;
    let prisma: PrismaService['client'];
    let session: string;
    let orgId: string;
    let otherOrgId: string;
    let repoId: string;
    const base = BigInt(randomInt(1_000_000, 900_000_000)) * 1000n;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = moduleFixture.createNestApplication();
      configureApp(app);
      await app.init();
      prisma = app.get(PrismaService).client;

      const user = await prisma.user.create({ data: { githubId: base, login: `u-${base}` } });
      orgId = (await prisma.organization.create({ data: { githubOrgId: base, name: 'mon-org' } }))
        .id;
      otherOrgId = (
        await prisma.organization.create({ data: { githubOrgId: base + 1n, name: 'autre' } })
      ).id;
      await prisma.membership.create({ data: { userId: user.id, organizationId: orgId } });
      repoId = (
        await prisma.repository.create({
          data: {
            organizationId: orgId,
            githubRepoId: base,
            name: 'api',
            isTracked: true,
            defaultBranch: 'main',
          },
        })
      ).id;
      const otherRepo = await prisma.repository.create({
        data: {
          organizationId: otherOrgId,
          githubRepoId: base + 1n,
          name: 'secret',
          isTracked: true,
        },
      });

      const metric = (
        organizationId: string,
        repositoryId: string | null,
        weekStart: string,
        value: number,
      ) =>
        prisma.weeklyMetric.create({
          data: {
            organizationId,
            repositoryId,
            weekStart: new Date(weekStart),
            metricKey: 'lead_time',
            value,
            sampleSize: 3,
          },
        });
      await metric(orgId, null, '2026-11-16', 10);
      await metric(orgId, null, '2026-11-23', 8);
      await metric(orgId, repoId, '2026-11-23', 6);
      await metric(otherOrgId, null, '2026-11-23', 99);

      const pr = (repositoryId: string, n: number, data: object) =>
        prisma.pullRequest.create({
          data: {
            repositoryId,
            githubPrId: base * 10n + BigInt(n),
            number: n,
            authorLogin: 'a',
            state: 'open',
            additions: 10,
            deletions: 2,
            createdAt: ago(1),
            ...data,
          },
        });
      await pr(repoId, 1, { createdAt: ago(3) }); // en attente de revue
      await pr(repoId, 2, { createdAt: ago(3), isDraft: true }); // brouillon : pas en attente
      await pr(repoId, 3, { createdAt: ago(10), firstReviewAt: ago(9) }); // ancienne, relue
      await pr(repoId, 4, { createdAt: ago(1) }); // récente
      await pr(otherRepo.id, 5, { createdAt: ago(20) }); // autre organisation

      const run = (n: number, minutes: number, conclusion: string, branch = 'main') =>
        prisma.workflowRun.create({
          data: {
            repositoryId: repoId,
            githubRunId: base * 10n + BigInt(n),
            workflowName: 'CI',
            branch,
            conclusion,
            startedAt: ago(2),
            completedAt: new Date(ago(2).getTime() + minutes * 60_000),
          },
        });
      await run(1, 10, 'success');
      await run(2, 20, 'failure');
      await run(3, 90, 'success', 'feature'); // hors branche principale

      session = await app.get(AuthService).createSession(user.id);
    });

    afterAll(async () => {
      await prisma.organization.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } });
      await prisma.user.deleteMany({ where: { githubId: base } });
      await app.close();
    });

    const get = (path: string) =>
      request(app.getHttpServer()).get(path).set('cookie', `xc_session=${session}`);

    it("renvoie les métriques de l'organisation, filtrées par période", async () => {
      const res = await get(`/orgs/${orgId}/metrics?from=2026-11-20&to=2026-11-30`).expect(200);
      expect(res.body).toEqual({
        repositoryId: null,
        from: '2026-11-20',
        to: '2026-11-30',
        metrics: [{ metricKey: 'lead_time', weekStart: '2026-11-23', value: 8, sampleSize: 3 }],
      });
    });

    it("renvoie les métriques d'un dépôt", async () => {
      const res = await get(
        `/orgs/${orgId}/metrics?repo=${repoId}&from=2026-11-01&to=2026-11-30`,
      ).expect(200);
      expect(res.body.metrics).toEqual([
        { metricKey: 'lead_time', weekStart: '2026-11-23', value: 6, sampleSize: 3 },
      ]);
    });

    it('valide les paramètres', async () => {
      await get(`/orgs/${orgId}/metrics?repo=pas-un-uuid`).expect(400);
      await get(`/orgs/${orgId}/metrics?from=2026-12-01&to=2026-11-01`).expect(400);
      await get(`/orgs/${orgId}/metrics?inconnu=1`).expect(400);
    });

    it('liste les goulots', async () => {
      const res = await get(`/orgs/${orgId}/bottlenecks`).expect(200);
      expect(res.body.awaitingReview.map((p: { number: number }) => p.number)).toEqual([1]);
      expect(res.body.oldPullRequests.map((p: { number: number }) => p.number)).toEqual([3]);
      expect(res.body.awaitingReview[0]).toMatchObject({ repositoryName: 'api', size: 12 });
      expect(res.body.awaitingReview[0]).not.toHaveProperty('authorLogin');
      expect(res.body.slowWorkflows).toEqual([
        {
          repositoryId: repoId,
          repositoryName: 'api',
          workflowName: 'CI',
          runs: 2,
          p90Minutes: 19,
          failureRate: 50,
        },
      ]);
    });

    it("donne l'avancement des imports", async () => {
      await prisma.syncJob.create({
        data: {
          organizationId: orgId,
          type: 'backfill',
          status: 'succeeded',
          startedAt: ago(1),
          finishedAt: ago(1),
        },
      });
      let res = await get(`/orgs/${orgId}/sync-status`).expect(200);
      expect(res.body.inProgress).toBe(false);
      await prisma.syncJob.create({
        data: { organizationId: orgId, type: 'backfill', status: 'running', startedAt: ago(0) },
      });
      res = await get(`/orgs/${orgId}/sync-status`).expect(200);
      expect(res.body.inProgress).toBe(true);
      expect(res.body.jobs.map((j: { status: string }) => j.status)).toEqual([
        'running',
        'succeeded',
      ]);
      await get(`/orgs/${otherOrgId}/sync-status`).expect(403);
    });

    it("ne donne jamais accès aux données d'une autre organisation", async () => {
      await get(`/orgs/${otherOrgId}/metrics`).expect(403);
      await get(`/orgs/${otherOrgId}/bottlenecks`).expect(403);
      const viaOwn = await get(`/orgs/${orgId}/metrics?from=2026-11-01&to=2026-11-30`).expect(200);
      expect(viaOwn.body.metrics.map((m: { value: number }) => m.value)).not.toContain(99);
      await request(app.getHttpServer()).get(`/orgs/${orgId}/metrics`).expect(401);
    });
  },
);
