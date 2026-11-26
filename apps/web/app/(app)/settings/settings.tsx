'use client';

import { ArrowUpRightIcon } from 'lucide-react';
import { PageBody, PageHeader, PageState } from '@/components/page-header';
import { RepositoryList } from '@/components/settings/repository-list';
import { SettingsSection } from '@/components/settings/settings-section';
import { SummaryRecipients } from '@/components/settings/summary-recipients';
import { SyncStatus } from '@/components/settings/sync-status';
import { buttonVariants } from '@/components/ui/button';
import { useConfig } from '@/hooks/use-dashboard';
import { useOrganization } from '@/hooks/use-organization';

/** Paramètres : GitHub App, dépôts suivis et état de l'import, destinataires du résumé. */
export function Settings() {
  const { me, orgId, organization } = useOrganization();
  const config = useConfig();
  if (me.isPending || me.data === null)
    return (
      <PageBody>
        <PageState>Chargement…</PageState>
      </PageBody>
    );
  if (!orgId)
    return (
      <main className="flex flex-1 flex-col">
        <PageHeader title="Paramètres" />
        <PageBody>
          <PageState>Aucune organisation : installez la GitHub App.</PageState>
        </PageBody>
      </main>
    );
  const installUrl = config.data?.githubAppInstallUrl;
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Paramètres" description={organization?.name} />
      <PageBody className="max-w-5xl gap-0">
        <SettingsSection
          first
          title="GitHub App"
          description="Lecture seule : métadonnées des PR, revues, runs et déploiements. Aucun accès au code."
        >
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <p className="text-sm">
              Installée sur <strong className="font-semibold">{organization?.name}</strong>.
            </p>
            {installUrl ? (
              <a
                href={installUrl}
                className={buttonVariants({ variant: 'secondary', className: 'h-9 px-3' })}
              >
                Gérer l&apos;accès aux dépôts sur GitHub
                <ArrowUpRightIcon />
              </a>
            ) : null}
          </div>
        </SettingsSection>
        <SettingsSection
          title="Dépôts suivis"
          description="Suivre un dépôt importe ses 90 derniers jours, puis le tient à jour par webhooks."
        >
          <SyncStatus orgId={orgId} className="border-b bg-muted px-5 py-3" />
          <RepositoryList orgId={orgId} />
        </SettingsSection>
        <SettingsSection
          title="Résumé par email"
          description="Le résumé de la semaine part chaque lundi matin à ces adresses. Chaque email porte un lien de désinscription."
        >
          <SummaryRecipients orgId={orgId} />
        </SettingsSection>
      </PageBody>
    </main>
  );
}
