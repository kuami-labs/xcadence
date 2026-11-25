'use client';

import { DashboardView, useDashboardFilters } from '@/components/dashboard/dashboard-view';
import { DemoBanner } from '@/components/demo-banner';
import { useDemo, useDemoMetrics } from '@/hooks/use-demo';

/** Tableau de bord de la démo publique : sans session, lecture seule. */
export function DemoDashboard() {
  const demo = useDemo();
  const filters = useDashboardFilters();
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

  if (demo.isPending) return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (demo.isError) return <NoDemo />;

  return (
    <>
      <DemoBanner organization={demo.data.organization.name} />
      <DashboardView
        subtitle={demo.data.organization.name}
        filters={{ ...filters, repo }}
        metrics={metrics}
        repositories={demo.data.repositories}
        allowOrganization={demo.data.organizationMetrics}
        empty="Pas encore de métrique sur cette période."
      />
    </>
  );
}

export function NoDemo() {
  return (
    <main className="mx-auto w-full max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">Démo</h1>
      <p className="mt-2 text-muted-foreground">Aucune démo publique pour l&apos;instant.</p>
    </main>
  );
}
