import { METRIC_KEYS, type MetricKey } from '@xcadence/shared';
import { HOUR_MS, MINUTE_MS, groupByWeek, median, percentile } from './stats.js';

/** Une valeur hebdomadaire, prête pour weekly_metrics. */
export interface MetricPoint {
  weekStart: Date;
  metricKey: MetricKey;
  value: number;
  sampleSize: number;
}

export interface FlowPullRequest {
  isDraft: boolean;
  createdAt: Date;
  firstReviewAt: Date | null;
  mergedAt: Date | null;
}

export interface FlowWorkflowRun {
  branch: string;
  startedAt: Date;
  completedAt: Date | null;
}

const byWeek = (
  groups: Map<string, number[]>,
  metricKey: MetricKey,
  stat: (v: number[]) => number | null,
) =>
  [...groups.entries()]
    .map(([week, values]) => ({
      weekStart: new Date(week),
      metricKey,
      value: stat(values) as number,
      sampleSize: values.length,
    }))
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

const toValues = <T>(groups: Map<string, T[]>, value: (item: T) => number) =>
  new Map([...groups].map(([week, items]) => [week, items.map(value)]));

/**
 * Temps avant première revue (heures, médiane), par semaine d'ouverture de la PR.
 * Brouillons exclus ; PR sans revue ignorées.
 */
export function timeToFirstReview(prs: FlowPullRequest[]): MetricPoint[] {
  const reviewed = prs.filter(
    (pr): pr is FlowPullRequest & { firstReviewAt: Date } =>
      !pr.isDraft && pr.firstReviewAt !== null,
  );
  const groups = groupByWeek(reviewed, (pr) => pr.createdAt);
  return byWeek(
    toValues(groups, (pr) => (pr.firstReviewAt.getTime() - pr.createdAt.getTime()) / HOUR_MS),
    METRIC_KEYS.timeToFirstReview,
    median,
  );
}

/** Durée de vie des PR (heures, médiane) : de l'ouverture à la fusion, par semaine de fusion. */
export function prLifetime(prs: FlowPullRequest[]): MetricPoint[] {
  const merged = prs.filter(
    (pr): pr is FlowPullRequest & { mergedAt: Date } => pr.mergedAt !== null,
  );
  const groups = groupByWeek(merged, (pr) => pr.mergedAt);
  return byWeek(
    toValues(groups, (pr) => (pr.mergedAt.getTime() - pr.createdAt.getTime()) / HOUR_MS),
    METRIC_KEYS.prLifetime,
    median,
  );
}

/**
 * Durée de la CI (minutes, p50 et p90) des runs terminés sur la branche principale,
 * par semaine de démarrage.
 */
export function ciDuration(runs: FlowWorkflowRun[], defaultBranch: string | null): MetricPoint[] {
  if (!defaultBranch) {
    return [];
  }
  const done = runs.filter(
    (run): run is FlowWorkflowRun & { completedAt: Date } =>
      run.branch === defaultBranch && run.completedAt !== null,
  );
  const minutes = toValues(
    groupByWeek(done, (run) => run.startedAt),
    (run) => (run.completedAt.getTime() - run.startedAt.getTime()) / MINUTE_MS,
  );
  return [
    ...byWeek(minutes, METRIC_KEYS.ciDurationP50, (v) => percentile(v, 50)),
    ...byWeek(minutes, METRIC_KEYS.ciDurationP90, (v) => percentile(v, 90)),
  ];
}
