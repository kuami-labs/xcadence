import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { WebhooksModule } from './webhooks/webhooks.module.js';

@Module({
  controllers: [HealthController],
  imports: [PrismaModule, WebhooksModule],
})
export class AppModule {}
