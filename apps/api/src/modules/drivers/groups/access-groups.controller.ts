import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { AccessGroupsService } from './access-groups.service';
import { AccessGroupListDto } from './dto/access-group-list.dto';
import { AccessGroupDto } from './dto/access-group.dto';
import { SaveAccessGroupRequestDto } from './dto/save-access-group-request.dto';

/** /v1/access-groups: which drivers may charge at which private sites (story AST-04). */
@ApiTags('drivers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('access-groups')
export class AccessGroupsController {
  constructor(private readonly groupsService: AccessGroupsService) {}

  @Get()
  @RouteAccess.requires('drivers:read')
  list(@CurrentAuth() auth: RequestAuth): Promise<AccessGroupListDto> {
    return this.groupsService.list(auth.requireAccess());
  }

  @Get(':id')
  @RouteAccess.requires('drivers:read')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<AccessGroupDto> {
    return this.groupsService.get(auth.requireAccess(), id);
  }

  @Post()
  @RouteAccess.requires('drivers:write')
  create(
    @CurrentAuth() auth: RequestAuth,
    @Body() body: SaveAccessGroupRequestDto,
  ): Promise<AccessGroupDto> {
    return this.groupsService.create(auth, body);
  }

  @Patch(':id')
  @RouteAccess.requires('drivers:write')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: SaveAccessGroupRequestDto,
  ): Promise<AccessGroupDto> {
    return this.groupsService.update(auth, id, version, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RouteAccess.requires('drivers:write')
  remove(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<void> {
    return this.groupsService.remove(auth, id, version);
  }
}
