import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient, type PrismaClient } from '../src/index.js';

// Test d'intégration : tourne dès que DATABASE_URL est défini (CI, dev container).
const url = process.env.DATABASE_URL;

describe.skipIf(!url)('schéma', () => {
  let prisma: PrismaClient;
  let organizationId: string;
  const githubOrgId = BigInt(Date.now());

  beforeAll(async () => {
    prisma = createPrismaClient(url);
    const org = await prisma.organization.create({ data: { githubOrgId, name: 'test-org' } });
    organizationId = org.id;
  });

  afterAll(async () => {
    await prisma.organization.delete({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it('un import rejoué met à jour au lieu de dupliquer', async () => {
    const data = { organizationId, githubRepoId: githubOrgId, name: 'repo', defaultBranch: 'main' };
    await prisma.repository.upsert({
      where: { githubRepoId: githubOrgId },
      create: data,
      update: data,
    });
    await prisma.repository.upsert({
      where: { githubRepoId: githubOrgId },
      create: data,
      update: { ...data, name: 'repo-renomme' },
    });

    const repos = await prisma.repository.findMany({ where: { organizationId } });
    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe('repo-renomme');
  });

  it("une seule métrique « toute l'organisation » par semaine", async () => {
    const metric = {
      organizationId,
      repositoryId: null,
      weekStart: new Date('2026-11-23'),
      metricKey: 'lead_time',
      value: 12,
      sampleSize: 3,
    };
    await prisma.weeklyMetric.create({ data: metric });
    await expect(prisma.weeklyMetric.create({ data: metric })).rejects.toThrow();
  });
});
