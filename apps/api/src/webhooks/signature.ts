import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Vérifie l'en-tête X-Hub-Signature-256 de GitHub (HMAC SHA-256 du corps brut).
 * Comparaison en temps constant ; tout en-tête absent ou mal formé est refusé.
 */
export function isValidSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!secret || !signatureHeader?.startsWith('sha256=')) {
    return false;
  }
  const expected = Buffer.from(
    'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex'),
  );
  const received = Buffer.from(signatureHeader);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
