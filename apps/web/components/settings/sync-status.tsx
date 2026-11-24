'use client';

import { useSyncStatus } from '@/hooks/use-dashboard';

const STATUS = {
  queued: 'en attente',
  running: 'en cours',
  succeeded: 'terminé',
  failed: 'en échec',
} as const;

/** Avancement des imports (rafraîchi tant qu'un import tourne). */
export function SyncStatus({ orgId }: { orgId: string }) {
  const status = useSyncStatus(orgId);
  if (!status.data) return null;
  const last = status.data.jobs.find((j) => j.type === 'backfill');
  if (status.data.inProgress) {
    return <p className="text-sm">Import en cours… Les métriques apparaîtront dès sa fin.</p>;
  }
  if (!last)
    return <p className="text-sm text-muted-foreground">Aucun import pour l&apos;instant.</p>;
  return (
    <p
      className={`text-sm ${last.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}
    >
      Dernier import {STATUS[last.status]}
      {last.finishedAt ? ` le ${new Date(last.finishedAt).toLocaleString('fr-FR')}` : ''}.
    </p>
  );
}
