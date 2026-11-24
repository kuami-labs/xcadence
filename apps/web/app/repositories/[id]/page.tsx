import { Suspense } from 'react';
import { Repository } from './repository';

export default function RepositoryPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Chargement…</p>}>
      <Repository />
    </Suspense>
  );
}
