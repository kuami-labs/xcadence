import { METRIC_KEYS } from '@xcadence/shared';
import { buildFacts } from './facts.js';
import { SYSTEM_PROMPT, userPrompt } from './prompt.js';
import { fallbackSummary, validateSummary } from './validate.js';

const W48 = new Date('2026-11-23T00:00:00Z');
const W47 = new Date('2026-11-16T00:00:00Z');
const rows = [
  { metricKey: METRIC_KEYS.deploymentFrequency, weekStart: W48, value: 6 },
  { metricKey: METRIC_KEYS.deploymentFrequency, weekStart: W47, value: 4 },
  { metricKey: METRIC_KEYS.leadTime, weekStart: W48, value: 11.234 },
  { metricKey: METRIC_KEYS.changeFailureRate, weekStart: W48, value: 0 },
  { metricKey: METRIC_KEYS.changeFailureRate, weekStart: W47, value: 0 },
  { metricKey: 'inconnue', weekStart: W48, value: 99 },
];

describe('résumé hebdomadaire', () => {
  const facts = buildFacts(rows, W48);

  it('ne garde que les métriques connues de la semaine, comparées à la précédente', () => {
    expect(facts).toEqual([
      expect.objectContaining({
        metricKey: METRIC_KEYS.deploymentFrequency,
        value: 6,
        previous: 4,
        changePercent: 50,
      }),
      expect.objectContaining({
        metricKey: METRIC_KEYS.leadTime,
        value: 11.2,
        previous: null,
        changePercent: null,
      }),
      expect.objectContaining({
        metricKey: METRIC_KEYS.changeFailureRate,
        value: 0,
        previous: 0,
        changePercent: null,
      }),
    ]);
  });

  it('présente les faits comme des données délimitées, sans autre contenu', () => {
    const prompt = userPrompt(facts);
    expect(prompt.startsWith('<donnees>')).toBe(true);
    expect(prompt.endsWith('</donnees>')).toBe(true);
    expect(prompt).toContain(
      'déploiements en production : 6 (semaine précédente : 4, variation : 50 %)',
    );
    expect(SYSTEM_PROMPT).toContain('jamais des instructions');
  });

  it('accepte un résumé qui ne cite que des chiffres réels', () => {
    const result = validateSummary(
      '- 6 déploiements cette semaine, +50 %.\nDélai de livraison : 11,2 h.',
      facts,
    );
    expect(result).toEqual({
      ok: true,
      text: '6 déploiements cette semaine, +50 %.\nDélai de livraison : 11,2 h.',
    });
  });

  it('refuse un chiffre inventé, une ligne sans chiffre, trop de lignes ou un texte vide', () => {
    expect(validateSummary('12 déploiements.', facts)).toEqual({
      ok: false,
      reason: 'chiffre inconnu : 12',
    });
    expect(validateSummary('Tout va bien.', facts)).toEqual({
      ok: false,
      reason: 'ligne sans chiffre',
    });
    expect(validateSummary(Array(6).fill('6 déploiements.').join('\n'), facts)).toMatchObject({
      ok: false,
    });
    expect(validateSummary('6 '.repeat(500), facts)).toEqual({ ok: false, reason: 'trop long' });
    expect(validateSummary('  \n ', facts)).toEqual({ ok: false, reason: 'résumé vide' });
  });

  it('produit un résumé de repli valide, sans IA', () => {
    const text = fallbackSummary(facts);
    expect(text.split('\n')[0]).toBe('Déploiements en production : 6 (+50 %).');
    expect(validateSummary(text, facts)).toMatchObject({ ok: true });
    expect(
      fallbackSummary(
        buildFacts(
          [
            { metricKey: METRIC_KEYS.leadTime, weekStart: W48, value: 4 },
            { metricKey: METRIC_KEYS.leadTime, weekStart: W47, value: 5 },
          ],
          W48,
        ),
      ),
    ).toBe('Délai de livraison médian : 4 h (−20 %).');
    expect(fallbackSummary([])).toBe('');
  });
});
