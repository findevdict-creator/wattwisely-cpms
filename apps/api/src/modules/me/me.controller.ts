import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { MeResponseDto } from './dto/me-response.dto';
import { MeService } from './me.service';

/** GET /v1/me - who am I and which tenants can I use. Works before a tenant is chosen. */
@ApiTags('me')
@ApiBearerAuth()
@RouteAccess.withoutTenant()
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  me(@CurrentAuth() auth: RequestAuth): MeResponseDto {
    return this.meService.describe(auth.user);
  }
}
