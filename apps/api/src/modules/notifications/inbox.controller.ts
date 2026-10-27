import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { InboxPageDto } from './dto/inbox-page.dto';
import { ListInboxQueryDto } from './dto/list-inbox-query.dto';
import { MarkedReadDto } from './dto/marked-read.dto';
import { InboxService } from './inbox.service';

/** /v1/notifications: the caller's own portal inbox in the chosen tenant. */
@ApiTags('notifications')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.anyMember()
@Controller('notifications')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get()
  list(@CurrentAuth() auth: RequestAuth, @Query() query: ListInboxQueryDto): Promise<InboxPageDto> {
    return this.inboxService.list(auth.requireAccess(), query);
  }

  /** Before :id/read, so "read-all" is not read as an id. */
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  readAll(@CurrentAuth() auth: RequestAuth): Promise<MarkedReadDto> {
    return this.inboxService.markRead(auth.requireAccess(), null);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  read(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<MarkedReadDto> {
    return this.inboxService.markRead(auth.requireAccess(), id);
  }
}
