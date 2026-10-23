import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiProduces, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { CreateReportExportRequestDto } from './dto/create-report-export-request.dto';
import { ReportExportListDto } from './dto/report-export-list.dto';
import { ReportExportDto } from './dto/report-export.dto';
import { ReportExportsService } from './report-exports.service';

/**
 * /v1/reports/exports: files built in the background. Any member may ask; the kind of
 * file decides the permission it needs, checked in the service.
 */
@ApiTags('reports')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.anyMember()
@Controller('reports/exports')
export class ReportExportsController {
  constructor(private readonly exportsService: ReportExportsService) {}

  @Post()
  create(
    @CurrentAuth() auth: RequestAuth,
    @Body() request: CreateReportExportRequestDto,
  ): Promise<ReportExportDto> {
    return this.exportsService.create(auth, request);
  }

  @Get()
  list(@CurrentAuth() auth: RequestAuth): Promise<ReportExportListDto> {
    return this.exportsService.list(auth.requireAccess());
  }

  @Get(':id/download')
  @ApiProduces('text/csv')
  async download(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<Buffer> {
    const file = await this.exportsService.download(auth.requireAccess(), id);
    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return file.csv;
  }
}
