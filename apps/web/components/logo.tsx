import { cn } from '@/lib/utils';

/**
 * Symbole XCadence (docs/brand) : quatre facettes, les 4 métriques DORA, éclairées du haut ;
 * le creux qui les sépare dessine le X, la facette de droite le C. Version « petite taille »
 * (trouée plus large), adaptée aux 16 à 48 px de l'interface. Couleurs : --logo-1 à --logo-4.
 */
export function LogoSymbol({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="16 16 224 224"
      aria-hidden
      className={cn('shrink-0', className)}
    >
      <path
        className="fill-logo-1"
        d="M128 105.37 L45.37 22.74 A56 56 0 0 1 72 16 L184 16 A56 56 0 0 1 210.63 22.74 Z"
      />
      <path
        className="fill-logo-2"
        d="M158.37 120.26 L233.26 45.37 A56 56 0 0 1 240 72 L240 78 A50 50 0 0 0 240 178 L240 184 A56 56 0 0 1 233.26 210.63 L158.37 135.74 A82 82 0 0 1 158.37 120.26 Z"
      />
      <path
        className="fill-logo-3"
        d="M128 150.63 L210.63 233.26 A56 56 0 0 1 184 240 L72 240 A56 56 0 0 1 45.37 233.26 Z"
      />
      <path
        className="fill-logo-4"
        d="M105.37 128 L22.74 210.63 A56 56 0 0 1 16 184 L16 72 A56 56 0 0 1 22.74 45.37 Z"
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
