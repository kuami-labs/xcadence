'use client';

import { METRIC_KEYS, type MetricKey, type MetricValue } from '@xcadence/shared';
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  formatValue,
  summarize,
  trend,
  weeklySeries,
  type MetricDefinition,
  type Period,
} from '@/lib/metrics/summary';
import { cn } from '@/lib/utils';

/** Ce que mesure chaque métrique (docs/01-PRD.md), sous le titre du graphique. */
const HINTS: Partial<Record<MetricKey, string>> = {
  [METRIC_KEYS.deploymentFrequency]:
    'Déploiements réussis en production, par semaine. Plus haut, c’est mieux.',
  [METRIC_KEYS.leadTime]:
    'Du premier commit d’une PR à son déploiement en production, en heures. Plus bas, c’est mieux.',
  [METRIC_KEYS.changeFailureRate]:
    'Part des déploiements en échec ou annulés sous 48 h. Plus bas, c’est mieux.',
  [METRIC_KEYS.timeToRestore]:
    'D’un déploiement en échec au déploiement réussi suivant, en heures. Plus bas, c’est mieux.',
};

const weekLabel = (weekStart: string) => `${weekStart.slice(8, 10)}/${weekStart.slice(5, 7)}`;

/**
 * Les métriques en onglets (valeur sur la période, tendance) et, dessous, la métrique choisie
 * semaine par semaine : la période affichée en bleu, les semaines précédentes en clair.
 */
export function MetricsPanel({
  metrics,
  values,
  selected,
  onSelect,
  current,
  previous,
  chartPeriod,
  weeks,
}: {
  metrics: MetricDefinition[];
  values: MetricValue[];
  selected: MetricKey;
  onSelect: (key: MetricKey) => void;
  current: Period;
  previous: Period;
  chartPeriod: Period;
  weeks: number;
}) {
  const metric = metrics.find((m) => m.key === selected) ?? metrics[0];
  return (
    <Card className="gap-0 py-0">
      <div
        role="tablist"
        aria-label="Métrique affichée"
        className="grid grid-cols-2 gap-px border-b bg-border lg:grid-cols-4"
      >
        {metrics.map((m) => (
          <MetricTab
            key={m.key}
            metric={m}
            values={values}
            current={current}
            previous={previous}
            weeks={weeks}
            selected={m.key === metric.key}
            onSelect={() => onSelect(m.key)}
          />
        ))}
      </div>
      <div role="tabpanel" className="flex flex-col gap-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] font-semibold tracking-tight">{metric.label} par semaine</h2>
            <p className="text-sm text-muted-foreground">{HINTS[metric.key]}</p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Legend className="bg-bar-current">{weeks} dernières semaines</Legend>
            {weeks < 12 ? <Legend className="bg-bar-past">Semaines précédentes</Legend> : null}
          </div>
        </div>
        <WeeklyBars
          metric={metric}
          values={values}
          period={chartPeriod}
          firstCurrent={current.from}
        />
      </div>
    </Card>
  );
}

function Legend({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={cn('size-2.5 rounded-[3px]', className)} />
      {children}
    </span>
  );
}

function MetricTab({
  metric,
  values,
  current,
  previous,
  weeks,
  selected,
  onSelect,
}: {
  metric: MetricDefinition;
  values: MetricValue[];
  current: Period;
  previous: Period;
  weeks: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const now = summarize(values, metric, current, weeks);
  const before = summarize(values, metric, previous, weeks);
  const change = trend(now.value, before.value, metric.better);
  const Arrow =
    change === null || change.direction === 'stable'
      ? ArrowRightIcon
      : (now.value ?? 0) > (before.value ?? 0)
        ? ArrowUpRightIcon
        : ArrowDownRightIcon;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className="flex flex-col items-start gap-1.5 bg-muted px-4 py-4 text-left outline-none hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset aria-selected:bg-card aria-selected:shadow-[inset_0_2px_0_var(--primary)] sm:px-6 sm:py-5"
    >
      <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-[28px] leading-tight font-semibold tracking-tight tabular-nums">
          {formatValue(now.value)}
        </span>
        {now.value !== null ? (
          <span className="text-sm text-muted-foreground">{metric.unit}</span>
        ) : null}
      </span>
      <span className="flex flex-wrap items-center gap-x-1 text-xs">
        {change === null ? (
          <span className="text-muted-foreground">Pas de comparaison possible</span>
        ) : change.percent === null ? (
          <span className="text-muted-foreground">Période précédente à zéro</span>
        ) : (
          <>
            <Arrow
              aria-hidden
              className={cn(
                'size-3.5',
                change.direction === 'better' && 'text-chart-3',
                change.direction === 'worse' && 'text-destructive',
                change.direction === 'stable' && 'text-muted-foreground',
              )}
            />
            <span className="font-medium tabular-nums">
              {change.percent > 0 ? '+' : change.percent < 0 ? '−' : ''}
              {formatValue(Math.abs(change.percent))} %
            </span>
            <span className="text-muted-foreground">vs {weeks} sem. préc.</span>
            <span className="sr-only">
              {change.direction === 'better'
                ? ', en amélioration'
                : change.direction === 'worse'
                  ? ', en dégradation'
                  : ', stable'}
            </span>
          </>
        )}
      </span>
    </button>
  );
}

function WeeklyBars({
  metric,
  values,
  period,
  firstCurrent,
}: {
  metric: MetricDefinition;
  values: MetricValue[];
  period: Period;
  firstCurrent: string;
}) {
  const data = weeklySeries(values, metric, period).map((w) => ({
    week: weekLabel(w.weekStart),
    value: w.value === null ? null : Math.round(w.value * 10) / 10,
    current: w.weekStart >= firstCurrent,
  }));
  if (data.every((d) => d.value === null || d.value === 0)) {
    return (
      <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        Aucune donnée sur ces 12 semaines.
      </p>
    );
  }
  const config = {
    value: { label: metric.label, color: 'var(--bar-current)' },
  } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full sm:h-64">
      <BarChart data={data} margin={{ left: 0, right: 0, top: 8 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
          minTickGap={12}
          className="font-mono"
        />
        <YAxis width={36} tickLine={false} axisLine={false} className="font-mono" />
        <ChartTooltip
          cursor={{ fill: 'var(--muted)' }}
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `Semaine du ${String(label)}`}
              formatter={(value) => (
                <span className="font-medium tabular-nums">
                  {formatValue(Number(value))} {metric.unit}
                </span>
              )}
            />
          }
        />
        <Bar dataKey="value" radius={[6, 6, 2, 2]} maxBarSize={44}>
          {data.map((d) => (
            <Cell key={d.week} fill={d.current ? 'var(--bar-current)' : 'var(--bar-past)'} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
