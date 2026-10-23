import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { IfMatch } from '../../../common/request/if-match.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { ReportScheduleListDto } from './dto/report-schedule-list.dto';
import { ReportScheduleRequestDto } from './dto/report-schedule-request.dto';
import { ReportScheduleDto } from './dto/report-schedule.dto';
import { ReportSchedulesService } from './report-schedules.service';

/** /v1/reports/schedules: usage reports e-mailed every week or month (Full reports module). */
@ApiTags('reports')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Tenant-Id', required: false })
@RouteAccess.requires('reports:schedule')
@Controller('reports/schedules')
export class ReportSchedulesController {
  constructor(private readonly schedulesService: ReportSchedulesService) {}

  @Get()
  list(@CurrentAuth() auth: RequestAuth): Promise<ReportScheduleListDto> {
    return this.schedulesService.list(auth.requireAccess());
  }

  @Post()
  create(
    @CurrentAuth() auth: RequestAuth,
    @Body() request: ReportScheduleRequestDto,
  ): Promise<ReportScheduleDto> {
    return this.schedulesService.create(auth, request);
  }

  /** Saving moves the next run to the next week or month boundary from now. */
  @Put(':id')
  update(
    @CurrentAuth() auth: RequestAuth,
    @Param('id') id: string,
    @Body() request: ReportScheduleRequestDto,
    @IfMatch() version: number,
  ): Promise<ReportScheduleDto> {
    return this.schedulesService.update(auth, id, request, version);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentAuth() auth: RequestAuth, @Param('id') id: string): Promise<void> {
    return this.schedulesService.remove(auth, id);
  }
}
