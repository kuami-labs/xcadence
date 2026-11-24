import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });

  it('/config (GET) : adresse d’installation de la GitHub App', async () => {
    const previous = process.env.GITHUB_APP_SLUG;
    process.env.GITHUB_APP_SLUG = 'mon-app';
    await request(app.getHttpServer())
      .get('/config')
      .expect(200)
      .expect({ githubAppInstallUrl: 'https://github.com/apps/mon-app/installations/new' });
    delete process.env.GITHUB_APP_SLUG;
    await request(app.getHttpServer())
      .get('/config')
      .expect(200)
      .expect({ githubAppInstallUrl: null });
    if (previous !== undefined) process.env.GITHUB_APP_SLUG = previous;
  });

  afterEach(async () => {
    await app.close();
  });
});
