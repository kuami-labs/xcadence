-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('owner', 'member');

-- CreateEnum
CREATE TYPE "PullRequestState" AS ENUM ('open', 'closed', 'merged');

-- CreateEnum
CREATE TYPE "ReviewState" AS ENUM ('approved', 'changes_requested', 'commented', 'dismissed', 'pending');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('pending', 'queued', 'in_progress', 'success', 'failure', 'error', 'inactive');

-- CreateEnum
CREATE TYPE "SyncJobType" AS ENUM ('backfill', 'webhook', 'recompute');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "github_id" BIGINT NOT NULL,
    "login" TEXT NOT NULL,
    "email" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "github_org_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "installation_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("user_id","organization_id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "github_repo_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "default_branch" TEXT NOT NULL,
    "is_tracked" BOOLEAN NOT NULL DEFAULT false,
    "deploy_rule" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_requests" (
    "id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "github_pr_id" BIGINT NOT NULL,
    "number" INTEGER NOT NULL,
    "author_login" TEXT NOT NULL,
    "state" "PullRequestState" NOT NULL,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL,
    "first_commit_at" TIMESTAMP(3),
    "first_review_at" TIMESTAMP(3),
    "merged_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pull_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "pull_request_id" UUID NOT NULL,
    "github_review_id" BIGINT NOT NULL,
    "reviewer_login" TEXT NOT NULL,
    "state" "ReviewState" NOT NULL,
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "github_deployment_id" BIGINT NOT NULL,
    "sha" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" "DeploymentStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "github_run_id" BIGINT NOT NULL,
    "workflow_name" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "conclusion" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_metrics" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "repository_id" UUID,
    "week_start" DATE NOT NULL,
    "metric_key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "sample_size" INTEGER NOT NULL,

    CONSTRAINT "weekly_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_summaries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "SyncJobType" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'queued',
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_github_org_id_key" ON "organizations"("github_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_installation_id_key" ON "organizations"("installation_id");

-- CreateIndex
CREATE INDEX "memberships_organization_id_idx" ON "memberships"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_github_repo_id_key" ON "repositories"("github_repo_id");

-- CreateIndex
CREATE INDEX "repositories_organization_id_idx" ON "repositories"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_github_pr_id_key" ON "pull_requests"("github_pr_id");

-- CreateIndex
CREATE INDEX "pull_requests_repository_id_merged_at_idx" ON "pull_requests"("repository_id", "merged_at");

-- CreateIndex
CREATE INDEX "pull_requests_repository_id_created_at_idx" ON "pull_requests"("repository_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_repository_id_number_key" ON "pull_requests"("repository_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_github_review_id_key" ON "reviews"("github_review_id");

-- CreateIndex
CREATE INDEX "reviews_pull_request_id_idx" ON "reviews"("pull_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "deployments_github_deployment_id_key" ON "deployments"("github_deployment_id");

-- CreateIndex
CREATE INDEX "deployments_repository_id_created_at_idx" ON "deployments"("repository_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_runs_github_run_id_key" ON "workflow_runs"("github_run_id");

-- CreateIndex
CREATE INDEX "workflow_runs_repository_id_started_at_idx" ON "workflow_runs"("repository_id", "started_at");

-- CreateIndex
CREATE INDEX "weekly_metrics_repository_id_week_start_metric_key_idx" ON "weekly_metrics"("repository_id", "week_start", "metric_key");

-- CreateIndex
-- NULLS NOT DISTINCT (PostgreSQL 15+) : repository_id null = toute l'organisation, une seule ligne par semaine et métrique
CREATE UNIQUE INDEX "weekly_metrics_scope_key" ON "weekly_metrics"("organization_id", "repository_id", "week_start", "metric_key") NULLS NOT DISTINCT;

-- CreateIndex
CREATE UNIQUE INDEX "weekly_summaries_organization_id_week_start_key" ON "weekly_summaries"("organization_id", "week_start");

-- CreateIndex
CREATE INDEX "sync_jobs_organization_id_created_at_idx" ON "sync_jobs"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_delivery_id_key" ON "webhook_events"("delivery_id");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_pull_request_id_fkey" FOREIGN KEY ("pull_request_id") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_metrics" ADD CONSTRAINT "weekly_metrics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_metrics" ADD CONSTRAINT "weekly_metrics_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_summaries" ADD CONSTRAINT "weekly_summaries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
