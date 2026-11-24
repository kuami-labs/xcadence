import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  JOBS,
  MAX_ENVIRONMENT_LENGTH,
  MAX_PRODUCTION_ENVIRONMENTS,
  QUEUES,
  type BackfillRepositoryJob,
} from '@xcadence/shared';
import type { Queue } from 'bullmq';
import { GithubService } from '../github/github.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  DEMO_GITHUB_ORG_ID,
  DEMO_ORGANIZATION_NAME,
  demoInstallationId,
} from './demo-installation.js';

/** `propriétaire/nom` tel qu'accepté par GitHub. */
const FULL_NAME = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100})$/;

export interface DemoRepositoryAdded {
  repositoryId: string;
  fullName: string;
  productionEnvironments: string[] | null;
}

/**
 * Organisation de démo (#81) : dépôts publics de tiers, importés avec le jeton de l'installation
 * DEMO_INSTALLATION_ID, sans webhook ni membre. Un dépôt privé est toujours refusé.
 */
@Injectable()
export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GithubService,
    @InjectQueue(QUEUES.sync) private readonly sync: Queue<BackfillRepositoryJob>,
  ) {}

  /** Ajoute (ou met à jour) un dépôt public à la démo et lance l'import des 90 derniers jours. */
  async addRepository(
    fullName: string,
    productionEnvironments: string[] = [],
  ): Promise<DemoRepositoryAdded> {
    const match = FULL_NAME.exec(fullName.trim());
    if (!match) {
      throw new Error(`Nom de dépôt invalide : attendu propriétaire/nom`);
    }
    const environments = [...new Set(productionEnvironments.map((e) => e.trim()))].filter(Boolean);
    if (
      environments.length > MAX_PRODUCTION_ENVIRONMENTS ||
      environments.some((e) => e.length > MAX_ENVIRONMENT_LENGTH)
    ) {
      throw new Error('Environnements de production invalides');
    }
    const installationId = demoInstallationId();
    if (!installationId) {
      throw new Error('DEMO_INSTALLATION_ID est requis pour la démo');
    }
    const [, owner, name] = match;
    const octokit = await this.github.forInstallation(installationId);
    const { data } = await octokit.rest.repos.get({ owner, repo: name });
    // Le jeton de l'installation lit aussi ses dépôts privés : seuls les publics entrent dans la démo.
    if (data.private || data.visibility !== 'public') {
      throw new Error('Seuls les dépôts publics peuvent entrer dans la démo');
    }

    const organization = await this.prisma.client.organization.upsert({
      where: { githubOrgId: DEMO_GITHUB_ORG_ID },
      create: { githubOrgId: DEMO_GITHUB_ORG_ID, name: DEMO_ORGANIZATION_NAME, isDemo: true },
      update: {},
    });
    if (!organization.isDemo) {
      throw new Error("L'organisation de démo existe sans être marquée comme telle");
    }
    const deployRule = environments.length > 0 ? { productionEnvironments: environments } : null;
    const fields = {
      organizationId: organization.id,
      owner: data.owner.login,
      name: data.name,
      defaultBranch: data.default_branch,
      isTracked: true,
    };
    const existing = await this.prisma.client.repository.findUnique({
      where: { githubRepoId: BigInt(data.id) },
    });
    if (existing && existing.organizationId !== organization.id) {
      throw new Error('Ce dépôt appartient déjà à une organisation cliente');
    }
    const repository = await this.prisma.client.repository.upsert({
      where: { githubRepoId: BigInt(data.id) },
      create: { githubRepoId: BigInt(data.id), ...fields, deployRule: deployRule ?? undefined },
      update: { ...fields, ...(deployRule ? { deployRule } : {}) },
    });

    const jobId = `backfill-${repository.id}`;
    const previous = await this.sync.getJob(jobId);
    if (previous && ((await previous.isCompleted()) || (await previous.isFailed()))) {
      await previous.remove();
    }
    await this.sync.add(
      JOBS.backfillRepository,
      { repositoryId: repository.id },
      {
        jobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
    return {
      repositoryId: repository.id,
      fullName: `${data.owner.login}/${data.name}`,
      productionEnvironments: deployRule?.productionEnvironments ?? null,
    };
  }
}
