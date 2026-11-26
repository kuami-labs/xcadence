import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/logo';
import { ThemeButton } from '@/components/theme-toggle';

/** Connexion et installation : un en-tête simple, sans navigation. */
export default function FocusLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-muted">
      <header className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3 sm:px-8">
        <Link
          href="/"
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <ThemeButton />
      </header>
      {children}
    </div>
  );
}
