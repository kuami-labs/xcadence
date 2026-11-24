'use client';

import { Switch } from '@/components/ui/switch';
import { useRepositories, useTrackRepository } from '@/hooks/use-dashboard';

/** Dépôts de l'organisation, avec la bascule de suivi (F1). */
export function RepositoryList({ orgId }: { orgId: string }) {
  const repositories = useRepositories(orgId);
  const track = useTrackRepository(orgId);

  if (repositories.isPending)
    return <p className="text-sm text-muted-foreground">Chargement des dépôts…</p>;
  if (repositories.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Impossible de charger les dépôts.
      </p>
    );
  }
  if (repositories.data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun dépôt : l&apos;installation de la GitHub App n&apos;en donne accès à aucun.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-lg border">
      {repositories.data.map((repo) => (
        <li key={repo.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <label htmlFor={`suivi-${repo.id}`} className="font-medium">
            {repo.name}
          </label>
          <Switch
            id={`suivi-${repo.id}`}
            checked={repo.isTracked}
            disabled={track.isPending}
            onCheckedChange={(checked) => track.mutate({ id: repo.id, isTracked: checked })}
          />
        </li>
      ))}
      {track.isError ? (
        <li role="alert" className="px-4 py-3 text-sm text-destructive">
          La modification n&apos;a pas été enregistrée. Réessayez.
        </li>
      ) : null}
    </ul>
  );
}
