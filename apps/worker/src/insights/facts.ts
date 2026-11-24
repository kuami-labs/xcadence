import { METRIC_KEYS, type MetricKey } from '@xcadence/shared';

/** Libellé et unité de chaque métrique, pour le modèle comme pour le résumé de repli. */
export const METRIC_LABELS: Record<MetricKey, { label: string; unit: string }> = {
  [METRIC_KEYS.deploymentFrequency]: { label: 'déploiements en production', unit: '' },
  [METRIC_KEYS.leadTime]: { label: 'délai de livraison médian', unit: 'h' },
  [METRIC_KEYS.changeFailureRate]: { label: "taux d'échec des changements", unit: '%' },
  [METRIC_KEYS.timeToRestore]: { label: 'temps de rétablissement médian', unit: 'h' },
  [METRIC_KEYS.timeToFirstReview]: { label: 'temps médian avant première revue', unit: 'h' },
  [METRIC_KEYS.prLifetime]: { label: 'durée de vie médiane des PR', unit: 'h' },
  [METRIC_KEYS.ciDurationP50]: { label: 'durée médiane de la CI', unit: 'min' },
  [METRIC_KEYS.ciDurationP90]: { label: 'durée de la CI (p90)', unit: 'min' },
};

/** Une métrique de l'organisation sur la semaine résumée, comparée à la précédente. */
export interface Fact {
  metricKey: MetricKey;
  label: string;
  unit: string;
  value: number;
  previous: number | null;
  /** Variation en %, arrondie à l'entier ; null sans semaine précédente ou depuis zéro. */
  changePercent: number | null;
}

export interface WeeklyMetricRow {
  metricKey: string;
  weekStart: Date;
  value: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Faits du résumé : métriques de toute l'organisation pour la semaine `week`, comparées à la
 * semaine précédente. Uniquement des chiffres agrégés (docs/08-SECURITE.md) : ni texte de PR,
 * ni nom de personne.
 */
export function buildFacts(rows: WeeklyMetricRow[], week: Date): Fact[] {
  const previousWeek = new Date(week.getTime() - 7 * 24 * 60 * 60 * 1000);
  const at = (key: string, w: Date) =>
    rows.find((r) => r.metricKey === key && r.weekStart.getTime() === w.getTime());
  return (Object.keys(METRIC_LABELS) as MetricKey[]).flatMap((metricKey) => {
    const current = at(metricKey, week);
    if (!current) return [];
    const before = at(metricKey, previousWeek);
    const value = round1(current.value);
    const previous = before ? round1(before.value) : null;
    return [
      {
        metricKey,
        ...METRIC_LABELS[metricKey],
        value,
        previous,
        changePercent:
          previous === null || previous === 0
            ? null
            : Math.round(((value - previous) / previous) * 100),
      },
    ];
  });
}
