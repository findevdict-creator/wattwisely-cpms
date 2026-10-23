import { Body, Controller, Delete, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { SubscriptionDto } from '../../subscription/dto/subscription.dto';
import { AdminTenantPlanService } from './admin-tenant-plan.service';
import { SetModuleRequestDto } from './dto/set-module-request.dto';
import { SetSubscriptionRequestDto } from './dto/set-subscription-request.dto';

/** /v1/admin/tenants/{id}/subscription and /modules/{key}: a tenant's plan and its switches. */
@ApiTags('admin')
@ApiBearerAuth()
@RouteAccess.platform('tenants:write')
@Controller('admin/tenants/:id')
export class AdminTenantPlanController {
  constructor(private readonly plan: AdminTenantPlanService) {}

  @Put('subscription')
  setSubscription(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Body() body: SetSubscriptionRequestDto,
  ): Promise<SubscriptionDto> {
    return this.plan.setSubscription(auth, id, body);
  }

  @Put('modules/:key')
  setModule(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Param('key') key: string,
    @Body() body: SetModuleRequestDto,
  ): Promise<SubscriptionDto> {
    return this.plan.setModule(auth, id, key, body);
  }

  /** Back to what the plan says. */
  @Delete('modules/:key')
  removeModule(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Param('key') key: string,
  ): Promise<SubscriptionDto> {
    return this.plan.removeModule(auth, id, key);
  }
}
