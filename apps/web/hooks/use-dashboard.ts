'use client';

import { useQuery } from '@tanstack/react-query';
import type { MetricsResponse, RepositoryView } from '@xcadence/shared';
import { apiFetch } from '@/lib/api/client';

/** Métriques hebdomadaires d'une organisation (ou d'un dépôt) sur une période. */
export function useMetrics(
  orgId: string | undefined,
  repo: string | null,
  from: string,
  to: string,
) {
  const params = new URLSearchParams({ from, to });
  if (repo) params.set('repo', repo);
  return useQuery({
    queryKey: ['metrics', orgId, repo, from, to],
    queryFn: () => apiFetch<MetricsResponse>(`/orgs/${orgId}/metrics?${params}`),
    enabled: Boolean(orgId),
  });
}

/** Dépôts d'une organisation (pour le filtre par dépôt). */
export function useRepositories(orgId: string | undefined) {
  return useQuery({
    queryKey: ['repositories', orgId],
    queryFn: () => apiFetch<RepositoryView[]>(`/orgs/${orgId}/repositories`),
    enabled: Boolean(orgId),
  });
}
