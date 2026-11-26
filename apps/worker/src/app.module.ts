import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SentryModule } from '@sentry/nestjs/setup';
import { pinoOptions, redisConnection } from '@xcadence/shared';
import { Redis } from 'ioredis';
import { LoggerModule } from 'nestjs-pino';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { GithubModule } from './github/github.module.js';
import { SyncModule } from './sync/sync.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { InsightsModule } from './insights/insights.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';

// Les modules de jobs BullMQ (import, métriques, résumés, emails) arrivent ici : docs/03-BACKEND.md.
@Module({
  imports: [
    // Logs JSON (docs/08-SECURITE.md) ; construits après le chargement du .env.
    LoggerModule.forRootAsync({ useFactory: () => ({ pinoHttp: pinoOptions() }) }),
    SentryModule.forRoot(),
    BullModule.forRootAsync({
      // Construit à l'initialisation (après le chargement du .env), pas à l'import du module.
      // BullMQ en ESM attend un client ioredis déjà construit ; maxRetriesPerRequest: null est exigé par les workers.
      useFactory: () => ({
        connection: new Redis({
          ...redisConnection(),
          maxRetriesPerRequest: null,
          lazyConnect: true,
        }),
      }),
    }),
    WebhooksModule,
    PrismaModule,
    GithubModule,
    SyncModule,
    MetricsModule,
    InsightsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
