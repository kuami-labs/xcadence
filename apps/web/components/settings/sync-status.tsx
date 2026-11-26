'use client';

import { useSyncStatus } from '@/hooks/use-dashboard';
import { cn } from '@/lib/utils';

const STATUS = {
  queued: 'en attente',
  running: 'en cours',
  succeeded: 'terminé',
  failed: 'en échec',
} as const;

/** Avancement des imports (rafraîchi tant qu'un import tourne), en un bandeau d'état. */
export function SyncStatus({ orgId, className }: { orgId: string; className?: string }) {
  const status = useSyncStatus(orgId);
  if (!status.data) return null;
  const last = status.data.jobs.find((j) => j.type === 'backfill');
  const failed = last?.status === 'failed';
  return (
    <p
      role="status"
      className={cn(
        'flex items-center gap-2.5 text-sm',
        failed ? 'text-destructive' : 'text-muted-foreground',
        className,
      )}
    >
      {status.data.inProgress ? (
        <span
          aria-hidden
          className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent"
        />
      ) : (
        <span
          aria-hidden
          className={cn('size-2 shrink-0 rounded-full', failed ? 'bg-destructive' : 'bg-primary')}
        />
      )}
      {status.data.inProgress ? (
        <span className="text-foreground">
          Import en cours… Les métriques apparaîtront dès sa fin.
        </span>
      ) : !last ? (
        'Aucun import pour l’instant.'
      ) : (
        <span>
          Dernier import {STATUS[last.status]}
          {last.finishedAt
            ? ` le ${new Date(last.finishedAt).toLocaleString('fr-FR', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : ''}
          .
        </span>
      )}
    </p>
  );
}
