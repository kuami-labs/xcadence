'use client';

import { useSyncExternalStore } from 'react';
import { THEME_KEY } from './theme-script';

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains('dark');

/** Thème affiché et bascule ; le choix est retenu dans le navigateur. */
export function useTheme() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const setDark = (next: boolean) => {
    const root = document.documentElement;
    root.classList.toggle('dark', next);
    root.style.colorScheme = next ? 'dark' : 'light';
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      // Stockage indisponible (navigation privée) : le thème change sans être retenu.
    }
  };
  return { dark, toggle: () => setDark(!dark) };
}
