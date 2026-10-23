import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { PlatformRoleCatalog } from '../../../common/platform/platform-role-catalog';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { AdminStaffService } from './admin-staff.service';
import { AddStaffRequestDto } from './dto/add-staff-request.dto';
import { PlatformRoleDefinitionDto } from './dto/platform-role-definition.dto';
import { StaffMemberDto } from './dto/staff-member.dto';
import { UpdateStaffRequestDto } from './dto/update-staff-request.dto';

/** /v1/admin/staff: Wattwisely's own people and their console roles. */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/staff')
export class AdminStaffController {
  constructor(private readonly staff: AdminStaffService) {}

  @Get()
  @RouteAccess.platform('staff:read')
  list(@CurrentAuth() auth: RequestAuth): Promise<StaffMemberDto[]> {
    return this.staff.list(auth);
  }

  @Get('roles')
  @RouteAccess.platform('staff:read')
  roles(): PlatformRoleDefinitionDto[] {
    return PlatformRoleCatalog.ROLES.map((role) => new PlatformRoleDefinitionDto(role));
  }

  @Post()
  @RouteAccess.platform('staff:manage')
  add(@CurrentAuth() auth: RequestAuth, @Body() body: AddStaffRequestDto): Promise<StaffMemberDto> {
    return this.staff.add(auth, body.email, body.role);
  }

  @Patch(':id')
  @RouteAccess.platform('staff:manage')
  changeRole(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: UpdateStaffRequestDto,
  ): Promise<StaffMemberDto> {
    return this.staff.changeRole(auth, id, version, body.role);
  }

  @Delete(':id')
  @RouteAccess.platform('staff:manage')
  remove(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<StaffMemberDto> {
    return this.staff.remove(auth, id, version);
  }
}
