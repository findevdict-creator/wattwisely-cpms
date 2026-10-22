import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { MyPermissionsDto } from './dto/my-permissions.dto';
import { MeService } from './me.service';

/** GET /v1/me/permissions - my roles and permissions in the current tenant. */
@ApiTags('me')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.anyMember()
@Controller('me/permissions')
export class MyPermissionsController {
  constructor(private readonly meService: MeService) {}

  @Get()
  permissions(@CurrentAuth() auth: RequestAuth): MyPermissionsDto {
    return this.meService.describePermissions(auth.requireAccess());
  }
}
