import type { Job } from 'bullmq';

const captureException = vi.fn();
vi.mock('@sentry/nestjs', () => ({ captureException }));

const { ReportedWorkerHost } = await import('./reported-worker-host.js');

class Essai extends ReportedWorkerHost {
  process(): Promise<void> {
    return Promise.resolve();
  }
}

describe('échecs de jobs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envoie l’erreur à Sentry avec la file et le job, sans les données du job', () => {
    const job = {
      queueName: 'notifications',
      name: 'send-summary-email',
      attemptsMade: 2,
      data: { email: 'cto@exemple.fr' },
    } as unknown as Job;
    const error = new Error('SMTP indisponible');
    new Essai().onFailed(job, error);
    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { queue: 'notifications', job: 'send-summary-email' },
      extra: { attempt: 2 },
    });
    expect(JSON.stringify(captureException.mock.calls)).not.toContain('cto@exemple.fr');
  });

  it('accepte un job absent (échec avant chargement)', () => {
    new Essai().onFailed(undefined, new Error('x'));
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { queue: 'inconnue', job: 'inconnu' },
      extra: { attempt: 0 },
    });
  });
});
