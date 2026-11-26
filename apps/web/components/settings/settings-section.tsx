import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Section de réglages : titre et explication à gauche, réglage dans une carte à droite. */
export function SettingsSection({
  title,
  description,
  children,
  first = false,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
  first?: boolean;
}) {
  return (
    <section
      className={cn(
        'grid gap-4 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10',
        first ? 'pt-2' : 'border-t',
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Card className="gap-0 overflow-hidden py-0">{children}</Card>
    </section>
  );
}
