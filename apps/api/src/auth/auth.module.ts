import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GithubOauthService } from './github-oauth/github-oauth.service.js';
import { OrganizationGuard } from './organization/organization.guard.js';
import { SessionGuard } from './session/session.guard.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, GithubOauthService, SessionGuard, OrganizationGuard],
  exports: [AuthService, SessionGuard, OrganizationGuard],
})
export class AuthModule {}
