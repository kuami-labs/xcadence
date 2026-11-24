import type { Fact } from './facts.js';

export const MAX_LINES = 5;
export const MAX_LENGTH = 800;

/** Chiffres autorisés : valeurs, valeurs précédentes, écarts et variations des faits. */
function allowedNumbers(facts: Fact[]): number[] {
  return facts.flatMap((f) => {
    const values = [f.value];
    if (f.previous !== null)
      values.push(f.previous, Math.round(Math.abs(f.value - f.previous) * 10) / 10);
    if (f.changePercent !== null) values.push(Math.abs(f.changePercent));
    return values;
  });
}

const NUMBER = /\d+(?:[.,]\d+)?/g;

/**
 * Vérifie un résumé avant enregistrement (docs/08-SECURITE.md, F5) : 5 lignes au plus, longueur
 * bornée, chaque ligne cite un chiffre, et chaque chiffre cité existe dans les métriques réelles.
 * Retourne le texte nettoyé, ou la raison du refus.
 */
export function validateSummary(
  text: string,
  facts: Fact[],
): { ok: true; text: string } | { ok: false; reason: string } {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^[\s*•-]+/, '').trim())
    .filter(Boolean);
  const clean = lines.join('\n');
  if (lines.length === 0) return { ok: false, reason: 'résumé vide' };
  if (lines.length > MAX_LINES) return { ok: false, reason: `${lines.length} lignes` };
  if (clean.length > MAX_LENGTH) return { ok: false, reason: 'trop long' };
  const allowed = allowedNumbers(facts);
  for (const line of lines) {
    const numbers = (line.match(NUMBER) ?? []).map((n) => Number(n.replace(',', '.')));
    if (numbers.length === 0) return { ok: false, reason: 'ligne sans chiffre' };
    const unknown = numbers.find((n) => !allowed.some((a) => Math.abs(a - n) <= 0.05));
    if (unknown !== undefined) return { ok: false, reason: `chiffre inconnu : ${unknown}` };
  }
  return { ok: true, text: clean };
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);

/** Résumé sans IA, à partir des seuls faits : utilisé si le modèle échoue ou se trompe. */
export function fallbackSummary(facts: Fact[]): string {
  if (facts.length === 0) return '';
  return facts
    .slice(0, MAX_LINES)
    .map((f) => {
      const unit = f.unit ? ` ${f.unit}` : '';
      const change =
        f.changePercent === null
          ? ''
          : ` (${f.changePercent > 0 ? '+' : '−'}${fmt(Math.abs(f.changePercent))} %)`;
      return `${f.label.charAt(0).toUpperCase()}${f.label.slice(1)} : ${fmt(f.value)}${unit}${change}.`;
    })
    .join('\n');
}
