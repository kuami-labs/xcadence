'use client';

import { Card } from '@/components/ui/card';
import { useLatestSummary } from '@/hooks/use-dashboard';

/** « Résumé de la semaine » (F5) : le dernier résumé, ligne par ligne. */
export function WeeklySummary({ orgId }: { orgId: string }) {
  const summary = useLatestSummary(orgId);
  const data = summary.data?.summary;
  if (summary.isPending || summary.isError) return null;
  return (
    <Card className="gap-3 px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold tracking-tight">Résumé de la semaine</h2>
        {data ? (
          <span className="text-sm text-muted-foreground tabular-nums">
            Semaine du{' '}
            {new Date(`${data.weekStart}T00:00:00Z`).toLocaleDateString('fr-FR', {
              timeZone: 'UTC',
              day: 'numeric',
              month: 'long',
            })}
          </span>
        ) : null}
      </div>
      {data ? (
        <>
          <ul className="text-sm leading-relaxed">
            {data.content.split('\n').map((line, i) => (
              <li key={i} className="border-t py-2.5">
                {line}
              </li>
            ))}
          </ul>
          <p className="border-t pt-3 text-xs text-muted-foreground">
            {data.model === 'repli'
              ? 'Rédigé sans IA, à partir des métriques.'
              : 'Rédigé par IA, chaque chiffre vérifié contre les métriques.'}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Le premier résumé arrivera lundi, après une semaine de données.
        </p>
      )}
    </Card>
  );
}
