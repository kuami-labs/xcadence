import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GithubService } from './github.service.js';

// Aucun appel réel à GitHub : un fetch simulé joue le rôle de l'API.
describe('GithubService', () => {
  beforeAll(() => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const dir = mkdtempSync(join(tmpdir(), 'xcadence-github-'));
    const keyPath = join(dir, 'cle.pem');
    writeFileSync(keyPath, privateKey.export({ type: 'pkcs1', format: 'pem' }));
    vi.stubEnv('GITHUB_APP_ID', '12345');
    vi.stubEnv('GITHUB_APP_PRIVATE_KEY_PATH', keyPath);
  });

  afterAll(() => vi.unstubAllEnvs());

  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });

  it("s'authentifie comme installation puis appelle l'API avec ce jeton", async () => {
    const calls: { url: string; auth: string | null }[] = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, auth: new Headers(init.headers).get('authorization') });
      if (url.endsWith('/app/installations/42/access_tokens')) {
        return json({ token: 'ghs_installation', expires_at: '2099-01-01T00:00:00Z' }, 201);
      }
      return json({ id: 1, name: 'depot', default_branch: 'main' });
    });
    const octokit = await new GithubService({ fetch: fetchMock as typeof fetch }).forInstallation(
      42,
    );
    const { data } = await octokit.rest.repos.get({ owner: 'org', repo: 'depot' });

    expect(data.default_branch).toBe('main');
    expect(calls[0].auth).toMatch(/^bearer /i); // JWT de l'App
    expect(calls.at(-1)?.auth).toBe('token ghs_installation');
  });

  it('reprend automatiquement après un dépassement de quota', async () => {
    let repoCalls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/access_tokens')) {
        return json({ token: 'ghs_x', expires_at: '2099-01-01T00:00:00Z' }, 201);
      }
      repoCalls += 1;
      if (repoCalls === 1) {
        return json({ message: 'API rate limit exceeded' }, 403, {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000)),
        });
      }
      return json({ id: 1, name: 'depot', default_branch: 'main' });
    });
    const octokit = await new GithubService({ fetch: fetchMock as typeof fetch }).forInstallation(
      7,
    );
    await expect(octokit.rest.repos.get({ owner: 'org', repo: 'depot' })).resolves.toMatchObject({
      status: 200,
    });
    expect(repoCalls).toBe(2);
  });
});
