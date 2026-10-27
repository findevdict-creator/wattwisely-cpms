import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { PageRequest } from '../../../common/paging/page-request';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { RfidCardsRepository } from '../cards/rfid-cards.repository';
import { DriverErrors } from '../driver-errors';
import { DriverPersonalData } from './driver-personal-data';
import { DriverRecord, DriverSummary } from './driver-record';
import { DriversRepository } from './drivers.repository';
import { DriverDetailDto } from './dto/driver-detail.dto';
import { DriverPageDto } from './dto/driver-page.dto';
import { DriverDto } from './dto/driver.dto';
import { ListDriversQueryDto } from './dto/list-drivers-query.dto';

/**
 * Reads drivers (story DRV-01). Drivers belong to the tenant as a whole, so anyone with
 * drivers:read sees them all; e-mail and phone need drivers:read_personal.
 */
@Injectable()
export class DriversService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly drivers: DriversRepository,
    private readonly cards: RfidCardsRepository,
  ) {}

  async list(access: TenantAccess, query: ListDriversQueryDto): Promise<DriverPageDto> {
    const page = PageRequest.from(query);
    const filter = { q: query.q?.trim(), status: query.status, groupId: query.group_id };
    const summaries = await this.runner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => {
        const records = await this.drivers.findPage(tx, filter, page.cursor, page.fetchSize);
        return this.withGroups(tx, records);
      },
    );
    const { items, nextCursor } = page.cut(summaries, (driver) => driver.name.toLowerCase());
    return new DriverPageDto(
      items.map((driver) => new DriverDto(DriverPersonalData.shownTo(access, driver))),
      nextCursor,
    );
  }

  async get(access: TenantAccess, id: string): Promise<DriverDetailDto> {
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.detail(tx, access, id),
    );
  }

  /** The driver with their groups and cards, personal data as the caller may see it. */
  async detail(tx: Transaction, access: TenantAccess, id: string): Promise<DriverDetailDto> {
    const record = await this.requireVisible(tx, id);
    const [summary] = await this.withGroups(tx, [record]);
    const cards = await this.cards.findByDriver(tx, record.id);
    return new DriverDetailDto(DriverPersonalData.shownTo(access, summary), cards);
  }

  /** The driver, or 404 when it does not exist or was deleted. */
  async requireVisible(tx: Transaction, id: string): Promise<DriverRecord> {
    const record = UuidV7.isUuid(id) ? await this.drivers.findById(tx, id) : null;
    if (!record || record.isDeleted) {
      throw DriverErrors.notFound();
    }
    return record;
  }

  async withGroups(tx: Transaction, records: DriverRecord[]): Promise<DriverSummary[]> {
    const groups = await this.drivers.findGroupsOf(
      tx,
      records.map((record) => record.id),
    );
    return records.map((record) => ({ ...record, groups: groups.get(record.id) ?? [] }));
  }
}
