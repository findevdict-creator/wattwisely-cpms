import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { AdminOwnersService } from './admin-owners.service';
import { InviteOwnerRequestDto } from './dto/invite-owner-request.dto';
import { InviteOwnerResultDto } from './dto/invite-owner-result.dto';
import { TenantOwnerDto } from './dto/tenant-owner.dto';

/** /v1/admin/tenants/{id}/owners: who runs the tenant, and inviting another Owner. */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/tenants/:id/owners')
export class AdminOwnersController {
  constructor(private readonly owners: AdminOwnersService) {}

  @Get()
  @RouteAccess.platform('tenants:read')
  list(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<TenantOwnerDto[]> {
    return this.owners.list(auth, id);
  }

  @Post('invites')
  @RouteAccess.platform('tenants:write')
  invite(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Body() body: InviteOwnerRequestDto,
  ): Promise<InviteOwnerResultDto> {
    return this.owners.invite(auth, id, body.email);
  }
}
