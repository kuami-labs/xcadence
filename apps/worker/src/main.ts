import './load-env.js';
import './instrument.js';
import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

// Le worker n'expose pas de HTTP : un contexte applicatif suffit ; les connexions Redis le gardent actif.
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableShutdownHooks();
  logger.log('Worker démarré', 'Worker');
}
await bootstrap();
