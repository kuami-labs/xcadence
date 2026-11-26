'use client';

import { useSearchParams } from 'next/navigation';

const MESSAGES: Record<string, string> = {
  connexion: 'La connexion avec GitHub a échoué ou a expiré. Recommencez.',
};

/** Message d'erreur renvoyé par l'API (?erreur=…) ; lu côté client pour garder la page statique. */
export function LoginError() {
  const erreur = useSearchParams().get('erreur');
  if (!erreur) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/50 px-3.5 py-3 text-sm text-destructive"
    >
      {MESSAGES[erreur] ?? MESSAGES.connexion}
    </p>
  );
}
