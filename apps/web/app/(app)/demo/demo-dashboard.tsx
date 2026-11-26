'use client';

import { BottlenecksSummary } from '@/components/dashboard/bottlenecks-summary';
import { DashboardView, useDashboardFilters } from '@/components/dashboard/dashboard-view';
import { DemoBanner } from '@/components/demo-banner';
import { PageBody, PageHeader, PageState } from '@/components/page-header';
import { useDemo, useDemoBottlenecks, useDemoMetrics } from '@/hooks/use-demo';

/** Tableau de bord de la démo publique : sans session, lecture seule. */
export function DemoDashboard() {
  const demo = useDemo();
  const filters = useDashboardFilters();
  const bottlenecks = useDemoBottlenecks();
  const data = demo.data;
  // Sans agrégat disponible, le premier dépôt public est affiché par défaut.
  const repo =
    filters.repo ?? (data && !data.organizationMetrics ? (data.repositories[0]?.id ?? null) : null);
  const metrics = useDemoMetrics(
    repo,
    filters.from,
    filters.to,
    Boolean(data) && (repo !== null || Boolean(data?.organizationMetrics)),
  );

  if (demo.isPending)
    return (
      <PageBody>
        <PageState>Chargement…</PageState>
      </PageBody>
    );
  if (demo.isError) return <NoDemo />;

  return (
    <DashboardView
      subtitle={`${demo.data.organization.name} · démo publique`}
      notice={<DemoBanner organization={demo.data.organization.name} />}
      filters={{ ...filters, repo }}
      metrics={metrics}
      repositories={demo.data.repositories}
      allowOrganization={demo.data.organizationMetrics}
      empty="Pas encore de métrique sur cette période."
      bottlenecks={
        bottlenecks.isError ? null : (
          <BottlenecksSummary data={bottlenecks.data} href="/demo/bottlenecks" />
        )
      }
    />
  );
}

export function NoDemo() {
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Démo" />
      <PageBody>
        <PageState>Aucune démo publique pour l&apos;instant.</PageState>
      </PageBody>
    </main>
  );
}
