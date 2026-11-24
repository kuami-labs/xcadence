import { createHmac } from 'node:crypto';
import { isValidSignature } from './signature.js';

const secret = 'secret-de-test';
const body = Buffer.from('{"action":"opened"}');
const sign = (b: Buffer, s = secret) => 'sha256=' + createHmac('sha256', s).update(b).digest('hex');

describe('isValidSignature', () => {
  it('accepte une signature correcte', () => {
    expect(isValidSignature(body, sign(body), secret)).toBe(true);
  });

  it('refuse un corps modifié', () => {
    expect(isValidSignature(Buffer.from('{"action":"closed"}'), sign(body), secret)).toBe(false);
  });

  it('refuse un autre secret', () => {
    expect(isValidSignature(body, sign(body, 'autre'), secret)).toBe(false);
  });

  it('refuse un en-tête absent ou mal formé', () => {
    expect(isValidSignature(body, undefined, secret)).toBe(false);
    expect(isValidSignature(body, 'sha1=abc', secret)).toBe(false);
    expect(isValidSignature(body, 'sha256=court', secret)).toBe(false);
  });

  it('refuse tout si le secret est vide', () => {
    expect(isValidSignature(body, sign(body, ''), '')).toBe(false);
  });
});
