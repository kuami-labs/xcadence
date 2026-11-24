'use client';

import type { MetricValue } from '@xcadence/shared';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { MetricDefinition } from '@/lib/metrics/summary';

/** Courbe hebdomadaire d'une métrique (12 semaines). */
export function TrendChart({
  metric,
  values,
}: {
  metric: MetricDefinition;
  values: MetricValue[];
}) {
  const data = values
    .filter((v) => v.metricKey === metric.key)
    .map((v) => ({ week: v.weekStart.slice(5), value: Math.round(v.value * 10) / 10 }));
  const config = { value: { label: metric.label, color: 'var(--chart-1)' } } satisfies ChartConfig;
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune donnée sur la période.</p>;
  }
  return (
    <ChartContainer config={config} className="h-40 w-full">
      <LineChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} />
        <YAxis width={32} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={2} dot />
      </LineChart>
    </ChartContainer>
  );
}
