'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useMe } from '@/hooks/use-me';

/** Tableau de bord : première version (utilisateur et organisations) ; les métriques arrivent avec #48. */
export default function DashboardPage() {
  const router = useRouter();
  const { data: me, isPending, isError } = useMe();

  useEffect(() => {
    if (me === null) router.replace('/login');
  }, [me, router]);

  if (isPending || me === null) {
    return <p className="p-8 text-muted-foreground">Chargement…</p>;
  }
  if (isError) {
    return (
      <p role="alert" className="p-8 text-destructive">
        Impossible de joindre l&apos;API. Réessayez dans un instant.
      </p>
    );
  }
  return (
    <main className="mx-auto w-full max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      <p className="mt-1 text-muted-foreground">Connecté en tant que {me.user.login}.</p>
      <h2 className="mt-6 font-medium">Organisations</h2>
      {me.organizations.length === 0 ? (
        <p className="text-muted-foreground">Aucune organisation : installez la GitHub App.</p>
      ) : (
        <ul className="mt-2 list-disc pl-6">
          {me.organizations.map((org) => (
            <li key={org.id}>{org.name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
