import '../load-env.js';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DemoModule } from './demo.module.js';
import { DemoService } from './demo.service.js';

/**
 * Administration de la démo publique (docs/03-BACKEND.md) :
 *   pnpm --filter @xcadence/worker demo:enable <organisation>
 *   pnpm --filter @xcadence/worker demo:disable
 */
@Module({ imports: [PrismaModule, DemoModule] })
class DemoCliModule {}

async function main() {
  const [command, login] = process.argv.slice(2);
  if (!(command === 'enable' && login) && command !== 'disable') {
    console.error('Usage : demo:enable <organisation> | demo:disable');
    process.exitCode = 1;
    return;
  }
  const app = await NestFactory.createApplicationContext(DemoCliModule, { logger: ['error'] });
  try {
    const demo = app.get(DemoService);
    if (command === 'enable') {
      const org = await demo.enable(login);
      console.log(
        `${org.name} est l'organisation de démo : ${org.publicRepositories} dépôt(s) public(s), ` +
          `dont ${org.trackedPublicRepositories} suivi(s) (seuls ceux-ci seront montrés).`,
      );
    } else {
      console.log(`Démo désactivée (${await demo.disable()} organisation(s) retirée(s)).`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}
await main();
