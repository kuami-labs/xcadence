'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RepositoryList } from '@/components/settings/repository-list';
import { SyncStatus } from '@/components/settings/sync-status';
import { useConfig } from '@/hooks/use-dashboard';
import { useOrganization } from '@/hooks/use-organization';

/** Installation (F1) : installer la GitHub App, choisir les dépôts, suivre l'import. */
export function Onboarding() {
  const { me, orgId, organization } = useOrganization();
  const config = useConfig();
  if (me.isPending || me.data === null)
    return <p className="p-8 text-muted-foreground">Chargement…</p>;
  const installUrl = config.data?.githubAppInstallUrl;
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Bienvenue sur XCadence</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Installer la GitHub App</CardTitle>
          <CardDescription>
            Lecture seule : métadonnées des PR, revues, runs et déploiements. Aucun accès au code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orgId ? (
            <p className="text-sm">
              Installée sur <strong>{organization?.name}</strong>.{' '}
              {installUrl ? (
                <a className="underline" href={installUrl}>
                  Ajouter une autre organisation
                </a>
              ) : null}
            </p>
          ) : installUrl ? (
            <Button nativeButton={false} render={<a href={installUrl} />}>
              Installer sur GitHub
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Lien d&apos;installation indisponible (GITHUB_APP_SLUG non défini côté API).
            </p>
          )}
        </CardContent>
      </Card>
      {orgId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Choisir les dépôts suivis</CardTitle>
            <CardDescription>
              L&apos;import des 90 derniers jours démarre dès qu&apos;un dépôt est suivi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SyncStatus orgId={orgId} />
            <RepositoryList orgId={orgId} />
            <Button nativeButton={false} render={<Link href={`/dashboard?org=${orgId}`} />}>
              Voir le tableau de bord
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
