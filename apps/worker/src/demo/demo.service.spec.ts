import { randomInt } from 'node:crypto';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { JOBS, QUEUES } from '@xcadence/shared';
import { GithubService } from '../github/github.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DEMO_GITHUB_ORG_ID, demoInstallationId } from './demo-installation.js';
import { DemoService } from './demo.service.js';

describe('installation de la démo', () => {
  it('lit DEMO_INSTALLATION_ID, sinon désactive la démo', () => {
    expect(demoInstallationId({ DEMO_INSTALLATION_ID: ' 185192144 ' })).toBe(185192144n);
    expect(demoInstallationId({})).toBeNull();
    expect(demoInstallationId({ DEMO_INSTALLATION_ID: 'abc' })).toBeNull();
    expect(demoInstallationId({ DEMO_INSTALLATION_ID: '0' })).toBeNull();
  });
});

// Intégration sur PostgreSQL ; GitHub et la file sont simulés.
describe.skipIf(!process.env.DATABASE_URL)('DemoService', () => {
  let module: TestingModule;
  let service: DemoService;
  let prisma: PrismaService['client'];
  const base = randomInt(1_000_000, 900_000_000) * 1000;
  const repoData = (over: Record<string, unknown> = {}) => ({
    id: base,
    name: 'dub',
    owner: { login: 'dubinc' },
    private: false,
    visibility: 'public',
    default_branch: 'main',
    ...over,
  });
  const get = vi.fn();
  const github = { forInstallation: vi.fn().mockResolvedValue({ rest: { repos: { get } } }) };
  const queue = { add: vi.fn(), getJob: vi.fn() };
  const created: bigint[] = [];
  let clientOrgId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        DemoService,
        PrismaService,
        { provide: GithubService, useValue: github },
        { provide: getQueueToken(QUEUES.sync), useValue: queue },
      ],
    }).compile();
    service = module.get(DemoService);
    prisma = module.get(PrismaService).client;
    clientOrgId = (
      await prisma.organization.create({ data: { githubOrgId: BigInt(base), name: 'cliente' } })
    ).id;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DEMO_INSTALLATION_ID = '185192144';
  });

  afterAll(async () => {
    delete process.env.DEMO_INSTALLATION_ID;
    // L'organisation de démo reste (elle peut exister en local) : seuls les dépôts de test partent.
    await prisma.repository.deleteMany({ where: { githubRepoId: { in: created } } });
    await prisma.organization.delete({ where: { id: clientOrgId } });
    await module.close();
  });

  it('ajoute un dépôt public à la démo et lance son import', async () => {
    get.mockResolvedValue({ data: repoData() });
    const previous = {
      isCompleted: vi.fn().mockResolvedValue(true),
      isFailed: vi.fn(),
      remove: vi.fn(),
    };
    queue.getJob.mockResolvedValue(previous);
    created.push(BigInt(base));
    const added = await service.addRepository(' dubinc/dub ', [' Production ', 'Production']);
    expect(added).toMatchObject({ fullName: 'dubinc/dub', productionEnvironments: ['Production'] });
    expect(github.forInstallation).toHaveBeenCalledWith(185192144n);
    const repo = await prisma.repository.findUniqueOrThrow({
      where: { id: added.repositoryId },
      include: { organization: true },
    });
    expect(repo).toMatchObject({
      owner: 'dubinc',
      name: 'dub',
      defaultBranch: 'main',
      isTracked: true,
      deployRule: { productionEnvironments: ['Production'] },
    });
    expect(repo.organization).toMatchObject({ isDemo: true, githubOrgId: DEMO_GITHUB_ORG_ID });
    expect(previous.remove).toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith(
      JOBS.backfillRepository,
      { repositoryId: added.repositoryId },
      expect.objectContaining({ jobId: `backfill-${added.repositoryId}` }),
    );

    // Ajouté de nouveau sans environnement : la règle enregistrée est conservée.
    queue.getJob.mockResolvedValue(undefined);
    await service.addRepository('dubinc/dub');
    expect(
      (await prisma.repository.findUniqueOrThrow({ where: { id: added.repositoryId } })).deployRule,
    ).toEqual({ productionEnvironments: ['Production'] });
  });

  it('refuse un dépôt privé, même lisible par l’installation', async () => {
    get.mockResolvedValue({
      data: repoData({ id: base + 1, private: true, visibility: 'private' }),
    });
    await expect(service.addRepository('kratt15/prive')).rejects.toThrow('dépôts publics');
    expect(await prisma.repository.count({ where: { githubRepoId: BigInt(base + 1) } })).toBe(0);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('refuse un dépôt déjà suivi par une organisation cliente', async () => {
    await prisma.repository.create({
      data: { organizationId: clientOrgId, githubRepoId: BigInt(base + 2), name: 'client' },
    });
    get.mockResolvedValue({ data: repoData({ id: base + 2, name: 'client' }) });
    await expect(service.addRepository('cliente/client')).rejects.toThrow('organisation cliente');
  });

  it('refuse un nom invalide, des environnements invalides ou une démo non configurée', async () => {
    await expect(service.addRepository('pas-de-barre')).rejects.toThrow('Nom de dépôt invalide');
    await expect(service.addRepository('a/b/c')).rejects.toThrow('Nom de dépôt invalide');
    await expect(service.addRepository('a/b', ['x'.repeat(101)])).rejects.toThrow('invalides');
    delete process.env.DEMO_INSTALLATION_ID;
    await expect(service.addRepository('a/b')).rejects.toThrow('DEMO_INSTALLATION_ID');
    expect(get).not.toHaveBeenCalled();
  });
});
