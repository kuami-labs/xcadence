'use client';

import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { RepositoryList } from '@/components/settings/repository-list';
import { SyncStatus } from '@/components/settings/sync-status';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useConfig, useRepositories, useSyncStatus } from '@/hooks/use-dashboard';
import { useOrganization } from '@/hooks/use-organization';
import { cn } from '@/lib/utils';

type StepState = 'done' | 'current' | 'todo';

/** Installation (F1) : installer la GitHub App, choisir les dépôts, suivre l'import. */
export function Onboarding() {
  const { me, orgId, organization } = useOrganization();
  const config = useConfig();
  const repositories = useRepositories(orgId);
  const sync = useSyncStatus(orgId);
  if (me.isPending || me.data === null)
    return <p className="px-4 py-6 text-sm text-muted-foreground sm:px-8">Chargement…</p>;

  const installUrl = config.data?.githubAppInstallUrl;
  const tracked = (repositories.data ?? []).filter((r) => r.isTracked);
  const lastImport = sync.data?.jobs.find((j) => j.type === 'backfill');
  const imported =
    tracked.length > 0 && !sync.data?.inProgress && lastImport?.status === 'succeeded';
  const steps: StepState[] = !orgId
    ? ['current', 'todo', 'todo']
    : tracked.length === 0
      ? ['done', 'current', 'todo']
      : imported
        ? ['done', 'done', 'done']
        : ['done', 'done', 'current'];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-4 py-10 sm:py-14">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] font-semibold tracking-tight">Bienvenue sur XCadence</h1>
        <p className="text-muted-foreground">
          Trois étapes, environ deux minutes. Vos premières métriques s&apos;affichent dès la fin de
          l&apos;import.
        </p>
      </div>

      <Card className="gap-0 py-0">
        <ol>
          <Step
            number={1}
            state={steps[0]}
            title="Installer la GitHub App"
            description={
              orgId ? (
                <>
                  Installée sur <strong className="text-foreground">{organization?.name}</strong>.
                  {installUrl ? (
                    <>
                      {' '}
                      <a className="font-medium text-primary hover:underline" href={installUrl}>
                        Ajouter une autre organisation
                      </a>
                    </>
                  ) : null}
                </>
              ) : (
                'Lecture seule : métadonnées des PR, revues, runs et déploiements. Aucun accès au code. Vous choisissez les dépôts sur GitHub.'
              )
            }
          >
            {!orgId ? (
              installUrl ? (
                <a href={installUrl} className={buttonVariants({ className: 'h-9 px-4' })}>
                  Installer sur GitHub
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Lien d&apos;installation indisponible (GITHUB_APP_SLUG non défini côté API).
                </p>
              )
            ) : null}
          </Step>

          <Step
            number={2}
            state={steps[1]}
            title="Choisir les dépôts suivis"
            description="L’import des 90 derniers jours démarre dès qu’un dépôt est suivi. Modifiable ensuite dans les paramètres."
          >
            {orgId ? (
              <div className="overflow-hidden rounded-lg border">
                <RepositoryList orgId={orgId} />
              </div>
            ) : null}
          </Step>

          <Step
            number={3}
            state={steps[2]}
            title="Importer 90 jours d'historique"
            description="Pull requests, revues, runs de CI et déploiements. Vous pouvez quitter cette page pendant l’import."
          >
            {orgId && tracked.length > 0 ? (
              <div className="flex flex-col items-start gap-4">
                <SyncStatus orgId={orgId} />
                <Link
                  href={`/dashboard?org=${orgId}`}
                  className={buttonVariants({
                    variant: imported ? 'default' : 'outline',
                    className: 'h-9 px-4',
                  })}
                >
                  Voir le tableau de bord
                  <ArrowRightIcon />
                </Link>
              </div>
            ) : null}
          </Step>
        </ol>
      </Card>
    </main>
  );
}

function Step({
  number,
  state,
  title,
  description,
  children,
}: {
  number: number;
  state: StepState;
  title: string;
  description: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li
      aria-current={state === 'current' ? 'step' : undefined}
      className="flex gap-4 border-b px-5 py-6 last:border-b-0 sm:px-6"
    >
      <span
        aria-hidden
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold',
          state === 'done' && 'bg-primary text-primary-foreground',
          state === 'current' && 'bg-card text-primary ring-2 ring-primary ring-inset',
          state === 'todo' && 'bg-secondary text-muted-foreground',
        )}
      >
        {state === 'done' ? <CheckIcon className="size-3.5" strokeWidth={3} /> : number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
        <div className="flex flex-col gap-1">
          <h2
            className={cn('text-[15px] font-semibold', state === 'todo' && 'text-muted-foreground')}
          >
            {title}
            {state === 'done' ? <span className="sr-only"> (fait)</span> : null}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </li>
  );
}
