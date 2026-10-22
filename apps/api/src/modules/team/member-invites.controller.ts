import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { InviteMemberRequestDto } from './dto/invite-member-request.dto';
import { InviteResultDto } from './dto/invite-result.dto';
import { MemberAccessService } from './member-access.service';
import { MemberInvitesService } from './member-invites.service';

/** /v1/members/invites: invite people, resend or cancel invitations (story ACC-02). */
@ApiTags('team')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.requires('team:manage')
@Controller('members/invites')
export class MemberInvitesController {
  constructor(
    private readonly invitesService: MemberInvitesService,
    private readonly memberAccessService: MemberAccessService,
  ) {}

  @Post()
  invite(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: InviteMemberRequestDto,
  ): Promise<InviteResultDto> {
    return this.invitesService.invite(auth, body);
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  resend(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<InviteResultDto> {
    return this.invitesService.resend(auth, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.memberAccessService.cancelInvitation(auth, id);
  }
}
