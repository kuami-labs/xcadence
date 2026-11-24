import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

// .env à la racine du monorepo (docs/06-ENVIRONNEMENT.md), s'il existe.
const envFile = new URL('../../../.env', import.meta.url);
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

async function bootstrap() {
  // rawBody : la signature des webhooks se calcule sur le corps exact reçu.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  configureApp(app);
  await app.listen(process.env.API_PORT ?? 4000);
}
await bootstrap();
