import { randomInt } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { GLOBAL_TEST_LOCK, holdTestLock } from '@xcadence/db';
import { GithubService } from '../github/github.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DemoService } from './demo.service.js';

const LOCK_TIMEOUT_MS = 120_000;

// Intégration sur PostgreSQL (DATABASE_URL), comme dans la CI ; GitHub simulé.
describe.skipIf(!process.env.DATABASE_URL)('DemoService', () => {
  let module: TestingModule;
  let demo: DemoService;
  let prisma: PrismaService['client'];
  const base = randomInt(1_000_000, 900_000_000) * 1000;
  const listRepos = vi.fn();
  // Dépôt 1 public, dépôt 2 privé, dépôt 3 public mais non suivi.
  const accessible = [1, 2, 3].map((n) => ({ id: base + n, private: n === 2 }));
  const octokit = {
    rest: { apps: { listReposAccessibleToInstallation: listRepos } },
    paginate: vi.fn(async (fn: unknown) => (fn === listRepos ? accessible : [])),
  };
  const github = { forInstallation: vi.fn().mockResolvedValue(octokit) };
  const orgIds: string[] = [];
  // Démo globale (une seule) : tests sérialisés, démo existante remise en place après.
  let releaseLock: (() => Promise<void>) | undefined;
  let previousDemos: string[] = [];

  const createOrg = async (n: number, installed: boolean) => {
    const org = await prisma.organization.create({
      data: {
        githubOrgId: BigInt(base + n),
        name: `org-${base + n}`,
        installationId: installed ? BigInt(base + n) : null,
      },
    });
    orgIds.push(org.id);
    return org;
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [DemoService, PrismaService, { provide: GithubService, useValue: github }],
    }).compile();
    demo = module.get(DemoService);
    prisma = module.get(PrismaService).client;
    releaseLock = await holdTestLock(prisma, GLOBAL_TEST_LOCK);
    previousDemos = (
      await prisma.organization.findMany({ where: { isDemo: true }, select: { id: true } })
    ).map((o) => o.id);
    // Attente possible du verrou, tenu par un autre fichier de test.
  }, LOCK_TIMEOUT_MS);

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await prisma.organization.updateMany({ where: { isDemo: true }, data: { isDemo: false } });
    await prisma.organization.updateMany({
      where: { id: { in: previousDemos } },
      data: { isDemo: true },
    });
    await releaseLock?.();
    await module.close();
  });

  it('active la démo sur une organisation installée, avec la visibilité à jour', async () => {
    const org = await createOrg(10, true);
    await prisma.repository.createMany({
      data: [1, 2, 3].map((n) => ({
        organizationId: org.id,
        githubRepoId: BigInt(base + n),
        name: `depot-${n}`,
        isTracked: n !== 3,
        // Visibilité périmée : le dépôt 2 est devenu privé.
        isPrivate: n === 1,
      })),
    });
    const other = await createOrg(20, true);
    await prisma.organization.update({ where: { id: other.id }, data: { isDemo: true } });

    await expect(demo.enable(org.name)).resolves.toEqual({
      name: org.name,
      publicRepositories: 2,
      trackedPublicRepositories: 1,
    });
    expect(github.forInstallation).toHaveBeenCalledWith(BigInt(base + 10));
    const repos = await prisma.repository.findMany({
      where: { organizationId: org.id },
      orderBy: { name: 'asc' },
    });
    expect(repos.map((r) => r.isPrivate)).toEqual([false, true, false]);
    // Une seule organisation de démo.
    const demos = await prisma.organization.findMany({
      where: { isDemo: true, id: { in: orgIds } },
    });
    expect(demos.map((o) => o.id)).toEqual([org.id]);

    await expect(demo.disable()).resolves.toBeGreaterThanOrEqual(1);
    expect(await prisma.organization.count({ where: { isDemo: true } })).toBe(0);
  });

  it("refuse une organisation inconnue ou sans installation de l'App", async () => {
    const org = await createOrg(30, false);
    await expect(demo.enable(org.name)).rejects.toThrow('GitHub App non installée');
    await expect(demo.enable(`inconnue-${base}`)).rejects.toThrow('organisation inconnue');
    expect(await prisma.organization.count({ where: { id: org.id, isDemo: true } })).toBe(0);
  });
});
