'use client';

import type { RecentPullRequest } from '@xcadence/shared';
import { ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MetricFigure, WeeklyBars } from '@/components/dashboard/metrics-panel';
import { PageBody, PageHeader, PageState } from '@/components/page-header';
import { ProductionEnvironments } from '@/components/repository/production-environments';
import { Card } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

const WEEKS = 4;

const STATE: Record<RecentPullRequest['state'] | 'draft', { label: string; className: string }> = {
  merged: { label: 'fusionnée', className: 'bg-accent text-accent-foreground' },
  open: { label: 'ouverte', className: 'bg-secondary text-secondary-foreground' },
  draft: { label: 'brouillon', className: 'border text-muted-foreground' },
  closed: { label: 'fermée', className: 'border text-muted-foreground' },
};

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
    return (
      <PageBody>
        <PageState>Chargement…</PageState>
      </PageBody>
    );
  if (metrics.isError || pullRequests.isError) {
    return (
      <PageBody>
        <PageState tone="error">Dépôt introuvable, ou API injoignable.</PageState>
      </PageBody>
    );
  }
  const values = metrics.data?.metrics ?? [];
  const groups = [
    { title: 'DORA', metrics: DORA_CARDS },
    { title: 'Flux', metrics: FLOW_CARDS },
  ];
  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title={
          <span className="flex flex-col gap-0.5">
            <nav
              aria-label="Fil d'Ariane"
              className="flex items-center gap-1 text-[13px] font-normal tracking-normal text-muted-foreground"
            >
              <Link href={`/dashboard?org=${orgId}`} className="hover:text-foreground">
                Vue d&apos;ensemble
              </Link>
              <ChevronRightIcon className="size-3.5" aria-hidden />
              <span>Dépôts</span>
            </nav>
            <span className="flex flex-wrap items-baseline gap-x-3">
              {repository?.name ?? 'Dépôt'}
              <span className="text-sm font-normal tracking-normal text-muted-foreground">
                {repository?.defaultBranch ? (
                  <>
                    branche <span className="font-mono">{repository.defaultBranch}</span>
                    {repository.isTracked ? ' · suivi' : ' · non suivi'}
                  </>
                ) : (
                  'Pas encore importé'
                )}
              </span>
            </span>
          </span>
        }
      />
      <PageBody>
        <Card className="gap-0 overflow-hidden py-0">
          {groups.map((group, i) => (
            <section key={group.title} className={cn(i > 0 && 'border-t')}>
              <div className="flex items-baseline justify-between gap-3 px-4 pt-4 sm:px-6">
                <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  {group.title}
                </h2>
                <span className="text-xs text-muted-foreground">{WEEKS} dernières semaines</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-px border-t bg-border lg:grid-cols-4">
                {group.metrics.map((metric) => (
                  <div key={metric.key} className="flex flex-col gap-1.5 bg-card px-4 py-4 sm:px-6">
                    <MetricFigure
                      metric={metric}
                      values={values}
                      current={current}
                      previous={previous}
                      weeks={WEEKS}
                      size="md"
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </Card>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card className="gap-4 px-4 sm:px-6">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[15px] font-semibold tracking-tight">Durée de la CI</h2>
              <p className="text-sm text-muted-foreground">
                Médiane par semaine sur la branche principale, en minutes.
              </p>
            </div>
            <WeeklyBars
              metric={FLOW_CARDS[2]}
              values={values}
              period={chartPeriod}
              firstCurrent={current.from}
              className="h-52 sm:h-56"
            />
          </Card>
          {orgId && repository ? (
            <Card className="gap-4 px-4 sm:px-6">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-[15px] font-semibold tracking-tight">
                  Environnements de production
                </h2>
                <p className="text-sm text-muted-foreground">
                  Quels déploiements comptent comme une mise en production.
                </p>
              </div>
              <ProductionEnvironments
                orgId={orgId}
                repositoryId={repository.id}
                rule={repository.deployRule}
              />
            </Card>
          ) : null}
        </div>

        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex items-baseline justify-between gap-3 px-4 py-4 sm:px-6">
            <h2 className="text-[15px] font-semibold tracking-tight">PR récentes</h2>
          </div>
          {!pullRequests.data ? (
            <p className="border-t px-4 py-8 text-sm text-muted-foreground sm:px-6">Chargement…</p>
          ) : pullRequests.data.length === 0 ? (
            <p className="border-t px-4 py-8 text-sm text-muted-foreground sm:px-6">
              Aucune PR importée.
            </p>
          ) : (
            <Table className="min-w-[560px]">
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="pl-4 text-muted-foreground sm:pl-6">PR</TableHead>
                  <TableHead className="text-muted-foreground">État</TableHead>
                  <TableHead className="text-right text-muted-foreground">Ouverte le</TableHead>
                  <TableHead className="text-right text-muted-foreground">Première revue</TableHead>
                  <TableHead className="pr-4 text-right text-muted-foreground sm:pr-6">
                    Taille
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pullRequests.data.map((pr) => {
                  const state = STATE[pr.isDraft && pr.state === 'open' ? 'draft' : pr.state];
                  return (
                    <TableRow key={pr.number}>
                      <TableCell className="pl-4 font-mono text-[13px] sm:pl-6">
                        #{pr.number}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            state.className,
                          )}
                        >
                          {state.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {new Date(pr.createdAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {pr.timeToFirstReviewHours === null
                          ? '—'
                          : `${formatValue(pr.timeToFirstReviewHours)} h`}
                      </TableCell>
                      <TableCell className="pr-4 text-right tabular-nums sm:pr-6">
                        {formatLines(pr.size)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </PageBody>
    </main>
  );
}
