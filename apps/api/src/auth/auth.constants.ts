import type { CookieOptions, Request } from 'express';

export const SESSION_COOKIE = 'xc_session';
export const STATE_COOKIE = 'xc_oauth_state';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const STATE_TTL_MS = 10 * 60 * 1000;

/** Cookies HttpOnly, Secure, SameSite=Lax (docs/08-SECURITE.md). Secure fonctionne aussi sur http://localhost. */
export const cookieOptions = (maxAge: number): CookieOptions => ({
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge,
});

export interface SessionUser {
  id: string;
  login: string;
  avatarUrl: string | null;
}

export type AuthenticatedRequest = Request & { user: SessionUser };
