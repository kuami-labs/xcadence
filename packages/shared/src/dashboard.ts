import type { MetricKey } from './metrics.js';

/** Une valeur hebdomadaire (GET /orgs/:orgId/metrics). */
export interface MetricValue {
  metricKey: MetricKey;
  /** Lundi de la semaine, AAAA-MM-JJ (UTC). */
  weekStart: string;
  value: number;
  sampleSize: number;
}

export interface MetricsResponse {
  /** null : toute l'organisation. */
  repositoryId: string | null;
  from: string;
  to: string;
  metrics: MetricValue[];
}

/** Une PR dans les listes de goulots (aucune donnée de code, aucun classement par personne). */
export interface BottleneckPullRequest {
  repositoryId: string;
  repositoryName: string;
  number: number;
  createdAt: string;
  ageHours: number;
  size: number;
}

/** Un workflow de CI sur la branche principale, sur les 4 dernières semaines. */
export interface BottleneckWorkflow {
  repositoryId: string;
  repositoryName: string;
  workflowName: string;
  runs: number;
  p90Minutes: number;
  /** Part des runs terminés en échec, %. */
  failureRate: number;
}

export interface BottlenecksResponse {
  /** PR ouvertes, hors brouillon, sans revue depuis plus de 48 h ; les plus anciennes d'abord. */
  awaitingReview: BottleneckPullRequest[];
  /** PR ouvertes depuis plus de 7 jours ; les plus anciennes d'abord. */
  oldPullRequests: BottleneckPullRequest[];
  /** Workflows les plus lents (p90), avec leur taux d'échec. */
  slowWorkflows: BottleneckWorkflow[];
}
