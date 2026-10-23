import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { SubscriptionDto } from './dto/subscription.dto';
import { SubscriptionService } from './subscription.service';

/** GET /v1/subscription: the plan the company is on, its modules and how much of it is used. */
@ApiTags('settings')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.requires('settings:read')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscription: SubscriptionService) {}

  @Get()
  get(@CurrentAuth() auth: RequestAuth): Promise<SubscriptionDto> {
    return this.subscription.get(auth.requireAccess());
  }
}
