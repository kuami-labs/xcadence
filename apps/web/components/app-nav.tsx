'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/dashboard', label: "Vue d'ensemble" },
  { href: '/bottlenecks', label: 'Goulots' },
  { href: '/settings', label: 'Paramètres' },
] as const;

/** Navigation entre les pages ; garde l'organisation choisie (?org=). */
export function AppNav() {
  const pathname = usePathname();
  const org = useSearchParams().get('org');
  if (pathname === '/login') return null;
  return (
    <nav className="flex gap-4 border-b px-8 py-3 text-sm">
      <span className="font-semibold">XCadence</span>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={org ? `${link.href}?org=${org}` : link.href}
          aria-current={pathname === link.href ? 'page' : undefined}
          className={cn(
            'text-muted-foreground hover:text-foreground',
            pathname === link.href && 'font-medium text-foreground',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
