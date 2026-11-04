import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { AcceptedInvitationDto } from '../invitations/dto/accepted-invitation.dto';
import { InvitationsService } from '../invitations/invitations.service';

/**
 * POST /v1/me/invitations/{id}/accept: accepts one of the invitations GET /v1/me lists,
 * for someone who lost the link from the e-mail. Works before a tenant is chosen.
 */
@ApiTags('me')
@ApiBearerAuth()
@RouteAccess.withoutTenant()
@Controller('me/invitations')
export class MyInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  accept(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
  ): Promise<AcceptedInvitationDto> {
    return this.invitationsService.acceptPending(auth, id);
  }
}
