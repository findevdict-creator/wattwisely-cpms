import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { IfMatch } from '../../common/request/if-match.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { CreatePlanRequestDto } from './dto/create-plan-request.dto';
import { PlanDto } from './dto/plan.dto';
import { UpdatePlanRequestDto } from './dto/update-plan-request.dto';
import { PlansService } from './plans.service';

/** /v1/admin/plans: the plan catalogue, for Wattwisely staff (story ADM-03). */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/plans')
export class AdminPlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  @RouteAccess.platform('plans:read')
  list(@CurrentAuth() auth: RequestAuth): Promise<PlanDto[]> {
    return this.plans.list(auth);
  }

  @Get(':id')
  @RouteAccess.platform('plans:read')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<PlanDto> {
    return this.plans.get(auth, id);
  }

  @Post()
  @RouteAccess.platform('plans:write')
  create(@CurrentAuth() auth: RequestAuth, @Body() body: CreatePlanRequestDto): Promise<PlanDto> {
    return this.plans.create(auth, body);
  }

  @Patch(':id')
  @RouteAccess.platform('plans:write')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: UpdatePlanRequestDto,
  ): Promise<PlanDto> {
    return this.plans.update(auth, id, version, body);
  }
}
