import { Module } from '@nestjs/common';
import { GithubService } from './github.service.js';

@Module({
  providers: [{ provide: GithubService, useFactory: () => new GithubService() }],
  exports: [GithubService],
})
export class GithubModule {}
