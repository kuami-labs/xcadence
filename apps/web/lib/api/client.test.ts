import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_URL, ApiError, apiFetch, loginUrl } from './client';

describe('client API', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('envoie le cookie de session et renvoie le JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiFetch<{ ok: boolean }>('/auth/me')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/auth/me`,
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('signale le statut HTTP en erreur', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    await expect(apiFetch('/auth/me')).rejects.toMatchObject({ status: 401 });
    await expect(apiFetch('/auth/me')).rejects.toBeInstanceOf(ApiError);
  });

  it('accepte une réponse vide', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiFetch('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it("construit l'adresse de connexion", () => {
    expect(loginUrl()).toBe(`${API_URL}/auth/github`);
  });
});
