import './load-env.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  // rawBody : la signature des webhooks se calcule sur le corps exact reçu.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  configureApp(app);
  await app.listen(process.env.API_PORT ?? 4000);
}
await bootstrap();
