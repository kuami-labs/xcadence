import { cn } from '@/lib/utils';

/** Marque XCadence : trois barres qui montent, sur le bleu du thème. */
export function Logo({ className, withName = true }: { className?: string; withName?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="shrink-0">
        <rect width="24" height="24" rx="6" className="fill-primary" />
        <path
          d="M6 15.5h2.5V18H6zM10.75 11h2.5v7h-2.5zM15.5 6.5H18V18h-2.5z"
          className="fill-primary-foreground"
        />
      </svg>
      {withName && <span className="text-[15px] font-semibold tracking-tight">XCadence</span>}
    </span>
  );
}
