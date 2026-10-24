import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { IfMatch } from '../../common/request/if-match.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';
import { PermissionDto } from './dto/permission.dto';
import { RoleDto } from './dto/role.dto';
import { UpdateRoleRequestDto } from './dto/update-role-request.dto';
import { RoleChangesService } from './role-changes.service';
import { RolesService } from './roles.service';

/**
 * /v1/roles and /v1/permissions: what can be given to team members, and the custom roles
 * a tenant shapes itself (module 14, plan module custom_roles).
 */
@ApiTags('roles')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller()
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly changes: RoleChangesService,
  ) {}

  @Get('roles')
  @RouteAccess.requires('team:read')
  list(@CurrentAuth() auth: RequestAuth): Promise<RoleDto[]> {
    return this.rolesService.list(auth.requireAccess());
  }

  @Get('roles/:id')
  @RouteAccess.requires('team:read')
  get(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<RoleDto> {
    return this.rolesService.get(auth.requireAccess(), id);
  }

  @Get('permissions')
  @RouteAccess.requires('team:read')
  permissions(@CurrentAuth() auth: RequestAuth): PermissionDto[] {
    return this.rolesService.listPermissions(auth.requireAccess());
  }

  @Post('roles')
  @RouteAccess.requires('custom_roles:manage')
  create(@CurrentAuth() auth: RequestAuth, @Body() body: CreateRoleRequestDto): Promise<RoleDto> {
    return this.changes.create(auth, body);
  }

  @Patch('roles/:id')
  @RouteAccess.requires('custom_roles:manage')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: UpdateRoleRequestDto,
  ): Promise<RoleDto> {
    return this.changes.update(auth, id, version, body);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RouteAccess.requires('custom_roles:manage')
  remove(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<void> {
    return this.changes.remove(auth, id, version);
  }
}
