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
