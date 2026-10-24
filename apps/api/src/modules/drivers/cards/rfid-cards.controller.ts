import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { AddCardRequestDto } from './dto/add-card-request.dto';
import { RfidCardDto } from './dto/rfid-card.dto';
import { UpdateCardRequestDto } from './dto/update-card-request.dto';
import { RfidCardsService } from './rfid-cards.service';

/** /v1/drivers/{id}/cards: the RFID cards a driver holds (story DRV-03). */
@ApiTags('drivers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('drivers/:driverId/cards')
export class RfidCardsController {
  constructor(private readonly cardsService: RfidCardsService) {}

  @Post()
  @RouteAccess.requires('drivers:write')
  add(
    @CurrentAuth() auth: RequestAuth,
    @Param('driverId') driverId: string,
    @Body() body: AddCardRequestDto,
  ): Promise<RfidCardDto> {
    return this.cardsService.add(auth, driverId, body);
  }

  @Patch(':cardId')
  @RouteAccess.requires('drivers:write')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param() ids: { driverId: string; cardId: string },
    @IfMatch() version: number,
    @Body() body: UpdateCardRequestDto,
  ): Promise<RfidCardDto> {
    return this.cardsService.update(auth, ids, version, body);
  }
}
