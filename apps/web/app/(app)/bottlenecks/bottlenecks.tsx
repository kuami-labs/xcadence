'use client';

import { BottlenecksView } from '@/components/bottlenecks/bottlenecks-view';
import { PageBody, PageHeader, PageState } from '@/components/page-header';
import { useBottlenecks } from '@/hooks/use-dashboard';
import { useOrganization } from '@/hooks/use-organization';

/** Goulots de l'organisation choisie (session requise). */
export function Bottlenecks() {
  const { me, orgId, organization } = useOrganization();
  const bottlenecks = useBottlenecks(orgId);

  if (me.isPending || me.data === null)
    return (
      <PageBody>
        <PageState>Chargement…</PageState>
      </PageBody>
    );
  if (!orgId && !me.isError)
    return (
      <main className="flex flex-1 flex-col">
        <PageHeader title="Goulots" />
        <PageBody>
          <PageState>Aucune organisation : installez la GitHub App.</PageState>
        </PageBody>
      </main>
    );

  return (
    <BottlenecksView
      subtitle={`${organization?.name ?? ''} · sans classement des personnes`}
      data={bottlenecks.data}
      error={me.isError || bottlenecks.isError}
    />
  );
}
