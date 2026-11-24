/** Réponse de GET /health, partagée entre l'API et le front. */
export interface HealthResponse {
  status: 'ok';
}

export * from './queues.js';
export * from './repositories.js';
export * from './metrics.js';
export * from './dashboard.js';
