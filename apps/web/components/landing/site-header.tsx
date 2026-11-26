'use client';

import { MenuIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/logo';
import { ThemeButton } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const SECTIONS = [
  { id: 'metriques', label: 'Métriques' },
  { id: 'fonctionnement', label: 'Fonctionnement' },
  { id: 'principes', label: 'Principes' },
  { id: 'open-source', label: 'Open source' },
] as const;

/**
 * En-tête de la landing : transparent en haut de page, compact et flouté dès qu'on défile,
 * avec la section en cours mise en évidence ; menu repliable sur mobile.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      let current: string | null = null;
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) current = id;
      }
      setSection(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // Page ouverte déjà défilée (lien vers une section) : état calculé dès l'affichage.
    const frame = requestAnimationFrame(onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const solid = scrolled || open;
  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300 motion-reduce:transition-none',
        solid
          ? 'border-border bg-background/80 shadow-[0_1px_3px_0_rgb(0_0_0/0.06),0_8px_24px_-12px_rgb(0_0_0/0.12)] backdrop-blur-md backdrop-saturate-150'
          : 'border-transparent bg-transparent',
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 transition-[min-height] duration-300 motion-reduce:transition-none',
          solid ? 'min-h-14' : 'min-h-[72px]',
        )}
      >
        <Link
          href="/"
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={section === s.id ? 'location' : undefined}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=location]:bg-secondary aria-[current=location]:font-medium aria-[current=location]:text-foreground"
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeButton />
          {/* Les classes d'affichage des boutons l'emporteraient sur `hidden` : une enveloppe. */}
          <span className="hidden sm:contents">
            <Link
              href="/demo"
              className={buttonVariants({ variant: 'secondary', className: 'h-8 px-3' })}
            >
              Voir la démo
            </Link>
          </span>
          <Link href="/login" className={buttonVariants({ className: 'h-8 px-3' })}>
            Se connecter
          </Link>
          <span className="contents md:hidden">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="menu-sections"
              aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            >
              {open ? <XIcon /> : <MenuIcon />}
            </button>
          </span>
        </div>
      </div>
      {open ? (
        <nav
          id="menu-sections"
          aria-label="Sections"
          className="flex flex-col gap-0.5 border-t bg-background px-4 pt-2 pb-4 md:hidden"
        >
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-md px-2 text-[15px] hover:bg-secondary"
            >
              {s.label}
            </a>
          ))}
          <Link
            href="/demo"
            className={buttonVariants({ variant: 'secondary', className: 'mt-2 h-10' })}
          >
            Voir la démo
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
