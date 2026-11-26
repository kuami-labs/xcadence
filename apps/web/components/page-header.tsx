import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** En-tête de page : titre, contexte et actions (filtres), séparé du contenu par un trait. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-8">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Contenu de page, centré, avec les marges du thème. */
export function PageBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-8 sm:py-7',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Message d'état (chargement, vide, erreur) à la place d'un contenu. */
export function PageState({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'muted' | 'error';
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : undefined}
      className={cn(
        'rounded-xl border border-dashed px-5 py-10 text-center text-sm',
        tone === 'error' ? 'border-destructive/50 text-destructive' : 'text-muted-foreground',
      )}
    >
      {children}
    </p>
  );
}
