import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { JOBS, QUEUES } from '@xcadence/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { RepositoriesService } from './repositories.service.js';

describe('RepositoriesService', () => {
  let service: RepositoriesService;
  const findFirst = vi.fn();
  const update = vi.fn().mockResolvedValue({ id: 'r1', isTracked: true });
  const add = vi.fn();
  const getJob = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoriesService,
        { provide: PrismaService, useValue: { client: { repository: { findFirst, update } } } },
        { provide: getQueueToken(QUEUES.sync), useValue: { add, getJob } },
      ],
    }).compile();
    service = module.get(RepositoriesService);
  });

  const job = (completed: boolean) => ({
    isCompleted: vi.fn().mockResolvedValue(completed),
    isFailed: vi.fn().mockResolvedValue(false),
    remove: vi.fn(),
  });

  it("suivre de nouveau un dépôt relance son import (l'ancien job terminé est retiré)", async () => {
    findFirst.mockResolvedValue({ isTracked: false });
    const previous = job(true);
    getJob.mockResolvedValue(previous);
    await service.update('o1', 'r1', { isTracked: true });
    expect(previous.remove).toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith(
      JOBS.backfillRepository,
      { repositoryId: 'r1' },
      expect.objectContaining({ jobId: 'backfill-r1' }),
    );
  });

  it('garde un import encore en attente (pas de doublon)', async () => {
    findFirst.mockResolvedValue({ isTracked: false });
    const pending = job(false);
    getJob.mockResolvedValue(pending);
    await service.update('o1', 'r1', { isTracked: true });
    expect(pending.remove).not.toHaveBeenCalled();
  });

  it("n'enfile rien pour un dépôt déjà suivi ou qu'on cesse de suivre", async () => {
    findFirst.mockResolvedValue({ isTracked: true });
    await service.update('o1', 'r1', { isTracked: true });
    findFirst.mockResolvedValue({ isTracked: true });
    await service.update('o1', 'r1', { isTracked: false });
    expect(add).not.toHaveBeenCalled();
  });
});
