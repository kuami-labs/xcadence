'use client';

import type { BottleneckPullRequest, BottlenecksResponse } from '@xcadence/shared';
import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatAge, formatLines } from '@/lib/format';
import { formatValue } from '@/lib/metrics/summary';

/**
 * Goulots (F4) : PR qui attendent, PR anciennes, CI lente ou instable. Aucun classement par personne.
 * Affichage seul : la page connectée et la démo publique fournissent les données.
 */
export function BottlenecksView({
  subtitle,
  data,
}: {
  subtitle: ReactNode;
  data: BottlenecksResponse | undefined;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Goulots</h1>
        <p className="text-muted-foreground">{subtitle}</p>
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
                  <TableCell className="text-right tabular-nums">{formatLines(pr.size)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
