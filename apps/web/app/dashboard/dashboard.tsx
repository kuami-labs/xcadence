'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DashboardFilters, PERIOD_OPTIONS } from '@/components/dashboard/filters';
import { MetricCard } from '@/components/dashboard/metric-card';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMetrics, useRepositories } from '@/hooks/use-dashboard';
import { useOrganization } from '@/hooks/use-organization';
import { DORA_CARDS, periods } from '@/lib/metrics/summary';

/** Vue d'ensemble (F3) : 4 cartes DORA avec tendance et courbes sur 12 semaines. */
export function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { me, orgId, organization } = useOrganization();

  const weeksParam = Number(params.get('semaines'));
  const weeks = (PERIOD_OPTIONS as readonly number[]).includes(weeksParam) ? weeksParam : 4;
  const repo = params.get('depot');

  // Période affichée et précédente (tendance), plus 12 semaines pour les courbes.
  const { current, previous } = periods(weeks);
  const chartPeriod = periods(12).current;
  const from = [previous.from, chartPeriod.from].sort()[0];
  const metrics = useMetrics(orgId, repo, from, current.to);
  const repositories = useRepositories(orgId);

  const setFilters = (next: { weeks?: number; repo?: string | null }) => {
    const query = new URLSearchParams(params);
    if (next.weeks) query.set('semaines', String(next.weeks));
    if (next.repo !== undefined) {
      if (next.repo) query.set('depot', next.repo);
      else query.delete('depot');
    }
    router.replace(`${pathname}?${query}`);
  };

  if (me.isPending || me.data === null)
    return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (me.isError) return <ErrorMessage />;
  if (!orgId) {
    return (
      <main className="mx-auto w-full max-w-5xl p-8">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="mt-2 text-muted-foreground">Aucune organisation : installez la GitHub App.</p>
      </main>
    );
  }

  const values = metrics.data?.metrics ?? [];
  const chartValues = values.filter((v) => v.weekStart >= chartPeriod.from);
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-muted-foreground">
            {organization?.name} · connecté en tant que {me.data.user.login}
          </p>
        </div>
        <DashboardFilters
          weeks={weeks}
          repo={repo}
          repositories={repositories.data ?? []}
          onChange={setFilters}
        />
      </div>

      {metrics.isError ? (
        <ErrorMessage />
      ) : metrics.isPending ? (
        <p className="text-muted-foreground">Chargement des métriques…</p>
      ) : values.length === 0 ? (
        <p className="text-muted-foreground">
          Aucune donnée pour l&apos;instant : suivez un dépôt, l&apos;import des 90 derniers jours
          démarre aussitôt.
        </p>
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

function ErrorMessage() {
  return (
    <p role="alert" className="p-8 text-destructive">
      Impossible de joindre l&apos;API. Réessayez dans un instant.
    </p>
  );
}
