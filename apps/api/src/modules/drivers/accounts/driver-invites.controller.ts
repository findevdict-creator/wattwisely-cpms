import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverInvitesService } from './driver-invites.service';
import { DriverInviteResultDto } from './dto/driver-invite-result.dto';
import { InviteDriverRequestDto } from './dto/invite-driver-request.dto';

/** /v1/drivers/{id}/invite and …/account-link: a driver's login as the operator manages it (module 19). */
@ApiTags('drivers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.requires('drivers:invite')
@Controller('drivers/:driverId')
export class DriverInvitesController {
  constructor(private readonly invites: DriverInvitesService) {}

  @Post('invite')
  invite(
    @CurrentAuth() auth: RequestAuth,
    @Param('driverId') driverId: string,
    @Body() body: InviteDriverRequestDto,
  ): Promise<DriverInviteResultDto> {
    return this.invites.invite(auth, driverId, body);
  }

  @Post('invite/resend')
  @HttpCode(HttpStatus.OK)
  resend(
    @CurrentAuth() auth: RequestAuth,
    @Param('driverId') driverId: string,
  ): Promise<DriverInviteResultDto> {
    return this.invites.resend(auth, driverId);
  }

  @Delete('invite')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(@CurrentAuth() auth: RequestAuth, @Param('driverId') driverId: string): Promise<void> {
    return this.invites.cancel(auth, driverId);
  }

  @Delete('account-link')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlink(
    @CurrentAuth() auth: RequestAuth,
    @Param('driverId') driverId: string,
    @IfMatch() version: number,
  ): Promise<void> {
    return this.invites.unlink(auth, driverId, version);
  }
}
