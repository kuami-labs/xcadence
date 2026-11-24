import {
  firstCommitAt,
  firstReviewAt,
  prState,
  pullRequestData,
  reviewState,
  workflowRunData,
} from './mapping.js';

const author = { id: 1, login: 'auteur' };
const pr = {
  id: 100,
  number: 7,
  state: 'closed',
  draft: false,
  user: author,
  created_at: '2026-11-02T09:00:00Z',
  merged_at: '2026-11-03T15:00:00Z',
  closed_at: '2026-11-03T15:00:00Z',
  additions: 40,
  deletions: 5,
};

describe('conversion GitHub → base', () => {
  it("déduit l'état de la PR", () => {
    expect(prState(pr)).toBe('merged');
    expect(prState({ ...pr, merged_at: null })).toBe('closed');
    expect(prState({ ...pr, state: 'open', merged_at: null, closed_at: null })).toBe('open');
  });

  it('convertit les états de revue', () => {
    expect(reviewState('APPROVED')).toBe('approved');
    expect(reviewState('CHANGES_REQUESTED')).toBe('changes_requested');
    expect(reviewState('DISMISSED')).toBe('dismissed');
  });

  it('prend le plus ancien commit', () => {
    expect(
      firstCommitAt([
        { commit: { author: { date: '2026-11-01T10:00:00Z' }, committer: null } },
        { commit: { author: { date: '2026-10-31T08:00:00Z' }, committer: null } },
        { commit: { author: null, committer: { date: '2026-11-01T12:00:00Z' } } },
      ]),
    ).toEqual(new Date('2026-10-31T08:00:00Z'));
    expect(firstCommitAt([])).toBeNull();
  });

  it("ignore les revues de l'auteur et les brouillons de revue", () => {
    const reviews = [
      { id: 1, state: 'COMMENTED', user: author, submitted_at: '2026-11-02T10:00:00Z' },
      { id: 2, state: 'PENDING', user: { id: 2, login: 'r' }, submitted_at: null },
      {
        id: 3,
        state: 'APPROVED',
        user: { id: 2, login: 'r' },
        submitted_at: '2026-11-03T11:00:00Z',
      },
      {
        id: 4,
        state: 'COMMENTED',
        user: { id: 3, login: 's' },
        submitted_at: '2026-11-02T14:00:00Z',
      },
    ];
    expect(firstReviewAt(pr, reviews)).toEqual(new Date('2026-11-02T14:00:00Z'));
    expect(firstReviewAt(pr, [reviews[0]])).toBeNull();
  });

  it('ne garde que des métadonnées', () => {
    expect(pullRequestData(pr, [], [])).toEqual({
      number: 7,
      authorLogin: 'auteur',
      state: 'merged',
      isDraft: false,
      createdAt: new Date('2026-11-02T09:00:00Z'),
      firstCommitAt: null,
      firstReviewAt: null,
      mergedAt: new Date('2026-11-03T15:00:00Z'),
      closedAt: new Date('2026-11-03T15:00:00Z'),
      additions: 40,
      deletions: 5,
    });
  });

  it('convertit un run de CI, terminé ou en cours', () => {
    const run = {
      id: 1,
      name: 'CI',
      head_branch: 'main',
      status: 'completed',
      conclusion: 'failure',
      created_at: '2026-11-02T09:00:00Z',
      updated_at: '2026-11-02T09:12:00Z',
      run_started_at: '2026-11-02T09:01:00Z',
    };
    expect(workflowRunData(run)).toEqual({
      workflowName: 'CI',
      branch: 'main',
      conclusion: 'failure',
      startedAt: new Date('2026-11-02T09:01:00Z'),
      completedAt: new Date('2026-11-02T09:12:00Z'),
    });
    expect(
      workflowRunData({ ...run, status: 'in_progress', conclusion: null }).completedAt,
    ).toBeNull();
  });
});
