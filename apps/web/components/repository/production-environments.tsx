'use client';

import { MAX_PRODUCTION_ENVIRONMENTS, type DeployRule } from '@xcadence/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useRepositoryEnvironments, useUpdateDeployRule } from '@/hooks/use-dashboard';

/**
 * Environnements comptés comme production pour un dépôt (deploy_rule). Par défaut,
 * `production` ou `prod` ; Vercel, par exemple, nomme les siens « Production – <projet> ».
 */
export function ProductionEnvironments({
  orgId,
  repositoryId,
  rule,
}: {
  orgId: string;
  repositoryId: string;
  rule: DeployRule | null;
}) {
  const environments = useRepositoryEnvironments(orgId, repositoryId);
  const update = useUpdateDeployRule(orgId, repositoryId);
  // null : pas encore modifié, on affiche la règle enregistrée.
  const [draft, setDraft] = useState<Set<string> | null>(null);

  if (environments.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Impossible de charger les environnements.
      </p>
    );
  }
  if (environments.isPending) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }
  if (environments.data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun déploiement importé : XCadence utilise la règle par défaut (« production » ou « prod
        »).
      </p>
    );
  }

  const saved = new Set(environments.data.filter((e) => e.isProduction).map((e) => e.name));
  const selected = draft ?? saved;
  const changed =
    draft !== null && (draft.size !== saved.size || [...draft].some((name) => !saved.has(name)));
  const toggle = (name: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(name);
    else next.delete(name);
    setDraft(next);
  };
  const save = (next: DeployRule | null) =>
    update.mutate(next, { onSuccess: () => setDraft(null) });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {rule
          ? 'Règle propre à ce dépôt.'
          : 'Règle par défaut : les environnements nommés « production » ou « prod ».'}{' '}
        Les métriques DORA ne comptent que les déploiements vers les environnements cochés.
      </p>
      <ul className="divide-y overflow-hidden rounded-lg border">
        {environments.data.map((environment) => (
          <li key={environment.name}>
            <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-muted/60">
              <Checkbox
                checked={selected.has(environment.name)}
                onCheckedChange={(checked) => toggle(environment.name, checked)}
                disabled={
                  update.isPending ||
                  (!selected.has(environment.name) && selected.size >= MAX_PRODUCTION_ENVIRONMENTS)
                }
              />
              <span className="flex-1 truncate font-mono text-[13px]">{environment.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {environment.deployments} déploiement{environment.deployments > 1 ? 's' : ''}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {update.isError && (
        <p role="alert" className="text-sm text-destructive">
          Enregistrement impossible. Réessayez.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!changed || selected.size === 0 || update.isPending}
          onClick={() => save({ productionEnvironments: [...selected] })}
        >
          Enregistrer
        </Button>
        {rule && (
          <Button variant="ghost" disabled={update.isPending} onClick={() => save(null)}>
            Revenir à la règle par défaut
          </Button>
        )}
      </div>
      {changed && selected.size === 0 && (
        <p className="text-sm text-muted-foreground">Cochez au moins un environnement.</p>
      )}
    </div>
  );
}
