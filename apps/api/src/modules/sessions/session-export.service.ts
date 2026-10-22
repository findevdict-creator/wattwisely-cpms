import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto';
import { SessionCsv } from './session-csv';
import { SessionErrors } from './session-errors';
import { SessionFilters } from './session-filters';
import { SessionsRepository } from './sessions.repository';

/** GET /v1/sessions/export: the filtered sessions as one CSV file, at the sites sessions:export covers. */
@Injectable()
export class SessionExportService {
  static readonly MAX_ROWS = 10_000;

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly sessions: SessionsRepository,
  ) {}

  async csv(access: TenantAccess, query: ListSessionsQueryDto): Promise<string> {
    const filter = SessionFilters.of(access, 'sessions:export', query);
    const records = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      (tx) => this.sessions.findAll(tx, filter, SessionExportService.MAX_ROWS + 1),
    );
    if (records.length > SessionExportService.MAX_ROWS) {
      throw SessionErrors.exportTooLarge(SessionExportService.MAX_ROWS);
    }
    return SessionCsv.of(records);
  }
}
