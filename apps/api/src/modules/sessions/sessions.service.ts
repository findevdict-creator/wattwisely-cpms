import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { PageRequest } from '../../common/paging/page-request';
import { SitePermissionChecker } from '../../common/permissions/site-permission.checker';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto';
import { SessionDetailDto } from './dto/session-detail.dto';
import { SessionPageDto } from './dto/session-page.dto';
import { SessionReadingDto } from './dto/session-reading.dto';
import { SessionDto } from './dto/session.dto';
import { SessionErrors } from './session-errors';
import { SessionFilters } from './session-filters';
import { SessionRecord } from './session-record';
import { SessionsRepository } from './sessions.repository';

/**
 * Reads charging sessions. sessions:read is site-scoped: a Site Manager sees the
 * sessions at their own sites only, in lists and by id.
 */
@Injectable()
export class SessionsService {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly sessions: SessionsRepository,
  ) {}

  async list(access: TenantAccess, query: ListSessionsQueryDto): Promise<SessionPageDto> {
    const page = PageRequest.from(query);
    const filter = SessionFilters.of(access, 'sessions:read', query);
    const records = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      (tx) => this.sessions.findPage(tx, filter, page.cursor, page.fetchSize),
    );
    const { items, nextCursor } = page.cut(records, (session) => session.startedAt.toISOString());
    return new SessionPageDto(
      items.map((session) => new SessionDto(session)),
      nextCursor,
    );
  }

  async get(access: TenantAccess, id: string): Promise<SessionDetailDto> {
    return this.transactionRunner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) =>
      this.detail(tx, await this.requireVisible(tx, access, id)),
    );
  }

  /** The energy chart: 0 Wh at the start, each reading since the start, and the stop reading. */
  async readings(access: TenantAccess, id: string): Promise<SessionReadingDto[]> {
    return this.transactionRunner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const session = await this.requireVisible(tx, access, id);
      const readings = await this.sessions.findReadings(tx, id);
      const points = [
        { at: session.startedAt, energyWh: 0, powerW: null, socPercent: null },
        ...readings.map((reading) => ({
          ...reading,
          energyWh: reading.energyWh === null ? null : reading.energyWh - session.meterStartWh,
        })),
      ];
      if (session.endedAt && session.meterStopWh !== null) {
        const energyWh = session.meterStopWh - session.meterStartWh;
        points.push({ at: session.endedAt, energyWh, powerW: null, socPercent: null });
      }
      return points.map((point) => new SessionReadingDto(point));
    });
  }

  async detail(tx: Transaction, session: SessionRecord): Promise<SessionDetailDto> {
    const tariff = session.tariffVersionId
      ? await this.sessions.findTariff(tx, session.tariffVersionId)
      : null;
    const lines = await this.sessions.findLines(tx, session.id);
    const history = await this.sessions.findHistory(tx, session.id);
    return new SessionDetailDto(session, { tariff, lines, history });
  }

  /** The session, or 404 when it does not exist or lies outside the caller's sessions:read scope. */
  async requireVisible(tx: Transaction, access: TenantAccess, id: string): Promise<SessionRecord> {
    const record = UuidV7.isUuid(id) ? await this.sessions.findById(tx, id) : null;
    if (!record || !SitePermissionChecker.isAllowedAt(access, 'sessions:read', record.siteId)) {
      throw SessionErrors.notFound();
    }
    return record;
  }
}
