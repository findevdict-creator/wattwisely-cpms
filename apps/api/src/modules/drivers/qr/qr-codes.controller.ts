import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { ConnectorQrCodeDto } from './dto/connector-qr-code.dto';
import { QrCodesService } from './qr-codes.service';

/** GET /v1/chargers/{id}/qr-codes: the stickers for a charger's plugs (module 7). */
@ApiTags('chargers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('chargers')
export class QrCodesController {
  constructor(private readonly service: QrCodesService) {}

  @Get(':id/qr-codes')
  @RouteAccess.requires('chargers:read')
  list(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<ConnectorQrCodeDto[]> {
    return this.service.list(auth.requireAccess(), id);
  }
}
