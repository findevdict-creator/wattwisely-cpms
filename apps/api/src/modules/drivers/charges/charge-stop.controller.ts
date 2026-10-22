import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { ChargeDto } from '../../payments/public/dto/charge.dto';
import { ChargeStopService } from './charge-stop.service';

/** POST /v1/public/charges/{key}/stop: the driver stops their own charge. The key is the proof. */
@ApiTags('public')
@RouteAccess.public()
@Controller('public/charges')
export class ChargeStopController {
  constructor(private readonly service: ChargeStopService) {}

  @Post(':key/stop')
  @HttpCode(HttpStatus.OK)
  stop(@Param('key') key: string): Promise<ChargeDto> {
    return this.service.stop(key);
  }
}
