import { Prisma } from '@xcadence/db';
import type { PrismaService } from '../prisma/prisma.service.js';
import { recomputeOrganization } from './recompute.processor.js';

describe('recomputeOrganization', () => {
  const failingWith = (error: unknown) =>
    ({
      client: {
        repository: { findMany: vi.fn().mockResolvedValue([]) },
        weeklyMetric: { deleteMany: vi.fn(), createMany: vi.fn() },
        $executeRaw: vi.fn(),
        $transaction: vi.fn().mockRejectedValue(error),
      },
    }) as unknown as PrismaService;

  it('ignore une organisation supprimée pendant le recalcul (clé étrangère)', async () => {
    const deleted = new Prisma.PrismaClientKnownRequestError('clé étrangère', {
      code: 'P2003',
      clientVersion: 'test',
    });
    await expect(recomputeOrganization(failingWith(deleted), 'org')).resolves.toBe(0);
  });

  it('laisse remonter toute autre erreur', async () => {
    await expect(
      recomputeOrganization(failingWith(new Error('base indisponible')), 'org'),
    ).rejects.toThrow('base indisponible');
  });
});
