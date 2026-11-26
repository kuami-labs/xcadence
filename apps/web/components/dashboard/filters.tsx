'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const PERIOD_OPTIONS = [4, 12] as const;
const ALL = 'toute-l-organisation';

/** Filtres du tableau de bord : période et dépôt ; leur valeur vit dans l'URL (docs/04-FRONTEND.md). */
export function DashboardFilters({
  weeks,
  repo,
  repositories: tracked,
  allowOrganization = true,
  onChange,
}: {
  weeks: number;
  repo: string | null;
  /** Dépôts suivis. */
  repositories: { id: string; name: string }[];
  /** Choix « Toute l'organisation » proposé (la démo le retire s'il inclut un dépôt privé). */
  allowOrganization?: boolean;
  onChange: (next: { weeks?: number; repo?: string | null }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Période"
        className="inline-flex rounded-lg bg-secondary p-0.5 text-secondary-foreground"
      >
        {PERIOD_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={weeks === n}
            onClick={() => onChange({ weeks: n })}
            className="h-7 rounded-md px-3 text-[13px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-sm"
          >
            {n} semaines
          </button>
        ))}
      </div>
      <Select
        value={repo ?? ALL}
        onValueChange={(value) => onChange({ repo: value === ALL ? null : (value as string) })}
      >
        <SelectTrigger aria-label="Dépôt">
          <SelectValue>
            {(value: string) =>
              value === ALL
                ? "Toute l'organisation"
                : (tracked.find((r) => r.id === value)?.name ?? 'Dépôt')
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowOrganization && <SelectItem value={ALL}>Toute l&apos;organisation</SelectItem>}
          {tracked.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
