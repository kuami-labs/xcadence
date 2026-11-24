import { METRIC_KEYS, type MetricKey, type MetricValue } from '@xcadence/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  unit: string;
  /** Sens d'amélioration : plus haut (fréquence) ou plus bas (délais, échecs). */
  better: 'higher' | 'lower';
  /** Agrégation sur une période : somme hebdomadaire moyenne, ou moyenne pondérée par l'échantillon. */
  aggregate: 'perWeek' | 'weighted';
}

/** Les 4 cartes DORA du tableau de bord (docs/04-FRONTEND.md) ; pas de niveau Elite à Low (#44). */
export const DORA_CARDS: MetricDefinition[] = [
  {
    key: METRIC_KEYS.deploymentFrequency,
    label: 'Fréquence de déploiement',
    unit: 'par semaine',
    better: 'higher',
    aggregate: 'perWeek',
  },
  {
    key: METRIC_KEYS.leadTime,
    label: 'Délai de livraison',
    unit: 'h',
    better: 'lower',
    aggregate: 'weighted',
  },
  {
    key: METRIC_KEYS.changeFailureRate,
    label: "Taux d'échec des changements",
    unit: '%',
    better: 'lower',
    aggregate: 'weighted',
  },
  {
    key: METRIC_KEYS.timeToRestore,
    label: 'Temps de rétablissement',
    unit: 'h',
    better: 'lower',
    aggregate: 'weighted',
  },
];

/** Lundi (UTC) de la semaine d'une date, au format AAAA-MM-JJ. */
export function mondayOf(date: Date): string {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * DAY_MS).toISOString().slice(0, 10);
}

export interface Period {
  from: string;
  to: string;
}

/** Les `weeks` dernières semaines (semaine en cours comprise) et la période précédente de même durée. */
export function periods(weeks: number, today = new Date()): { current: Period; previous: Period } {
  const monday = new Date(`${mondayOf(today)}T00:00:00Z`);
  const start = new Date(monday.getTime() - (weeks - 1) * 7 * DAY_MS);
  const previousStart = new Date(start.getTime() - weeks * 7 * DAY_MS);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    current: { from: iso(start), to: iso(new Date(monday.getTime() + 6 * DAY_MS)) },
    previous: { from: iso(previousStart), to: iso(new Date(start.getTime() - DAY_MS)) },
  };
}

/** Valeur d'une métrique sur une période ; null sans donnée. */
export function summarize(
  values: MetricValue[],
  metric: MetricDefinition,
  period: Period,
  weeks: number,
): { value: number | null; sampleSize: number } {
  const inPeriod = values.filter(
    (v) => v.metricKey === metric.key && v.weekStart >= period.from && v.weekStart <= period.to,
  );
  const sampleSize = inPeriod.reduce((sum, v) => sum + v.sampleSize, 0);
  if (metric.aggregate === 'perWeek') {
    // Les semaines sans déploiement comptent pour zéro.
    return { value: inPeriod.reduce((sum, v) => sum + v.value, 0) / weeks, sampleSize };
  }
  if (sampleSize === 0) {
    return { value: null, sampleSize };
  }
  const weighted = inPeriod.reduce((sum, v) => sum + v.value * v.sampleSize, 0) / sampleSize;
  return { value: weighted, sampleSize };
}

export type TrendDirection = 'better' | 'worse' | 'stable';

/** Variation par rapport à la période précédente ; null si l'une des deux valeurs manque. */
export function trend(
  current: number | null,
  previous: number | null,
  better: MetricDefinition['better'],
): { percent: number | null; direction: TrendDirection } | null {
  if (current === null || previous === null) return null;
  if (current === previous) return { percent: 0, direction: 'stable' };
  const percent = previous === 0 ? null : ((current - previous) / previous) * 100;
  const up = current > previous;
  return { percent, direction: up === (better === 'higher') ? 'better' : 'worse' };
}

/** Affichage d'une valeur : une décimale au plus. */
export function formatValue(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
}
