/** Clés des métriques écrites dans weekly_metrics (docs/01-PRD.md, Métriques calculées). */
export const METRIC_KEYS = {
  /** Temps entre l'ouverture d'une PR (hors brouillon) et la première revue, heures, médiane. */
  timeToFirstReview: 'time_to_first_review',
  /** Temps entre l'ouverture et la fusion d'une PR, heures, médiane. */
  prLifetime: 'pr_lifetime',
  /** Durée des runs de CI sur la branche principale, minutes, médiane (p50). */
  ciDurationP50: 'ci_duration_p50',
  /** Durée des runs de CI sur la branche principale, minutes, 90e percentile. */
  ciDurationP90: 'ci_duration_p90',
  /** Déploiements réussis en production par semaine. */
  deploymentFrequency: 'deployment_frequency',
  /** Premier commit d'une PR → déploiement en production qui la livre, heures, médiane. */
  leadTime: 'lead_time',
  /** Part des déploiements en production en échec ou annulés (rollback) sous 48 h, %. */
  changeFailureRate: 'change_failure_rate',
  /** Déploiement en échec → déploiement réussi suivant, heures, médiane. */
  timeToRestore: 'time_to_restore',
} as const;

export type MetricKey = (typeof METRIC_KEYS)[keyof typeof METRIC_KEYS];
