import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '@xcadence/shared';
import { SummaryProcessor } from './summary.processor.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.insights })],
  providers: [SummaryProcessor],
})
export class InsightsModule {}
