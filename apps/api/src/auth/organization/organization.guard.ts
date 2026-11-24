import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service.js';
import type { AuthenticatedRequest } from '../auth.constants.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Filtre par organisation : à placer après SessionGuard sur toute route /orgs/:orgId/…
 * Un utilisateur n'accède jamais aux données d'une organisation dont il n'est pas membre.
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const orgId = req.params.orgId;
    if (
      !req.user ||
      typeof orgId !== 'string' ||
      !UUID.test(orgId) ||
      !(await this.auth.isMember(req.user.id, orgId))
    ) {
      throw new ForbiddenException();
    }
    return true;
  }
}
