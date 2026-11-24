import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '@xcadence/shared';
import { MetricsScheduler } from './metrics.scheduler.js';
import { RecomputeProcessor } from './recompute.processor.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.metrics })],
  providers: [RecomputeProcessor, MetricsScheduler],
  exports: [MetricsScheduler],
})
export class MetricsModule {}
