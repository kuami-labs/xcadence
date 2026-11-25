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
    <div className="flex flex-wrap gap-2">
      <Select value={String(weeks)} onValueChange={(value) => onChange({ weeks: Number(value) })}>
        <SelectTrigger aria-label="Période">
          <SelectValue>{(value: string) => `${value} dernières semaines`}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n} dernières semaines
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
