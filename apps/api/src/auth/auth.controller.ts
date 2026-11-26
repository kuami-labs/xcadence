import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  STATE_COOKIE,
  STATE_TTL_MS,
  cookieOptions,
  type AuthenticatedRequest,
} from './auth.constants.js';
import { GithubOauthService } from './github-oauth/github-oauth.service.js';
import { SessionGuard } from './session/session.guard.js';

const webUrl = () => process.env.WEB_URL ?? 'http://localhost:3000';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly github: GithubOauthService,
  ) {}

  /** Redirige vers GitHub, avec un state aléatoire (protection CSRF du flux OAuth). */
  @Get('github')
  start(@Res() res: Response): void {
    const state = randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, cookieOptions(STATE_TTL_MS));
    res.redirect(this.github.authorizeUrl(state));
  }

  @Get('github/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const expected = req.cookies?.[STATE_COOKIE] as string | undefined;
    res.clearCookie(STATE_COOKIE, { path: '/' });
    if (
      !code ||
      !state ||
      !expected ||
      state.length !== expected.length ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(expected))
    ) {
      // State absent ou différent (retour rejoué, lien expiré) : retour à la page de connexion.
      return res.redirect(`${webUrl()}/login?erreur=connexion`);
    }
    let userId: string;
    try {
      userId = await this.auth.loginWithGithub(code);
    } catch {
      // Code refusé par GitHub : même message, sans détail.
      return res.redirect(`${webUrl()}/login?erreur=connexion`);
    }
    const token = await this.auth.createSession(userId);
    res.cookie(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_MS));
    res.redirect(`${webUrl()}/dashboard`);
  }

  /** Utilisateur connecté et organisations auxquelles il a accès. */
  @Get('me')
  @UseGuards(SessionGuard)
  async me(@Req() req: AuthenticatedRequest) {
    return { user: req.user, organizations: await this.auth.organizationsOf(req.user.id) };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    // SameSite=Lax + vérification de l'origine sur les routes qui modifient (docs/08-SECURITE.md).
    const origin = req.headers.origin;
    if (origin && origin !== webUrl()) {
      throw new ForbiddenException();
    }
    await this.auth.deleteSession(req.cookies?.[SESSION_COOKIE] as string | undefined);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }
}
