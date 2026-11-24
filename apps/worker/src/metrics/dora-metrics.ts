import { METRIC_KEYS } from '@xcadence/shared';
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

/** Fréquence de déploiement : déploiements réussis en production par semaine. */
export function deploymentFrequency(deployments: DoraDeployment[]): MetricPoint[] {
  const groups = groupByWeek(
    productionChanges(deployments).filter((c) => c.succeeded),
    (c) => c.at,
  );
  return byWeek(
    toValues(groups, () => 1),
    METRIC_KEYS.deploymentFrequency,
    (v) => v.length,
  );
}

/**
 * Délai de livraison (heures, médiane) : premier commit de la PR (ouverture à défaut) jusqu'au
 * premier déploiement réussi en production après sa fusion. Semaine du déploiement.
 */
export function leadTime(prs: DoraPullRequest[], deployments: DoraDeployment[]): MetricPoint[] {
  const shipped = productionChanges(deployments).filter((c) => c.succeeded);
  const delivered = prs.flatMap((pr) => {
    if (!pr.mergedAt) return [];
    const merged = pr.mergedAt;
    const deploy = shipped.find((c) => c.at >= merged);
    if (!deploy) return [];
    const start = pr.firstCommitAt ?? pr.createdAt;
    return [{ at: deploy.at, hours: (deploy.at.getTime() - start.getTime()) / HOUR_MS }];
  });
  return byWeek(
    toValues(
      groupByWeek(delivered, (d) => d.at),
      (d) => d.hours,
    ),
    METRIC_KEYS.leadTime,
    median,
  );
}

/** Taux d'échec des changements (%) : changements en échec / changements, par semaine. */
export function changeFailureRate(deployments: DoraDeployment[]): MetricPoint[] {
  const changes = productionChanges(deployments);
  const failed = new Set(failures(changes).map((f) => f.change));
  return byWeek(
    toValues(
      groupByWeek(changes, (c) => c.at),
      (c) => (failed.has(c) ? 1 : 0),
    ),
    METRIC_KEYS.changeFailureRate,
    (v) => (v.reduce((a, b) => a + b, 0) / v.length) * 100,
  );
}

/** Temps de rétablissement (heures, médiane) : échec → déploiement réussi suivant. Semaine de l'échec. */
export function timeToRestore(deployments: DoraDeployment[]): MetricPoint[] {
  const restored = failures(productionChanges(deployments)).flatMap(({ change, restoredAt }) =>
    restoredAt
      ? [{ at: change.at, hours: (restoredAt.getTime() - change.at.getTime()) / HOUR_MS }]
      : [],
  );
  return byWeek(
    toValues(
      groupByWeek(restored, (r) => r.at),
      (r) => r.hours,
    ),
    METRIC_KEYS.timeToRestore,
    median,
  );
}
