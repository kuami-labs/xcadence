import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@xcadence/db';
import { PrismaService } from '../prisma/prisma.service.js';

interface GithubAccount {
  id: number;
  login: string;
  type: string;
}

interface GithubRepository {
  id: number;
  name: string;
}

/** Champs utilisés des événements `installation` et `installation_repositories`. */
export interface InstallationPayload {
  action: string;
  installation: { id: number; account: GithubAccount };
  sender?: { id: number };
  repositories?: GithubRepository[];
  repositories_added?: GithubRepository[];
  repositories_removed?: GithubRepository[];
}

type Tx = Prisma.TransactionClient;

/**
 * Installation de la GitHub App : organisation et liste de ses dépôts (non suivis par défaut).
 * Idempotent : un événement rejoué ne duplique rien (identifiants GitHub uniques).
 */
@Injectable()
export class InstallationHandler {
  private readonly logger = new Logger(InstallationHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Retourne true si l'événement a été traité, false s'il ne concerne pas cette tâche. */
  async handle(eventType: string, payload: InstallationPayload): Promise<boolean> {
    if (
      eventType === 'installation' &&
      ['created', 'new_permissions_accepted', 'unsuspend'].includes(payload.action)
    ) {
      await this.prisma.client.$transaction(async (tx) => {
        const orgId = await this.upsertOrganization(tx, payload);
        await this.upsertRepositories(tx, orgId, payload.repositories ?? []);
      });
      return true;
    }
    if (eventType === 'installation' && payload.action === 'deleted') {
      await this.deleteOrganization(payload.installation);
      return true;
    }
    if (eventType === 'installation_repositories') {
      await this.prisma.client.$transaction(async (tx) => {
        const orgId = await this.upsertOrganization(tx, payload);
        await this.upsertRepositories(tx, orgId, payload.repositories_added ?? []);
        const removed = (payload.repositories_removed ?? []).map((r) => BigInt(r.id));
        if (removed.length > 0) {
          // Cascade : PR, revues, runs, déploiements et métriques du dépôt.
          await tx.repository.deleteMany({
            where: { organizationId: orgId, githubRepoId: { in: removed } },
          });
        }
      });
      return true;
    }
    return false;
  }

  /**
   * Désinstallation : suppression complète (docs/01-PRD.md, RGPD).
   * L'organisation entraîne en cascade appartenances, dépôts, PR, revues, runs, déploiements,
   * métriques, résumés et imports ; les webhooks reçus de cette installation sont aussi supprimés.
   * Les comptes utilisateurs restent : ils peuvent appartenir à d'autres organisations.
   */
  private async deleteOrganization(installation: InstallationPayload['installation']) {
    await this.prisma.client.$transaction([
      this.prisma.client.organization.deleteMany({
        where: { githubOrgId: BigInt(installation.account.id) },
      }),
      this.prisma.client.webhookEvent.deleteMany({
        where: { payload: { path: ['installation', 'id'], equals: installation.id } },
      }),
    ]);
    // Aucun login dans les logs : seulement l'identifiant de l'installation.
    this.logger.log(`Données de l'installation ${installation.id} supprimées`);
  }

  private async upsertOrganization(tx: Tx, payload: InstallationPayload): Promise<string> {
    const { account, id: installationId } = payload.installation;
    const data = { name: account.login, installationId: BigInt(installationId) };
    const org = await tx.organization.upsert({
      where: { githubOrgId: BigInt(account.id) },
      create: { githubOrgId: BigInt(account.id), ...data },
      update: data,
    });

    // La personne qui installe, si elle s'est déjà connectée, voit l'organisation tout de suite.
    if (payload.sender) {
      const user = await tx.user.findUnique({ where: { githubId: BigInt(payload.sender.id) } });
      if (user) {
        const role = payload.sender.id === account.id ? 'owner' : 'member';
        await tx.membership.upsert({
          where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
          create: { userId: user.id, organizationId: org.id, role },
          update: {},
        });
      }
    }
    this.logger.log(`Organisation ${account.login} à jour (installation ${installationId})`);
    return org.id;
  }

  private async upsertRepositories(tx: Tx, organizationId: string, repos: GithubRepository[]) {
    for (const repo of repos) {
      await tx.repository.upsert({
        where: { githubRepoId: BigInt(repo.id) },
        create: { organizationId, githubRepoId: BigInt(repo.id), name: repo.name },
        update: { organizationId, name: repo.name },
      });
    }
  }
}
