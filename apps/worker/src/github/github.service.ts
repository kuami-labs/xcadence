import { readFileSync } from 'node:fs';
import { Injectable, Logger } from '@nestjs/common';
import { App, Octokit } from 'octokit';

/** Nombre de reprises après un dépassement de quota, avant de rendre la main à BullMQ (qui réessaie le job). */
export const MAX_RATE_LIMIT_RETRIES = 3;

type ThrottleOptions = { method: string; url: string; request: { retryCount: number } };

/**
 * Clients Octokit authentifiés par installation de la GitHub App (docs/03-BACKEND.md, GithubModule).
 * Lecture seule ; pagination, limitation et reprise sur quota fournies par Octokit.
 * Aucun jeton n'est journalisé : seulement la méthode et la route.
 */
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private app?: App;

  constructor(private readonly options: { fetch?: typeof fetch } = {}) {}

  /** Client authentifié pour une installation ; le jeton d'installation est renouvelé par Octokit. */
  forInstallation(installationId: bigint | number): Promise<Octokit> {
    return this.githubApp().getInstallationOctokit(Number(installationId)) as Promise<Octokit>;
  }

  private githubApp(): App {
    if (!this.app) {
      const appId = process.env.GITHUB_APP_ID;
      const keyPath = process.env.GITHUB_APP_PRIVATE_KEY_PATH;
      if (!appId || !keyPath) {
        throw new Error('GITHUB_APP_ID et GITHUB_APP_PRIVATE_KEY_PATH sont requis');
      }
      const onLimit = (kind: string) => (retryAfter: number, options: ThrottleOptions) => {
        const retry = options.request.retryCount < MAX_RATE_LIMIT_RETRIES;
        this.logger.warn(
          `${kind} atteint pour ${options.method} ${options.url} : ${retry ? `reprise dans ${retryAfter} s` : 'abandon'}`,
        );
        return retry;
      };
      this.app = new App({
        appId,
        privateKey: readFileSync(keyPath, 'utf8'),
        Octokit: Octokit.defaults({
          throttle: {
            onRateLimit: onLimit('Quota'),
            onSecondaryRateLimit: onLimit('Quota secondaire'),
          },
          ...(this.options.fetch ? { request: { fetch: this.options.fetch } } : {}),
        }),
      });
    }
    return this.app;
  }
}
