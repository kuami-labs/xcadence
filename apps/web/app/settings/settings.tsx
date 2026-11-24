'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RepositoryList } from '@/components/settings/repository-list';
import { SyncStatus } from '@/components/settings/sync-status';
import { useOrganization } from '@/hooks/use-organization';

/** Paramètres : dépôts suivis et état de l'import. */
export function Settings() {
  const { me, orgId, organization } = useOrganization();
  if (me.isPending || me.data === null)
    return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (!orgId)
    return (
      <p className="p-8 text-muted-foreground">Aucune organisation : installez la GitHub App.</p>
    );
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-muted-foreground">{organization?.name}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dépôts suivis</CardTitle>
          <CardDescription>
            Suivre un dépôt importe ses 90 derniers jours, puis le tient à jour.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SyncStatus orgId={orgId} />
          <RepositoryList orgId={orgId} />
        </CardContent>
      </Card>
    </main>
  );
}
