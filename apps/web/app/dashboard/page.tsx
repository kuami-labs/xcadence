import { Suspense } from 'react';
import { Dashboard } from './dashboard';

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Chargement…</p>}>
      <Dashboard />
    </Suspense>
  );
}
