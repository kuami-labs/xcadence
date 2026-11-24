import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { SESSION_TTL_MS, type SessionUser } from './auth.constants.js';
import { GithubOauthService } from './github-oauth/github-oauth.service.js';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GithubOauthService,
  ) {}

  /** Connexion GitHub : crée ou met à jour l'utilisateur, ses organisations installées et ses appartenances. */
  async loginWithGithub(code: string): Promise<string> {
    const token = await this.github.exchangeCode(code);
    const [ghUser, installations] = await Promise.all([
      this.github.getUser(token),
      this.github.getInstallations(token),
    ]);

    return this.prisma.client.$transaction(async (tx) => {
      const profile = { login: ghUser.login, email: ghUser.email, avatarUrl: ghUser.avatar_url };
      const user = await tx.user.upsert({
        where: { githubId: BigInt(ghUser.id) },
        create: { githubId: BigInt(ghUser.id), ...profile },
        update: profile,
      });

      for (const installation of installations) {
        const account = installation.account;
        const data = { name: account.login, installationId: BigInt(installation.id) };
        const org = await tx.organization.upsert({
          where: { githubOrgId: BigInt(account.id) },
          create: { githubOrgId: BigInt(account.id), ...data },
          update: data,
        });
        // Compte personnel : l'utilisateur en est propriétaire. Organisation : membre (les rôles viendront plus tard).
        const role = account.id === ghUser.id ? 'owner' : 'member';
        await tx.membership.upsert({
          where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
          create: { userId: user.id, organizationId: org.id, role },
          update: {},
        });
      }
      return user.id;
    });
  }

  async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.client.session.create({
      data: { tokenHash: hash(token), userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });
    return token;
  }

  async findSessionUser(token: string | undefined): Promise<SessionUser | null> {
    if (!token) {
      return null;
    }
    const session = await this.prisma.client.session.findUnique({
      where: { tokenHash: hash(token) },
      include: { user: true },
    });
    if (!session) {
      return null;
    }
    if (session.expiresAt <= new Date()) {
      await this.prisma.client.session.delete({ where: { id: session.id } });
      return null;
    }
    const { id, login, avatarUrl } = session.user;
    return { id, login, avatarUrl };
  }

  async deleteSession(token: string | undefined): Promise<void> {
    if (token) {
      await this.prisma.client.session.deleteMany({ where: { tokenHash: hash(token) } });
    }
  }

  async isMember(userId: string, organizationId: string): Promise<boolean> {
    const count = await this.prisma.client.membership.count({
      where: { userId, organizationId },
    });
    return count === 1;
  }

  async organizationsOf(userId: string) {
    const memberships = await this.prisma.client.membership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      role: m.role,
    }));
  }
}
