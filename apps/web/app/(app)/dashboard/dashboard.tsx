'use client';

import Link from 'next/link';
import { BottlenecksSummary } from '@/components/dashboard/bottlenecks-summary';
import {
  DashboardView,
  ErrorMessage,
  useDashboardFilters,
} from '@/components/dashboard/dashboard-view';
import { WeeklySummary } from '@/components/dashboard/weekly-summary';
import { PageBody, PageHeader, PageState } from '@/components/page-header';
import { useBottlenecks, useMetrics, useRepositories } from '@/hooks/use-dashboard';
import { useOrganization } from '@/hooks/use-organization';

/** Tableau de bord de l'organisation choisie (session requise). */
export function Dashboard() {
  const { me, orgId, organization } = useOrganization();
  const filters = useDashboardFilters();
  const metrics = useMetrics(orgId, filters.repo, filters.from, filters.to);
  const repositories = useRepositories(orgId);
  const bottlenecks = useBottlenecks(orgId);

  if (me.isPending || me.data === null)
    return (
      <PageBody>
        <PageState>Chargement…</PageState>
      </PageBody>
    );
  if (me.isError)
    return (
      <PageBody>
        <ErrorMessage />
      </PageBody>
    );
  if (!orgId) {
    return (
      <main className="flex flex-1 flex-col">
        <PageHeader title="Vue d'ensemble" />
        <PageBody>
          <PageState>
            Aucune organisation pour l&apos;instant.{' '}
            <Link className="font-medium text-primary hover:underline" href="/onboarding">
              Installer la GitHub App
            </Link>
          </PageState>
        </PageBody>
      </main>
    );
  }

  const tracked = (repositories.data ?? []).filter((r) => r.isTracked);
  return (
    <DashboardView
      subtitle={`${organization?.name} · ${tracked.length} dépôt${tracked.length > 1 ? 's' : ''} suivi${tracked.length > 1 ? 's' : ''}`}
      filters={filters}
      metrics={metrics}
      repositories={tracked}
      empty={
        <>
          Aucune donnée pour l&apos;instant.{' '}
          <Link
            className="font-medium text-primary hover:underline"
            href={`/settings?org=${orgId}`}
          >
            Suivez un dépôt
          </Link>{' '}
          : l&apos;import des 90 derniers jours démarre aussitôt.
        </>
      }
      summary={<WeeklySummary orgId={orgId} />}
      bottlenecks={
        bottlenecks.isError ? null : (
          <BottlenecksSummary data={bottlenecks.data} href={`/bottlenecks?org=${orgId}`} />
        )
      }
    />
  );
}
