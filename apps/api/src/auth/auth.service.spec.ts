import { createHash } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { GithubOauthService } from './github-oauth/github-oauth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  const db = {
    session: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    user: { upsert: vi.fn() },
    organization: { upsert: vi.fn() },
    membership: { upsert: vi.fn(), count: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(db)),
  };
  const github = { exchangeCode: vi.fn(), getUser: vi.fn(), getInstallations: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: { client: db } },
        { provide: GithubOauthService, useValue: github },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it("ne stocke que l'empreinte du jeton de session", async () => {
    const token = await service.createSession('u1');
    const data = db.session.create.mock.calls[0][0].data;
    expect(data.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(data.tokenHash).not.toBe(token);
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('refuse et supprime une session expirée', async () => {
    db.session.findUnique.mockResolvedValue({
      id: 's1',
      expiresAt: new Date(Date.now() - 1000),
      user: { id: 'u1', login: 'a', avatarUrl: null },
    });
    await expect(service.findSessionUser('jeton')).resolves.toBeNull();
    expect(db.session.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });

  it('refuse une session absente', async () => {
    await expect(service.findSessionUser(undefined)).resolves.toBeNull();
    expect(db.session.findUnique).not.toHaveBeenCalled();
  });

  it('crée utilisateur, organisations et appartenances à la connexion', async () => {
    github.exchangeCode.mockResolvedValue('jeton-github');
    github.getUser.mockResolvedValue({ id: 10, login: 'kuami', email: null, avatar_url: null });
    github.getInstallations.mockResolvedValue([
      { id: 100, account: { id: 10, login: 'kuami', type: 'User' } },
      { id: 200, account: { id: 20, login: 'acme', type: 'Organization' } },
    ]);
    db.user.upsert.mockResolvedValue({ id: 'u1' });
    db.organization.upsert.mockResolvedValueOnce({ id: 'o1' }).mockResolvedValueOnce({ id: 'o2' });

    await expect(service.loginWithGithub('code')).resolves.toBe('u1');
    const roles = db.membership.upsert.mock.calls.map((c) => c[0].create.role);
    expect(roles).toEqual(['owner', 'member']);
  });
});
