import { HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseSession } from '../../common/database/database-session';
import { TransactionRunner } from '../../common/database/transaction-runner';
import { UuidV7 } from '../../common/database/uuid-v7';
import { ProblemException } from '../../common/problem/problem.exception';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { AuditLogCursor } from './audit-log-cursor';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogEntryDto } from './dto/audit-log-entry.dto';
import { AuditLogPageDto } from './dto/audit-log-page.dto';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto';

/** Lets Owners search their tenant's audit log (story SEC-01). Writing is AuditRecorder's job. */
@Injectable()
export class AuditLogService {
  static readonly DEFAULT_LIMIT = 25;

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly repository: AuditLogRepository,
  ) {}

  async list(access: TenantAccess, query: ListAuditLogQueryDto): Promise<AuditLogPageDto> {
    const cursor = query.cursor ? AuditLogCursor.parse(query.cursor) : null;
    if (query.cursor && !cursor) {
      throw new ProblemException(
        HttpStatus.BAD_REQUEST,
        'validation_failed',
        'cursor is not valid',
      );
    }
    const limit = query.limit ?? AuditLogService.DEFAULT_LIMIT;
    const records = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      (tx) => this.repository.findPage(tx, query, cursor, limit + 1),
    );
    const page = records.slice(0, limit);
    const last = page[page.length - 1];
    const next = records.length > limit ? new AuditLogCursor(last.occurredAt, last.id) : null;
    return new AuditLogPageDto(
      page.map((record) => new AuditLogEntryDto(record, false)),
      next?.toString() ?? null,
    );
  }

  async get(access: TenantAccess, id: string): Promise<AuditLogEntryDto> {
    const record = UuidV7.isUuid(id)
      ? await this.transactionRunner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
          this.repository.findById(tx, id),
        )
      : null;
    if (!record) {
      throw new ProblemException(
        HttpStatus.NOT_FOUND,
        'audit_entry_not_found',
        'This entry does not exist.',
      );
    }
    return new AuditLogEntryDto(record, true);
  }
}
