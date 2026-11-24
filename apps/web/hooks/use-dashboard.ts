'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BottlenecksResponse,
  MetricsResponse,
  PublicConfigResponse,
  RecentPullRequest,
  RepositoryView,
  SummaryRecipientView,
  SyncStatusResponse,
  WeeklySummaryView,
} from '@xcadence/shared';
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

/** Goulots d'une organisation (F4). */
export function useBottlenecks(orgId: string | undefined) {
  return useQuery({
    queryKey: ['bottlenecks', orgId],
    queryFn: () => apiFetch<BottlenecksResponse>(`/orgs/${orgId}/bottlenecks`),
    enabled: Boolean(orgId),
  });
}

/** Fenêtre de rafraîchissement après un changement de suivi : l'import attend d'abord dans la file. */
const WATCH_AFTER_TRACKING_MS = 30_000;
let lastTrackingChange = 0;

/**
 * Avancement des imports ; rafraîchi toutes les 3 s tant qu'un import tourne,
 * et pendant 30 s après un changement de suivi (le temps que le worker le prenne).
 */
export function useSyncStatus(orgId: string | undefined) {
  return useQuery({
    queryKey: ['sync-status', orgId],
    queryFn: () => apiFetch<SyncStatusResponse>(`/orgs/${orgId}/sync-status`),
    enabled: Boolean(orgId),
    refetchInterval: (query) =>
      query.state.data?.inProgress || Date.now() - lastTrackingChange < WATCH_AFTER_TRACKING_MS
        ? 3_000
        : false,
  });
}

/** Réglages publics (adresse d'installation de la GitHub App). */
export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<PublicConfigResponse>('/config'),
    staleTime: Infinity,
  });
}

/** Suivre ou ne plus suivre un dépôt ; suivre lance l'import des 90 derniers jours. */
export function useTrackRepository(orgId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isTracked }: { id: string; isTracked: boolean }) =>
      apiFetch<RepositoryView>(`/orgs/${orgId}/repositories/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isTracked }),
      }),
    onSuccess: () => {
      lastTrackingChange = Date.now();
      void client.invalidateQueries({ queryKey: ['repositories', orgId] });
      void client.invalidateQueries({ queryKey: ['sync-status', orgId] });
    },
  });
}

/** Les 20 PR les plus récentes d'un dépôt. */
export function useRecentPullRequests(orgId: string | undefined, repositoryId: string) {
  return useQuery({
    queryKey: ['pull-requests', orgId, repositoryId],
    queryFn: () =>
      apiFetch<RecentPullRequest[]>(`/orgs/${orgId}/repositories/${repositoryId}/pull-requests`),
    enabled: Boolean(orgId),
  });
}

/** Dernier résumé hebdomadaire de l'organisation (F5). */
export function useLatestSummary(orgId: string | undefined) {
  return useQuery({
    queryKey: ['summary', orgId],
    queryFn: () =>
      apiFetch<{ summary: WeeklySummaryView | null }>(`/orgs/${orgId}/summaries/latest`),
    enabled: Boolean(orgId),
  });
}

/** Destinataires du résumé hebdomadaire par email. */
export function useSummaryRecipients(orgId: string | undefined) {
  return useQuery({
    queryKey: ['summary-recipients', orgId],
    queryFn: () => apiFetch<SummaryRecipientView[]>(`/orgs/${orgId}/summary-recipients`),
    enabled: Boolean(orgId),
  });
}

export function useAddSummaryRecipient(orgId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch<SummaryRecipientView>(`/orgs/${orgId}/summary-recipients`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['summary-recipients', orgId] }),
  });
}

export function useRemoveSummaryRecipient(orgId: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/orgs/${orgId}/summary-recipients/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['summary-recipients', orgId] }),
  });
}
