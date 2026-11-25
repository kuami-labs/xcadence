'use client';

import { useQuery } from '@tanstack/react-query';
import type { BottlenecksResponse, DemoResponse, MetricsResponse } from '@xcadence/shared';
import { apiFetch } from '@/lib/api/client';

/** Démo publique (ADR 0006) : lecture seule, sans session. */
export function useDemo() {
  return useQuery({
    queryKey: ['demo'],
    queryFn: () => apiFetch<DemoResponse>('/demo'),
  });
}

/** Métriques de la démo ; `repo` null : agrégat de l'organisation (s'il est disponible). */
export function useDemoMetrics(repo: string | null, from: string, to: string, enabled: boolean) {
  const params = new URLSearchParams({ from, to });
  if (repo) params.set('repo', repo);
  return useQuery({
    queryKey: ['demo', 'metrics', repo, from, to],
    queryFn: () => apiFetch<MetricsResponse>(`/demo/metrics?${params}`),
    enabled,
  });
}

export function useDemoBottlenecks() {
  return useQuery({
    queryKey: ['demo', 'bottlenecks'],
    queryFn: () => apiFetch<BottlenecksResponse>('/demo/bottlenecks'),
  });
}
