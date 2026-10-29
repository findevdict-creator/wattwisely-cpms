import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverDataExportService } from './driver-data-export.service';
import { DriverMeService } from './driver-me.service';
import { DriverDataExportDto } from './dto/driver-data-export.dto';
import { DriverMeDto } from './dto/driver-me.dto';
import { UpdateDriverMeRequestDto } from './dto/update-driver-me-request.dto';

/**
 * /v1/driver/me: the driver's own account (module 19), their data as a file and deleting the
 * account (module 33). Only the driver app's tokens open it.
 */
@ApiTags('driver app')
@ApiBearerAuth()
@RouteAccess.driver()
@Controller('driver/me')
export class DriverMeController {
  constructor(
    private readonly me: DriverMeService,
    private readonly dataExport: DriverDataExportService,
  ) {}

  @Get()
  describe(@CurrentAuth() auth: RequestAuth): DriverMeDto {
    return this.me.describe(auth);
  }

  @Patch()
  update(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: UpdateDriverMeRequestDto,
  ): Promise<DriverMeDto> {
    return this.me.update(auth, body);
  }

  /** Everything held about the driver, as a JSON file (module 33). */
  @Get('export')
  @Header('Content-Disposition', 'attachment; filename="my-wattwisely-data.json"')
  export(@CurrentAuth() auth: RequestAuth): Promise<DriverDataExportDto> {
    return this.dataExport.export(auth);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  erase(@CurrentAuth() auth: RequestAuth): Promise<void> {
    return this.me.erase(auth);
  }
}
