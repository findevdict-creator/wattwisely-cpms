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
import { ChargerChangesService } from './charger-changes.service';
import { ChargerRegistrationService } from './charger-registration.service';
import { ChargersService } from './chargers.service';
import { ChargerPageDto } from './dto/charger-page.dto';
import { ChargerDto } from './dto/charger.dto';
import { ListChargersQueryDto } from './dto/list-chargers-query.dto';
import { RegisterChargerRequestDto } from './dto/register-charger-request.dto';
import { RegisteredChargerDto } from './dto/registered-charger.dto';
import { UpdateChargerRequestDto } from './dto/update-charger-request.dto';

/** /v1/chargers: registered charge points (story AST-02). */
@ApiTags('chargers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('chargers')
export class ChargersController {
  constructor(
    private readonly chargersService: ChargersService,
    private readonly registration: ChargerRegistrationService,
    private readonly chargerChanges: ChargerChangesService,
  ) {}

  @Get()
  @RouteAccess.requires('chargers:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListChargersQueryDto,
  ): Promise<ChargerPageDto> {
    return this.chargersService.list(auth.requireAccess(), query);
  }

  @Get(':id')
  @RouteAccess.requires('chargers:read')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<ChargerDto> {
    return this.chargersService.get(auth.requireAccess(), id);
  }

  @Post()
  @RouteAccess.requires('chargers:write')
  register(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: RegisterChargerRequestDto,
  ): Promise<RegisteredChargerDto> {
    return this.registration.register(auth, body);
  }

  @Patch(':id')
  @RouteAccess.requires('chargers:write')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: UpdateChargerRequestDto,
  ): Promise<ChargerDto> {
    return this.chargerChanges.update(auth, id, version, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RouteAccess.requires('chargers:delete')
  remove(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<void> {
    return this.chargerChanges.remove(auth, id, version);
  }

  /** A new password, shown once in the answer. Switches the charger to password mode. */
  @Post(':id/password')
  @RouteAccess.requires('chargers:write')
  setPassword(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<RegisteredChargerDto> {
    return this.registration.setPassword(auth, id, version);
  }

  /** Drops the password; the charger is then recognised by its boot fingerprint. */
  @Delete(':id/password')
  @RouteAccess.requires('chargers:write')
  removePassword(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<RegisteredChargerDto> {
    return this.registration.removePassword(auth, id, version);
  }

  /** Forgets the boot fingerprint, so a replacement charger can take over the identity. */
  @Post(':id/fingerprint/reset')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('chargers:write')
  resetFingerprint(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<ChargerDto> {
    return this.registration.resetFingerprint(auth, id, version);
  }
}
