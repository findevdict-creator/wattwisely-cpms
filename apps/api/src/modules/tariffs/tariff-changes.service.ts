import { Injectable } from '@nestjs/common';
import { SitePermissionChecker } from '../../common/permissions/site-permission.checker';
import { RequestAuth } from '../../common/request/request-auth';
import { CreateTariffRequestDto } from './dto/create-tariff-request.dto';
import { TariffPricesRequestDto } from './dto/tariff-prices-request.dto';
import { TariffDto } from './dto/tariff.dto';
import { UpdateTariffRequestDto } from './dto/update-tariff-request.dto';
import { TariffApprovalRule } from './tariff-approval.rule';
import { TariffErrors } from './tariff-errors';
import { TariffWriter } from './tariff.writer';
import { TariffsRepository } from './tariffs.repository';
import { TariffsService } from './tariffs.service';

/**
 * Creates tariffs, renames them, adds price versions and archives them, each in one
 * transaction with its audit entry. Tariffs belong to the whole company, so changing
 * one needs tariffs:write (or delete) for the whole company. Sessions already running
 * keep the version they started with. Under a managed service agreement a Managed
 * operator's price change may have to be a proposal instead (TariffApprovalRule).
 */
@Injectable()
export class TariffChangesService {
  constructor(
    private readonly tariffs: TariffsRepository,
    private readonly reader: TariffsService,
    private readonly writer: TariffWriter,
    private readonly approval: TariffApprovalRule,
  ) {}

  async create(auth: RequestAuth, request: CreateTariffRequestDto): Promise<TariffDto> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'tariffs:write');
    TariffWriter.check(request.prices);
    const { id, notify } = await this.writer.run(auth, async (tx) => {
      await this.approval.requireDirectChange(tx, auth);
      const tariffId = await this.writer.create(tx, auth, request);
      const name = request.name.trim();
      return {
        id: tariffId,
        notify: await this.approval.notifyOwners(tx, auth, { id: tariffId, name }),
      };
    });
    await notify();
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
    await this.writer.run(auth, async (tx) => {
      const before = await this.reader.require(tx, id);
      const name = request.name.trim();
      await this.writer.update(tx, auth, { id, version }, { name });
      await this.writer.record(tx, auth, 'tariffs.renamed', {
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
    TariffWriter.check(prices);
    const notify = await this.writer.run(auth, async (tx) => {
      await this.approval.requireDirectChange(tx, auth);
      const tariff = await this.reader.require(tx, id);
      await this.writer.addVersion(tx, auth, { ...tariff, version }, prices);
      return this.approval.notifyOwners(tx, auth, tariff);
    });
    await notify();
    return this.reader.get(access, id);
  }

  /** Archived tariffs stay readable for old sessions; one still used by a site cannot be archived. */
  async archive(auth: RequestAuth, id: string, version: number): Promise<void> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'tariffs:delete');
    await this.writer.run(auth, async (tx) => {
      const tariff = await this.reader.require(tx, id);
      const siteCount = (await this.tariffs.countSites(tx, [id])).get(id) ?? 0;
      if (siteCount > 0) {
        throw TariffErrors.inUse(siteCount);
      }
      await this.writer.update(
        tx,
        auth,
        { id, version },
        { status: 'archived', archivedAt: new Date() },
      );
      await this.writer.record(tx, auth, 'tariffs.archived', { tariff });
    });
  }
}
