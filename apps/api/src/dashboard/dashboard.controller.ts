import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import type { BottlenecksResponse, MetricsResponse } from '@xcadence/shared';
import { OrganizationGuard } from '../auth/organization/organization.guard.js';
import { SessionGuard } from '../auth/session/session.guard.js';
import { DashboardService } from './dashboard.service.js';
import { MetricsQueryDto } from './metrics-query.dto.js';

/** Endpoints de lecture du tableau de bord (F3, F4). */
@Controller('orgs/:orgId')
@UseGuards(SessionGuard, OrganizationGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('metrics')
  metrics(
    @Param('orgId') orgId: string,
    @Query() query: MetricsQueryDto,
  ): Promise<MetricsResponse> {
    return this.dashboard.metrics(orgId, query);
  }

  @Get('bottlenecks')
  bottlenecks(@Param('orgId') orgId: string): Promise<BottlenecksResponse> {
    return this.dashboard.bottlenecks(orgId);
  }
}
