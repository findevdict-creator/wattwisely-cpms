import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { AcceptedInvitationDto } from './dto/accepted-invitation.dto';
import { InvitationPreviewDto } from './dto/invitation-preview.dto';
import { InvitationsService } from './invitations.service';

/**
 * /v1/invitations/{token}: the link in an invitation e-mail.
 * Anyone with the link may look at it; accepting needs a login and no tenant yet.
 */
@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get(':token')
  @RouteAccess.public()
  preview(@Param('token') token: string): Promise<InvitationPreviewDto> {
    return this.invitationsService.preview(token);
  }

  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @RouteAccess.withoutTenant()
  accept(
    @CurrentAuth() auth: RequestAuth,
    @Param('token') token: string,
  ): Promise<AcceptedInvitationDto> {
    return this.invitationsService.accept(auth, token);
  }
}
