import { randomInt } from 'node:crypto';
import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QUEUES } from '@xcadence/shared';
import type { Queue } from 'bullmq';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { AuthService } from './../src/auth/auth.service.js';
import { configureApp } from './../src/configure-app.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Intégration : PostgreSQL et Redis réels (DATABASE_URL, REDIS_URL), comme dans la CI.
describe.skipIf(!process.env.DATABASE_URL || !process.env.REDIS_URL)(
  'GET/PATCH /orgs/:orgId/repositories (e2e)',
  () => {
    let app: INestApplication<App>;
    let prisma: PrismaService['client'];
    let sync: Queue;
    let session: string;
    let orgId: string;
    let otherOrgId: string;
    let repoId: string;
    let otherRepoId: string;
    const base = BigInt(randomInt(1_000_000, 900_000_000)) * 1000n;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = moduleFixture.createNestApplication();
      configureApp(app);
      await app.init();
      prisma = app.get(PrismaService).client;
      sync = app.get<Queue>(getQueueToken(QUEUES.sync));

      const user = await prisma.user.create({ data: { githubId: base, login: `u-${base}` } });
      const org = await prisma.organization.create({
        data: { githubOrgId: base, name: 'mon-org' },
      });
      const other = await prisma.organization.create({
        data: { githubOrgId: base + 1n, name: 'autre-org' },
      });
      await prisma.membership.create({ data: { userId: user.id, organizationId: org.id } });
      orgId = org.id;
      otherOrgId = other.id;
      repoId = (
        await prisma.repository.create({
          data: { organizationId: org.id, githubRepoId: base, name: 'api' },
        })
      ).id;
      otherRepoId = (
        await prisma.repository.create({
          data: { organizationId: other.id, githubRepoId: base + 1n, name: 'secret' },
        })
      ).id;
      session = await app.get(AuthService).createSession(user.id);
    });

    afterAll(async () => {
      await sync.remove(`backfill-${repoId}`);
      await prisma.organization.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } });
      await prisma.user.deleteMany({ where: { githubId: base } });
      await app.close();
    });

    const api = () => request(app.getHttpServer());
    const cookie = () => `xc_session=${session}`;

    it("liste les dépôts de l'organisation, sans identifiant GitHub", async () => {
      const res = await api()
        .get(`/orgs/${orgId}/repositories`)
        .set('cookie', cookie())
        .expect(200);
      expect(res.body).toEqual([
        { id: repoId, name: 'api', defaultBranch: null, isTracked: false, deployRule: null },
      ]);
    });

    it("suit un dépôt et enfile l'import des 90 derniers jours", async () => {
      const res = await api()
        .patch(`/orgs/${orgId}/repositories/${repoId}`)
        .set('cookie', cookie())
        .send({ isTracked: true, deployRule: { source: 'deployments' } })
        .expect(200);
      expect(res.body).toMatchObject({ isTracked: true, deployRule: { source: 'deployments' } });
      const job = await sync.getJob(`backfill-${repoId}`);
      expect(job?.data).toEqual({ repositoryId: repoId });
    });

    it('valide les entrées et refuse les champs inconnus', async () => {
      await api()
        .patch(`/orgs/${orgId}/repositories/${repoId}`)
        .set('cookie', cookie())
        .send({ isTracked: 'oui' })
        .expect(400);
      await api()
        .patch(`/orgs/${orgId}/repositories/${repoId}`)
        .set('cookie', cookie())
        .send({ organizationId: otherOrgId })
        .expect(400);
      await api()
        .patch(`/orgs/${orgId}/repositories/pas-un-uuid`)
        .set('cookie', cookie())
        .send({})
        .expect(400);
    });

    it('liste les PR récentes d’un dépôt, sans auteur', async () => {
      await prisma.pullRequest.create({
        data: {
          repositoryId: repoId,
          githubPrId: base,
          number: 7,
          authorLogin: 'quelquun',
          state: 'merged',
          createdAt: new Date('2026-11-23T08:00:00Z'),
          firstReviewAt: new Date('2026-11-23T10:30:00Z'),
          mergedAt: new Date('2026-11-23T12:00:00Z'),
          additions: 10,
          deletions: 4,
        },
      });
      const res = await api()
        .get(`/orgs/${orgId}/repositories/${repoId}/pull-requests`)
        .set('cookie', cookie())
        .expect(200);
      expect(res.body).toEqual([
        {
          number: 7,
          state: 'merged',
          isDraft: false,
          createdAt: '2026-11-23T08:00:00.000Z',
          mergedAt: '2026-11-23T12:00:00.000Z',
          size: 14,
          timeToFirstReviewHours: 2.5,
        },
      ]);
      await api()
        .get(`/orgs/${orgId}/repositories/${otherRepoId}/pull-requests`)
        .set('cookie', cookie())
        .expect(404);
    });

    it("ne donne accès ni aux dépôts ni à l'organisation d'un autre", async () => {
      await api().get(`/orgs/${otherOrgId}/repositories`).set('cookie', cookie()).expect(403);
      await api()
        .patch(`/orgs/${otherOrgId}/repositories/${otherRepoId}`)
        .set('cookie', cookie())
        .send({ isTracked: true })
        .expect(403);
      // Dépôt d'une autre organisation passé par sa propre organisation : introuvable.
      await api()
        .patch(`/orgs/${orgId}/repositories/${otherRepoId}`)
        .set('cookie', cookie())
        .send({ isTracked: true })
        .expect(404);
      const other = await prisma.repository.findUniqueOrThrow({ where: { id: otherRepoId } });
      expect(other.isTracked).toBe(false);
      await api().get(`/orgs/${orgId}/repositories`).expect(401);
    });
  },
);
