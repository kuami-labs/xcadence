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

/** GET /orgs/:orgId/sync-status : imports récents de l'organisation. */
export interface SyncStatusResponse {
  /** Un import est en attente ou en cours. */
  inProgress: boolean;
  jobs: {
    type: 'backfill' | 'webhook' | 'recompute';
    status: 'queued' | 'running' | 'succeeded' | 'failed';
    startedAt: string | null;
    finishedAt: string | null;
  }[];
}

/** GET /config : réglages publics utiles au front. */
export interface PublicConfigResponse {
  /** Adresse d'installation de la GitHub App ; null si GITHUB_APP_SLUG n'est pas défini. */
  githubAppInstallUrl: string | null;
}

/** GET /orgs/:orgId/summaries/latest : dernier résumé hebdomadaire, null s'il n'y en a pas. */
export interface WeeklySummaryView {
  /** Lundi de la semaine résumée, AAAA-MM-JJ. */
  weekStart: string;
  content: string;
  /** Modèle qui l'a rédigé, ou `repli` (résumé sans IA). */
  model: string;
}

/** Destinataire du résumé (GET/POST /orgs/:orgId/summary-recipients). */
export interface SummaryRecipientView {
  id: string;
  email: string;
}
