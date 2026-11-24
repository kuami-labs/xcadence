import { Injectable, UnauthorizedException } from '@nestjs/common';

export interface GithubUser {
  id: number;
  login: string;
  email: string | null;
  avatar_url: string | null;
}

export interface GithubInstallation {
  id: number;
  account: { id: number; login: string; type: string };
}

/**
 * Flux OAuth de la GitHub App, avec fetch (aucune dépendance).
 * Le jeton utilisateur ne sert qu'au moment de la connexion : il n'est jamais stocké ni journalisé.
 */
@Injectable()
export class GithubOauthService {
  private get clientId(): string {
    return process.env.GITHUB_APP_CLIENT_ID ?? '';
  }

  authorizeUrl(state: string): string {
    const params = new URLSearchParams({ client_id: this.clientId, state });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async exchangeCode(code: string): Promise<string> {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: process.env.GITHUB_APP_CLIENT_SECRET ?? '',
        code,
      }),
    });
    const data = (await res.json()) as { access_token?: string };
    if (!res.ok || !data.access_token) {
      throw new UnauthorizedException('Échange du code GitHub refusé');
    }
    return data.access_token;
  }

  getUser(token: string): Promise<GithubUser> {
    return this.get<GithubUser>('/user', token);
  }

  async getInstallations(token: string): Promise<GithubInstallation[]> {
    const data = await this.get<{ installations: GithubInstallation[] }>(
      '/user/installations?per_page=100',
      token,
    );
    return data.installations;
  }

  private async get<T>(path: string, token: string): Promise<T> {
    const res = await fetch(`https://api.github.com${path}`, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'x-github-api-version': '2022-11-28',
      },
    });
    if (!res.ok) {
      throw new UnauthorizedException(`Appel GitHub refusé (${res.status})`);
    }
    return (await res.json()) as T;
  }
}
