import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { WorkflowRunEventsHandler } from './workflow-run-events.handler.js';

// Intégration sur PostgreSQL (DATABASE_URL), payloads fixes.
describe.skipIf(!process.env.DATABASE_URL)('WorkflowRunEventsHandler', () => {
  let module: TestingModule;
  let handler: WorkflowRunEventsHandler;
  let prisma: PrismaService['client'];
  const base = Date.now() * 100;
  let orgId: string;
  let repoId: string;

  const event = (
    status: string,
    conclusion: string | null,
    updatedAt: string,
    repoGithubId = base,
  ) => ({
    repository: { id: repoGithubId },
    workflow_run: {
      id: base + 1,
      name: 'CI',
      head_branch: 'main',
      status,
      conclusion,
      created_at: '2026-11-24T10:00:00Z',
      updated_at: updatedAt,
      run_started_at: '2026-11-24T10:00:05Z',
    },
  });

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [WorkflowRunEventsHandler, PrismaService],
    }).compile();
    handler = module.get(WorkflowRunEventsHandler);
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

  it("suit un run de l'état en cours à terminé, sans doublon", async () => {
    await expect(
      handler.handle('workflow_run', event('in_progress', null, '2026-11-24T10:00:05Z')),
    ).resolves.toBe(true);
    let runs = await prisma.workflowRun.findMany({ where: { repositoryId: repoId } });
    expect(runs).toHaveLength(1);
    expect(runs[0].completedAt).toBeNull();

    await handler.handle('workflow_run', event('completed', 'success', '2026-11-24T10:07:00Z'));
    runs = await prisma.workflowRun.findMany({ where: { repositoryId: repoId } });
    expect(runs).toHaveLength(1);
    expect(runs[0].conclusion).toBe('success');
    expect(runs[0].completedAt).toEqual(new Date('2026-11-24T10:07:00Z'));
  });

  it("n'enregistre rien pour un dépôt non suivi, et ignore les autres événements", async () => {
    await expect(
      handler.handle(
        'workflow_run',
        event('completed', 'failure', '2026-11-24T11:00:00Z', base + 2),
      ),
    ).resolves.toBe(true);
    expect(
      await prisma.workflowRun.count({ where: { repository: { organizationId: orgId } } }),
    ).toBe(1);
    await expect(handler.handle('pull_request', {})).resolves.toBe(false);
  });
});
