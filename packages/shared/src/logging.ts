/**
 * Règles de journalisation communes à l'API et au worker (docs/08-SECURITE.md) :
 * jamais de jeton, d'en-tête Authorization ni de payload complet dans les logs ou dans Sentry.
 */
export const LOG_CENSOR = '[masqué]';

/** Chemins masqués par pino, en plus des sérialiseurs qui ne gardent que l'utile. */
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-hub-signature-256"]',
  'res.headers["set-cookie"]',
  '*.authorization',
  '*.cookie',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.privateKey',
  '*.apiKey',
  '*.secret',
  '*.payload',
];

export interface LogEnv {
  NODE_ENV?: string;
  LOG_LEVEL?: string;
  LOG_FORMAT?: string;
}

/**
 * Options pino : JSON en production et sur demande (LOG_FORMAT=json), lisible en développement
 * (pino-pretty, dépendance de dev), muet pendant les tests sauf LOG_LEVEL explicite.
 */
export function pinoOptions(env: LogEnv = process.env) {
  const quiet = env.NODE_ENV === 'test';
  const json = env.NODE_ENV === 'production' || env.LOG_FORMAT === 'json' || quiet;
  return {
    level: env.LOG_LEVEL ?? (quiet ? 'silent' : 'info'),
    redact: { paths: LOG_REDACT_PATHS, censor: LOG_CENSOR },
    transport: json
      ? undefined
      : { target: 'pino-pretty', options: { singleLine: true, ignore: 'pid,hostname' } },
  };
}

/** Chemin sans la query : jetons de désinscription et codes OAuth n'entrent jamais dans les logs. */
export function pathOnly(url: string | undefined): string {
  return (url ?? '').split('?')[0];
}

/**
 * Collecte Sentry (option `dataCollection` de Sentry 11, qui collecte tout par défaut) :
 * rien sur l'utilisateur, ni cookies, en-têtes, query, corps, requêtes SQL, arguments des jobs
 * (payloads de webhooks, adresses email) ni variables locales. Seules l'erreur et sa pile partent.
 */
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
  genAI: { inputs: false, outputs: false },
  mcp: { inputs: false, outputs: false },
  graphQL: { document: false, variables: false },
};

/** Partie d'un événement Sentry qui peut contenir des données de la requête. */
export interface SentryLikeEvent {
  request?: {
    url?: string;
    headers?: Record<string, string>;
    cookies?: unknown;
    query_string?: unknown;
    data?: unknown;
  };
}

/** Nettoie un événement avant envoi à Sentry : ni en-têtes, ni cookies, ni query, ni corps. */
export function scrubSentryEvent<T extends SentryLikeEvent>(event: T): T {
  if (event.request) {
    const { url } = event.request;
    event.request = url ? { url: pathOnly(url) } : {};
  }
  return event;
}
