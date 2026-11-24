import * as Sentry from '@sentry/nestjs';
import { SENTRY_DATA_COLLECTION, scrubSentryEvent } from '@xcadence/shared';

// Importé juste après load-env.ts. Sentry est optionnel : sans SENTRY_DSN (développement, tests,
// contributeurs), rien n'est initialisé ni envoyé.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    dataCollection: SENTRY_DATA_COLLECTION,
    beforeSend: (event) => scrubSentryEvent(event),
  });
}
