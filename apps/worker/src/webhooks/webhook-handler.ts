/** Gestionnaire d'un type d'événement GitHub. Retourne true si l'événement a été traité. */
export interface WebhookHandler {
  handle(eventType: string, payload: unknown): Promise<boolean>;
}
