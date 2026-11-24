'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useAddSummaryRecipient,
  useRemoveSummaryRecipient,
  useSummaryRecipients,
} from '@/hooks/use-dashboard';
import { ApiError } from '@/lib/api/client';

/** Adresses qui reçoivent le résumé du lundi ; chaque email porte un lien de désinscription. */
export function SummaryRecipients({ orgId }: { orgId: string }) {
  const recipients = useSummaryRecipients(orgId);
  const add = useAddSummaryRecipient(orgId);
  const remove = useRemoveSummaryRecipient(orgId);
  const [email, setEmail] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    add.mutate(email, { onSuccess: () => setEmail('') });
  };

  const addError =
    add.error instanceof ApiError && add.error.status === 409
      ? 'Cette adresse reçoit déjà le résumé.'
      : add.error instanceof ApiError && add.error.status === 400
        ? 'Adresse email invalide.'
        : add.isError
          ? "Impossible d'ajouter l'adresse. Réessayez."
          : null;

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="recipient-email" className="sr-only">
          Adresse email
        </label>
        <Input
          id="recipient-email"
          type="email"
          required
          maxLength={254}
          placeholder="cto@exemple.fr"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={addError ? true : undefined}
          aria-describedby={addError ? 'recipient-error' : undefined}
        />
        <Button type="submit" disabled={add.isPending}>
          Ajouter
        </Button>
      </form>
      {addError && (
        <p id="recipient-error" role="alert" className="text-sm text-destructive">
          {addError}
        </p>
      )}
      {recipients.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Impossible de charger les destinataires.
        </p>
      ) : recipients.isPending ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : recipients.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun destinataire pour l&apos;instant.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {recipients.data.map((recipient) => (
            <li key={recipient.id} className="flex items-center justify-between gap-4 px-3 py-2">
              <span className="truncate text-sm">{recipient.email}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate(recipient.id)}
                aria-label={`Retirer ${recipient.email}`}
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
