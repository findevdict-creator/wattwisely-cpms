import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { ListMembersQueryDto } from './dto/list-members-query.dto';
import { MemberDto } from './dto/member.dto';
import { ReplaceMemberRolesRequestDto } from './dto/replace-member-roles-request.dto';
import { MemberAccessService } from './member-access.service';
import { MembersService } from './members.service';

/** /v1/members: the tenant's team, their roles, and removing people (stories ACC-02, ACC-03). */
@ApiTags('team')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('members')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly memberAccessService: MemberAccessService,
  ) {}

  @Get()
  @RouteAccess.requires('team:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListMembersQueryDto,
  ): Promise<MemberDto[]> {
    return this.membersService.list(auth.requireAccess(), query);
  }

  @Get(':id')
  @RouteAccess.requires('team:read')
  get(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<MemberDto> {
    return this.membersService.get(auth.requireAccess(), id);
  }

  @Put(':id/roles')
  @RouteAccess.requires('team:manage')
  replaceRoles(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ReplaceMemberRolesRequestDto,
  ): Promise<MemberDto> {
    return this.memberAccessService.replaceRoles(auth, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RouteAccess.requires('team:manage')
  remove(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.memberAccessService.remove(auth, id);
  }
}
