import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { AuthService } from '../auth.service.js';
import { SessionGuard } from './session.guard.js';

const contextFor = (req: object) =>
  ({ switchToHttp: () => ({ getRequest: () => req }) }) as unknown as ExecutionContext;

describe('SessionGuard', () => {
  const findSessionUser = vi.fn();
  const guard = new SessionGuard({ findSessionUser } as unknown as AuthService);

  it('accepte une session valide et place l’utilisateur dans la requête', async () => {
    const user = { id: 'u1', login: 'kuami', avatarUrl: null };
    findSessionUser.mockResolvedValue(user);
    const req: Record<string, unknown> = { cookies: { xc_session: 'jeton' } };
    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true);
    expect(req.user).toEqual(user);
  });

  it('refuse sans session', async () => {
    findSessionUser.mockResolvedValue(null);
    await expect(guard.canActivate(contextFor({ cookies: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
