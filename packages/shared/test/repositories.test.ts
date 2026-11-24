import { describe, expect, it } from 'vitest';
import { isProductionEnvironment, parseDeployRule } from '../src/repositories.js';

describe('règle de déploiement', () => {
  it('lit deploy_rule tel que stocké, sinon règle par défaut', () => {
    expect(parseDeployRule({ productionEnvironments: [' Production – ui ', '', 3] })).toEqual({
      productionEnvironments: ['Production – ui'],
    });
    expect(parseDeployRule({ productionEnvironments: [] })).toBeNull();
    expect(parseDeployRule({ productionEnvironments: 'production' })).toBeNull();
    expect(parseDeployRule({ autre: true })).toBeNull();
    expect(parseDeployRule(null)).toBeNull();
    expect(parseDeployRule('production')).toBeNull();
  });

  it('par défaut : production ou prod seulement', () => {
    expect(isProductionEnvironment(' Production ', null)).toBe(true);
    expect(isProductionEnvironment('prod', null)).toBe(true);
    expect(isProductionEnvironment('Production – ui', null)).toBe(false);
  });

  it('avec une règle : seulement les environnements désignés, sans tenir compte de la casse', () => {
    const rule = { productionEnvironments: ['Production – umami-analytics-us'] };
    expect(isProductionEnvironment('production – UMAMI-analytics-us', rule)).toBe(true);
    expect(isProductionEnvironment('Production – umami-analytics-eu', rule)).toBe(false);
    expect(isProductionEnvironment('production', rule)).toBe(false);
  });
});
