'use client';

import { useSyncExternalStore, type ReactNode } from 'react';

const subscribe = () => () => {};

/**
 * Affiche `children` seulement une fois l'hydratation terminée. Les données de session viennent
 * du navigateur (cookie) : sans cela, une requête partagée (l'utilisateur, lu aussi par la barre
 * latérale) peut se terminer avant l'hydratation d'une autre partie de la page, qui ne correspond
 * plus au HTML du serveur.
 */
export function AfterHydration({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return hydrated ? children : fallback;
}
