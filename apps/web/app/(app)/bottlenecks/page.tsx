import { Suspense } from 'react';
import { Bottlenecks } from './bottlenecks';

export default function BottlenecksPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Chargement…</p>}>
      <Bottlenecks />
    </Suspense>
  );
}
