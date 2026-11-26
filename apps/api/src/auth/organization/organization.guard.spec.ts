import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { AuthService } from '../auth.service.js';
import { OrganizationGuard } from './organization.guard.js';

const orgId = '019a0000-0000-7000-8000-000000000001';
const contextFor = (req: object) =>
  ({ switchToHttp: () => ({ getRequest: () => req }) }) as unknown as ExecutionContext;

describe('OrganizationGuard', () => {
  const isMember = vi.fn();
  const guard = new OrganizationGuard({ isMember } as unknown as AuthService);
  const user = { id: 'u1', login: 'kuami', avatarUrl: null };

  it('accepte un membre de l’organisation', async () => {
    isMember.mockResolvedValue(true);
    await expect(guard.canActivate(contextFor({ user, params: { orgId } }))).resolves.toBe(true);
  });

  it('refuse un non-membre', async () => {
    isMember.mockResolvedValue(false);
    await expect(guard.canActivate(contextFor({ user, params: { orgId } }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('refuse un identifiant mal formé sans interroger la base', async () => {
    isMember.mockClear();
    await expect(
      guard.canActivate(contextFor({ user, params: { orgId: '1 OR 1=1' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(isMember).not.toHaveBeenCalled();
  });
});
