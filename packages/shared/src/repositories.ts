/** Dépôt tel que l'API l'expose (GET/PATCH /orgs/:orgId/repositories). */
export interface RepositoryView {
  id: string;
  name: string;
  /** null tant que le dépôt n'a pas été importé. */
  defaultBranch: string | null;
  isTracked: boolean;
  /** Règle de détection des déploiements, forme libre pour l'instant. */
  deployRule: unknown;
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
