import { METRIC_KEYS } from '@xcadence/shared';
import type { Fact } from './facts.js';
import {
  FakeSummaryProvider,
  OpenAiCompatibleProvider,
  createSummaryProvider,
} from './summary-provider.js';

const facts: Fact[] = [
  {
    metricKey: METRIC_KEYS.deploymentFrequency,
    label: 'déploiements en production',
    unit: '',
    value: 6,
    previous: 4,
    changePercent: 50,
  },
];

describe('fournisseurs du résumé', () => {
  it('fournisseur factice : résumé fixe, sans réseau', async () => {
    await expect(new FakeSummaryProvider().write(facts)).resolves.toBe(
      'Déploiements en production : 6 (+50 %).',
    );
  });

  it("API compatible OpenAI : n'envoie que les faits, avec la clé en en-tête", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ choices: [{ message: { content: '6 déploiements.' } }] }));
    const provider = new OpenAiCompatibleProvider(
      'https://ia.example/v1/',
      'modele',
      'cle-secrete',
      fetchMock,
    );
    await expect(provider.write(facts)).resolves.toBe('6 déploiements.');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://ia.example/v1/chat/completions');
    expect(init.headers.authorization).toBe('Bearer cle-secrete');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('modele');
    expect(body.messages[1].content).toContain('<donnees>');
    expect(body).not.toHaveProperty('tools');
  });

  it('fonctionne sans clé (Ollama) et accepte une réponse vide', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({}));
    const provider = new OpenAiCompatibleProvider(
      'http://ollama:11434/v1',
      'llama3.2:1b',
      undefined,
      fetchMock,
    );
    await expect(provider.write(facts)).resolves.toBe('');
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('authorization');
  });

  it('signale une erreur sans exposer la clé', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('quota', { status: 429 }));
    const provider = new OpenAiCompatibleProvider(
      'https://ia.example/v1',
      'm',
      'cle-secrete',
      fetchMock,
    );
    await expect(provider.write(facts)).rejects.toThrow('Fournisseur IA : réponse 429');
    await expect(provider.write(facts)).rejects.not.toThrow('cle-secrete');
  });

  it('choisit le fournisseur selon SUMMARY_PROVIDER', () => {
    expect(createSummaryProvider({}).model).toBe('fake');
    expect(
      createSummaryProvider({
        SUMMARY_PROVIDER: 'openai',
        AI_BASE_URL: 'http://ollama:11434/v1',
        AI_MODEL: 'llama3.2:1b',
      }).model,
    ).toBe('llama3.2:1b');
    expect(() => createSummaryProvider({ SUMMARY_PROVIDER: 'openai' })).toThrow('AI_BASE_URL');
    expect(() => createSummaryProvider({ SUMMARY_PROVIDER: 'anthropic' })).toThrow(
      'pas encore disponible',
    );
  });
});
