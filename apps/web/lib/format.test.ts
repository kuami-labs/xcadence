import { describe, expect, it } from 'vitest';
import { formatAge } from './format';

describe('formatAge', () => {
  it('affiche heures puis jours', () => {
    expect(formatAge(5.7)).toBe('5 h');
    expect(formatAge(48)).toBe('2 j');
    expect(formatAge(76.2)).toBe('3 j 4 h');
  });
});
