import { randomInt } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { AuthService } from './../src/auth/auth.service.js';
import { configureApp } from './../src/configure-app.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Intégration : PostgreSQL et Redis réels, comme dans la CI.
describe.skipIf(!process.env.DATABASE_URL || !process.env.REDIS_URL)(
  'Destinataires du résumé (e2e)',
  () => {
    let app: INestApplication<App>;
    let prisma: PrismaService['client'];
    let session: string;
    let orgId: string;
    let otherOrgId: string;
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
      orgId = (await prisma.organization.create({ data: { githubOrgId: base, name: 'o' } })).id;
      otherOrgId = (
        await prisma.organization.create({ data: { githubOrgId: base + 1n, name: 'autre' } })
      ).id;
      await prisma.membership.create({ data: { userId: user.id, organizationId: orgId } });
      session = await app.get(AuthService).createSession(user.id);
    });

    afterAll(async () => {
      await prisma.organization.deleteMany({ where: { id: { in: [orgId, otherOrgId] } } });
      await prisma.user.deleteMany({ where: { githubId: base } });
      await app.close();
    });

    const api = () => request(app.getHttpServer());
    const cookie = () => `xc_session=${session}`;

    it('ajoute, liste et retire des destinataires', async () => {
      const added = await api()
        .post(`/orgs/${orgId}/summary-recipients`)
        .set('cookie', cookie())
        .send({ email: ' CTO@Exemple.fr ' })
        .expect(201);
      expect(added.body).toMatchObject({ email: 'cto@exemple.fr' });
      expect(added.body).not.toHaveProperty('unsubscribeToken');
      await api()
        .post(`/orgs/${orgId}/summary-recipients`)
        .set('cookie', cookie())
        .send({ email: 'cto@exemple.fr' })
        .expect(409);
      await api()
        .post(`/orgs/${orgId}/summary-recipients`)
        .set('cookie', cookie())
        .send({ email: 'pas-une-adresse' })
        .expect(400);
      const list = await api()
        .get(`/orgs/${orgId}/summary-recipients`)
        .set('cookie', cookie())
        .expect(200);
      expect(list.body).toEqual([{ id: added.body.id, email: 'cto@exemple.fr' }]);
      await api()
        .delete(`/orgs/${orgId}/summary-recipients/${added.body.id}`)
        .set('cookie', cookie())
        .expect(204);
      await api()
        .delete(`/orgs/${orgId}/summary-recipients/${added.body.id}`)
        .set('cookie', cookie())
        .expect(404);
    });

    it("désinscrit par le lien de l'email, sans session", async () => {
      const r = await prisma.summaryRecipient.create({
        data: { organizationId: orgId, email: 'a@b.fr', unsubscribeToken: `jeton-${base}` },
      });
      const res = await api()
        .get(`/summary-recipients/unsubscribe?token=jeton-${base}`)
        .expect(200);
      expect(res.text).toContain('Vous ne recevrez plus');
      expect(await prisma.summaryRecipient.count({ where: { id: r.id } })).toBe(0);
      await api().get('/summary-recipients/unsubscribe?token=inconnu').expect(200);
      const r2 = await prisma.summaryRecipient.create({
        data: { organizationId: orgId, email: 'c@d.fr', unsubscribeToken: `clic-${base}` },
      });
      await api()
        .post(`/summary-recipients/unsubscribe?token=clic-${base}`)
        .type('form')
        .send('List-Unsubscribe=One-Click')
        .expect(200);
      expect(await prisma.summaryRecipient.count({ where: { id: r2.id } })).toBe(0);
    });

    it("n'expose jamais les destinataires d'une autre organisation", async () => {
      await api().get(`/orgs/${otherOrgId}/summary-recipients`).set('cookie', cookie()).expect(403);
      await api()
        .post(`/orgs/${otherOrgId}/summary-recipients`)
        .set('cookie', cookie())
        .send({ email: 'x@y.fr' })
        .expect(403);
      await api().get(`/orgs/${orgId}/summary-recipients`).expect(401);
    });
  },
);
