import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { AssignOperatorRequestDto } from '../dto/assign-operator-request.dto';
import { ManagedOperatorDto } from '../dto/managed-operator.dto';
import { ManagedOperatorsService } from './managed-operators.service';

/** /v1/admin/tenants/{id}/managed-service/operators: the staff working in a managed tenant (story MGT-02). */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/tenants/:tenantId/managed-service/operators')
export class ManagedOperatorsController {
  constructor(private readonly operators: ManagedOperatorsService) {}

  @Get()
  @RouteAccess.platform('tenants:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Param('tenantId') tenantId: string,
  ): Promise<ManagedOperatorDto[]> {
    return this.operators.list(auth, tenantId);
  }

  /** Idempotent by staff member: the same person cannot be assigned twice. */
  @Put(':staffId')
  @RouteAccess.platform('tenants:manage_service')
  assign(
    @CurrentAuth() auth: RequestAuth,
    @Param('tenantId') tenantId: string,
    @Param('staffId') staffId: string,
    @Body() body: AssignOperatorRequestDto,
  ): Promise<ManagedOperatorDto> {
    return this.operators.assign(auth, { tenantId, staffId }, body);
  }

  @Delete(':staffId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RouteAccess.platform('tenants:manage_service')
  remove(
    @CurrentAuth() auth: RequestAuth,
    @Param('tenantId') tenantId: string,
    @Param('staffId') staffId: string,
  ): Promise<void> {
    return this.operators.remove(auth, { tenantId, staffId });
  }
}
