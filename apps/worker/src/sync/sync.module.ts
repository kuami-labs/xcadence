import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '@xcadence/shared';
import { GithubModule } from '../github/github.module.js';
import { BackfillProcessor } from './backfill.processor.js';
import { PullRequestsImporter } from './pull-requests.importer.js';

@Module({
  imports: [GithubModule, BullModule.registerQueue({ name: QUEUES.sync })],
  providers: [BackfillProcessor, PullRequestsImporter],
})
export class SyncModule {}
