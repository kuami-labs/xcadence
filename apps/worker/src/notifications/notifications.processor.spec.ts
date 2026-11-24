import { randomInt } from 'node:crypto';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { JOBS, QUEUES } from '@xcadence/shared';
import type { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { MAILER } from './mailer.js';
import { NotificationsProcessor } from './notifications.processor.js';

// Intégration sur PostgreSQL ; ni Redis ni SMTP : la file et l'envoi sont simulés.
describe.skipIf(!process.env.DATABASE_URL)('NotificationsProcessor', () => {
  const queue = { addBulk: vi.fn() };
  const mailer = { send: vi.fn() };
  let module: TestingModule;
  let processor: NotificationsProcessor;
  let prisma: PrismaService['client'];
  const base = BigInt(randomInt(1_000_000, 900_000_000)) * 1000n;
  const orgIds: string[] = [];

  const setup = async (emails: string[]) => {
    const org = await prisma.organization.create({
      data: { githubOrgId: base + BigInt(orgIds.length), name: 'Acme' },
    });
    orgIds.push(org.id);
    const summary = await prisma.weeklySummary.create({
      data: {
        organizationId: org.id,
        weekStart: new Date('2026-11-23T00:00:00Z'),
        content: '6 déploiements.',
        model: 'fake',
      },
    });
    const recipients = [];
    for (const [i, email] of emails.entries()) {
      recipients.push(
        await prisma.summaryRecipient.create({
          data: {
            organizationId: org.id,
            email,
            unsubscribeToken: `t-${base}-${orgIds.length}-${i}`,
          },
        }),
      );
    }
    return { org, summary, recipients };
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        NotificationsProcessor,
        PrismaService,
        { provide: getQueueToken(QUEUES.notifications), useValue: queue },
        { provide: MAILER, useValue: mailer },
      ],
    }).compile();
    processor = module.get(NotificationsProcessor);
    prisma = module.get(PrismaService).client;
  });

  beforeEach(() => vi.clearAllMocks());

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    await module.close();
  });

  it('répartit un job par destinataire, une seule fois', async () => {
    const { summary, recipients } = await setup(['a@x.fr', 'b@x.fr']);
    const job = { name: JOBS.sendNotifications, data: { summaryId: summary.id } } as Job;
    await expect(processor.process(job)).resolves.toBe('2 email(s)');
    const jobs = queue.addBulk.mock.calls[0][0];
    expect(jobs.map((j: { opts: { jobId: string } }) => j.opts.jobId).sort()).toEqual(
      recipients.map((r) => `${summary.id}-${r.id}`).sort(),
    );
    expect(
      (await prisma.weeklySummary.findUnique({ where: { id: summary.id } }))?.sentAt,
    ).not.toBeNull();
    await expect(processor.process(job)).resolves.toBe('deja-envoye');
    expect(queue.addBulk).toHaveBeenCalledTimes(1);
    await expect(processor.dispatch('01900000-0000-7000-8000-000000000000')).resolves.toBe(
      'absent',
    );
  });

  it('envoie le résumé avec le lien de désinscription du destinataire', async () => {
    const { org, summary, recipients } = await setup(['cto@x.fr']);
    const job = {
      name: JOBS.sendSummaryEmail,
      data: { summaryId: summary.id, recipientId: recipients[0].id },
    } as Job;
    await expect(processor.process(job)).resolves.toBe('envoye');
    const sent = mailer.send.mock.calls[0][0];
    expect(sent.to).toBe('cto@x.fr');
    expect(sent.subject).toContain('Acme');
    expect(sent.text).toContain('6 déploiements.');
    expect(sent.text).toContain(`/dashboard?org=${org.id}`);
    expect(sent.unsubscribeUrl).toContain(`token=${recipients[0].unsubscribeToken}`);
  });

  it("n'envoie rien à un destinataire désinscrit ou d'une autre organisation", async () => {
    const a = await setup(['a@x.fr']);
    const b = await setup(['b@x.fr']);
    const send = (summaryId: string, recipientId: string) =>
      processor.process({ name: JOBS.sendSummaryEmail, data: { summaryId, recipientId } } as Job);
    await expect(send(a.summary.id, b.recipients[0].id)).resolves.toBe('ignore');
    await prisma.summaryRecipient.delete({ where: { id: a.recipients[0].id } });
    await expect(send(a.summary.id, a.recipients[0].id)).resolves.toBe('ignore');
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('refuse un job inconnu', async () => {
    await expect(processor.process({ name: 'autre', data: {} } as Job)).rejects.toThrow(
      'Job inconnu',
    );
  });
});
