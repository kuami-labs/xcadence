'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLatestSummary } from '@/hooks/use-dashboard';

/** « Résumé de la semaine » (F5) : le dernier résumé, ligne par ligne. */
export function WeeklySummary({ orgId }: { orgId: string }) {
  const summary = useLatestSummary(orgId);
  const data = summary.data?.summary;
  if (summary.isPending || summary.isError) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Résumé de la semaine</CardTitle>
        <CardDescription>
          {data
            ? `Semaine du ${new Date(`${data.weekStart}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' })}${
                data.model === 'repli' ? ' · rédigé sans IA' : ''
              }`
            : 'Le premier résumé arrivera lundi, après une semaine de données.'}
        </CardDescription>
      </CardHeader>
      {data ? (
        <CardContent>
          <ul className="space-y-1 text-sm">
            {data.content.split('\n').map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  );
}
