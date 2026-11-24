'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useMe } from './use-me';

/**
 * Utilisateur connecté et organisation affichée (?org=, la première par défaut).
 * Sans session, renvoie vers /login.
 */
export function useOrganization() {
  const router = useRouter();
  const params = useSearchParams();
  const me = useMe();
  useEffect(() => {
    if (me.data === null) router.replace('/login');
  }, [me.data, router]);
  const orgId = params.get('org') ?? me.data?.organizations[0]?.id;
  const organization = me.data?.organizations.find((o) => o.id === orgId);
  return { me, orgId: organization?.id, organization };
}
