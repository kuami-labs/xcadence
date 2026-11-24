import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '@xcadence/shared';
import { WebhookEventsProcessor } from './webhook-events.processor.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.webhooks })],
  providers: [WebhookEventsProcessor],
})
export class WebhooksModule {}
