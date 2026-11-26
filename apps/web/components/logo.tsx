import { cn } from '@/lib/utils';

/**
 * Symbole XCadence (docs/brand) : deux chevrons de code qui se font face et forment le X.
 * Version « petite taille » (chevrons plus écartés), adaptée aux 16 à 48 px de l'interface.
 * Couleurs : --logo-1 (chevron de gauche) et --logo-2 (de droite), en clair et en sombre.
 */
export function LogoSymbol({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="20 20 216 216"
      aria-hidden
      className={cn('shrink-0', className)}
    >
      <path
        className="fill-logo-1"
        d="M61.28 35.47 L113.28 115.47 A23 23 0 0 1 113.28 140.53 L61.28 220.53 A23 23 0 0 1 22.72 195.47 L66.57 128 L22.72 60.53 A23 23 0 0 1 61.28 35.47 Z"
      />
      <path
        className="fill-logo-2"
        d="M194.72 35.47 L142.72 115.47 A23 23 0 0 0 142.72 140.53 L194.72 220.53 A23 23 0 0 0 233.28 195.47 L189.43 128 L233.28 60.53 A23 23 0 0 0 194.72 35.47 Z"
      />
    </svg>
  );
}

/** Logo de l'interface : symbole et nom en Inter 700 (le nom reste du texte, lisible et sélectionnable). */
export function Logo({
  className,
  withName = true,
  size = 24,
}: {
  className?: string;
  withName?: boolean;
  size?: number;
}) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoSymbol size={size} />
      {withName && (
        <span className="text-[15px] font-bold tracking-[-0.035em] text-(--logo-word)">
          XCadence
        </span>
      )}
    </span>
  );
}
