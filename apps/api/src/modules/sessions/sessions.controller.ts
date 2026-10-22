import { Controller, Get, Header, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiProduces, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto';
import { SessionDetailDto } from './dto/session-detail.dto';
import { SessionPageDto } from './dto/session-page.dto';
import { SessionReadingDto } from './dto/session-reading.dto';
import { SessionCloseService } from './session-close.service';
import { SessionExportService } from './session-export.service';
import { SessionsService } from './sessions.service';

/** /v1/sessions: charging sessions, their receipts and timelines (Sessions and Pricing design). */
@ApiTags('sessions')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly closer: SessionCloseService,
    private readonly exporter: SessionExportService,
  ) {}

  @Get()
  @RouteAccess.requires('sessions:read')
  list(
    @CurrentAuth() auth: RequestAuth,
    @Query() query: ListSessionsQueryDto,
  ): Promise<SessionPageDto> {
    return this.sessionsService.list(auth.requireAccess(), query);
  }

  /** Before :id, so "export" is not read as an id. limit and cursor are ignored. */
  @Get('export')
  @RouteAccess.requires('sessions:export')
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="sessions.csv"')
  export(@CurrentAuth() auth: RequestAuth, @Query() query: ListSessionsQueryDto): Promise<string> {
    return this.exporter.csv(auth.requireAccess(), query);
  }

  @Get(':id')
  @RouteAccess.requires('sessions:read')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<SessionDetailDto> {
    return this.sessionsService.get(auth.requireAccess(), id);
  }

  @Get(':id/meter-values')
  @RouteAccess.requires('sessions:read')
  readings(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
  ): Promise<SessionReadingDto[]> {
    return this.sessionsService.readings(auth.requireAccess(), id);
  }

  /** Ends a stuck session: priced now if it stopped, failed if it never did. */
  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @RouteAccess.requires('sessions:close_stuck')
  close(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<SessionDetailDto> {
    return this.closer.close(auth, id);
  }
}
