import type { Octokit } from 'octokit';
import type { GithubService } from '../github/github.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { PullRequestsImporter } from '../sync/pull-requests.importer.js';
import { PullRequestEventsHandler } from './pull-request-events.handler.js';

describe('PullRequestEventsHandler', () => {
  const findUnique = vi.fn();
  const octokit = {} as Octokit;
  const forInstallation = vi.fn().mockResolvedValue(octokit);
  const importPullRequest = vi.fn();
  const handler = new PullRequestEventsHandler(
    { client: { repository: { findUnique } } } as unknown as PrismaService,
    { forInstallation } as unknown as GithubService,
    { importPullRequest } as unknown as PullRequestsImporter,
  );
  const payload = {
    installation: { id: 42 },
    repository: { id: 7, name: 'depot', owner: { login: 'org' } },
    pull_request: { number: 3 },
  };

  beforeEach(() => vi.clearAllMocks());

  it.each(['pull_request', 'pull_request_review'])(
    'réimporte la PR concernée pour %s sur un dépôt suivi',
    async (eventType) => {
      findUnique.mockResolvedValue({ id: 'r1', isTracked: true });
      await expect(handler.handle(eventType, payload)).resolves.toBe(true);
      expect(findUnique).toHaveBeenCalledWith({ where: { githubRepoId: 7n } });
      expect(forInstallation).toHaveBeenCalledWith(42);
      expect(importPullRequest).toHaveBeenCalledWith(
        octokit,
        { id: 'r1', owner: 'org', name: 'depot' },
        3,
      );
    },
  );

  it("traite sans rien importer l'événement d'un dépôt non suivi ou inconnu", async () => {
    findUnique.mockResolvedValueOnce({ id: 'r1', isTracked: false }).mockResolvedValueOnce(null);
    await expect(handler.handle('pull_request', payload)).resolves.toBe(true);
    await expect(handler.handle('pull_request', payload)).resolves.toBe(true);
    expect(importPullRequest).not.toHaveBeenCalled();
  });

  it('ignore les autres événements', async () => {
    await expect(handler.handle('workflow_run', payload)).resolves.toBe(false);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
