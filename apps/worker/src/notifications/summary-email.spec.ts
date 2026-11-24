import { summaryEmail } from './summary-email.js';

describe('email du résumé', () => {
  const email = summaryEmail({
    organizationName: 'Acme <script>',
    weekStart: new Date('2026-11-23T00:00:00Z'),
    content: '6 déploiements en production, +50 %.\n\n2 PR bloquées & "lentes".',
    dashboardUrl: 'http://localhost:3000/dashboard?org=o&x=1',
    unsubscribeUrl: 'http://localhost:4000/summary-recipients/unsubscribe?token=abc',
  });

  it('donne un sujet daté et un texte brut avec les deux liens', () => {
    expect(email.subject).toBe('XCadence · Acme <script> · semaine du 23 novembre');
    expect(email.text).toContain('6 déploiements en production, +50 %.');
    expect(email.text).toContain('Tableau de bord : http://localhost:3000/dashboard?org=o&x=1');
    expect(email.text).toContain('token=abc');
    expect(email.text).not.toContain('\n\n\n');
  });

  it('échappe tout le contenu dans le HTML', () => {
    expect(email.html).toContain('Acme &lt;script&gt;');
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('<li>2 PR bloquées &amp; &quot;lentes&quot;.</li>');
    expect(email.html).toContain('href="http://localhost:3000/dashboard?org=o&amp;x=1"');
    expect(email.html.match(/<li>/g)).toHaveLength(2);
    expect(
      summaryEmail({
        ...{
          organizationName: "l'équipe",
          weekStart: new Date(0),
          content: '',
          dashboardUrl: '',
          unsubscribeUrl: '',
        },
      }).html,
    ).toContain('l&#39;équipe');
  });
});
