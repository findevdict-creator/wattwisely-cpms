import { Injectable } from '@nestjs/common';
import {
  DatabaseErrors,
  DatabaseSession,
  Transaction,
  TransactionRunner,
  UuidV7,
} from '@wattwisely/db';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { VersionConflict } from '../../common/problem/version-conflict';
import { RequestAuth } from '../../common/request/request-auth';
import { TariffPricesRequestDto } from './dto/tariff-prices-request.dto';
import { TariffErrors } from './tariff-errors';
import { TariffPriceRules } from './tariff-price-rules';
import { TariffPrices } from './tariff-prices';
import { TariffRecord } from './tariff-record';
import { TariffsRepository } from './tariffs.repository';
import { TariffsService } from './tariffs.service';

/** A new tariff: its name, currency and first prices. */
export interface NewTariff {
  name: string;
  currency: string;
  prices: TariffPricesRequestDto;
}

/**
 * The database side of tariff changes, inside the caller's transaction: a new tariff with
 * its first version, a new version, a checked update, and the audit entry for each. Shared
 * by the tariff endpoints and by approving a proposal (module 10).
 */
@Injectable()
export class TariffWriter {
  static readonly NAME_INDEX = 'tariffs_name_unique';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly tariffs: TariffsRepository,
    private readonly reader: TariffsService,
    private readonly audit: AuditRecorder,
  ) {}

  /** One transaction in the tenant; a taken name becomes a 409. */
  async run<T>(auth: RequestAuth, work: (tx: Transaction) => Promise<T>): Promise<T> {
    const session = DatabaseSession.forTenant(auth.requireAccess().tenant.id);
    try {
      return await this.transactionRunner.run(session, work);
    } catch (error) {
      if (DatabaseErrors.violatedUniqueConstraint(error) === TariffWriter.NAME_INDEX) {
        throw TariffErrors.nameTaken();
      }
      throw error;
    }
  }

  /** The bands must cover the week and the limits must agree, or 422. */
  static check(prices: TariffPricesRequestDto): void {
    const problems = TariffPriceRules.problemsOf(prices);
    if (problems.length > 0) {
      throw TariffErrors.invalidPrices(problems);
    }
  }

  async create(tx: Transaction, auth: RequestAuth, tariff: NewTariff): Promise<string> {
    const id = UuidV7.create();
    const name = tariff.name.trim();
    const accountId = auth.requireAccount().id;
    await this.tariffs.insert(tx, {
      id,
      tenantId: auth.requireAccess().tenant.id,
      name,
      currency: tariff.currency,
      createdBy: accountId,
      updatedBy: accountId,
    });
    await this.insertVersion(tx, auth, { id, number: 1 }, tariff.prices);
    await this.record(tx, auth, 'tariffs.created', { tariff: { id, name } });
    return id;
  }

  /** New prices: a new version, in force for sessions that start from now on. */
  async addVersion(
    tx: Transaction,
    auth: RequestAuth,
    tariff: TariffRecord,
    prices: TariffPricesRequestDto,
  ): Promise<number> {
    if (tariff.status !== 'active') {
      throw TariffErrors.archived();
    }
    const versions = await this.tariffs.findVersions(tx, tariff.id);
    await this.update(tx, auth, { id: tariff.id, version: tariff.version }, {});
    const number = (versions[0]?.number ?? 0) + 1;
    await this.insertVersion(tx, auth, { id: tariff.id, number }, prices);
    await this.record(tx, auth, 'tariffs.prices_changed', { tariff, after: { version: number } });
    return number;
  }

  /** Changes the row if it still has the version the caller saw, else 409. */
  async update(
    tx: Transaction,
    auth: RequestAuth,
    expected: { id: string; version: number },
    changes: object,
  ): Promise<void> {
    const isSaved = await this.tariffs.update(tx, expected.id, expected.version, {
      ...changes,
      updatedBy: auth.requireAccount().id,
    });
    if (!isSaved) {
      throw VersionConflict.exception();
    }
  }

  record(
    tx: Transaction,
    auth: RequestAuth,
    action: string,
    change: { tariff: { id: string; name: string }; before?: object; after?: object },
  ): Promise<void> {
    return this.audit.record(tx, auth, {
      action,
      targetType: 'tariff',
      targetId: change.tariff.id,
      targetLabel: change.tariff.name,
      before: change.before ?? null,
      after: change.after ?? null,
    });
  }

  private async insertVersion(
    tx: Transaction,
    auth: RequestAuth,
    tariff: { id: string; number: number },
    prices: TariffPricesRequestDto,
  ): Promise<void> {
    await this.tariffs.insertVersion(tx, {
      id: UuidV7.create(),
      tenantId: auth.requireAccess().tenant.id,
      tariffId: tariff.id,
      number: tariff.number,
      ...TariffPrices.versionColumns(prices),
      createdBy: auth.requireAccount().id,
    });
  }
}
