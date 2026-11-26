import type { BottlenecksResponse } from '@xcadence/shared';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { formatValue } from '@/lib/metrics/summary';

/** Les goulots en bref, sur le tableau de bord ; le détail est sur la page Goulots. */
export function BottlenecksSummary({
  data,
  href,
}: {
  data: BottlenecksResponse | undefined;
  href: string;
}) {
  const slowest = data?.slowWorkflows[0];
  return (
    <Card className="gap-2 px-6">
      <div className="flex items-baseline justify-between gap-2 pb-1">
        <h2 className="text-[15px] font-semibold tracking-tight">Goulots</h2>
        <Link
          href={href}
          className="rounded-sm text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Tout voir
        </Link>
      </div>
      <Row
        label="En attente de revue"
        hint="plus de 48 h, hors brouillons"
        value={data ? String(data.awaitingReview.length) : '…'}
      />
      <Row
        label="PR anciennes"
        hint="ouvertes depuis plus de 7 jours"
        value={data ? String(data.oldPullRequests.length) : '…'}
      />
      <Row
        label="CI la plus lente"
        hint={slowest ? `${slowest.repositoryName} · p90 sur la branche principale` : 'aucun run'}
        value={slowest ? formatValue(slowest.p90Minutes) : data ? '—' : '…'}
        unit={slowest ? 'min' : undefined}
      />
    </Card>
  );
}

function Row({
  label,
  hint,
  value,
  unit,
}: {
  label: string;
  hint: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t py-3">
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium">{label}</span>
        <span className="truncate text-xs text-muted-foreground">{hint}</span>
      </span>
      <span className="shrink-0 text-[22px] font-semibold tracking-tight tabular-nums">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
        ) : null}
      </span>
    </div>
  );
}
