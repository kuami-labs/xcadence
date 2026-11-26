'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import type { MetricKey, MetricsResponse } from '@xcadence/shared';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardFilters, PERIOD_OPTIONS } from '@/components/dashboard/filters';
import { MetricsPanel } from '@/components/dashboard/metrics-panel';
import { PageBody, PageHeader, PageState } from '@/components/page-header';
import { DORA_CARDS, periods } from '@/lib/metrics/summary';

/** Filtres du tableau de bord, lus et écrits dans l'URL (?semaines=, ?depot=, ?metrique=). */
export function useDashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const weeksParam = Number(params.get('semaines'));
  const weeks = (PERIOD_OPTIONS as readonly number[]).includes(weeksParam) ? weeksParam : 4;
  const repo = params.get('depot');
  const metricParam = params.get('metrique');
  const metric = (DORA_CARDS.find((m) => m.key === metricParam) ?? DORA_CARDS[0]).key;

  // Période affichée et précédente (tendance), plus 12 semaines pour le graphique.
  const { current, previous } = periods(weeks);
  const chartPeriod = periods(12).current;
  const from = [previous.from, chartPeriod.from].sort()[0];

  const setFilters = (next: { weeks?: number; repo?: string | null; metric?: MetricKey }) => {
    // Adresse actuelle, pas celle du dernier rendu : deux clics rapides ne s'écrasent pas.
    const query = new URLSearchParams(window.location.search);
    if (next.weeks) query.set('semaines', String(next.weeks));
    if (next.metric) query.set('metrique', next.metric);
    if (next.repo !== undefined) {
      if (next.repo) query.set('depot', next.repo);
      else query.delete('depot');
    }
    router.replace(`${pathname}?${query}`, { scroll: false });
  };
  return {
    weeks,
    repo,
    metric,
    current,
    previous,
    chartPeriod,
    from,
    to: current.to,
    setFilters,
  };
}

export type DashboardFiltersState = ReturnType<typeof useDashboardFilters>;

/**
 * Vue d'ensemble (F3) : les 4 métriques DORA en onglets, avec tendance et graphique sur
 * 12 semaines, puis le résumé et les goulots. Affichage seul : la page connectée et la démo
 * publique fournissent les données.
 */
export function DashboardView({
  subtitle,
  notice,
  filters,
  metrics,
  repositories,
  allowOrganization = true,
  empty,
  summary,
  bottlenecks,
}: {
  subtitle: ReactNode;
  /** Bandeau au-dessus du contenu (démo publique). */
  notice?: ReactNode;
  filters: DashboardFiltersState;
  metrics: UseQueryResult<MetricsResponse>;
  /** Dépôts suivis proposés dans le filtre. */
  repositories: { id: string; name: string }[];
  /** Choix « Toute l'organisation » proposé. */
  allowOrganization?: boolean;
  empty: ReactNode;
  summary?: ReactNode;
  bottlenecks?: ReactNode;
}) {
  const { weeks, repo, metric, current, previous, chartPeriod, setFilters } = filters;
  const values = metrics.data?.metrics ?? [];
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title="Vue d'ensemble"
        description={subtitle}
        actions={
          <DashboardFilters
            weeks={weeks}
            repo={repo}
            repositories={repositories}
            allowOrganization={allowOrganization}
            onChange={setFilters}
          />
        }
      />
      <PageBody>
        {notice}
        {metrics.isError ? (
          <ErrorMessage />
        ) : metrics.isPending ? (
          <PageState>Chargement des métriques…</PageState>
        ) : values.length === 0 ? (
          <PageState>{empty}</PageState>
        ) : (
          <MetricsPanel
            metrics={DORA_CARDS}
            values={values}
            selected={metric}
            onSelect={(key) => setFilters({ metric: key })}
            current={current}
            previous={previous}
            chartPeriod={chartPeriod}
            weeks={weeks}
          />
        )}
        {summary && bottlenecks ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="min-w-0">{summary}</div>
            <div className="min-w-0">{bottlenecks}</div>
          </div>
        ) : (
          (summary ?? bottlenecks)
        )}
      </PageBody>
    </main>
  );
}

export function ErrorMessage() {
  return (
    <PageState tone="error">Impossible de joindre l&apos;API. Réessayez dans un instant.</PageState>
  );
}
