import { HttpStatus, Injectable } from '@nestjs/common';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { ProblemException } from '../../../common/problem/problem.exception';
import { RequestAuth } from '../../../common/request/request-auth';
import { AuditLogCursor } from '../../audit-log/audit-log-cursor';
import { AuditLogRepository } from '../../audit-log/audit-log.repository';
import { AdminAuditLogQueryDto } from './dto/admin-audit-log-query.dto';
import { PlatformAuditEntryDto } from './dto/platform-audit-entry.dto';
import { PlatformAuditPageDto } from './dto/platform-audit-page.dto';

/** The audit log across every tenant plus platform actions, for Wattwisely staff. */
@Injectable()
export class AdminAuditLogService {
  static readonly DEFAULT_LIMIT = 25;

  constructor(
    private readonly platform: PlatformTransaction,
    private readonly repository: AuditLogRepository,
  ) {}

  async list(auth: RequestAuth, query: AdminAuditLogQueryDto): Promise<PlatformAuditPageDto> {
    const cursor = query.cursor ? AuditLogCursor.parse(query.cursor) : null;
    if (query.cursor && !cursor) {
      throw new ProblemException(
        HttpStatus.BAD_REQUEST,
        'validation_failed',
        'cursor is not valid',
      );
    }
    const limit = query.limit ?? AdminAuditLogService.DEFAULT_LIMIT;
    const records = await this.platform.run(auth, (tx) =>
      this.repository.findPage(tx, query, cursor, limit + 1),
    );
    const page = records.slice(0, limit);
    const last = page[page.length - 1];
    const next = records.length > limit ? new AuditLogCursor(last.occurredAt, last.id) : null;
    return new PlatformAuditPageDto(
      page.map((record) => new PlatformAuditEntryDto(record, true)),
      next?.toString() ?? null,
    );
  }
}
