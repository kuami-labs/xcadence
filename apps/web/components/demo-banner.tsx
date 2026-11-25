import { loginUrl } from '@/lib/api/client';

/** Rappel affiché sur les pages de la démo publique. */
export function DemoBanner({ organization }: { organization: string }) {
  return (
    <p className="mx-auto mt-6 w-full max-w-5xl rounded-md border px-4 py-3 text-sm text-muted-foreground">
      Démo publique en lecture seule : dépôts publics de <strong>{organization}</strong>, suivis par
      XCadence. Pour votre équipe,{' '}
      <a className="underline" href={loginUrl()}>
        connectez-vous avec GitHub
      </a>
      .
    </p>
  );
}
