import { Controller, Get } from '@nestjs/common';
import type { PublicConfigResponse } from '@xcadence/shared';

/** Réglages publics du front (aucun secret). */
@Controller('config')
export class ConfigController {
  @Get()
  get(): PublicConfigResponse {
    const slug = process.env.GITHUB_APP_SLUG;
    return {
      githubAppInstallUrl: slug
        ? `https://github.com/apps/${encodeURIComponent(slug)}/installations/new`
        : null,
    };
  }
}
