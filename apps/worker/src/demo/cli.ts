import '../load-env.js';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { redisConnection } from '@xcadence/shared';
import { Redis } from 'ioredis';
import { parseArgs } from 'node:util';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DemoModule } from './demo.module.js';
import { DemoService } from './demo.service.js';

/**
 * Administration de la démo publique :
 *   pnpm --filter @xcadence/worker demo:add <propriétaire/nom> [--production "Production – ui"]…
 * Le worker doit tourner pour traiter l'import mis en file.
 */
// BullMQ ne ferme pas un client Redis qu'on lui fournit : la commande le ferme elle-même.
let connection: Redis | undefined;

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => {
        connection = new Redis({ ...redisConnection(), maxRetriesPerRequest: null });
        return { connection };
      },
    }),
    PrismaModule,
    DemoModule,
  ],
})
class DemoCliModule {}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { production: { type: 'string', multiple: true } },
  });
  const [command, fullName] = positionals;
  if (command !== 'add' || !fullName) {
    console.error('Usage : demo:add <propriétaire/nom> [--production "<environnement>"]…');
    process.exitCode = 1;
    return;
  }
  const app = await NestFactory.createApplicationContext(DemoCliModule, { logger: ['error'] });
  try {
    const added = await app.get(DemoService).addRepository(fullName, values.production ?? []);
    const rule = added.productionEnvironments?.join(', ') ?? 'règle par défaut';
    console.log(`${added.fullName} ajouté à la démo (production : ${rule}) ; import mis en file.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await app.close();
    await connection?.quit();
  }
}
await main();
