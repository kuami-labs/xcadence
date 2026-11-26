import type { PrismaService } from '../prisma/prisma.service.js';
import { trackedRepository } from './tracked-repository.js';

describe('trackedRepository', () => {
  const findUnique = vi.fn();
  const update = vi.fn(async ({ data }: { data: object }) => ({
    id: 'r1',
    isTracked: true,
    ...data,
  }));
  const prisma = { client: { repository: { findUnique, update } } } as unknown as PrismaService;

  beforeEach(() => vi.clearAllMocks());

  it('retourne null pour un dépôt inconnu ou non suivi, sans rien modifier', async () => {
    findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'r1', isTracked: false });
    await expect(trackedRepository(prisma, { id: 7, private: false })).resolves.toBeNull();
    await expect(trackedRepository(prisma, { id: 7, private: false })).resolves.toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('met à jour la visibilité quand elle change', async () => {
    findUnique.mockResolvedValue({ id: 'r1', isTracked: true, isPrivate: false });
    await expect(trackedRepository(prisma, { id: 7, private: true })).resolves.toMatchObject({
      isPrivate: true,
    });
    expect(update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { isPrivate: true } });
  });

  it('ne touche à rien si la visibilité est inchangée ou absente', async () => {
    const repo = { id: 'r1', isTracked: true, isPrivate: false };
    findUnique.mockResolvedValue(repo);
    await expect(trackedRepository(prisma, { id: 7, private: false })).resolves.toBe(repo);
    await expect(trackedRepository(prisma, { id: 7 })).resolves.toBe(repo);
    expect(update).not.toHaveBeenCalled();
  });
});
