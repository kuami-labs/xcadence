import type { Fact } from './facts.js';
import { SYSTEM_PROMPT, userPrompt } from './prompt.js';
import { fallbackSummary } from './validate.js';

/** Fournisseur du résumé hebdomadaire (docs/02-STACK.md, ADR 0004) : modèle interchangeable. */
export interface SummaryProvider {
  /** Nom enregistré dans weekly_summaries.model. */
  readonly model: string;
  write(facts: Fact[]): Promise<string>;
}

/** Fournisseur factice : résumé fixe calculé à partir des faits ; aucune clé, aucun modèle (tests, CI). */
export class FakeSummaryProvider implements SummaryProvider {
  readonly model = 'fake';
  write(facts: Fact[]): Promise<string> {
    return Promise.resolve(fallbackSummary(facts));
  }
}

/**
 * Toute API compatible OpenAI (Ollama, Groq, OpenRouter, Gemini…) : POST {baseUrl}/chat/completions.
 * Le modèle ne reçoit que des métriques agrégées et n'a aucun outil (docs/08-SECURITE.md).
 */
export class OpenAiCompatibleProvider implements SummaryProvider {
  constructor(
    private readonly baseUrl: string,
    readonly model: string,
    private readonly apiKey: string | undefined,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async write(facts: Fact[]): Promise<string> {
    const res = await this.fetchFn(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt(facts) },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      // Jamais la clé dans le message : seulement le statut.
      throw new Error(`Fournisseur IA : réponse ${res.status}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? '';
  }
}

/** Fournisseur choisi par SUMMARY_PROVIDER (fake par défaut). */
export function createSummaryProvider(env: NodeJS.ProcessEnv = process.env): SummaryProvider {
  switch (env.SUMMARY_PROVIDER ?? 'fake') {
    case 'fake':
      return new FakeSummaryProvider();
    case 'openai':
    case 'ollama':
      if (!env.AI_BASE_URL || !env.AI_MODEL) {
        throw new Error('AI_BASE_URL et AI_MODEL sont requis pour SUMMARY_PROVIDER=openai');
      }
      return new OpenAiCompatibleProvider(env.AI_BASE_URL, env.AI_MODEL, env.AI_API_KEY);
    default:
      throw new Error(
        `SUMMARY_PROVIDER inconnu ou pas encore disponible : ${env.SUMMARY_PROVIDER}`,
      );
  }
}
