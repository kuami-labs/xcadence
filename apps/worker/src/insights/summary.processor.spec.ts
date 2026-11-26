import { randomInt } from 'node:crypto';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { JOBS, METRIC_KEYS, QUEUES } from '@xcadence/shared';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SummaryProvider } from './summary-provider.js';
import { FALLBACK_MODEL, SummaryProcessor } from './summary.processor.js';

const NOW = new Date('2026-11-30T07:00:00Z'); // lundi : résume la semaine du 23 novembre
const W48 = new Date('2026-11-23T00:00:00Z');
const W47 = new Date('2026-11-16T00:00:00Z');
const provider = (
  text: string,
  model = 'modele-test',
): SummaryProvider & { write: ReturnType<typeof vi.fn> } => ({
  model,
  write: vi.fn().mockResolvedValue(text),
});

// Intégration sur PostgreSQL (DATABASE_URL) ; aucun appel à un vrai modèle.
describe.skipIf(!process.env.DATABASE_URL)('SummaryProcessor', () => {
  const notifications = { add: vi.fn() };
  let module: TestingModule;
  let processor: SummaryProcessor;
  let prisma: PrismaService['client'];
  const base = randomInt(1_000_000, 900_000_000) * 1000;
  const orgIds: string[] = [];

  const org = async (withMetrics: boolean) => {
    const o = await prisma.organization.create({
      data: { githubOrgId: BigInt(base + orgIds.length), name: 'o' },
    });
    orgIds.push(o.id);
    if (withMetrics) {
      await prisma.weeklyMetric.createMany({
        data: [
          {
            organizationId: o.id,
            weekStart: W48,
            metricKey: METRIC_KEYS.deploymentFrequency,
            value: 6,
            sampleSize: 6,
          },
          {
            organizationId: o.id,
            weekStart: W47,
            metricKey: METRIC_KEYS.deploymentFrequency,
            value: 4,
            sampleSize: 4,
          },
        ],
      });
    }
    return o.id;
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        SummaryProcessor,
        PrismaService,
        { provide: getQueueToken(QUEUES.insights), useValue: {} },
        { provide: getQueueToken(QUEUES.notifications), useValue: notifications },
      ],
    }).compile();
    processor = module.get(SummaryProcessor);
    prisma = module.get(PrismaService).client;
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await module.close();
  });

  const summaryOf = (organizationId: string) =>
    prisma.weeklySummary.findUnique({
      where: { organizationId_weekStart: { organizationId, weekStart: W48 } },
    });

  it('enregistre un résumé valide du modèle, une seule fois par semaine', async () => {
    const id = await org(true);
    const ok = provider('6 déploiements en production, +50 % sur la semaine.');
    await expect(processor.summarize(id, NOW, ok)).resolves.toBe('written');
    await expect(processor.summarize(id, NOW, ok)).resolves.toBe('exists');
    const saved = await summaryOf(id);
    expect(notifications.add).toHaveBeenCalledTimes(1);
    expect(notifications.add).toHaveBeenCalledWith(
      JOBS.sendNotifications,
      { summaryId: saved?.id },
      expect.objectContaining({ jobId: saved?.id }),
    );
    expect(saved).toMatchObject({
      model: 'modele-test',
      content: '6 déploiements en production, +50 % sur la semaine.',
    });
  });

  it('se rabat sur un résumé sans IA si le modèle invente des chiffres', async () => {
    const id = await org(true);
    const liar = provider('12 déploiements, un record !');
    await expect(processor.summarize(id, NOW, liar)).resolves.toBe('fallback');
    expect(liar.write).toHaveBeenCalledTimes(2);
    expect(await summaryOf(id)).toMatchObject({
      model: FALLBACK_MODEL,
      content: 'Déploiements en production : 6 (+50 %).',
    });
  });

  it('se rabat aussi si le fournisseur est en panne', async () => {
    const id = await org(true);
    const down: SummaryProvider = {
      model: 'x',
      write: vi.fn().mockRejectedValue(new Error('réponse 503')),
    };
    await expect(processor.summarize(id, NOW, down)).resolves.toBe('fallback');
  });

  it("n'écrit rien sans métrique", async () => {
    const id = await org(false);
    await expect(processor.summarize(id, NOW, provider('6.'))).resolves.toBe('no-data');
    expect(await summaryOf(id)).toBeNull();
  });

  it('refuse un job inconnu', async () => {
    await expect(processor.process({ name: 'autre', data: {} } as Job)).rejects.toThrow(
      'Job inconnu',
    );
    expect(JOBS.generateWeeklySummary).toBe('generate-weekly-summary');
  });
});
