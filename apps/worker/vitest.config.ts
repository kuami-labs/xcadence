import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // Calculs de métriques couverts à 100 % (docs/02-STACK.md) : vérifié à chaque `pnpm test`.
    coverage: {
      enabled: true,
      include: [
        'src/metrics/stats.ts',
        'src/metrics/flow-metrics.ts',
        'src/metrics/dora-metrics.ts',
        'src/metrics/organization-metrics.ts',
      ],
      exclude: ['**/*.spec.ts'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
