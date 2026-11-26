import type { MetricValue } from '@xcadence/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatValue,
  summarize,
  trend,
  type MetricDefinition,
  type Period,
} from '@/lib/metrics/summary';

const DIRECTION_STYLE = {
  better: 'text-chart-3',
  worse: 'text-destructive',
  stable: 'text-muted-foreground',
} as const;

/** Carte d'une métrique : valeur sur la période et tendance par rapport à la période précédente. */
export function MetricCard({
  metric,
  values,
  current,
  previous,
  weeks,
}: {
  metric: MetricDefinition;
  values: MetricValue[];
  current: Period;
  previous: Period;
  weeks: number;
}) {
  const now = summarize(values, metric, current, weeks);
  const before = summarize(values, metric, previous, weeks);
  const change = trend(now.value, before.value, metric.better);
  return (
    <Card>
      <CardHeader>
        <CardDescription>{metric.label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">
          {formatValue(now.value)}
          {now.value !== null ? (
            <span className="ml-1 text-sm font-normal text-muted-foreground">{metric.unit}</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <p className="text-muted-foreground">
          {weeks} dernières semaines · {now.sampleSize} élément{now.sampleSize > 1 ? 's' : ''}
        </p>
        <p className={change ? DIRECTION_STYLE[change.direction] : 'text-muted-foreground'}>
          {change === null
            ? 'Pas de comparaison possible'
            : change.percent === null
              ? 'Période précédente à zéro'
              : `${change.percent > 0 ? '+' : ''}${formatValue(change.percent)} % vs période précédente`}
        </p>
      </CardContent>
    </Card>
  );
}
