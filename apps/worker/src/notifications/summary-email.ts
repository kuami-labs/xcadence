/** Contenu de l'email du résumé hebdomadaire : texte brut et HTML échappé. */
export interface SummaryEmailInput {
  organizationName: string;
  weekStart: Date;
  content: string;
  dashboardUrl: string;
  unsubscribeUrl: string;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

const formatWeek = (week: Date): string =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(week);

export function summaryEmail(input: SummaryEmailInput): EmailContent {
  const week = formatWeek(input.weekStart);
  const lines = input.content.split('\n').filter((line) => line.trim() !== '');
  const subject = `XCadence · ${input.organizationName} · semaine du ${week}`;
  const text = [
    `Résumé de la semaine du ${week} pour ${input.organizationName} :`,
    '',
    ...lines,
    '',
    `Tableau de bord : ${input.dashboardUrl}`,
    '',
    `Ne plus recevoir ce résumé : ${input.unsubscribeUrl}`,
  ].join('\n');
  const html = [
    '<!doctype html><html lang="fr"><body style="font-family:sans-serif;line-height:1.5">',
    `<p>Résumé de la semaine du ${escapeHtml(week)} pour <strong>${escapeHtml(input.organizationName)}</strong> :</p>`,
    `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`,
    `<p><a href="${escapeHtml(input.dashboardUrl)}">Ouvrir le tableau de bord</a></p>`,
    `<p style="font-size:12px;color:#666"><a href="${escapeHtml(input.unsubscribeUrl)}">Ne plus recevoir ce résumé</a></p>`,
    '</body></html>',
  ].join('');
  return { subject, text, html };
}
