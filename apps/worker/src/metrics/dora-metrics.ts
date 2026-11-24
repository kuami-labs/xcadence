import { METRIC_KEYS, type MetricKey } from '@xcadence/shared';
import { HOUR_MS, byWeek, groupByWeek, median, toValues, type MetricPoint } from './stats.js';

export interface DoraDeployment {
  sha: string;
  environment: string;
  status: string;
  createdAt: Date;
  finishedAt: Date | null;
}

export interface DoraPullRequest {
  createdAt: Date;
  firstCommitAt: Date | null;
  mergedAt: Date | null;
}

/** Fenêtre d'un rollback : redéployer un ancien commit sous 48 h annule le changement précédent. */
export const ROLLBACK_WINDOW_MS = 48 * HOUR_MS;

/** Environnement de production : `production` ou `prod` (la règle par dépôt viendra avec deploy_rule). */
export function isProduction(environment: string): boolean {
  return /^prod(uction)?$/i.test(environment.trim());
}

/** `inactive` : réussi puis remplacé par un déploiement plus récent (GitHub). */
const SUCCEEDED = new Set(['success', 'inactive']);
const FAILED = new Set(['failure', 'error']);

interface Change {
  sha: string;
  at: Date;
  succeeded: boolean;
}

/** Déploiements de production terminés (réussis ou en échec), dans l'ordre chronologique. */
function productionChanges(deployments: DoraDeployment[]): Change[] {
  return deployments
    .filter((d) => isProduction(d.environment) && (SUCCEEDED.has(d.status) || FAILED.has(d.status)))
    .map((d) => ({
      sha: d.sha,
      at: d.finishedAt ?? d.createdAt,
      succeeded: SUCCEEDED.has(d.status),
    }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Changements en échec : déploiement en échec, ou déploiement réussi aussitôt annulé par un
 * rollback (redéploiement sous 48 h d'un commit déjà déployé avant lui).
 * Retourne chaque échec avec la date de rétablissement (déploiement réussi suivant), s'il existe.
 */
function failures(changes: Change[]): { change: Change; restoredAt: Date | null }[] {
  const succeeded = changes.filter((c) => c.succeeded);
  const result: { change: Change; restoredAt: Date | null }[] = [];
  for (const change of changes) {
    const next = succeeded.find((s) => s.at > change.at) ?? null;
    if (!change.succeeded) {
      result.push({ change, restoredAt: next?.at ?? null });
      continue;
    }
    const earlier = succeeded.filter((s) => s.at < change.at && s.sha !== change.sha);
    const rolledBack =
      next !== null &&
      next.sha !== change.sha &&
      next.at.getTime() - change.at.getTime() <= ROLLBACK_WINDOW_MS &&
      earlier.some((s) => s.sha === next.sha);
    if (rolledBack) {
      result.push({ change, restoredAt: next.at });
    }
  }
  return result;
}

/** Une mesure datée, avant regroupement par semaine. */
export interface Sample {
  at: Date;
  value: number;
}

/**
 * Mesures DORA d'un seul dépôt : les déploiements ne doivent jamais être mélangés entre dépôts
 * (association PR → déploiement, rollbacks, rétablissements). Pour une organisation, on réunit
 * ensuite les mesures de chaque dépôt.
 */
export function doraSamples(prs: DoraPullRequest[], deployments: DoraDeployment[]) {
  const changes = productionChanges(deployments);
  const shipped = changes.filter((c) => c.succeeded);
  const failed = failures(changes);
  const failedChanges = new Set(failed.map((f) => f.change));
  return {
    deployments: shipped.map((c) => ({ at: c.at, value: 1 })),
    leadTimes: prs.flatMap((pr) => {
      if (!pr.mergedAt) return [];
      const merged = pr.mergedAt;
      const deploy = shipped.find((c) => c.at >= merged);
      if (!deploy) return [];
      const start = pr.firstCommitAt ?? pr.createdAt;
      return [{ at: deploy.at, value: (deploy.at.getTime() - start.getTime()) / HOUR_MS }];
    }),
    changes: changes.map((c) => ({ at: c.at, value: failedChanges.has(c) ? 1 : 0 })),
    restores: failed.flatMap(({ change, restoredAt }) =>
      restoredAt
        ? [{ at: change.at, value: (restoredAt.getTime() - change.at.getTime()) / HOUR_MS }]
        : [],
    ),
  };
}

export type DoraSamples = ReturnType<typeof doraSamples>;

const weekly = (samples: Sample[], key: MetricKey, stat: (v: number[]) => number | null) =>
  byWeek(
    toValues(
      groupByWeek(samples, (s) => s.at),
      (s) => s.value,
    ),
    key,
    stat,
  );

/** Agrège des mesures DORA (d'un dépôt, ou réunies pour une organisation) par semaine. */
export function doraMetrics(samples: DoraSamples): MetricPoint[] {
  return [
    // Fréquence : déploiements réussis en production.
    ...weekly(samples.deployments, METRIC_KEYS.deploymentFrequency, (v) => v.length),
    // Délai : premier commit (ouverture à défaut) → premier déploiement réussi après la fusion.
    ...weekly(samples.leadTimes, METRIC_KEYS.leadTime, median),
    // Taux d'échec (%) : changements en échec ou annulés, sur les changements de la semaine.
    ...weekly(
      samples.changes,
      METRIC_KEYS.changeFailureRate,
      (v) => (v.reduce((a, b) => a + b, 0) / v.length) * 100,
    ),
    // Rétablissement : échec → déploiement réussi suivant ; semaine de l'échec.
    ...weekly(samples.restores, METRIC_KEYS.timeToRestore, median),
  ];
}

const only = (key: MetricKey) => (points: MetricPoint[]) =>
  points.filter((p) => p.metricKey === key);

/** Fréquence de déploiement : déploiements réussis en production par semaine. */
export const deploymentFrequency = (deployments: DoraDeployment[]) =>
  only(METRIC_KEYS.deploymentFrequency)(doraMetrics(doraSamples([], deployments)));

/** Délai de livraison (heures, médiane), semaine du déploiement. */
export const leadTime = (prs: DoraPullRequest[], deployments: DoraDeployment[]) =>
  only(METRIC_KEYS.leadTime)(doraMetrics(doraSamples(prs, deployments)));

/** Taux d'échec des changements (%), par semaine. */
export const changeFailureRate = (deployments: DoraDeployment[]) =>
  only(METRIC_KEYS.changeFailureRate)(doraMetrics(doraSamples([], deployments)));

/** Temps de rétablissement (heures, médiane), semaine de l'échec. */
export const timeToRestore = (deployments: DoraDeployment[]) =>
  only(METRIC_KEYS.timeToRestore)(doraMetrics(doraSamples([], deployments)));
