/** URL de l'API NestJS (docs/06-ENVIRONNEMENT.md : port 4000 en développement). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Erreur HTTP de l'API, avec son statut (401 : pas de session). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Appel typé à l'API, avec le cookie de session (HttpOnly, envoyé par le navigateur).
 * Le front ne parle jamais directement à GitHub (docs/04-FRONTEND.md).
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { accept: 'application/json', ...init.headers },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `${init.method ?? 'GET'} ${path} : ${res.status}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Adresse de connexion : l'API redirige vers GitHub (OAuth de la GitHub App). */
export const loginUrl = () => `${API_URL}/auth/github`;
