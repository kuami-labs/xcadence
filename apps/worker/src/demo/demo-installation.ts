/** Identifiant GitHub réservé à l'organisation de démo : aucun compte GitHub n'a l'identifiant 0. */
export const DEMO_GITHUB_ORG_ID = 0n;
export const DEMO_ORGANIZATION_NAME = 'Démo XCadence';

/**
 * Installation de la GitHub App dont le jeton lit les dépôts publics de la démo (spike #66) ;
 * null si DEMO_INSTALLATION_ID est absent ou invalide : la démo est alors désactivée.
 */
export function demoInstallationId(env: NodeJS.ProcessEnv = process.env): bigint | null {
  const value = env.DEMO_INSTALLATION_ID?.trim();
  return value && /^[1-9]\d*$/.test(value) ? BigInt(value) : null;
}
