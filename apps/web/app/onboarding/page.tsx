import { Suspense } from 'react';
import { Onboarding } from './onboarding';

export default function OnboardingPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Chargement…</p>}>
      <Onboarding />
    </Suspense>
  );
}
