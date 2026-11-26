import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth.service.js';
import { SESSION_COOKIE, type AuthenticatedRequest } from '../auth.constants.js';

/** Exige une session valide ; place l'utilisateur dans request.user. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = await this.auth.findSessionUser(
      req.cookies?.[SESSION_COOKIE] as string | undefined,
    );
    if (!user) {
      throw new UnauthorizedException();
    }
    (req as AuthenticatedRequest).user = user;
    return true;
  }
}
