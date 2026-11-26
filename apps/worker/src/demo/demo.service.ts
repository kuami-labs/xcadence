import { Injectable } from '@nestjs/common';
import { GithubService } from '../github/github.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface DemoOrganization {
  name: string;
  publicRepositories: number;
  trackedPublicRepositories: number;
}

/**
 * Démo publique en lecture seule : une de nos organisations où la GitHub App est installée
 * (donc un compte que nous administrons). Ses données arrivent comme pour tout client
 * (import et webhooks) ; seuls ses dépôts publics seront montrés.
 */
@Injectable()
export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GithubService,
  ) {}

  /** Fait de l'organisation `login` la seule organisation de démo. */
  async enable(login: string): Promise<DemoOrganization> {
    const org = await this.prisma.client.organization.findFirst({
      where: { name: login, installationId: { not: null } },
    });
    if (!org?.installationId) {
      throw new Error(`${login} : organisation inconnue ou GitHub App non installée`);
    }

    // Visibilité à jour avant d'exposer quoi que ce soit (privé par défaut).
    const octokit = await this.github.forInstallation(org.installationId);
    const accessible = await octokit.paginate(octokit.rest.apps.listReposAccessibleToInstallation);
    const publicIds = accessible.filter((r) => !r.private).map((r) => BigInt(r.id));
    await this.prisma.client.$transaction([
      this.prisma.client.repository.updateMany({
        where: { organizationId: org.id },
        data: { isPrivate: true },
      }),
      this.prisma.client.repository.updateMany({
        where: { organizationId: org.id, githubRepoId: { in: publicIds } },
        data: { isPrivate: false },
      }),
      // Une seule organisation de démo à la fois.
      this.prisma.client.organization.updateMany({
        where: { isDemo: true, id: { not: org.id } },
        data: { isDemo: false },
      }),
      this.prisma.client.organization.update({ where: { id: org.id }, data: { isDemo: true } }),
    ]);

    const publicRepos = await this.prisma.client.repository.findMany({
      where: { organizationId: org.id, isPrivate: false },
      select: { isTracked: true },
    });
    return {
      name: org.name,
      publicRepositories: publicRepos.length,
      trackedPublicRepositories: publicRepos.filter((r) => r.isTracked).length,
    };
  }

  /** Plus aucune organisation de démo. Retourne le nombre d'organisations retirées. */
  async disable(): Promise<number> {
    const { count } = await this.prisma.client.organization.updateMany({
      where: { isDemo: true },
      data: { isDemo: false },
    });
    return count;
  }
}
