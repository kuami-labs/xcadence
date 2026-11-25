'use client';

import Link from 'next/link';
import {
  DashboardView,
  ErrorMessage,
  useDashboardFilters,
} from '@/components/dashboard/dashboard-view';
import { WeeklySummary } from '@/components/dashboard/weekly-summary';
import { useMetrics, useRepositories } from '@/hooks/use-dashboard';
import { useOrganization } from '@/hooks/use-organization';

/** Tableau de bord de l'organisation choisie (session requise). */
export function Dashboard() {
  const { me, orgId, organization } = useOrganization();
  const filters = useDashboardFilters();
  const metrics = useMetrics(orgId, filters.repo, filters.from, filters.to);
  const repositories = useRepositories(orgId);

  if (me.isPending || me.data === null)
    return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (me.isError) return <ErrorMessage />;
  if (!orgId) {
    return (
      <main className="mx-auto w-full max-w-5xl p-8">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="mt-2 text-muted-foreground">
          Aucune organisation pour l&apos;instant.{' '}
          <Link className="underline" href="/onboarding">
            Installer la GitHub App
          </Link>
        </p>
      </main>
    );
  }

  return (
    <DashboardView
      subtitle={`${organization?.name} · connecté en tant que ${me.data.user.login}`}
      filters={filters}
      metrics={metrics}
      repositories={(repositories.data ?? []).filter((r) => r.isTracked)}
      empty={
        <>
          Aucune donnée pour l&apos;instant.{' '}
          <Link className="underline" href={`/settings?org=${orgId}`}>
            Suivez un dépôt
          </Link>{' '}
          : l&apos;import des 90 derniers jours démarre aussitôt.
        </>
      }
      summary={<WeeklySummary orgId={orgId} />}
    />
  );
}
