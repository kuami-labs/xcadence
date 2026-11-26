import { describe, expect, it } from 'vitest';
import { redisConnection } from '../src/queues.js';

describe('redisConnection', () => {
  it("lit l'hôte et le port", () => {
    expect(redisConnection('redis://redis:6379')).toMatchObject({ host: 'redis', port: 6379 });
  });

  it('lit identifiants, base et TLS', () => {
    expect(redisConnection('rediss://user:p%40ss@cache.example:6380/2')).toMatchObject({
      host: 'cache.example',
      port: 6380,
      username: 'user',
      password: 'p@ss',
      db: 2,
      tls: {},
    });
  });
});
