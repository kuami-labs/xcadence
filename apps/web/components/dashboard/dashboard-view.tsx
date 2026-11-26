'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import type { MetricsResponse } from '@xcadence/shared';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardFilters, PERIOD_OPTIONS } from '@/components/dashboard/filters';
import { MetricCard } from '@/components/dashboard/metric-card';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DORA_CARDS, periods } from '@/lib/metrics/summary';

/** Filtres du tableau de bord, lus et écrits dans l'URL (?semaines=, ?depot=). */
export function useDashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const weeksParam = Number(params.get('semaines'));
  const weeks = (PERIOD_OPTIONS as readonly number[]).includes(weeksParam) ? weeksParam : 4;
  const repo = params.get('depot');

  // Période affichée et précédente (tendance), plus 12 semaines pour les courbes.
  const { current, previous } = periods(weeks);
  const chartPeriod = periods(12).current;
  const from = [previous.from, chartPeriod.from].sort()[0];

  const setFilters = (next: { weeks?: number; repo?: string | null }) => {
    const query = new URLSearchParams(params);
    if (next.weeks) query.set('semaines', String(next.weeks));
    if (next.repo !== undefined) {
      if (next.repo) query.set('depot', next.repo);
      else query.delete('depot');
    }
    router.replace(`${pathname}?${query}`);
  };
  return { weeks, repo, current, previous, chartPeriod, from, to: current.to, setFilters };
}

export type DashboardFiltersState = ReturnType<typeof useDashboardFilters>;

/**
 * Vue d'ensemble (F3) : 4 cartes DORA avec tendance et courbes sur 12 semaines.
 * Affichage seul : la page connectée et la démo publique fournissent les données.
 */
export function DashboardView({
  subtitle,
  filters,
  metrics,
  repositories,
  allowOrganization = true,
  empty,
  summary,
}: {
  subtitle: ReactNode;
  filters: DashboardFiltersState;
  metrics: UseQueryResult<MetricsResponse>;
  /** Dépôts suivis proposés dans le filtre. */
  repositories: { id: string; name: string }[];
  /** Choix « Toute l'organisation » proposé. */
  allowOrganization?: boolean;
  empty: ReactNode;
  summary?: ReactNode;
}) {
  const { weeks, repo, current, previous, chartPeriod, setFilters } = filters;
  const values = metrics.data?.metrics ?? [];
  const chartValues = values.filter((v) => v.weekStart >= chartPeriod.from);
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <DashboardFilters
          weeks={weeks}
          repo={repo}
          repositories={repositories}
          allowOrganization={allowOrganization}
          onChange={setFilters}
        />
      </div>

      {metrics.isError ? (
        <ErrorMessage />
      ) : metrics.isPending ? (
        <p className="text-muted-foreground">Chargement des métriques…</p>
      ) : values.length === 0 ? (
        <p className="text-muted-foreground">{empty}</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DORA_CARDS.map((metric) => (
              <MetricCard
                key={metric.key}
                metric={metric}
                values={values}
                current={current}
                previous={previous}
                weeks={weeks}
              />
            ))}
          </section>
          {summary}
          <section className="grid gap-4 md:grid-cols-2">
            {DORA_CARDS.map((metric) => (
              <Card key={metric.key}>
                <CardHeader>
                  <CardTitle className="text-base">{metric.label} · 12 semaines</CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart metric={metric} values={chartValues} />
                </CardContent>
              </Card>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

export function ErrorMessage() {
  return (
    <p role="alert" className="p-8 text-destructive">
      Impossible de joindre l&apos;API. Réessayez dans un instant.
    </p>
  );
}
