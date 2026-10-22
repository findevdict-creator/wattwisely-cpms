import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { IfMatch } from '../../common/request/if-match.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { CreateTariffRequestDto } from './dto/create-tariff-request.dto';
import { ListTariffsQueryDto } from './dto/list-tariffs-query.dto';
import { TariffPageDto } from './dto/tariff-page.dto';
import { TariffPreviewRequestDto } from './dto/tariff-preview-request.dto';
import { TariffPreviewDto } from './dto/tariff-preview.dto';
import { TariffPricesRequestDto } from './dto/tariff-prices-request.dto';
import { TariffVersionDto } from './dto/tariff-version.dto';
import { TariffDto } from './dto/tariff.dto';
import { UpdateTariffRequestDto } from './dto/update-tariff-request.dto';
import { TariffChangesService } from './tariff-changes.service';
import { TariffPreviewService } from './tariff-preview.service';
import { TariffsService } from './tariffs.service';

/** /v1/tariffs: what charging costs, in versions (Sessions and Pricing design). */
@ApiTags('tariffs')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('tariffs')
export class TariffsController {
  constructor(
    private readonly tariffsService: TariffsService,
    private readonly tariffChanges: TariffChangesService,
    private readonly previews: TariffPreviewService,
  ) {}

  @Get()
  @RouteAccess.requires('tariffs:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListTariffsQueryDto,
  ): Promise<TariffPageDto> {
    return this.tariffsService.list(auth.requireAccess(), query);
  }

  @Post()
  @RouteAccess.requires('tariffs:write')
  create(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: CreateTariffRequestDto,
  ): Promise<TariffDto> {
    return this.tariffChanges.create(auth, body);
  }

  /** Before :id, so "preview" is not read as an id. */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('tariffs:read')
  preview(@Body() body: TariffPreviewRequestDto): TariffPreviewDto {
    return this.previews.preview(body);
  }

  @Get(':id')
  @RouteAccess.requires('tariffs:read')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<TariffDto> {
    return this.tariffsService.get(auth.requireAccess(), id);
  }

  @Patch(':id')
  @RouteAccess.requires('tariffs:write')
  rename(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: UpdateTariffRequestDto,
  ): Promise<TariffDto> {
    return this.tariffChanges.rename(auth, id, version, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RouteAccess.requires('tariffs:delete')
  archive(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<void> {
    return this.tariffChanges.archive(auth, id, version);
  }

  @Get(':id/versions')
  @RouteAccess.requires('tariffs:read')
  versions(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<TariffVersionDto[]> {
    return this.tariffsService.versions(auth.requireAccess(), id);
  }

  /** New prices for sessions that start from now on. */
  @Post(':id/versions')
  @RouteAccess.requires('tariffs:write')
  addVersion(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: TariffPricesRequestDto,
  ): Promise<TariffDto> {
    return this.tariffChanges.addVersion(auth, id, version, body);
  }
}
