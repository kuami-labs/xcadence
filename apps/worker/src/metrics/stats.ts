const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

/** Début de la semaine (lundi 00:00 UTC) qui contient la date. */
export function weekStart(date: Date): Date {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (day.getUTCDay() + 6) % 7; // lundi = 0 … dimanche = 6
  return new Date(day.getTime() - offset * DAY_MS);
}

/**
 * Percentile par interpolation linéaire entre les rangs (même convention que la plupart des
 * tableurs). p entre 0 et 100 ; null pour une liste vide.
 */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  return sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
}

/** Médiane : préférée à la moyenne, une PR oubliée un mois ne fausse pas la semaine (PRD). */
export function median(values: number[]): number | null {
  return percentile(values, 50);
}

/** Regroupe des valeurs par semaine (clé : date ISO du lundi). */
export function groupByWeek<T>(items: T[], dateOf: (item: T) => Date): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = weekStart(dateOf(item)).toISOString();
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}
