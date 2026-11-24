import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { JOBS, QUEUES } from '@xcadence/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { WebhooksService } from './webhooks.service.js';

describe('WebhooksService', () => {
  let service: WebhooksService;
  const createMany = vi.fn();
  const findUniqueOrThrow = vi.fn();
  const add = vi.fn();
  const event = { deliveryId: 'd1', eventType: 'ping', payload: {} };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: PrismaService,
          useValue: { client: { webhookEvent: { createMany, findUniqueOrThrow } } },
        },
        { provide: getQueueToken(QUEUES.webhooks), useValue: { add } },
      ],
    }).compile();
    service = module.get<WebhooksService>(WebhooksService);
  });

  it('enregistre une nouvelle livraison et enfile son traitement', async () => {
    createMany.mockResolvedValue({ count: 1 });
    findUniqueOrThrow.mockResolvedValue({ id: 'e1', processedAt: null });
    await expect(service.record(event)).resolves.toBe(true);
    expect(createMany).toHaveBeenCalledWith({ data: [event], skipDuplicates: true });
    expect(add).toHaveBeenCalledWith(
      JOBS.processWebhookEvent,
      { webhookEventId: 'e1' },
      expect.objectContaining({ jobId: 'e1', attempts: 5 }),
    );
  });

  it('remet en file un rejeu pas encore traité (même jobId : pas de doublon)', async () => {
    createMany.mockResolvedValue({ count: 0 });
    findUniqueOrThrow.mockResolvedValue({ id: 'e1', processedAt: null });
    await expect(service.record(event)).resolves.toBe(false);
    expect(add).toHaveBeenCalledWith(
      JOBS.processWebhookEvent,
      { webhookEventId: 'e1' },
      expect.objectContaining({ jobId: 'e1' }),
    );
  });

  it("n'enfile pas un rejeu déjà traité", async () => {
    createMany.mockResolvedValue({ count: 0 });
    findUniqueOrThrow.mockResolvedValue({ id: 'e1', processedAt: new Date() });
    await expect(service.record(event)).resolves.toBe(false);
    expect(add).not.toHaveBeenCalled();
  });
});
