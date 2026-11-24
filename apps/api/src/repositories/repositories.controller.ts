import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import type { RecentPullRequest, RepositoryEnvironment, RepositoryView } from '@xcadence/shared';
import { OrganizationGuard } from '../auth/organization/organization.guard.js';
import { SessionGuard } from '../auth/session/session.guard.js';
import { RepositoriesService } from './repositories.service.js';
import { UpdateRepositoryDto } from './update-repository.dto.js';

/** Dépôts d'une organisation (F1 : choisir les dépôts suivis). */
@Controller('orgs/:orgId/repositories')
@UseGuards(SessionGuard, OrganizationGuard)
export class RepositoriesController {
  constructor(private readonly repositories: RepositoriesService) {}

  @Get()
  list(@Param('orgId') orgId: string): Promise<RepositoryView[]> {
    return this.repositories.list(orgId);
  }

  @Patch(':id')
  update(
    @Param('orgId') orgId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRepositoryDto,
  ): Promise<RepositoryView> {
    return this.repositories.update(orgId, id, dto);
  }

  @Get(':id/environments')
  environments(
    @Param('orgId') orgId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<RepositoryEnvironment[]> {
    return this.repositories.environments(orgId, id);
  }

  @Get(':id/pull-requests')
  pullRequests(
    @Param('orgId') orgId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<RecentPullRequest[]> {
    return this.repositories.recentPullRequests(orgId, id);
  }
}
