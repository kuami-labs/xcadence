import { describe, expect, it } from 'vitest';
import { formatAge, formatLines } from './format';

describe('formatAge', () => {
  it('affiche heures puis jours', () => {
    expect(formatAge(5.7)).toBe('5 h');
    expect(formatAge(48)).toBe('2 j');
    expect(formatAge(76.2)).toBe('3 j 4 h');
  });
});

describe('formatLines', () => {
  it('accorde le pluriel', () => {
    expect(formatLines(0)).toBe('0 ligne');
    expect(formatLines(1)).toBe('1 ligne');
    expect(formatLines(14)).toBe('14 lignes');
  });
});
