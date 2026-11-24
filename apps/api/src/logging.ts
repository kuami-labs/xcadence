import type { IncomingMessage } from 'node:http';
import { pathOnly, pinoOptions, type LogEnv } from '@xcadence/shared';
import type { Params } from 'nestjs-pino';
import type { DestinationStream } from 'pino';

/**
 * Logs HTTP de l'API : une ligne JSON par requête avec méthode, chemin et statut.
 * Les en-têtes (Authorization, cookies, signature des webhooks), la query et le corps
 * ne sont jamais journalisés.
 */
export function httpLoggerParams(env: LogEnv = process.env, stream?: DestinationStream): Params {
  const options = {
    ...pinoOptions(env),
    autoLogging: { ignore: (req: IncomingMessage) => pathOnly(req.url) === '/health' },
    serializers: {
      req: (req: { id?: unknown; method?: string; url?: string }) => ({
        id: req.id,
        method: req.method,
        url: pathOnly(req.url),
      }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
    },
  };
  return { pinoHttp: stream ? [options, stream] : options };
}
