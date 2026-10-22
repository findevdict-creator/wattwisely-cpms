import { Injectable } from '@nestjs/common';
import {
  DatabaseErrors,
  DatabaseSession,
  Transaction,
  TransactionRunner,
  UuidV7,
} from '@wattwisely/db';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { SitePermissionChecker } from '../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../common/problem/version-conflict';
import { RequestAuth } from '../../common/request/request-auth';
import { CreateTariffRequestDto } from './dto/create-tariff-request.dto';
import { TariffPricesRequestDto } from './dto/tariff-prices-request.dto';
import { TariffDto } from './dto/tariff.dto';
import { UpdateTariffRequestDto } from './dto/update-tariff-request.dto';
import { TariffErrors } from './tariff-errors';
import { TariffPriceRules } from './tariff-price-rules';
import { TariffPrices } from './tariff-prices';
import { TariffsRepository } from './tariffs.repository';
import { TariffsService } from './tariffs.service';

/**
 * Creates tariffs, renames them, adds price versions and archives them, each in one
 * transaction with its audit entry. Tariffs belong to the whole company, so changing
 * one needs tariffs:write (or delete) for the whole company. Sessions already running
 * keep the version they started with.
 */
@Injectable()
export class TariffChangesService {
  static readonly NAME_INDEX = 'tariffs_name_unique';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly tariffs: TariffsRepository,
    private readonly reader: TariffsService,
    private readonly audit: AuditRecorder,
  ) {}

  async create(auth: RequestAuth, request: CreateTariffRequestDto): Promise<TariffDto> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'tariffs:write');
    TariffChangesService.check(request.prices);
    const id = UuidV7.create();
    const accountId = auth.requireAccount().id;
    await this.run(auth, async (tx) => {
      await this.tariffs.insert(tx, {
        id,
        tenantId: access.tenant.id,
        name: request.name.trim(),
        currency: request.currency,
        createdBy: accountId,
        updatedBy: accountId,
      });
      await this.insertVersion(tx, auth, { id, number: 1 }, request.prices);
      await this.record(tx, auth, 'tariffs.created', { tariff: { id, name: request.name.trim() } });
    });
    return this.reader.get(access, id);
  }

  async rename(
    auth: RequestAuth,
    id: string,
    version: number,
    request: UpdateTariffRequestDto,
  ): Promise<TariffDto> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'tariffs:write');
    await this.run(auth, async (tx) => {
      const before = await this.reader.require(tx, id);
      const name = request.name.trim();
      await this.update(tx, auth, { id, version }, { name });
      await this.record(tx, auth, 'tariffs.renamed', {
        tariff: before,
        before: { name: before.name },
        after: { name },
      });
    });
    return this.reader.get(access, id);
  }

  /** New prices: a new version, in force for sessions that start from now on. */
  async addVersion(
    auth: RequestAuth,
    id: string,
    version: number,
    prices: TariffPricesRequestDto,
  ): Promise<TariffDto> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'tariffs:write');
    TariffChangesService.check(prices);
    await this.run(auth, async (tx) => {
      const tariff = await this.reader.require(tx, id);
      if (tariff.status !== 'active') {
        throw TariffErrors.archived();
      }
      const versions = await this.tariffs.findVersions(tx, id);
      await this.update(tx, auth, { id, version }, {});
      const number = (versions[0]?.number ?? 0) + 1;
      await this.insertVersion(tx, auth, { id, number }, prices);
      await this.record(tx, auth, 'tariffs.prices_changed', { tariff, after: { version: number } });
    });
    return this.reader.get(access, id);
  }

  /** Archived tariffs stay readable for old sessions; one still used by a site cannot be archived. */
  async archive(auth: RequestAuth, id: string, version: number): Promise<void> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'tariffs:delete');
    await this.run(auth, async (tx) => {
      const tariff = await this.reader.require(tx, id);
      const siteCount = (await this.tariffs.countSites(tx, [id])).get(id) ?? 0;
      if (siteCount > 0) {
        throw TariffErrors.inUse(siteCount);
      }
      await this.update(tx, auth, { id, version }, { status: 'archived', archivedAt: new Date() });
      await this.record(tx, auth, 'tariffs.archived', { tariff });
    });
  }

  private async update(
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

  private record(
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

  private async run(auth: RequestAuth, work: (tx: Transaction) => Promise<void>): Promise<void> {
    const session = DatabaseSession.forTenant(auth.requireAccess().tenant.id);
    try {
      await this.transactionRunner.run(session, work);
    } catch (error) {
      if (DatabaseErrors.violatedUniqueConstraint(error) === TariffChangesService.NAME_INDEX) {
        throw TariffErrors.nameTaken();
      }
      throw error;
    }
  }

  private static check(prices: TariffPricesRequestDto): void {
    const problems = TariffPriceRules.problemsOf(prices);
    if (problems.length > 0) {
      throw TariffErrors.invalidPrices(problems);
    }
  }
}
