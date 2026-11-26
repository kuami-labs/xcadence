'use client';

import { BottlenecksView } from '@/components/bottlenecks/bottlenecks-view';
import { useBottlenecks } from '@/hooks/use-dashboard';
import { useOrganization } from '@/hooks/use-organization';

/** Goulots de l'organisation choisie (session requise). */
export function Bottlenecks() {
  const { me, orgId, organization } = useOrganization();
  const bottlenecks = useBottlenecks(orgId);

  if (me.isPending || me.data === null)
    return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (me.isError || bottlenecks.isError) {
    return (
      <p role="alert" className="p-8 text-destructive">
        Impossible de joindre l&apos;API. Réessayez dans un instant.
      </p>
    );
  }
  if (!orgId)
    return (
      <p className="p-8 text-muted-foreground">Aucune organisation : installez la GitHub App.</p>
    );

  return <BottlenecksView subtitle={organization?.name} data={bottlenecks.data} />;
}
