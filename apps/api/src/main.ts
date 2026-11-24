import './load-env.js';
import './instrument.js';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  // rawBody : la signature des webhooks se calcule sur le corps exact reçu.
  const app = await NestFactory.create(AppModule, { rawBody: true, bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app);
  await app.listen(process.env.API_PORT ?? 4000);
}
await bootstrap();
