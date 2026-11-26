'use client';

import { useParams } from 'next/navigation';
import { MetricCard } from '@/components/dashboard/metric-card';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { ProductionEnvironments } from '@/components/repository/production-environments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMetrics, useRecentPullRequests, useRepositories } from '@/hooks/use-dashboard';
import { useOrganization } from '@/hooks/use-organization';
import { formatLines } from '@/lib/format';
import { DORA_CARDS, FLOW_CARDS, formatValue, periods } from '@/lib/metrics/summary';

const STATE = { open: 'ouverte', closed: 'fermée', merged: 'fusionnée' } as const;
const WEEKS = 4;

/** Détail d'un dépôt : métriques DORA et de flux, durée de la CI, PR récentes (docs/04-FRONTEND.md). */
export function Repository() {
  const { id } = useParams<{ id: string }>();
  const { me, orgId } = useOrganization();
  const repositories = useRepositories(orgId);
  const { current, previous } = periods(WEEKS);
  const chartPeriod = periods(12).current;
  const metrics = useMetrics(orgId, id, [previous.from, chartPeriod.from].sort()[0], current.to);
  const pullRequests = useRecentPullRequests(orgId, id);
  const repository = repositories.data?.find((r) => r.id === id);

  if (me.isPending || me.data === null)
    return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (metrics.isError || pullRequests.isError) {
    return (
      <p role="alert" className="p-8 text-destructive">
        Dépôt introuvable, ou API injoignable.
      </p>
    );
  }
  const values = metrics.data?.metrics ?? [];
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold">{repository?.name ?? 'Dépôt'}</h1>
        <p className="text-muted-foreground">
          {repository?.defaultBranch
            ? `Branche principale : ${repository.defaultBranch}`
            : 'Pas encore importé'}
          {repository && !repository.isTracked ? ' · non suivi' : ''}
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...DORA_CARDS, ...FLOW_CARDS].map((metric) => (
          <MetricCard
            key={metric.key}
            metric={metric}
            values={values}
            current={current}
            previous={previous}
            weeks={WEEKS}
          />
        ))}
      </section>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Durée de la CI (médiane) · 12 semaines</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            metric={FLOW_CARDS[2]}
            values={values.filter((v) => v.weekStart >= chartPeriod.from)}
          />
        </CardContent>
      </Card>
      {orgId && repository && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Environnements de production</CardTitle>
            <CardDescription>
              Quels déploiements comptent comme une mise en production.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductionEnvironments
              orgId={orgId}
              repositoryId={repository.id}
              rule={repository.deployRule}
            />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PR récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {!pullRequests.data ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : pullRequests.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune PR importée.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PR</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead className="text-right">Ouverte le</TableHead>
                  <TableHead className="text-right">Première revue</TableHead>
                  <TableHead className="text-right">Taille</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pullRequests.data.map((pr) => (
                  <TableRow key={pr.number}>
                    <TableCell>#{pr.number}</TableCell>
                    <TableCell>
                      {STATE[pr.state]}
                      {pr.isDraft ? ' (brouillon)' : ''}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {new Date(pr.createdAt).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pr.timeToFirstReviewHours === null
                        ? '—'
                        : `${formatValue(pr.timeToFirstReviewHours)} h`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatLines(pr.size)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
