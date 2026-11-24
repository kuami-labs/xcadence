'use client';

import type { BottleneckPullRequest } from '@xcadence/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBottlenecks } from '@/hooks/use-dashboard';
import { useOrganization } from '@/hooks/use-organization';
import { formatAge } from '@/lib/format';
import { formatValue } from '@/lib/metrics/summary';

/** Goulots (F4) : PR qui attendent, PR anciennes, CI lente ou instable. Aucun classement par personne. */
export function Bottlenecks() {
  const { me, orgId, organization } = useOrganization();
  const bottlenecks = useBottlenecks(orgId);

  if (me.isPending || me.data === null)
    return <p className="p-8 text-muted-foreground">Chargement…</p>;
  if (me.isError || bottlenecks.isError) {
    return (
      <p role="alert" className="p-8 text-destructive">
        Impossible de joindre l&apos;API. Réessayez dans un instant.
      </p>
    );
  }
  if (!orgId)
    return (
      <p className="p-8 text-muted-foreground">Aucune organisation : installez la GitHub App.</p>
    );

  const data = bottlenecks.data;
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Goulots</h1>
        <p className="text-muted-foreground">{organization?.name}</p>
      </div>
      {!data ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : (
        <>
          <PullRequestTable
            title="PR en attente de revue"
            description="Ouvertes depuis plus de 48 h, hors brouillon, sans revue ; les plus anciennes d'abord."
            empty="Aucune PR n'attend de revue depuis plus de 48 h."
            rows={data.awaitingReview}
          />
          <PullRequestTable
            title="PR anciennes"
            description="Ouvertes depuis plus de 7 jours."
            empty="Aucune PR ouverte depuis plus de 7 jours."
            rows={data.oldPullRequests}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CI lente ou instable</CardTitle>
              <CardDescription>
                Branche principale, 4 dernières semaines ; les plus lentes d&apos;abord.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.slowWorkflows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun run de CI terminé sur la période.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dépôt</TableHead>
                      <TableHead>Workflow</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Durée p90</TableHead>
                      <TableHead className="text-right">Échecs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.slowWorkflows.map((w) => (
                      <TableRow key={`${w.repositoryId}-${w.workflowName}`}>
                        <TableCell>{w.repositoryName}</TableCell>
                        <TableCell>{w.workflowName}</TableCell>
                        <TableCell className="text-right tabular-nums">{w.runs}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatValue(w.p90Minutes)} min
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatValue(w.failureRate)} %
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}

function PullRequestTable({
  title,
  description,
  empty,
  rows,
}: {
  title: string;
  description: string;
  empty: string;
  rows: BottleneckPullRequest[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dépôt</TableHead>
                <TableHead>PR</TableHead>
                <TableHead className="text-right">Ancienneté</TableHead>
                <TableHead className="text-right">Taille</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((pr) => (
                <TableRow key={`${pr.repositoryId}-${pr.number}`}>
                  <TableCell>{pr.repositoryName}</TableCell>
                  <TableCell>#{pr.number}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatAge(pr.ageHours)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{pr.size} lignes</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
