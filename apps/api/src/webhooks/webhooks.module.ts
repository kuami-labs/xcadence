import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '@xcadence/shared';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.webhooks })],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
