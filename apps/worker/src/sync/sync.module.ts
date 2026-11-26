import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '@xcadence/shared';
import { GithubModule } from '../github/github.module.js';
import { MetricsModule } from '../metrics/metrics.module.js';
import { BackfillProcessor } from './backfill.processor.js';
import { DeploymentsImporter } from './deployments.importer.js';
import { PullRequestsImporter } from './pull-requests.importer.js';
import { WorkflowRunsImporter } from './workflow-runs.importer.js';

@Module({
  imports: [GithubModule, MetricsModule, BullModule.registerQueue({ name: QUEUES.sync })],
  providers: [BackfillProcessor, PullRequestsImporter, WorkflowRunsImporter, DeploymentsImporter],
  exports: [PullRequestsImporter],
})
export class SyncModule {}
