import { groupByWeek, median, percentile, weekStart } from './stats.js';

describe('outils statistiques', () => {
  it('ramène une date au lundi 00:00 UTC de sa semaine', () => {
    expect(weekStart(new Date('2026-11-23T00:00:00Z'))).toEqual(new Date('2026-11-23T00:00:00Z'));
    expect(weekStart(new Date('2026-11-25T15:30:00Z'))).toEqual(new Date('2026-11-23T00:00:00Z'));
    // Dimanche soir : encore la semaine du lundi précédent.
    expect(weekStart(new Date('2026-11-29T23:59:59Z'))).toEqual(new Date('2026-11-23T00:00:00Z'));
    expect(weekStart(new Date('2026-11-30T00:00:00Z'))).toEqual(new Date('2026-11-30T00:00:00Z'));
  });

  it('calcule médiane et percentiles par interpolation', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(percentile([10, 20, 30, 40, 50], 90)).toBe(46);
    expect(percentile([7], 90)).toBe(7);
    expect(median([])).toBeNull();
  });

  it('résiste à une valeur extrême (médiane, pas moyenne)', () => {
    expect(median([2, 3, 4, 720])).toBe(3.5);
  });

  it('regroupe par semaine', () => {
    const groups = groupByWeek(
      [
        new Date('2026-11-23T10:00:00Z'),
        new Date('2026-11-29T10:00:00Z'),
        new Date('2026-11-30T10:00:00Z'),
      ],
      (d) => d,
    );
    expect([...groups].map(([week, items]) => [week, items.length])).toEqual([
      ['2026-11-23T00:00:00.000Z', 2],
      ['2026-11-30T00:00:00.000Z', 1],
    ]);
  });
});
