import { METRIC_KEYS, type MetricValue } from '@xcadence/shared';
import { describe, expect, it } from 'vitest';
import {
  DORA_CARDS,
  formatValue,
  mondayOf,
  periods,
  summarize,
  trend,
  weeklySeries,
} from './summary';

const [frequency, leadTime] = DORA_CARDS;
const v = (
  metricKey: MetricValue['metricKey'],
  weekStart: string,
  value: number,
  sampleSize: number,
) => ({
  metricKey,
  weekStart,
  value,
  sampleSize,
});

describe('résumé des métriques', () => {
  it('ramène une date au lundi', () => {
    expect(mondayOf(new Date('2026-11-29T23:00:00Z'))).toBe('2026-11-23');
    expect(mondayOf(new Date('2026-11-30T01:00:00Z'))).toBe('2026-11-30');
  });

  it('calcule la période et la précédente', () => {
    expect(periods(4, new Date('2026-11-25T12:00:00Z'))).toEqual({
      current: { from: '2026-11-02', to: '2026-11-29' },
      previous: { from: '2026-10-05', to: '2026-11-01' },
    });
  });

  it('fréquence : moyenne par semaine, semaines sans déploiement comprises', () => {
    const values = [
      v(METRIC_KEYS.deploymentFrequency, '2026-11-23', 6, 6),
      v(METRIC_KEYS.deploymentFrequency, '2026-11-16', 2, 2),
    ];
    expect(summarize(values, frequency, { from: '2026-11-02', to: '2026-11-29' }, 4)).toEqual({
      value: 2,
      sampleSize: 8,
    });
  });

  it("délai : moyenne pondérée par l'échantillon, null sans donnée", () => {
    const values = [
      v(METRIC_KEYS.leadTime, '2026-11-23', 10, 3),
      v(METRIC_KEYS.leadTime, '2026-11-16', 2, 1),
      v(METRIC_KEYS.leadTime, '2026-10-01', 99, 9), // hors période
      v(METRIC_KEYS.prLifetime, '2026-11-23', 50, 5), // autre métrique
    ];
    expect(summarize(values, leadTime, { from: '2026-11-02', to: '2026-11-29' }, 4)).toEqual({
      value: 8,
      sampleSize: 4,
    });
    expect(summarize([], leadTime, { from: '2026-11-02', to: '2026-11-29' }, 4)).toEqual({
      value: null,
      sampleSize: 0,
    });
  });

  it('tendance selon le sens d’amélioration', () => {
    expect(trend(12, 10, 'higher')).toEqual({ percent: 20, direction: 'better' });
    expect(trend(12, 10, 'lower')).toEqual({ percent: 20, direction: 'worse' });
    expect(trend(5, 10, 'lower')).toEqual({ percent: -50, direction: 'better' });
    expect(trend(3, 3, 'lower')).toEqual({ percent: 0, direction: 'stable' });
    expect(trend(3, 0, 'higher')).toEqual({ percent: null, direction: 'better' });
    expect(trend(null, 3, 'higher')).toBeNull();
  });

  it('formate les valeurs', () => {
    expect(formatValue(null)).toBe('—');
    expect(formatValue(7.25)).toBe('7,3');
  });

  it('donne une valeur par semaine, sans trou', () => {
    const period = { from: '2026-11-02', to: '2026-11-29' };
    const values = [
      v(METRIC_KEYS.deploymentFrequency, '2026-11-09', 3, 3),
      v(METRIC_KEYS.leadTime, '2026-11-09', 12.5, 4),
      v(METRIC_KEYS.leadTime, '2026-10-26', 99, 1),
    ];
    // Fréquence : une semaine sans déploiement vaut zéro.
    expect(weeklySeries(values, frequency, period)).toEqual([
      { weekStart: '2026-11-02', value: 0 },
      { weekStart: '2026-11-09', value: 3 },
      { weekStart: '2026-11-16', value: 0 },
      { weekStart: '2026-11-23', value: 0 },
    ]);
    // Délai : une semaine sans PR déployée n'a pas de valeur ; hors période, ignorée.
    expect(weeklySeries(values, leadTime, period).map((w) => w.value)).toEqual([
      null,
      12.5,
      null,
      null,
    ]);
  });
});
