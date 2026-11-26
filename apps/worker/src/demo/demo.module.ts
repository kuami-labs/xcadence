import { Module } from '@nestjs/common';
import { GithubModule } from '../github/github.module.js';
import { DemoService } from './demo.service.js';

@Module({
  imports: [GithubModule],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
