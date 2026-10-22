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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { CreateSiteRequestDto } from './dto/create-site-request.dto';
import { ListSitesQueryDto } from './dto/list-sites-query.dto';
import { SitePageDto } from './dto/site-page.dto';
import { SiteDto } from './dto/site.dto';
import { UpdateSiteRequestDto } from './dto/update-site-request.dto';
import { SiteChangesService } from './site-changes.service';
import { SitesService } from './sites.service';

/** /v1/sites: charging locations (story AST-01). */
@ApiTags('sites')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@Controller('sites')
export class SitesController {
  constructor(
    private readonly sitesService: SitesService,
    private readonly siteChanges: SiteChangesService,
  ) {}

  @Get()
  @RouteAccess.requires('sites:read')
  list(@CurrentAuth() auth: RequestAuth, @Query() query: ListSitesQueryDto): Promise<SitePageDto> {
    return this.sitesService.list(auth.requireAccess(), query);
  }

  @Get(':id')
  @RouteAccess.requires('sites:read')
  get(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<SiteDto> {
    return this.sitesService.get(auth.requireAccess(), id);
  }

  @Post()
  @RouteAccess.requires('sites:write')
  create(@CurrentAuth() auth: RequestAuth, @Body() body: CreateSiteRequestDto): Promise<SiteDto> {
    return this.siteChanges.create(auth, body);
  }

  @Patch(':id')
  @RouteAccess.requires('sites:write')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
    @Body() body: UpdateSiteRequestDto,
  ): Promise<SiteDto> {
    return this.siteChanges.update(auth, id, version, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RouteAccess.requires('sites:delete')
  remove(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @IfMatch() version: number,
  ): Promise<void> {
    return this.siteChanges.remove(auth, id, version);
  }
}
