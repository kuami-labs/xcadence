import { EyeIcon } from 'lucide-react';
import { loginUrl } from '@/lib/api/client';

/** Rappel affiché sur les pages de la démo publique. */
export function DemoBanner({ organization }: { organization: string }) {
  return (
    <p className="flex items-start gap-2.5 rounded-lg bg-accent px-4 dark:bg-accent/20 py-3 text-sm text-accent-foreground">
      <EyeIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        Démo publique en lecture seule : dépôts publics de <strong>{organization}</strong>, suivis
        par XCadence. Pour votre équipe,{' '}
        <a className="font-medium underline underline-offset-2" href={loginUrl()}>
          connectez-vous avec GitHub
        </a>
        .
      </span>
    </p>
  );
}
