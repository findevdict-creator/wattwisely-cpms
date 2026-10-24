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
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverChangesService } from './driver-changes.service';
import { DriversService } from './drivers.service';
import { BlockDriverRequestDto } from './dto/block-driver-request.dto';
import { CreateDriverRequestDto } from './dto/create-driver-request.dto';
import { DriverDetailDto } from './dto/driver-detail.dto';
import { DriverPageDto } from './dto/driver-page.dto';
import { ListDriversQueryDto } from './dto/list-drivers-query.dto';
import { UpdateDriverRequestDto } from './dto/update-driver-request.dto';

/** /v1/drivers: the tenant's drivers (story DRV-01), who may charge with an RFID card. */
@ApiTags('drivers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('drivers')
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly driverChanges: DriverChangesService,
  ) {}

  @Get()
  @RouteAccess.requires('drivers:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListDriversQueryDto,
  ): Promise<DriverPageDto> {
    return this.driversService.list(auth.requireAccess(), query);
  }

  @Get(':id')
  @RouteAccess.requires('drivers:read')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<DriverDetailDto> {
    return this.driversService.get(auth.requireAccess(), id);
  }

  @Post()
  @RouteAccess.requires('drivers:write')
  create(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: CreateDriverRequestDto,
  ): Promise<DriverDetailDto> {
    return this.driverChanges.create(auth, body);
  }

  @Patch(':id')
  @RouteAccess.requires('drivers:write')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: UpdateDriverRequestDto,
  ): Promise<DriverDetailDto> {
    return this.driverChanges.update(auth, id, version, body);
  }

  @Post(':id/block')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('drivers:block')
  block(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: BlockDriverRequestDto,
  ): Promise<DriverDetailDto> {
    const reason = body.reason?.trim() ?? '';
    return this.driverChanges.setBlocked(auth, id, version, { isBlocked: true, reason });
  }

  @Post(':id/unblock')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('drivers:block')
  unblock(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<DriverDetailDto> {
    return this.driverChanges.setBlocked(auth, id, version, { isBlocked: false, reason: '' });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RouteAccess.requires('drivers:delete')
  remove(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<void> {
    return this.driverChanges.remove(auth, id, version);
  }
}
