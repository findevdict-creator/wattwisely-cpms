import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverInvitationsService } from './driver-invitations.service';
import { AcceptedDriverInvitationDto } from './dto/accepted-driver-invitation.dto';
import { DriverInvitationPreviewDto } from './dto/driver-invitation-preview.dto';

/**
 * /v1/driver/invitations/{token}: the link in a driver's invitation e-mail (module 19).
 * Anyone with the link may look at it; accepting or declining needs the driver app's login.
 */
@ApiTags('driver app')
@Controller('driver/invitations')
export class DriverInvitationsController {
  constructor(private readonly invitations: DriverInvitationsService) {}

  @Get(':token')
  @RouteAccess.public()
  preview(@Param('token') token: string): Promise<DriverInvitationPreviewDto> {
    return this.invitations.preview(token);
  }

  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @RouteAccess.driver()
  accept(
    @CurrentAuth() auth: RequestAuth,
    @Param('token') token: string,
  ): Promise<AcceptedDriverInvitationDto> {
    return this.invitations.accept(auth, token);
  }

  @Post(':token/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @RouteAccess.driver()
  decline(@CurrentAuth() auth: RequestAuth, @Param('token') token: string): Promise<void> {
    return this.invitations.decline(auth, token);
  }
}
