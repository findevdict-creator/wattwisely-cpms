import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverReceiptsService } from './driver-receipts.service';

/** /v1/driver/charges/{id}/receipt.pdf: the receipt of one of the driver's charges (module 33). */
@ApiTags('driver app')
@ApiBearerAuth()
@RouteAccess.driver()
@Controller('driver/charges')
export class DriverReceiptsController {
  constructor(private readonly receipts: DriverReceiptsService) {}

  @Get(':id/receipt.pdf')
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="receipt.pdf"')
  async receipt(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    return new StreamableFile(await this.receipts.pdf(auth, id));
  }
}
