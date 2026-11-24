import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RecipientsController, UnsubscribeController } from './recipients.controller.js';
import { RecipientsService } from './recipients.service.js';

@Module({
  imports: [AuthModule],
  controllers: [RecipientsController, UnsubscribeController],
  providers: [RecipientsService],
})
export class RecipientsModule {}
