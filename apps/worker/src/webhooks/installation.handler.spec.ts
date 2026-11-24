import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { InstallationHandler, type InstallationPayload } from './installation.handler.js';

// Intégration sur PostgreSQL (DATABASE_URL), comme dans la CI ; payloads fixes, aucun appel à GitHub.
describe.skipIf(!process.env.DATABASE_URL)('InstallationHandler', () => {
  let module: TestingModule;
  let handler: InstallationHandler;
  let prisma: PrismaService['client'];
  const base = Date.now() * 100;
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
    await expect(handler.handle('installation', { action: 'deleted', installation })).resolves.toBe(
      false,
    );
  });
});
