import { UnauthorizedException } from '@nestjs/common';
import { GithubOauthService } from './github-oauth.service.js';

describe('GithubOauthService', () => {
  const service = new GithubOauthService();

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("construit l'URL d'autorisation avec le client et le state", () => {
    vi.stubEnv('GITHUB_APP_CLIENT_ID', 'Iv23test');
    const url = new URL(service.authorizeUrl('abc'));
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('Iv23test');
    expect(url.searchParams.get('state')).toBe('abc');
  });

  it('refuse un code rejeté par GitHub', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ error: 'bad_verification_code' })),
    );
    await expect(service.exchangeCode('mauvais')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("retourne le jeton d'accès", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ access_token: 'ghu_x' })));
    await expect(service.exchangeCode('bon')).resolves.toBe('ghu_x');
  });
});
