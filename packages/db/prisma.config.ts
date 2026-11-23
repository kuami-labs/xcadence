import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // process.env plutôt que env() : `prisma generate` (build, CI) fonctionne sans base.
  datasource: { url: process.env.DATABASE_URL },
});
