import { Controller, Get, INestApplication, Module, Param, UseGuards } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { AuthModule } from './../src/auth/auth.module.js';
import { GithubOauthService } from './../src/auth/github-oauth/github-oauth.service.js';
import { OrganizationGuard } from './../src/auth/organization/organization.guard.js';
import { SessionGuard } from './../src/auth/session/session.guard.js';
import { configureApp } from './../src/configure-app.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Route de test protégée comme le seront les routes /orgs/:orgId/… (docs/03-BACKEND.md).
@Controller('orgs')
class OrgProbeController {
  @Get(':orgId/probe')
  @UseGuards(SessionGuard, OrganizationGuard)
  probe(@Param('orgId') orgId: string) {
    return { orgId };
  }
}

@Module({ imports: [AuthModule], controllers: [OrgProbeController] })
class OrgProbeModule {}

const cookieValue = (res: request.Response, name: string): string | undefined => {
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const found = cookies.find((c) => c.startsWith(`${name}=`));
  return found?.split(';')[0].slice(name.length + 1);
};

// Test d'intégration : GitHub est simulé, PostgreSQL est réel (DATABASE_URL), comme dans la CI.
describe.skipIf(!process.env.DATABASE_URL)('Connexion GitHub (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService['client'];
  const base = Date.now() * 10;
  const ghUser = { id: base, login: `e2e-${base}`, email: null, avatar_url: null };
  const otherAccountId = base + 1;
  const github = {
    authorizeUrl: (state: string) => `https://github.com/login/oauth/authorize?state=${state}`,
    exchangeCode: vi.fn().mockResolvedValue('ghu_simule'),
    getUser: vi.fn().mockResolvedValue(ghUser),
    getInstallations: vi
      .fn()
      .mockResolvedValue([{ id: base, account: { id: base, login: ghUser.login, type: 'User' } }]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, OrgProbeModule],
    })
      .overrideProvider(GithubOauthService)
      .useValue(github)
      .compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService).client;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { githubId: BigInt(ghUser.id) } });
    await prisma.organization.deleteMany({
      where: { githubOrgId: { in: [BigInt(base), BigInt(otherAccountId)] } },
    });
    await app.close();
  });

  const login = async () => {
    const start = await request(app.getHttpServer()).get('/auth/github').expect(302);
    const state = cookieValue(start, 'xc_oauth_state');
    expect(start.headers.location).toContain(`state=${state}`);
    const callback = await request(app.getHttpServer())
      .get(`/auth/github/callback?code=abc&state=${state}`)
      .set('cookie', `xc_oauth_state=${state}`)
      .expect(302);
    expect(callback.headers.location).toBe('http://localhost:3000/dashboard');
    const session = cookieValue(callback, 'xc_session');
    expect(session).toBeTruthy();
    const raw = ([] as string[]).concat(callback.headers['set-cookie'] ?? []).join(';');
    expect(raw).toMatch(/HttpOnly/);
    expect(raw).toMatch(/Secure/);
    expect(raw).toMatch(/SameSite=Lax/);
    return session as string;
  };

  it('refuse un retour GitHub dont le state ne correspond pas', async () => {
    await request(app.getHttpServer())
      .get('/auth/github/callback?code=abc&state=pirate')
      .set('cookie', 'xc_oauth_state=attendu')
      .expect(400);
    expect(github.exchangeCode).not.toHaveBeenCalled();
  });

  it('connecte, expose /auth/me puis déconnecte', async () => {
    const session = await login();
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('cookie', `xc_session=${session}`)
      .expect(200);
    expect(me.body.user.login).toBe(ghUser.login);
    expect(me.body.organizations).toEqual([
      expect.objectContaining({ name: ghUser.login, role: 'owner' }),
    ]);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('cookie', `xc_session=${session}`)
      .set('origin', 'https://site-malveillant.example')
      .expect(403);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('cookie', `xc_session=${session}`)
      .expect(204);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('cookie', `xc_session=${session}`)
      .expect(401);
  });

  it("ne donne jamais accès aux données d'une autre organisation", async () => {
    const session = await login();
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('cookie', `xc_session=${session}`);
    const ownOrgId = me.body.organizations[0].id as string;
    const other = await prisma.organization.create({
      data: { githubOrgId: BigInt(otherAccountId), name: 'autre-org' },
    });

    await request(app.getHttpServer())
      .get(`/orgs/${ownOrgId}/probe`)
      .set('cookie', `xc_session=${session}`)
      .expect(200, { orgId: ownOrgId });
    await request(app.getHttpServer())
      .get(`/orgs/${other.id}/probe`)
      .set('cookie', `xc_session=${session}`)
      .expect(403);
    await request(app.getHttpServer()).get(`/orgs/${ownOrgId}/probe`).expect(401);
  });
});
