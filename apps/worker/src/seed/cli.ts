import '../load-env.js';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SeedService } from './seed.service.js';

/** pnpm db:seed : jeu de test sans GitHub (docs/06-ENVIRONNEMENT.md). */
@Module({ imports: [PrismaModule], providers: [SeedService] })
class SeedCliModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(SeedCliModule, { logger: ['error'] });
  try {
    const result = await app.get(SeedService).run();
    console.log(
      `Jeu de test chargé : ${result.pullRequests} PR, ${result.workflowRuns} runs de CI, ` +
        `${result.deployments} déploiements, ${result.metrics} métriques hebdomadaires.`,
    );
    console.log(
      result.isDemo
        ? 'Démo publique : http://localhost:3000/demo (pnpm dev).'
        : "Une autre organisation est déjà la démo : le jeu de test n'est visible qu'en base.",
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}
await main();
