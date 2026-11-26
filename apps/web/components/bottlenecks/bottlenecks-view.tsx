'use client';

import type { BottleneckPullRequest, BottlenecksResponse } from '@xcadence/shared';
import { useState, type ReactNode } from 'react';
import { PageBody, PageHeader, PageState } from '@/components/page-header';
import { Card } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

const WEEK_HOURS = 7 * 24;

type Tab = 'review' | 'old' | 'ci';

/**
 * Goulots (F4) : PR qui attendent, PR anciennes, CI lente ou instable. Aucun classement par
 * personne. Affichage seul : la page connectée et la démo publique fournissent les données.
 */
export function BottlenecksView({
  subtitle,
  notice,
  data,
  error = false,
}: {
  subtitle: ReactNode;
  /** Bandeau au-dessus du contenu (démo publique). */
  notice?: ReactNode;
  data: BottlenecksResponse | undefined;
  error?: boolean;
}) {
  const [tab, setTab] = useState<Tab>('review');
  const tabs: { id: Tab; label: string; count: number | undefined }[] = [
    { id: 'review', label: 'En attente de revue', count: data?.awaitingReview.length },
    { id: 'old', label: 'PR anciennes', count: data?.oldPullRequests.length },
    { id: 'ci', label: 'CI lente ou instable', count: data?.slowWorkflows.length },
  ];
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader title="Goulots" description={subtitle} />
      <PageBody>
        {notice}
        {error ? (
          <PageState tone="error">
            Impossible de joindre l&apos;API. Réessayez dans un instant.
          </PageState>
        ) : !data ? (
          <PageState>Chargement…</PageState>
        ) : (
          <>
            <Overview data={data} />
            <Card className="gap-0 py-0">
              <div
                role="tablist"
                aria-label="Type de goulot"
                className="flex gap-1 overflow-x-auto border-b px-3 sm:px-4"
              >
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className="flex min-h-12 shrink-0 items-center gap-2 px-2.5 text-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset aria-selected:font-medium aria-selected:text-foreground aria-selected:shadow-[inset_0_-2px_0_var(--primary)]"
                  >
                    {t.label}
                    <span className="rounded-full bg-secondary px-2 py-px text-xs font-medium text-secondary-foreground tabular-nums">
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>
              <div role="tabpanel">
                {tab === 'review' ? (
                  <PullRequestTable
                    hint="Ouvertes depuis plus de 48 h, hors brouillons, sans aucune revue ; les plus anciennes d'abord. En rouge : plus de 7 jours."
                    empty="Aucune PR n'attend de revue depuis plus de 48 h."
                    ageLabel="Attend depuis"
                    rows={data.awaitingReview}
                    highlightOld
                  />
                ) : tab === 'old' ? (
                  <PullRequestTable
                    hint="Ouvertes depuis plus de 7 jours, revues ou non."
                    empty="Aucune PR ouverte depuis plus de 7 jours."
                    ageLabel="Ouverte depuis"
                    rows={data.oldPullRequests}
                  />
                ) : (
                  <WorkflowTable data={data} />
                )}
              </div>
            </Card>
          </>
        )}
      </PageBody>
    </main>
  );
}

/** Les trois chiffres clés, en un bandeau. */
function Overview({ data }: { data: BottlenecksResponse }) {
  const oldest = data.awaitingReview[0];
  const slowest = data.slowWorkflows[0];
  return (
    <Card className="grid gap-px overflow-hidden bg-border py-0 sm:grid-cols-3">
      <Figure
        label="En attente de revue"
        value={String(data.awaitingReview.length)}
        unit="PR"
        hint={oldest ? `la plus ancienne attend depuis ${formatAge(oldest.ageHours)}` : 'aucune PR'}
      />
      <Figure
        label="PR anciennes"
        value={String(data.oldPullRequests.length)}
        unit="PR"
        hint="ouvertes depuis plus de 7 jours"
      />
      <Figure
        label="CI la plus lente"
        value={slowest ? formatValue(slowest.p90Minutes) : '—'}
        unit={slowest ? 'min' : undefined}
        hint={
          slowest
            ? `${slowest.repositoryName} · p90, ${formatValue(slowest.failureRate)} % d'échecs`
            : 'aucun run sur 4 semaines'
        }
      />
    </Card>
  );
}

function Figure({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 bg-card px-6 py-5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-[28px] leading-tight font-semibold tracking-tight tabular-nums">
        {value}
        {unit ? (
          <span className="ml-1.5 text-sm font-normal tracking-normal text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </span>
      <span className="text-sm text-muted-foreground">{hint}</span>
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3.5 text-sm text-muted-foreground sm:px-6">{children}</p>;
}

function PullRequestTable({
  hint,
  empty,
  ageLabel,
  rows,
  highlightOld = false,
}: {
  hint: string;
  empty: string;
  ageLabel: string;
  rows: BottleneckPullRequest[];
  highlightOld?: boolean;
}) {
  return (
    <>
      <Hint>{hint}</Hint>
      {rows.length === 0 ? (
        <p className="border-t px-4 py-10 text-center text-sm text-muted-foreground sm:px-6">
          {empty}
        </p>
      ) : (
        <Table className="min-w-[560px]">
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="pl-4 text-muted-foreground sm:pl-6">Pull request</TableHead>
              <TableHead className="text-muted-foreground">Dépôt</TableHead>
              <TableHead className="text-muted-foreground">Ouverte le</TableHead>
              <TableHead className="text-right text-muted-foreground">Taille</TableHead>
              <TableHead className="pr-4 text-right text-muted-foreground sm:pr-6">
                {ageLabel}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((pr) => (
              <TableRow key={`${pr.repositoryId}-${pr.number}`}>
                <TableCell className="pl-4 font-mono text-[13px] sm:pl-6">#{pr.number}</TableCell>
                <TableCell className="font-medium">{pr.repositoryName}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {new Date(pr.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatLines(pr.size)}</TableCell>
                <TableCell
                  className={cn(
                    'pr-4 text-right font-medium tabular-nums sm:pr-6',
                    highlightOld && pr.ageHours > WEEK_HOURS && 'text-destructive',
                  )}
                >
                  {formatAge(pr.ageHours)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

function WorkflowTable({ data }: { data: BottlenecksResponse }) {
  return (
    <>
      <Hint>Branche principale, 4 dernières semaines ; les plus lentes d&apos;abord.</Hint>
      {data.slowWorkflows.length === 0 ? (
        <p className="border-t px-4 py-10 text-center text-sm text-muted-foreground sm:px-6">
          Aucun run de CI terminé sur la période.
        </p>
      ) : (
        <Table className="min-w-[560px]">
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="pl-4 text-muted-foreground sm:pl-6">Workflow</TableHead>
              <TableHead className="text-muted-foreground">Dépôt</TableHead>
              <TableHead className="text-right text-muted-foreground">Runs</TableHead>
              <TableHead className="text-right text-muted-foreground">Durée p90</TableHead>
              <TableHead className="pr-4 text-right text-muted-foreground sm:pr-6">
                Échecs
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slowWorkflows.map((w) => (
              <TableRow key={`${w.repositoryId}-${w.workflowName}`}>
                <TableCell className="max-w-64 truncate pl-4 sm:pl-6">{w.workflowName}</TableCell>
                <TableCell className="font-medium">{w.repositoryName}</TableCell>
                <TableCell className="text-right tabular-nums">{w.runs}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatValue(w.p90Minutes)} min
                </TableCell>
                <TableCell className="pr-4 text-right tabular-nums sm:pr-6">
                  {formatValue(w.failureRate)} %
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
