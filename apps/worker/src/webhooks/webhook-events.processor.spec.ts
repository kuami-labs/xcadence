import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { JOBS, QUEUES, redisConnection } from '@xcadence/shared';
import { Queue, QueueEvents, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { AppModule } from '../app.module.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { InstallationHandler } from './installation.handler.js';
import type { PullRequestEventsHandler } from './pull-request-events.handler.js';
import { WebhookEventsProcessor } from './webhook-events.processor.js';

const jobFor = (webhookEventId: string) =>
  ({ name: JOBS.processWebhookEvent, data: { webhookEventId } }) as Job;

describe('WebhookEventsProcessor', () => {
  const findUnique = vi.fn();
  const updateMany = vi.fn();
  const handle = vi.fn();
  const prHandle = vi.fn().mockResolvedValue(false);
  const processor = new WebhookEventsProcessor(
    { client: { webhookEvent: { findUnique, updateMany } } } as unknown as PrismaService,
    { handle } as unknown as InstallationHandler,
    { handle: prHandle } as unknown as PullRequestEventsHandler,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    prHandle.mockResolvedValue(false);
  });

  it('refuse un job inconnu', async () => {
    await expect(processor.process({ name: 'autre', data: {} } as Job)).rejects.toThrow(
      'Job inconnu',
    );
  });

  it('traite un événement géré et le marque traité', async () => {
    findUnique.mockResolvedValue({
      id: 'e1',
      eventType: 'installation',
      payload: {},
      processedAt: null,
    });
    handle.mockResolvedValue(true);
    await expect(processor.process(jobFor('e1'))).resolves.toBe('processed');
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { processedAt: expect.any(Date) },
    });
  });

  it('passe au gestionnaire suivant quand le premier ne gère pas', async () => {
    findUnique.mockResolvedValue({
      id: 'e1',
      eventType: 'pull_request',
      payload: {},
      processedAt: null,
    });
    handle.mockResolvedValue(false);
    prHandle.mockResolvedValue(true);
    await expect(processor.process(jobFor('e1'))).resolves.toBe('processed');
    expect(prHandle).toHaveBeenCalledWith('pull_request', {});
  });

  it('laisse non traité un événement pas encore géré', async () => {
    findUnique.mockResolvedValue({ id: 'e1', eventType: 'push', payload: {}, processedAt: null });
    handle.mockResolvedValue(false);
    await expect(processor.process(jobFor('e1'))).resolves.toBe('ignored');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('ne retraite pas un événement déjà traité', async () => {
    findUnique.mockResolvedValue({ id: 'e1', eventType: 'installation', processedAt: new Date() });
    await expect(processor.process(jobFor('e1'))).resolves.toBe('already-processed');
    expect(handle).not.toHaveBeenCalled();
  });

  // Intégration : Redis et PostgreSQL réels, comme dans la CI.
  describe.skipIf(!process.env.REDIS_URL || !process.env.DATABASE_URL)('avec Redis', () => {
    let app: TestingModule;
    let queue: Queue;
    let events: QueueEvents;
    const connection = () => new Redis({ ...redisConnection(), maxRetriesPerRequest: null });

    beforeAll(async () => {
      app = await Test.createTestingModule({ imports: [AppModule] }).compile();
      await app.init();
      queue = new Queue(QUEUES.webhooks, { connection: connection() });
      events = new QueueEvents(QUEUES.webhooks, { connection: connection() });
      await events.waitUntilReady();
    });

    afterAll(async () => {
      await events.close();
      await queue.close();
      await app.close();
    });

    it('reçoit un job publié dans la file', async () => {
      const job = await queue.add(JOBS.processWebhookEvent, { webhookEventId: randomUUID() });
      // Identifiant inconnu en base : le worker a bien reçu le job et l'a signalé.
      await expect(job.waitUntilFinished(events, 10_000)).resolves.toBe('missing');
    });
  });
});
