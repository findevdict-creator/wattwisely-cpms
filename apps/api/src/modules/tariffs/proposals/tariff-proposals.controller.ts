import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { CreateTariffProposalRequestDto } from './dto/create-tariff-proposal-request.dto';
import { DecideTariffProposalRequestDto } from './dto/decide-tariff-proposal-request.dto';
import { ListTariffProposalsQueryDto } from './dto/list-tariff-proposals-query.dto';
import { TariffProposalDto } from './dto/tariff-proposal.dto';
import { TariffProposalDecisionsService } from './tariff-proposal-decisions.service';
import { TariffProposalsService } from './tariff-proposals.service';

/** /v1/tariff-proposals: price changes proposed by a Managed operator for the Owner to approve (story MGT-03). */
@ApiTags('tariffs')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('tariff-proposals')
export class TariffProposalsController {
  constructor(
    private readonly proposals: TariffProposalsService,
    private readonly decisions: TariffProposalDecisionsService,
  ) {}

  @Get()
  @RouteAccess.requires('tariffs:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListTariffProposalsQueryDto,
  ): Promise<TariffProposalDto[]> {
    return this.proposals.list(auth, query);
  }

  @Post()
  @RouteAccess.requires('tariffs:write')
  create(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: CreateTariffProposalRequestDto,
  ): Promise<TariffProposalDto> {
    return this.proposals.create(auth, body);
  }

  @Get(':id')
  @RouteAccess.requires('tariffs:read')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<TariffProposalDto> {
    return this.proposals.get(auth, id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('tariffs:approve')
  approve(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: DecideTariffProposalRequestDto,
  ): Promise<TariffProposalDto> {
    return this.decisions.approve(auth, { id, version }, body);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('tariffs:approve')
  reject(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: DecideTariffProposalRequestDto,
  ): Promise<TariffProposalDto> {
    return this.decisions.reject(auth, { id, version }, body);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('tariffs:write')
  withdraw(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<TariffProposalDto> {
    return this.proposals.withdraw(auth, id, version);
  }
}
