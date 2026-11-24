import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '@xcadence/shared';
import { GithubModule } from '../github/github.module.js';
import { SyncModule } from '../sync/sync.module.js';
import { WebhookEventsProcessor } from './webhook-events.processor.js';
import { InstallationHandler } from './installation.handler.js';
import { PullRequestEventsHandler } from './pull-request-events.handler.js';
import { WorkflowRunEventsHandler } from './workflow-run-events.handler.js';
import { DeploymentStatusEventsHandler } from './deployment-status-events.handler.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.webhooks }), GithubModule, SyncModule],
  providers: [
    WebhookEventsProcessor,
    InstallationHandler,
    PullRequestEventsHandler,
    WorkflowRunEventsHandler,
    DeploymentStatusEventsHandler,
  ],
})
export class WebhooksModule {}
