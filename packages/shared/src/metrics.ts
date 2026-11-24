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
} as const;

export type MetricKey = (typeof METRIC_KEYS)[keyof typeof METRIC_KEYS];
