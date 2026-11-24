import type { DeploymentStatus, PullRequestState, ReviewState } from '@xcadence/db';

/** Champs utilisés d'une PR de l'API GitHub (pulls.get). */
export interface GithubPullRequest {
  id: number;
  number: number;
  state: string;
  draft?: boolean;
  user: { id: number; login: string } | null;
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
  additions?: number;
  deletions?: number;
}

/** Champs utilisés d'une revue de l'API GitHub (pulls.listReviews). */
export interface GithubReview {
  id: number;
  state: string;
  user: { id: number; login: string } | null;
  submitted_at?: string | null;
}

/** Champs utilisés d'un commit de PR (pulls.listCommits). */
export interface GithubCommit {
  commit: { author: { date?: string } | null; committer: { date?: string } | null };
}

const date = (value: string | null | undefined) => (value ? new Date(value) : null);

export function prState(pr: GithubPullRequest): PullRequestState {
  if (pr.merged_at) return 'merged';
  return pr.state === 'closed' ? 'closed' : 'open';
}

const REVIEW_STATES: Record<string, ReviewState> = {
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes_requested',
  COMMENTED: 'commented',
  DISMISSED: 'dismissed',
  PENDING: 'pending',
};

export function reviewState(state: string): ReviewState {
  return REVIEW_STATES[state.toUpperCase()] ?? 'commented';
}

/** Date du premier commit de la PR (auteur, sinon committer) : départ du délai de livraison. */
export function firstCommitAt(commits: GithubCommit[]): Date | null {
  const dates = commits
    .map((c) => date(c.commit.author?.date ?? c.commit.committer?.date))
    .filter((d): d is Date => d !== null);
  return dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
}

/**
 * Première revue d'une autre personne que l'auteur, hors brouillon de revue (pending).
 * Métrique « Temps avant première revue » (docs/01-PRD.md).
 */
export function firstReviewAt(pr: GithubPullRequest, reviews: GithubReview[]): Date | null {
  const dates = reviews
    .filter((r) => r.state.toUpperCase() !== 'PENDING' && r.user?.id !== pr.user?.id)
    .map((r) => date(r.submitted_at))
    .filter((d): d is Date => d !== null);
  return dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
}

/** Données d'une PR pour la table pull_requests (métadonnées seulement, aucun contenu de code). */
export function pullRequestData(
  pr: GithubPullRequest,
  commits: GithubCommit[],
  reviews: GithubReview[],
) {
  return {
    number: pr.number,
    authorLogin: pr.user?.login ?? 'ghost',
    state: prState(pr),
    isDraft: pr.draft ?? false,
    createdAt: new Date(pr.created_at),
    firstCommitAt: firstCommitAt(commits),
    firstReviewAt: firstReviewAt(pr, reviews),
    mergedAt: date(pr.merged_at),
    closedAt: date(pr.closed_at),
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
  };
}

/** Champs utilisés d'un run GitHub Actions (actions.listWorkflowRunsForRepo). */
export interface GithubWorkflowRun {
  id: number;
  name?: string | null;
  head_branch: string | null;
  status: string | null;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  run_started_at?: string;
}

/** Données d'un run pour la table workflow_runs (métrique « Durée de la CI »). */
export function workflowRunData(run: GithubWorkflowRun) {
  return {
    workflowName: run.name ?? 'sans nom',
    branch: run.head_branch ?? '',
    conclusion: run.conclusion,
    startedAt: new Date(run.run_started_at ?? run.created_at),
    // Fin du run : dernière mise à jour une fois terminé ; null tant qu'il tourne.
    completedAt: run.status === 'completed' ? new Date(run.updated_at) : null,
  };
}

/** Champs utilisés d'un déploiement et de son dernier statut (repos.listDeployments, listDeploymentStatuses). */
export interface GithubDeployment {
  id: number;
  sha: string;
  environment: string;
  created_at: string;
}

export interface GithubDeploymentStatus {
  state: string;
  created_at: string;
}

const DEPLOYMENT_STATES: readonly DeploymentStatus[] = [
  'pending',
  'queued',
  'in_progress',
  'success',
  'failure',
  'error',
  'inactive',
];
const FINAL_STATES: readonly DeploymentStatus[] = ['success', 'failure', 'error', 'inactive'];

export function deploymentStatus(state: string | undefined): DeploymentStatus {
  const value = state?.toLowerCase() as DeploymentStatus | undefined;
  return value && DEPLOYMENT_STATES.includes(value) ? value : 'pending';
}

/** Données d'un déploiement pour la table deployments (métriques DORA). */
export function deploymentData(deployment: GithubDeployment, latest?: GithubDeploymentStatus) {
  const status = deploymentStatus(latest?.state);
  return {
    sha: deployment.sha,
    environment: deployment.environment,
    status,
    createdAt: new Date(deployment.created_at),
    // Fin : date du dernier statut une fois le déploiement terminé.
    finishedAt: latest && FINAL_STATES.includes(status) ? new Date(latest.created_at) : null,
  };
}
