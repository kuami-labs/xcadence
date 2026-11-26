'use client';

import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { useRepositories, useTrackRepository } from '@/hooks/use-dashboard';

/** Dépôts de l'organisation, avec la bascule de suivi (F1). */
export function RepositoryList({ orgId }: { orgId: string }) {
  const repositories = useRepositories(orgId);
  const track = useTrackRepository(orgId);

  if (repositories.isPending)
    return <p className="px-5 py-4 text-sm text-muted-foreground">Chargement des dépôts…</p>;
  if (repositories.isError) {
    return (
      <p role="alert" className="px-5 py-4 text-sm text-destructive">
        Impossible de charger les dépôts.
      </p>
    );
  }
  if (repositories.data.length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-muted-foreground">
        Aucun dépôt : l&apos;installation de la GitHub App n&apos;en donne accès à aucun.
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {repositories.data.map((repo) => (
        <li
          key={repo.id}
          className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/60"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <label htmlFor={`suivi-${repo.id}`} className="truncate text-sm font-medium">
              {repo.name}
            </label>
            <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              {repo.defaultBranch ? (
                <span>
                  branche <span className="font-mono">{repo.defaultBranch}</span>
                </span>
              ) : (
                <span>pas encore importé</span>
              )}
              {repo.isTracked ? (
                <>
                  <span aria-hidden>·</span>
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={`/repositories/${repo.id}?org=${orgId}`}
                  >
                    Voir les métriques
                  </Link>
                </>
              ) : null}
            </span>
          </div>
          <Switch
            id={`suivi-${repo.id}`}
            aria-label={`Suivre ${repo.name}`}
            checked={repo.isTracked}
            disabled={track.isPending}
            onCheckedChange={(checked) => track.mutate({ id: repo.id, isTracked: checked })}
          />
        </li>
      ))}
      {track.isError ? (
        <li role="alert" className="px-5 py-3 text-sm text-destructive">
          La modification n&apos;a pas été enregistrée. Réessayez.
        </li>
      ) : null}
    </ul>
  );
}
