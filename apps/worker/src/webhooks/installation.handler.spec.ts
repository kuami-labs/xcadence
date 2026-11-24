import { randomInt } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { InstallationHandler, type InstallationPayload } from './installation.handler.js';

// Intégration sur PostgreSQL (DATABASE_URL), comme dans la CI ; payloads fixes, aucun appel à GitHub.
describe.skipIf(!process.env.DATABASE_URL)('InstallationHandler', () => {
  let module: TestingModule;
  let handler: InstallationHandler;
  let prisma: PrismaService['client'];
  const base = randomInt(1_000_000, 900_000_000) * 1000;
  const account = { id: base, login: `org-${base}`, type: 'Organization' };
  const installation = { id: base, account };
  const repo = (n: number) => ({ id: base + n, name: `depot-${n}` });

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [InstallationHandler, PrismaService],
    }).compile();
    handler = module.get(InstallationHandler);
    prisma = module.get(PrismaService).client;
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { githubOrgId: BigInt(base) } });
    await prisma.user.deleteMany({ where: { githubId: BigInt(base + 99) } });
    await module.close();
  });

  const repos = () =>
    prisma.repository.findMany({
      where: { organization: { githubOrgId: BigInt(base) } },
      orderBy: { name: 'asc' },
    });

  it("crée l'organisation et ses dépôts, non suivis, à l'installation", async () => {
    const payload: InstallationPayload = {
      action: 'created',
      installation,
      repositories: [repo(1), repo(2)],
    };
    await expect(handler.handle('installation', payload)).resolves.toBe(true);
    // Rejoué : aucun doublon.
    await expect(handler.handle('installation', payload)).resolves.toBe(true);

    const org = await prisma.organization.findUniqueOrThrow({
      where: { githubOrgId: BigInt(base) },
    });
    expect(org.name).toBe(account.login);
    expect(org.installationId).toBe(BigInt(base));
    const list = await repos();
    expect(list.map((r) => r.name)).toEqual(['depot-1', 'depot-2']);
    expect(list.every((r) => !r.isTracked && r.defaultBranch === null)).toBe(true);
  });

  it('ajoute et retire des dépôts', async () => {
    await handler.handle('installation_repositories', {
      action: 'added',
      installation,
      repositories_added: [repo(3)],
      repositories_removed: [repo(1)],
    });
    expect((await repos()).map((r) => r.name)).toEqual(['depot-2', 'depot-3']);
  });

  it("rattache la personne qui installe si elle s'est déjà connectée", async () => {
    const user = await prisma.user.create({
      data: { githubId: BigInt(base + 99), login: 'installe' },
    });
    await handler.handle('installation', {
      action: 'new_permissions_accepted',
      installation,
      sender: { id: base + 99 },
    });
    const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
    expect(membership?.role).toBe('member');
  });

  it('ignore les autres événements', async () => {
    await expect(handler.handle('pull_request', { action: 'opened', installation })).resolves.toBe(
      false,
    );
    await expect(handler.handle('installation', { action: 'suspend', installation })).resolves.toBe(
      false,
    );
  });

  it("supprime toutes les données de l'organisation à la désinstallation", async () => {
    const org = await prisma.organization.findUniqueOrThrow({
      where: { githubOrgId: BigInt(base) },
    });
    const repository = (await repos())[0];
    const pr = await prisma.pullRequest.create({
      data: {
        repositoryId: repository.id,
        githubPrId: BigInt(base),
        number: 1,
        authorLogin: 'quelquun',
        state: 'open',
        createdAt: new Date(),
      },
    });
    await prisma.review.create({
      data: {
        pullRequestId: pr.id,
        githubReviewId: BigInt(base),
        reviewerLogin: 'relecteur',
        state: 'approved',
      },
    });
    await prisma.weeklyMetric.create({
      data: {
        organizationId: org.id,
        weekStart: new Date('2026-11-23'),
        metricKey: 'lead_time',
        value: 1,
        sampleSize: 1,
      },
    });
    await prisma.syncJob.create({ data: { organizationId: org.id, type: 'backfill' } });
    await prisma.webhookEvent.create({
      data: {
        deliveryId: `d-${base}`,
        eventType: 'pull_request',
        payload: { installation: { id: base } },
      },
    });

    await expect(handler.handle('installation', { action: 'deleted', installation })).resolves.toBe(
      true,
    );

    expect(await prisma.organization.count({ where: { id: org.id } })).toBe(0);
    expect(await prisma.repository.count({ where: { organizationId: org.id } })).toBe(0);
    expect(await prisma.pullRequest.count({ where: { id: pr.id } })).toBe(0);
    expect(await prisma.review.count({ where: { pullRequestId: pr.id } })).toBe(0);
    expect(await prisma.weeklyMetric.count({ where: { organizationId: org.id } })).toBe(0);
    expect(await prisma.syncJob.count({ where: { organizationId: org.id } })).toBe(0);
    expect(await prisma.membership.count({ where: { organizationId: org.id } })).toBe(0);
    expect(await prisma.webhookEvent.count({ where: { deliveryId: `d-${base}` } })).toBe(0);
    // Le compte utilisateur reste : il peut appartenir à d'autres organisations.
    expect(await prisma.user.count({ where: { githubId: BigInt(base + 99) } })).toBe(1);
  });
});
