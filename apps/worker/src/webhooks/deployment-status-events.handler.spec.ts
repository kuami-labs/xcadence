import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { DeploymentStatusEventsHandler } from './deployment-status-events.handler.js';

// Intégration sur PostgreSQL (DATABASE_URL), payloads fixes.
describe.skipIf(!process.env.DATABASE_URL)('DeploymentStatusEventsHandler', () => {
  let module: TestingModule;
  let handler: DeploymentStatusEventsHandler;
  let prisma: PrismaService['client'];
  const base = Date.now() * 100;
  let orgId: string;
  let repoId: string;

  const event = (state: string, at: string, repoGithubId = base) => ({
    repository: { id: repoGithubId },
    deployment: {
      id: base + 1,
      sha: 'abc',
      environment: 'production',
      created_at: '2026-11-24T10:00:00Z',
    },
    deployment_status: { state, created_at: at },
  });

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [DeploymentStatusEventsHandler, PrismaService],
    }).compile();
    handler = module.get(DeploymentStatusEventsHandler);
    prisma = module.get(PrismaService).client;
    orgId = (await prisma.organization.create({ data: { githubOrgId: BigInt(base), name: 'o' } }))
      .id;
    repoId = (
      await prisma.repository.create({
        data: { organizationId: orgId, githubRepoId: BigInt(base), name: 'r', isTracked: true },
      })
    ).id;
    await prisma.repository.create({
      data: { organizationId: orgId, githubRepoId: BigInt(base + 2), name: 'non-suivi' },
    });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await module.close();
  });

  it('suit un déploiement de « en cours » à « échec », sans doublon', async () => {
    await expect(
      handler.handle('deployment_status', event('in_progress', '2026-11-24T10:00:10Z')),
    ).resolves.toBe(true);
    await handler.handle('deployment_status', event('failure', '2026-11-24T10:03:00Z'));
    const deployments = await prisma.deployment.findMany({ where: { repositoryId: repoId } });
    expect(deployments).toHaveLength(1);
    expect(deployments[0].status).toBe('failure');
    expect(deployments[0].finishedAt).toEqual(new Date('2026-11-24T10:03:00Z'));
  });

  it("n'enregistre rien pour un dépôt non suivi, et ignore les autres événements", async () => {
    await expect(
      handler.handle('deployment_status', event('success', '2026-11-24T11:00:00Z', base + 2)),
    ).resolves.toBe(true);
    expect(
      await prisma.deployment.count({ where: { repository: { organizationId: orgId } } }),
    ).toBe(1);
    await expect(handler.handle('workflow_run', {})).resolves.toBe(false);
  });
});
