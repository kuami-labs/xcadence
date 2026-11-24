import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '@xcadence/shared';
import { WebhookEventsProcessor } from './webhook-events.processor.js';
import { InstallationHandler } from './installation.handler.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.webhooks })],
  providers: [WebhookEventsProcessor, InstallationHandler],
})
export class WebhooksModule {}
