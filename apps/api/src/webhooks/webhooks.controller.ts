import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { isValidSignature } from './signature.js';
import { WebhooksService } from './webhooks.service.js';

@Controller('webhooks')
@UseGuards(ThrottlerGuard)
// GitHub peut envoyer des rafales d'événements : limite plus large que pour /auth.
@Throttle({ default: { limit: 300, ttl: 60_000 } })
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  /** Réception des événements de la GitHub App : signature vérifiée avant tout traitement. */
  @Post('github')
  @HttpCode(202)
  async github(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Headers('x-github-delivery') deliveryId: string | undefined,
    @Headers('x-github-event') eventType: string | undefined,
  ): Promise<{ received: true; duplicate: boolean }> {
    const secret = process.env.GITHUB_WEBHOOK_SECRET ?? '';
    if (!req.rawBody || !isValidSignature(req.rawBody, signature, secret)) {
      throw new UnauthorizedException('Signature invalide');
    }
    if (!deliveryId || !eventType) {
      throw new BadRequestException('En-têtes GitHub manquants');
    }
    const isNew = await this.webhooks.record({
      deliveryId,
      eventType,
      payload: req.body as object,
    });
    return { received: true, duplicate: !isNew };
  }
}
