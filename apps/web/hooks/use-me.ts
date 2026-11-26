'use client';

import { useQuery } from '@tanstack/react-query';
import type { MeResponse } from '@xcadence/shared';
import { ApiError, apiFetch } from '@/lib/api/client';

/** Utilisateur connecté ; `null` sans session (401). */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await apiFetch<MeResponse>('/auth/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
  });
}
