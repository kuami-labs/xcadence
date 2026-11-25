import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { BottlenecksResponse, DemoResponse, MetricsResponse } from '@xcadence/shared';
import { MetricsQueryDto } from '../dashboard/metrics-query.dto.js';
import { DemoService } from './demo.service.js';

/** Démo publique : lecture seule, sans session (ADR 0006). Aucune route d'écriture. */
@Controller('demo')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 120, ttl: 60_000 } })
export class DemoController {
  constructor(private readonly demo: DemoService) {}

  @Get()
  info(): Promise<DemoResponse> {
    return this.demo.info();
  }

  @Get('metrics')
  metrics(@Query() query: MetricsQueryDto): Promise<MetricsResponse> {
    return this.demo.metrics(query);
  }

  @Get('bottlenecks')
  bottlenecks(): Promise<BottlenecksResponse> {
    return this.demo.bottlenecks();
  }
}
