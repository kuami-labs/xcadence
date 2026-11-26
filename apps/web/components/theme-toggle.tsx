'use client';

import { MoonIcon, SunIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/lib/theme';

/** Bouton lune / soleil, pour les en-têtes sans barre latérale. */
export function ThemeButton() {
  const { dark, toggle } = useTheme();
  const label = dark ? 'Passer en thème clair' : 'Passer en thème sombre';
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label}>
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}

/** Interrupteur « Thème sombre », pour la barre latérale. */
export function ThemeSwitch() {
  const { dark, toggle } = useTheme();
  return (
    <label className="flex min-h-9 cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 text-sm hover:bg-secondary">
      <span className="flex items-center gap-2.5">
        <MoonIcon className="size-4" aria-hidden />
        Thème sombre
      </span>
      <Switch size="sm" checked={dark} onCheckedChange={toggle} />
    </label>
  );
}
