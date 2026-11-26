import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { loginUrl } from '@/lib/api/client';
import { LoginError } from './login-error';

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">XCadence</h1>
        <p className="mt-1 text-muted-foreground">Radar de santé d&apos;équipe tech.</p>
      </div>
      <Suspense>
        <LoginError />
      </Suspense>
      <Button nativeButton={false} render={<a href={loginUrl()} />}>
        Se connecter avec GitHub
      </Button>
    </main>
  );
}
