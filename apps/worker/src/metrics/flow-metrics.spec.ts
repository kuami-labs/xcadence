import { METRIC_KEYS } from '@xcadence/shared';
import { ciDuration, prLifetime, timeToFirstReview } from './flow-metrics.js';

const at = (iso: string) => new Date(iso);
const S47 = at('2026-11-16T00:00:00Z');
const S48 = at('2026-11-23T00:00:00Z');

const pr = (created: string, review: string | null, merged: string | null, isDraft = false) => ({
  isDraft,
  createdAt: at(created),
  firstReviewAt: review ? at(review) : null,
  mergedAt: merged ? at(merged) : null,
});

describe('métriques de flux', () => {
  const prs = [
    // Semaine 48 : revues après 2 h, 4 h et 30 h ; une PR sans revue ; un brouillon relu.
    pr('2026-11-23T08:00:00Z', '2026-11-23T10:00:00Z', '2026-11-24T08:00:00Z'),
    pr('2026-11-24T09:00:00Z', '2026-11-24T13:00:00Z', null),
    pr('2026-11-25T00:00:00Z', '2026-11-26T06:00:00Z', '2026-11-27T00:00:00Z'),
    pr('2026-11-26T00:00:00Z', null, null),
    pr('2026-11-27T00:00:00Z', '2026-11-27T01:00:00Z', null, true),
    // Semaine 47 : ouverte la semaine précédente, fusionnée en semaine 48 après 10 jours.
    pr('2026-11-16T00:00:00Z', '2026-11-16T01:00:00Z', '2026-11-26T00:00:00Z'),
  ];

  it('temps avant première revue : médiane par semaine d’ouverture, brouillons et PR sans revue exclus', () => {
    expect(timeToFirstReview(prs)).toEqual([
      { weekStart: S47, metricKey: METRIC_KEYS.timeToFirstReview, value: 1, sampleSize: 1 },
      { weekStart: S48, metricKey: METRIC_KEYS.timeToFirstReview, value: 4, sampleSize: 3 },
    ]);
  });

  it('durée de vie des PR : médiane par semaine de fusion', () => {
    // Semaine 48 : 24 h, 48 h, 240 h → médiane 48 h.
    expect(prLifetime(prs)).toEqual([
      { weekStart: S48, metricKey: METRIC_KEYS.prLifetime, value: 48, sampleSize: 3 },
    ]);
  });

  it('durée de la CI : p50 et p90 des runs terminés sur la branche principale', () => {
    const run = (branch: string, start: string, minutes: number | null) => ({
      branch,
      startedAt: at(start),
      completedAt: minutes === null ? null : new Date(at(start).getTime() + minutes * 60_000),
    });
    const runs = [
      run('main', '2026-11-23T10:00:00Z', 4),
      run('main', '2026-11-24T10:00:00Z', 6),
      run('main', '2026-11-25T10:00:00Z', 8),
      run('main', '2026-11-26T10:00:00Z', 10),
      run('main', '2026-11-27T10:00:00Z', 30),
      run('main', '2026-11-27T11:00:00Z', null), // en cours : ignoré
      run('feature/x', '2026-11-27T12:00:00Z', 2), // autre branche : ignorée
    ];
    expect(ciDuration(runs, 'main')).toEqual([
      { weekStart: S48, metricKey: METRIC_KEYS.ciDurationP50, value: 8, sampleSize: 5 },
      { weekStart: S48, metricKey: METRIC_KEYS.ciDurationP90, value: 22, sampleSize: 5 },
    ]);
  });

  it('ne calcule rien sans branche principale connue ni données', () => {
    expect(ciDuration([], null)).toEqual([]);
    expect(timeToFirstReview([])).toEqual([]);
    expect(prLifetime([])).toEqual([]);
  });
});
