import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { JOBS, QUEUES, redisConnection } from '@xcadence/shared';
import { Queue, QueueEvents, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { AppModule } from '../app.module.js';
import { WebhookEventsProcessor } from './webhook-events.processor.js';

describe('WebhookEventsProcessor', () => {
  it('refuse un job inconnu', async () => {
    const processor = new WebhookEventsProcessor();
    await expect(processor.process({ name: 'autre', data: {} } as Job)).rejects.toThrow(
      'Job inconnu',
    );
  });

  // Intégration : nécessite Redis (REDIS_URL), comme dans la CI.
  describe.skipIf(!process.env.REDIS_URL)('avec Redis', () => {
    let app: TestingModule;
    let queue: Queue;
    let events: QueueEvents;

    beforeAll(async () => {
      app = await Test.createTestingModule({ imports: [AppModule] }).compile();
      await app.init();
      queue = new Queue(QUEUES.webhooks, {
        connection: new Redis({ ...redisConnection(), maxRetriesPerRequest: null }),
      });
      events = new QueueEvents(QUEUES.webhooks, {
        connection: new Redis({ ...redisConnection(), maxRetriesPerRequest: null }),
      });
      await events.waitUntilReady();
    });

    afterAll(async () => {
      await events.close();
      await queue.close();
      await app.close();
    });

    it('reçoit un job publié dans la file', async () => {
      const webhookEventId = randomUUID();
      const job = await queue.add(JOBS.processWebhookEvent, { webhookEventId });
      await expect(job.waitUntilFinished(events, 10_000)).resolves.toEqual({ webhookEventId });
    });
  });
});
