import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '@xcadence/shared';
import { GithubModule } from '../github/github.module.js';
import { DemoService } from './demo.service.js';

@Module({
  imports: [GithubModule, BullModule.registerQueue({ name: QUEUES.sync })],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
