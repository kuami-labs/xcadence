import { METRIC_KEYS } from '@xcadence/shared';
import {
  changeFailureRate,
  deploymentFrequency,
  isProduction,
  doraSamples,
  leadTime,
  timeToRestore,
} from './dora-metrics.js';

const at = (iso: string) => new Date(iso);
const S48 = at('2026-11-23T00:00:00Z');

const deploy = (
  sha: string,
  status: string,
  finished: string | null,
  environment = 'production',
  created?: string,
) => ({
  sha,
  environment,
  status,
  createdAt: at(created ?? finished ?? '2026-11-23T00:00:00Z'),
  finishedAt: finished ? at(finished) : null,
});

// Semaine 48, en production sauf mention :
const deployments = [
  deploy('A', 'success', null, 'production', '2026-11-23T10:00:00Z'), // date de création à défaut de fin
  deploy('B', 'success', '2026-11-24T10:00:00Z'),
  deploy('A', 'success', '2026-11-24T20:00:00Z'), // rollback de B (A déjà déployé, 10 h après B)
  deploy('C', 'failure', '2026-11-25T10:00:00Z'),
  deploy('C', 'success', '2026-11-25T14:00:00Z'), // rétablit C en 4 h
  deploy('D', 'success', '2026-11-26T08:00:00Z', 'staging'), // hors production
  deploy('E', 'in_progress', null, 'production', '2026-11-26T09:00:00Z'), // pas terminé
  deploy('F', 'inactive', '2026-11-26T10:00:00Z'), // réussi puis remplacé
  deploy('G', 'error', '2026-11-27T10:00:00Z'), // pas encore rétabli
];

describe('métriques DORA', () => {
  it('reconnaît la production', () => {
    expect(isProduction('production')).toBe(true);
    expect(isProduction(' Prod ')).toBe(true);
    expect(isProduction('staging')).toBe(false);
    expect(isProduction('preproduction')).toBe(false);
    // Vercel : ignoré par défaut, reconnu quand la règle du dépôt le désigne.
    expect(isProduction('Production – ui')).toBe(false);
    const rule = { productionEnvironments: ['Production – ui'] };
    expect(isProduction('production – UI ', rule)).toBe(true);
    expect(isProduction('production', rule)).toBe(false);
  });

  it('applique la règle du dépôt à toutes les métriques DORA', () => {
    // Mêmes déploiements, la production nommée à la façon de Vercel (staging inchangé).
    const vercel = deployments.map((d) =>
      d.environment === 'production' ? { ...d, environment: 'Production – ui' } : d,
    );
    expect(doraSamples([], vercel).deployments).toEqual([]);
    const rule = { productionEnvironments: ['Production – ui'] };
    expect(doraSamples([], vercel, rule)).toEqual(doraSamples([], deployments));
  });

  it('fréquence : déploiements réussis en production', () => {
    expect(deploymentFrequency(deployments)).toEqual([
      { weekStart: S48, metricKey: METRIC_KEYS.deploymentFrequency, value: 5, sampleSize: 5 },
    ]);
  });

  it('délai de livraison : premier commit → premier déploiement réussi après la fusion', () => {
    const prs = [
      {
        createdAt: at('2026-11-23T07:00:00Z'),
        firstCommitAt: at('2026-11-23T08:00:00Z'),
        mergedAt: at('2026-11-23T09:00:00Z'),
      }, // → A 10:00 : 2 h
      {
        createdAt: at('2026-11-24T00:00:00Z'),
        firstCommitAt: null,
        mergedAt: at('2026-11-24T09:00:00Z'),
      }, // ouverture → B : 10 h
      { createdAt: at('2026-11-24T00:00:00Z'), firstCommitAt: null, mergedAt: null }, // pas fusionnée
      {
        createdAt: at('2026-11-27T00:00:00Z'),
        firstCommitAt: null,
        mergedAt: at('2026-11-27T12:00:00Z'),
      }, // pas encore déployée
    ];
    expect(leadTime(prs, deployments)).toEqual([
      { weekStart: S48, metricKey: METRIC_KEYS.leadTime, value: 6, sampleSize: 2 },
    ]);
  });

  it("taux d'échec : échecs et changements annulés par un rollback", () => {
    // 7 changements terminés en production ; en échec : B (rollback), C (failure), G (error).
    const [point] = changeFailureRate(deployments);
    expect(point).toMatchObject({
      weekStart: S48,
      metricKey: METRIC_KEYS.changeFailureRate,
      sampleSize: 7,
    });
    expect(point.value).toBeCloseTo((3 / 7) * 100);
  });

  it('rétablissement : échec → déploiement réussi suivant (échecs non rétablis exclus)', () => {
    // B rétabli en 10 h (rollback), C en 4 h ; G pas encore.
    expect(timeToRestore(deployments)).toEqual([
      { weekStart: S48, metricKey: METRIC_KEYS.timeToRestore, value: 7, sampleSize: 2 },
    ]);
  });

  it('ne voit pas de rollback au-delà de 48 h ni sur un même commit redéployé', () => {
    const slow = [
      deploy('A', 'success', '2026-11-23T10:00:00Z'),
      deploy('B', 'success', '2026-11-23T12:00:00Z'),
      deploy('A', 'success', '2026-11-26T12:00:00Z'), // 72 h après B : pas un rollback
      deploy('A', 'success', '2026-11-26T13:00:00Z'), // même commit redéployé
    ];
    expect(changeFailureRate(slow)[0].value).toBe(0);
    expect(timeToRestore(slow)).toEqual([]);
  });

  it('ne calcule rien sans déploiement', () => {
    expect(deploymentFrequency([])).toEqual([]);
    expect(leadTime([], [])).toEqual([]);
    expect(changeFailureRate([])).toEqual([]);
    expect(timeToRestore([])).toEqual([]);
  });
});
