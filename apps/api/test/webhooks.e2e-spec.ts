import { createHmac, randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Test d'intégration : nécessite PostgreSQL (DATABASE_URL), comme dans la CI.
describe.skipIf(!process.env.DATABASE_URL)('POST /webhooks/github (e2e)', () => {
  let app: INestApplication<App>;
  const secret = 'secret-e2e';
  const body = JSON.stringify({ zen: 'Keep it logically awesome.' });
  const sign = (b: string) => 'sha256=' + createHmac('sha256', secret).update(b).digest('hex');
  const deliveryId = randomUUID();

  const send = (signature: string, delivery = deliveryId) =>
    request(app.getHttpServer())
      .post('/webhooks/github')
      .set('content-type', 'application/json')
      .set('x-github-event', 'ping')
      .set('x-github-delivery', delivery)
      .set('x-hub-signature-256', signature)
      .send(body);

  beforeAll(async () => {
    process.env.GITHUB_WEBHOOK_SECRET = secret;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication({ rawBody: true });
    await app.init();
  });

  afterAll(async () => {
    await app.get(PrismaService).client.webhookEvent.deleteMany({ where: { deliveryId } });
    await app.close();
  });

  it('refuse une signature invalide, sans rien enregistrer', async () => {
    const other = randomUUID();
    await send('sha256=' + '0'.repeat(64), other).expect(401);
    const count = await app
      .get(PrismaService)
      .client.webhookEvent.count({ where: { deliveryId: other } });
    expect(count).toBe(0);
  });

  it('enregistre un événement signé une seule fois', async () => {
    await send(sign(body)).expect(202).expect({ received: true, duplicate: false });
    await send(sign(body)).expect(202).expect({ received: true, duplicate: true });
    const events = await app
      .get(PrismaService)
      .client.webhookEvent.findMany({ where: { deliveryId } });
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('ping');
  });
});
