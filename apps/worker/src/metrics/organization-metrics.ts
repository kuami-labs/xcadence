import { parseDeployRule } from '@xcadence/shared';
import { doraMetrics, doraSamples, type DoraDeployment, type DoraSamples } from './dora-metrics.js';
import { ciDuration, prLifetime, timeToFirstReview, type FlowWorkflowRun } from './flow-metrics.js';
import type { MetricPoint } from './stats.js';

/** Données brutes d'un dépôt suivi, telles que lues en base. */
export interface RepositoryData {
  id: string;
  defaultBranch: string | null;
  /** deploy_rule tel que stocké (JSON) ; absent ou invalide = règle par défaut. */
  deployRule?: unknown;
  pullRequests: {
    isDraft: boolean;
    createdAt: Date;
    firstCommitAt: Date | null;
    firstReviewAt: Date | null;
    mergedAt: Date | null;
  }[];
  workflowRuns: FlowWorkflowRun[];
  deployments: DoraDeployment[];
}

/** Une ligne de weekly_metrics : repositoryId null = toute l'organisation. */
export interface MetricRow extends MetricPoint {
  repositoryId: string | null;
}

function metricsOf(
  prs: RepositoryData['pullRequests'],
  mainRuns: FlowWorkflowRun[],
  dora: DoraSamples,
): MetricPoint[] {
  return [
    ...timeToFirstReview(prs),
    ...prLifetime(prs),
    // Runs déjà limités à la branche principale de chaque dépôt.
    ...ciDuration(mainRuns, 'main'),
    ...doraMetrics(dora),
  ];
}

const onMainBranch = (repo: RepositoryData): FlowWorkflowRun[] =>
  repo.defaultBranch
    ? repo.workflowRuns
        .filter((r) => r.branch === repo.defaultBranch)
        .map((r) => ({ ...r, branch: 'main' }))
    : [];

/**
 * Toutes les métriques d'une organisation : par dépôt suivi, puis pour toute l'organisation
 * (données des dépôts réunies). Aucune métrique par développeur.
 */
export function organizationMetrics(repos: RepositoryData[]): MetricRow[] {
  const samples = repos.map((repo) =>
    doraSamples(repo.pullRequests, repo.deployments, parseDeployRule(repo.deployRule)),
  );
  const perRepo = repos.flatMap((repo, i) =>
    metricsOf(repo.pullRequests, onMainBranch(repo), samples[i]).map((p) => ({
      ...p,
      repositoryId: repo.id,
    })),
  );
  if (repos.length === 0) {
    return perRepo;
  }
  const whole = metricsOf(
    repos.flatMap((r) => r.pullRequests),
    repos.flatMap(onMainBranch),
    {
      // Mesures calculées dépôt par dépôt, puis réunies : jamais de déploiements mélangés.
      deployments: samples.flatMap((s) => s.deployments),
      leadTimes: samples.flatMap((s) => s.leadTimes),
      changes: samples.flatMap((s) => s.changes),
      restores: samples.flatMap((s) => s.restores),
    },
  ).map((p) => ({ ...p, repositoryId: null }));
  return [...perRepo, ...whole];
}
