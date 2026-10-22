import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { PermissionDto } from './dto/permission.dto';
import { RoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';

/** GET /v1/roles and GET /v1/permissions: what can be given to team members. */
@ApiTags('roles')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.requires('team:read')
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  list(@CurrentAuth() auth: RequestAuth): Promise<RoleDto[]> {
    return this.rolesService.list(auth.requireAccess());
  }

  @Get('roles/:id')
  get(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<RoleDto> {
    return this.rolesService.get(auth.requireAccess(), id);
  }

  @Get('permissions')
  permissions(): PermissionDto[] {
    return this.rolesService.listPermissions();
  }
}
