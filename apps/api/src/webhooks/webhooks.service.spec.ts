import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { WebhooksService } from './webhooks.service.js';

describe('WebhooksService', () => {
  let service: WebhooksService;
  const createMany = vi.fn();

  beforeEach(async () => {
    createMany.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: { client: { webhookEvent: { createMany } } } },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  it('enregistre une nouvelle livraison', async () => {
    createMany.mockResolvedValue({ count: 1 });
    const event = { deliveryId: 'd1', eventType: 'ping', payload: {} };
    await expect(service.record(event)).resolves.toBe(true);
    expect(createMany).toHaveBeenCalledWith({ data: [event], skipDuplicates: true });
  });

  it('signale une livraison déjà reçue', async () => {
    createMany.mockResolvedValue({ count: 0 });
    await expect(
      service.record({ deliveryId: 'd1', eventType: 'ping', payload: {} }),
    ).resolves.toBe(false);
  });
});
