import { Module } from '@nestjs/common';
import { RoleChangesService } from './role-changes.service';
import { RolesController } from './roles.controller';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

/** Roles and permissions: the built-in roles, and a tenant's custom roles (module 14). */
@Module({
  controllers: [RolesController],
  providers: [RolesService, RoleChangesService, RolesRepository],
  exports: [RolesRepository],
})
export class RolesModule {}
