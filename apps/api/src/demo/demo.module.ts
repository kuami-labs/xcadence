import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module.js';
import { DemoController } from './demo.controller.js';
import { DemoService } from './demo.service.js';

@Module({
  imports: [DashboardModule],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
