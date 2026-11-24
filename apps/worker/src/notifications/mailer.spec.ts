const sendMail = vi.fn().mockResolvedValue({});
const createTransport = vi.fn(() => ({ sendMail }));
vi.mock('nodemailer', () => ({ createTransport }));

const { createMailer } = await import('./mailer.js');

const message = {
  to: 'cto@exemple.fr',
  subject: 's',
  text: 't',
  html: '<p>t</p>',
  unsubscribeUrl: 'http://api/desinscription',
};

describe('envoi SMTP', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Mailpit par défaut, sans authentification', async () => {
    await createMailer({}).send(message);
    expect(createTransport).toHaveBeenCalledWith({
      host: 'localhost',
      port: 1025,
      secure: false,
      auth: undefined,
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'cto@exemple.fr',
        headers: {
          'List-Unsubscribe': '<http://api/desinscription>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    );
  });

  it('Resend en production : TLS sur 465 et identifiants de l’environnement', async () => {
    await createMailer({
      SMTP_HOST: 'smtp.resend.com',
      SMTP_PORT: '465',
      SMTP_USER: 'resend',
      SMTP_PASSWORD: 'cle',
      MAIL_FROM: 'XCadence <resume@exemple.fr>',
    }).send(message);
    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: 'cle' },
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'XCadence <resume@exemple.fr>' }),
    );
  });
});
