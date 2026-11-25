import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ThrottlerModule } from '@nestjs/throttler';
import { redisConnection } from '@xcadence/shared';
import { Redis } from 'ioredis';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { RepositoriesModule } from './repositories/repositories.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ConfigController } from './config.controller.js';
import { RecipientsModule } from './recipients/recipients.module.js';
import { DemoModule } from './demo/demo.module.js';
import { httpLoggerParams } from './logging.js';

@Module({
  imports: [
    // Logs JSON (docs/08-SECURITE.md) ; construits après le chargement du .env.
    LoggerModule.forRootAsync({ useFactory: () => httpLoggerParams() }),
    // Erreurs inattendues vers Sentry si SENTRY_DSN est défini (instrument.ts).
    SentryModule.forRoot(),
    // Limitation de débit (docs/08-SECURITE.md), appliquée par ThrottlerGuard sur /auth, /webhooks et /demo.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
    // Files BullMQ (packages/shared) : l'API publie, le worker traite.
    // Construit à l'initialisation (après le chargement du .env) ; client ioredis exigé par BullMQ en ESM.
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: new Redis({
          ...redisConnection(),
          maxRetriesPerRequest: null,
          lazyConnect: true,
        }),
      }),
    }),
    PrismaModule,
    AuthModule,
    WebhooksModule,
    RepositoriesModule,
    DashboardModule,
    RecipientsModule,
    DemoModule,
  ],
  controllers: [HealthController, ConfigController],
  // Les erreurs HTTP attendues (4xx) ne partent pas vers Sentry, seulement les erreurs imprévues.
  providers: [{ provide: APP_FILTER, useClass: SentryGlobalFilter }],
})
export class AppModule {}
