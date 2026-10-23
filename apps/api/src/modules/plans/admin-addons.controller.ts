import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { IfMatch } from '../../common/request/if-match.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { AddonsService } from './addons.service';
import { AddonDto } from './dto/addon.dto';
import { UpdateAddonRequestDto } from './dto/update-addon-request.dto';

/** /v1/admin/addons: add-on prices, for Wattwisely staff (story ADM-03). */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/addons')
export class AdminAddonsController {
  constructor(private readonly addons: AddonsService) {}

  @Get()
  @RouteAccess.platform('plans:read')
  list(@CurrentAuth() auth: RequestAuth): Promise<AddonDto[]> {
    return this.addons.list(auth);
  }

  @Patch(':key')
  @RouteAccess.platform('plans:write')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('key') key: string,
    @IfMatch() version: number,
    @Body() body: UpdateAddonRequestDto,
  ): Promise<AddonDto> {
    return this.addons.update(auth, key, version, body);
  }
}
