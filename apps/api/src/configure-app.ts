import { ValidationPipe, type INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

/** Réglages communs à l'application et aux tests e2e. */
export function configureApp(app: INestApplication): void {
  app.use(cookieParser());
  // Chaque DTO est validé ; les champs inconnus sont refusés (docs/08-SECURITE.md).
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // Le front (WEB_URL) appelle l'API avec ses cookies de session.
  app.enableCors({ origin: process.env.WEB_URL ?? 'http://localhost:3000', credentials: true });
  app.enableShutdownHooks();
}
