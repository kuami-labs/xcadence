import type { PullRequestState, ReviewState } from '@xcadence/db';

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
