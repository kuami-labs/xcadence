/** Dépôt tel que l'API l'expose (GET/PATCH /orgs/:orgId/repositories). */
export interface RepositoryView {
  id: string;
  name: string;
  /** null tant que le dépôt n'a pas été importé. */
  defaultBranch: string | null;
  isTracked: boolean;
  /** Environnements de production du dépôt ; null = règle par défaut (`production` ou `prod`). */
  deployRule: DeployRule | null;
}

/**
 * Règle de déploiement d'un dépôt (colonne repositories.deploy_rule). Vercel nomme par exemple
 * ses environnements « Production – <projet> » : la règle par défaut ne les reconnaît pas.
 */
export interface DeployRule {
  /** Environnements GitHub comptés comme production, comparés sans tenir compte de la casse. */
  productionEnvironments: string[];
}

export const MAX_PRODUCTION_ENVIRONMENTS = 10;
export const MAX_ENVIRONMENT_LENGTH = 100;

const DEFAULT_PRODUCTION = /^prod(uction)?$/i;

/** Lit deploy_rule tel que stocké (JSON) ; null si absent ou d'une autre forme : règle par défaut. */
export function parseDeployRule(value: unknown): DeployRule | null {
  if (typeof value !== 'object' || value === null) return null;
  const list = (value as { productionEnvironments?: unknown }).productionEnvironments;
  if (!Array.isArray(list)) return null;
  const names = list
    .filter((name): name is string => typeof name === 'string')
    .map((name) => name.trim())
    .filter((name) => name !== '');
  return names.length > 0 ? { productionEnvironments: names } : null;
}

/** Un déploiement vers cet environnement compte-t-il comme une mise en production ? */
export function isProductionEnvironment(environment: string, rule: DeployRule | null): boolean {
  const name = environment.trim();
  if (!rule) return DEFAULT_PRODUCTION.test(name);
  const wanted = name.toLowerCase();
  return rule.productionEnvironments.some((env) => env.trim().toLowerCase() === wanted);
}

/** GET /orgs/:orgId/repositories/:id/environments : environnements vus dans les déploiements importés. */
export interface RepositoryEnvironment {
  name: string;
  deployments: number;
  /** Compté comme production avec la règle actuelle du dépôt. */
  isProduction: boolean;
}

/** GET /auth/me : utilisateur connecté et organisations auxquelles il a accès. */
export interface MeResponse {
  user: { id: string; login: string; avatarUrl: string | null };
  organizations: { id: string; name: string; role: 'owner' | 'member' }[];
}

/** GET /orgs/:orgId/repositories/:id/pull-requests : PR récentes d'un dépôt (aucun auteur). */
export interface RecentPullRequest {
  number: number;
  state: 'open' | 'closed' | 'merged';
  isDraft: boolean;
  createdAt: string;
  mergedAt: string | null;
  size: number;
  /** Heures entre l'ouverture et la première revue ; null sans revue. */
  timeToFirstReviewHours: number | null;
}
