import './load-env.js';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

// Le worker n'expose pas de HTTP : un contexte applicatif suffit ; les connexions Redis le gardent actif.
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  Logger.log('Worker démarré', 'Worker');
}
await bootstrap();
