import { Suspense, type ReactNode } from 'react';
import { AfterHydration } from './after-hydration';

/**
 * Page lue depuis l'API avec la session du navigateur : le serveur rend l'état de chargement,
 * le contenu s'affiche après l'hydratation (voir AfterHydration).
 */
export function ClientPage({ children }: { children: ReactNode }) {
  const loading = <p className="px-4 py-6 text-sm text-muted-foreground sm:px-8">Chargement…</p>;
  return (
    <Suspense fallback={loading}>
      <AfterHydration fallback={loading}>{children}</AfterHydration>
    </Suspense>
  );
}
