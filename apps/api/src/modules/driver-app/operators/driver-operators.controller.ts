import { Controller, Delete, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverOperatorsService } from './driver-operators.service';
import { DriverOperatorListDto } from './dto/driver-operator-list.dto';
import { DriverOperatorProfileDto } from './dto/driver-operator-profile.dto';

/** /v1/driver/operators: the operators a driver is linked with (module 19, story DRV-05). Driver tokens only. */
@ApiTags('driver app')
@ApiBearerAuth()
@RouteAccess.driver()
@Controller('driver/operators')
export class DriverOperatorsController {
  constructor(private readonly operators: DriverOperatorsService) {}

  @Get()
  list(@CurrentAuth() auth: RequestAuth): Promise<DriverOperatorListDto> {
    return this.operators.list(auth);
  }

  @Get(':tenantId/profile')
  profile(
    @CurrentAuth() auth: RequestAuth,
    @Param('tenantId') tenantId: string,
  ): Promise<DriverOperatorProfileDto> {
    return this.operators.profile(auth, tenantId);
  }

  @Delete(':tenantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@CurrentAuth() auth: RequestAuth, @Param('tenantId') tenantId: string): Promise<void> {
    return this.operators.leave(auth, tenantId);
  }
}
