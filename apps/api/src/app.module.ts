import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { redisConnection } from '@xcadence/shared';
import { Redis } from 'ioredis';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { RepositoriesModule } from './repositories/repositories.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ConfigController } from './config.controller.js';

@Module({
  imports: [
    // Limitation de débit (docs/08-SECURITE.md), appliquée par ThrottlerGuard sur /auth et /webhooks.
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
  ],
  controllers: [HealthController, ConfigController],
})
export class AppModule {}
