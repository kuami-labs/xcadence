import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { SummaryRecipientView } from '@xcadence/shared';
import { OrganizationGuard } from '../auth/organization/organization.guard.js';
import { SessionGuard } from '../auth/session/session.guard.js';
import { AddRecipientDto } from './add-recipient.dto.js';
import { RecipientsService } from './recipients.service.js';

@Controller('orgs/:orgId/summary-recipients')
@UseGuards(SessionGuard, OrganizationGuard)
export class RecipientsController {
  constructor(private readonly recipients: RecipientsService) {}

  @Get()
  list(@Param('orgId') orgId: string): Promise<SummaryRecipientView[]> {
    return this.recipients.list(orgId);
  }

  @Post()
  add(@Param('orgId') orgId: string, @Body() dto: AddRecipientDto): Promise<SummaryRecipientView> {
    return this.recipients.add(orgId, dto.email);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('orgId') orgId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.recipients.remove(orgId, id);
  }
}

/** Lien de désinscription des emails : public, sans session, limité en débit. */
@Controller('summary-recipients')
@UseGuards(ThrottlerGuard)
export class UnsubscribeController {
  constructor(private readonly recipients: RecipientsService) {}

  @Get('unsubscribe')
  @Header('content-type', 'text/html; charset=utf-8')
  async unsubscribe(@Query('token') token: string | undefined): Promise<string> {
    if (token) {
      await this.recipients.unsubscribe(token);
    }
    return '<!doctype html><html lang="fr"><meta charset="utf-8"><title>XCadence</title><p>Vous ne recevrez plus le résumé hebdomadaire XCadence.</p></html>';
  }

  /** Désinscription en un clic depuis le client mail (RFC 8058, en-tête List-Unsubscribe-Post). */
  @Post('unsubscribe')
  @HttpCode(200)
  async unsubscribeOneClick(@Query('token') token: string | undefined): Promise<void> {
    if (token) {
      await this.recipients.unsubscribe(token);
    }
  }
}
