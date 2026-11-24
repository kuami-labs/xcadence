import { METRIC_KEYS } from '@xcadence/shared';
import { organizationMetrics, type RepositoryData } from './organization-metrics.js';

const at = (iso: string) => new Date(iso);
const repo = (id: string, defaultBranch: string | null, deployHour: number): RepositoryData => ({
  id,
  defaultBranch,
  pullRequests: [
    {
      isDraft: false,
      createdAt: at('2026-11-23T08:00:00Z'),
      firstCommitAt: at('2026-11-23T08:00:00Z'),
      firstReviewAt: at('2026-11-23T10:00:00Z'),
      mergedAt: at('2026-11-23T12:00:00Z'),
    },
  ],
  workflowRuns: [
    {
      branch: 'trunk',
      startedAt: at('2026-11-23T12:00:00Z'),
      completedAt: at('2026-11-23T12:10:00Z'),
    },
    {
      branch: 'feature',
      startedAt: at('2026-11-23T12:00:00Z'),
      completedAt: at('2026-11-23T12:50:00Z'),
    },
  ],
  deployments: [
    {
      sha: 'a',
      environment: 'production',
      status: 'success',
      createdAt: at(`2026-11-23T${deployHour}:00:00Z`),
      finishedAt: at(`2026-11-23T${deployHour}:00:00Z`),
    },
  ],
});

describe('métriques d’une organisation', () => {
  it('calcule par dépôt puis pour toute l’organisation', () => {
    const rows = organizationMetrics([repo('r1', 'trunk', 14), repo('r2', null, 16)]);
    const get = (repositoryId: string | null, key: string) =>
      rows.find((r) => r.repositoryId === repositoryId && r.metricKey === key);

    expect(get('r1', METRIC_KEYS.deploymentFrequency)?.value).toBe(1);
    expect(get(null, METRIC_KEYS.deploymentFrequency)).toMatchObject({ value: 2, sampleSize: 2 });
    // CI : seule la branche principale de r1 compte (r2 n'a pas de branche principale connue).
    expect(get('r1', METRIC_KEYS.ciDurationP50)?.value).toBe(10);
    expect(get('r2', METRIC_KEYS.ciDurationP50)).toBeUndefined();
    expect(get(null, METRIC_KEYS.ciDurationP50)).toMatchObject({ value: 10, sampleSize: 1 });
    // Délai : 6 h (r1) et 8 h (r2) → médiane 7 h pour l'organisation.
    expect(get(null, METRIC_KEYS.leadTime)?.value).toBe(7);
  });

  it('applique la règle de déploiement de chaque dépôt', () => {
    const vercel = (id: string): RepositoryData => {
      const r = repo(id, 'trunk', 14);
      return {
        ...r,
        deployments: r.deployments.map((d) => ({ ...d, environment: 'Production – ui' })),
      };
    };
    const rows = organizationMetrics([
      { ...vercel('avec-regle'), deployRule: { productionEnvironments: ['Production – ui'] } },
      { ...vercel('sans-regle'), deployRule: { forme: 'inconnue' } },
    ]);
    const frequency = (repositoryId: string | null) =>
      rows.find(
        (r) => r.repositoryId === repositoryId && r.metricKey === METRIC_KEYS.deploymentFrequency,
      );
    expect(frequency('avec-regle')?.value).toBe(1);
    expect(frequency('sans-regle')).toBeUndefined();
    expect(frequency(null)?.value).toBe(1);
  });

  it('ne renvoie rien sans dépôt suivi', () => {
    expect(organizationMetrics([])).toEqual([]);
  });
});
