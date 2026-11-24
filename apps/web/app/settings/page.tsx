import { Suspense } from 'react';
import { Settings } from './settings';

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Chargement…</p>}>
      <Settings />
    </Suspense>
  );
}
