/**
 * Files BullMQ partagées entre l'API (qui publie) et le worker (qui traite).
 * Jobs : docs/03-BACKEND.md, section « Jobs BullMQ ».
 */
export const QUEUES = {
  /** Événements GitHub reçus par l'API, traités par le worker. */
  webhooks: 'webhook-events',
  /** Imports depuis l'API GitHub. */
  sync: 'sync',
  /** Recalcul des métriques hebdomadaires. */
  metrics: 'metrics',
  /** Résumé hebdomadaire et alertes. */
  insights: 'insights',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export const JOBS = {
  processWebhookEvent: 'process-webhook-event',
  backfillRepository: 'backfill-repository',
  recomputeWeeklyMetrics: 'recompute-weekly-metrics',
  generateWeeklySummary: 'generate-weekly-summary',
} as const;

/** process-webhook-event : l'événement brut est déjà enregistré dans webhook_events. */
export interface ProcessWebhookEventJob {
  webhookEventId: string;
}

/** backfill-repository : import des 90 derniers jours d'un dépôt suivi. */
export interface BackfillRepositoryJob {
  repositoryId: string;
}

/** recompute-weekly-metrics : une organisation, ou toutes (passage nocturne) si absent. */
export interface RecomputeWeeklyMetricsJob {
  organizationId?: string;
}

/** generate-weekly-summary : une organisation, ou toutes (passage du lundi) si absent. */
export interface GenerateWeeklySummaryJob {
  organizationId?: string;
}

/** Options de connexion Redis à partir de REDIS_URL (redis://[user:mot-de-passe@]hôte:port[/base]). */
export function redisConnection(url = process.env.REDIS_URL ?? 'redis://localhost:6379') {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  };
}
