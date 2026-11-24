import { describe, expect, it } from 'vitest';
import {
  LOG_CENSOR,
  LOG_REDACT_PATHS,
  SENTRY_DATA_COLLECTION,
  pathOnly,
  pinoOptions,
  scrubSentryEvent,
} from '../src/logging.js';

describe('journalisation', () => {
  it('JSON en production, lisible en développement, muet en test', () => {
    expect(pinoOptions({ NODE_ENV: 'production' })).toMatchObject({
      level: 'info',
      transport: undefined,
    });
    expect(pinoOptions({ LOG_FORMAT: 'json' }).transport).toBeUndefined();
    expect(pinoOptions({}).transport).toMatchObject({ target: 'pino-pretty' });
    expect(pinoOptions({ NODE_ENV: 'test' })).toMatchObject({
      level: 'silent',
      transport: undefined,
    });
    expect(pinoOptions({ NODE_ENV: 'test', LOG_LEVEL: 'debug' }).level).toBe('debug');
  });

  it('masque Authorization, cookies et signature des webhooks', () => {
    const { redact } = pinoOptions({});
    expect(redact.censor).toBe(LOG_CENSOR);
    expect(redact.paths).toEqual(LOG_REDACT_PATHS);
    expect(LOG_REDACT_PATHS).toEqual(
      expect.arrayContaining(['req.headers.authorization', 'req.headers.cookie', '*.payload']),
    );
  });

  it('retire la query des URL (jetons, codes OAuth)', () => {
    expect(pathOnly('/summary-recipients/unsubscribe?token=secret')).toBe(
      '/summary-recipients/unsubscribe',
    );
    expect(pathOnly('/health')).toBe('/health');
    expect(pathOnly(undefined)).toBe('');
  });

  it('ne laisse partir vers Sentry ni en-têtes, ni cookies, ni query, ni corps', () => {
    const event = scrubSentryEvent({
      request: {
        url: 'http://api/auth/github/callback?code=secret',
        headers: { authorization: 'Bearer secret' },
        cookies: { xc_session: 'secret' },
        query_string: 'code=secret',
        data: { payload: 'secret' },
      },
    });
    expect(event).toEqual({ request: { url: 'http://api/auth/github/callback' } });
    expect(scrubSentryEvent({ request: { headers: { cookie: 'x' } } })).toEqual({ request: {} });
    expect(scrubSentryEvent({})).toEqual({});
  });

  it('coupe toute collecte de données par Sentry, arguments des jobs compris', () => {
    expect(SENTRY_DATA_COLLECTION).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      queues: false,
      stackFrameVariables: false,
    });
  });
});
