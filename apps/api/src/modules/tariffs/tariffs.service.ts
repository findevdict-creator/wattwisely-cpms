import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { PageRequest } from '../../common/paging/page-request';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { ListTariffsQueryDto } from './dto/list-tariffs-query.dto';
import { TariffPageDto } from './dto/tariff-page.dto';
import { TariffVersionDto } from './dto/tariff-version.dto';
import { TariffDto } from './dto/tariff.dto';
import { TariffErrors } from './tariff-errors';
import { TariffRecord, TariffSummary } from './tariff-record';
import { TariffsRepository } from './tariffs.repository';

/** Reads tariffs. Tariffs belong to the whole company, so anyone with tariffs:read sees them all. */
@Injectable()
export class TariffsService {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly tariffs: TariffsRepository,
  ) {}

  async list(access: TenantAccess, query: ListTariffsQueryDto): Promise<TariffPageDto> {
    const page = PageRequest.from(query);
    const summaries = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => {
        const records = await this.tariffs.findPage(
          tx,
          query.status ?? 'active',
          page.cursor,
          page.fetchSize,
        );
        return this.withDetails(tx, records);
      },
    );
    const { items, nextCursor } = page.cut(summaries, (tariff) => tariff.name.toLowerCase());
    return new TariffPageDto(
      items.map((tariff) => new TariffDto(tariff)),
      nextCursor,
    );
  }

  async get(access: TenantAccess, id: string): Promise<TariffDto> {
    const summary = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => (await this.withDetails(tx, [await this.require(tx, id)]))[0],
    );
    return new TariffDto(summary);
  }

  async versions(access: TenantAccess, id: string): Promise<TariffVersionDto[]> {
    const rows = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => {
        await this.require(tx, id);
        return this.tariffs.findVersions(tx, id);
      },
    );
    return rows.map((row) => new TariffVersionDto(row));
  }

  /** The tariff, or 404. */
  async require(tx: Transaction, id: string): Promise<TariffRecord> {
    const record = UuidV7.isUuid(id) ? await this.tariffs.findById(tx, id) : null;
    if (!record) {
      throw TariffErrors.notFound();
    }
    return record;
  }

  /** Is this an active tariff of the tenant? For a tariff named in a site's request body. */
  async isAssignable(tx: Transaction, id: string): Promise<boolean> {
    const record = UuidV7.isUuid(id) ? await this.tariffs.findById(tx, id) : null;
    return record?.status === 'active';
  }

  async withDetails(tx: Transaction, records: TariffRecord[]): Promise<TariffSummary[]> {
    const ids = records.map((record) => record.id);
    const versions = await this.tariffs.findCurrentVersions(tx, ids);
    const siteCounts = await this.tariffs.countSites(tx, ids);
    return records
      .filter((record) => versions.has(record.id))
      .map((record) => ({
        ...record,
        currentVersion: versions.get(record.id) as TariffSummary['currentVersion'],
        siteCount: siteCounts.get(record.id) ?? 0,
      }));
  }
}
