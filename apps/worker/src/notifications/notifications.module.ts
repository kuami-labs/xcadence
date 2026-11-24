import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '@xcadence/shared';
import { MAILER, createMailer } from './mailer.js';
import { NotificationsProcessor } from './notifications.processor.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.notifications })],
  providers: [NotificationsProcessor, { provide: MAILER, useFactory: () => createMailer() }],
})
export class NotificationsModule {}
