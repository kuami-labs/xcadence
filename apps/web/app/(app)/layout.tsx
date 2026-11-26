import { Suspense, type ReactNode } from 'react';
import { MobileBar, Sidebar } from '@/components/shell/sidebar';

/** Pages de l'application et de la démo : barre latérale, menu en tiroir sur mobile. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh">
      {/* useSearchParams (?org=) : rendu côté client, la page reste statique. */}
      <Suspense>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense>
          <MobileBar />
        </Suspense>
        {children}
      </div>
    </div>
  );
}
