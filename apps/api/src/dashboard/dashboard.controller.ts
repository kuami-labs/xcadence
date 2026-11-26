import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import type {
  BottlenecksResponse,
  MetricsResponse,
  SyncStatusResponse,
  WeeklySummaryView,
} from '@xcadence/shared';
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

  @Get('sync-status')
  syncStatus(@Param('orgId') orgId: string): Promise<SyncStatusResponse> {
    return this.dashboard.syncStatus(orgId);
  }

  /** Dernier résumé ; `{ summary: null }` s'il n'y en a pas encore. */
  @Get('summaries/latest')
  async latestSummary(
    @Param('orgId') orgId: string,
  ): Promise<{ summary: WeeklySummaryView | null }> {
    return { summary: await this.dashboard.latestSummary(orgId) };
  }
}
