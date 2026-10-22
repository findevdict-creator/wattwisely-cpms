import { Module } from '@nestjs/common';
import { SessionCloseService } from './session-close.service';
import { SessionExportService } from './session-export.service';
import { SessionsController } from './sessions.controller';
import { SessionsRepository } from './sessions.repository';
import { SessionsService } from './sessions.service';

/** Charging sessions for staff: lists, receipts, timelines, export and closing stuck ones (module 5). */
@Module({
  controllers: [SessionsController],
  providers: [SessionsRepository, SessionsService, SessionCloseService, SessionExportService],
})
export class SessionsModule {}
