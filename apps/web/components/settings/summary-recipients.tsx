'use client';

import { XIcon } from 'lucide-react';
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
    <div>
      {recipients.isError ? (
        <p role="alert" className="px-5 py-4 text-sm text-destructive">
          Impossible de charger les destinataires.
        </p>
      ) : recipients.isPending ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">Chargement…</p>
      ) : recipients.data.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Aucun destinataire : le résumé reste visible sur le tableau de bord.
        </p>
      ) : (
        <ul className="divide-y">
          {recipients.data.map((recipient) => (
            <li
              key={recipient.id}
              className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/60"
            >
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground uppercase"
              >
                {recipient.email.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{recipient.email}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate(recipient.id)}
                aria-label={`Retirer ${recipient.email}`}
                title="Retirer"
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex flex-wrap gap-2 border-t bg-muted px-5 py-4">
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
          className="min-w-48 flex-1 bg-card"
        />
        <Button type="submit" disabled={add.isPending}>
          Ajouter
        </Button>
        {addError && (
          <p id="recipient-error" role="alert" className="w-full text-sm text-destructive">
            {addError}
          </p>
        )}
      </form>
    </div>
  );
}
