import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { redisConnection } from '@xcadence/shared';
import { Redis } from 'ioredis';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

// Les modules de jobs BullMQ (import, métriques, résumés, emails) arrivent ici : docs/03-BACKEND.md.
@Module({
  imports: [
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
  ],
})
export class AppModule {}
