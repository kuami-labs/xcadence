import { Suspense } from 'react';
import { DemoDashboard } from './demo-dashboard';

export default function DemoPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Chargement…</p>}>
      <DemoDashboard />
    </Suspense>
  );
}
