import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Logger, LoggerModule } from 'nestjs-pino';
import { Writable } from 'node:stream';
import request from 'supertest';
import { httpLoggerParams } from './logging.js';

@Controller()
class EssaiController {
  @Get('essai')
  essai() {
    return { ok: true };
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}

// Critère de #70 : un en-tête Authorization n'apparaît jamais dans les logs.
describe('logs HTTP de l’API', () => {
  let app: INestApplication;
  const lines: string[] = [];

  beforeAll(async () => {
    const stream = new Writable({
      write(chunk, _encoding, done) {
        lines.push(chunk.toString());
        done();
      },
    });
    @Module({
      imports: [LoggerModule.forRoot(httpLoggerParams({ NODE_ENV: 'production' }, stream))],
      controllers: [EssaiController],
    })
    class EssaiModule {}
    const moduleRef = await Test.createTestingModule({ imports: [EssaiModule] }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(Logger));
    await app.init();
  });

  afterAll(() => app.close());

  it('une ligne JSON par requête, sans en-têtes ni query', async () => {
    await request(app.getHttpServer())
      .get('/essai?token=jeton-de-desinscription')
      .set('authorization', 'Bearer ghs_secret-en-tete')
      .set('cookie', 'xc_session=secret-de-session')
      .set('x-hub-signature-256', 'sha256=secret-de-signature')
      .expect(200);
    const all = lines.join('');
    expect(all).not.toMatch(/secret|ghs_|jeton-de-desinscription|authorization|cookie/i);
    const entry = lines.map((l) => JSON.parse(l)).find((l) => l.req?.url === '/essai');
    expect(entry).toMatchObject({
      req: { method: 'GET', url: '/essai' },
      res: { statusCode: 200 },
    });
  });

  it('ne journalise pas les sondes /health', async () => {
    const before = lines.length;
    await request(app.getHttpServer()).get('/health').expect(200);
    expect(lines.slice(before).some((l) => l.includes('/health'))).toBe(false);
  });
});
