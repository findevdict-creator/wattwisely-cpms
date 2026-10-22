import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { PageRequest } from '../../../common/paging/page-request';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { AssetErrors } from '../asset-errors';
import { ConnectorsRepository } from '../connectors/connectors.repository';
import { SitesService } from '../sites/sites.service';
import { ChargerRecord, ChargerDetail } from './charger-record';
import { ChargersRepository } from './chargers.repository';
import { ChargerPageDto } from './dto/charger-page.dto';
import { ChargerDto } from './dto/charger.dto';
import { ListChargersQueryDto } from './dto/list-chargers-query.dto';

/** Reads chargers (story AST-02). A site-scoped role sees only the chargers on its sites. */
@Injectable()
export class ChargersService {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly chargers: ChargersRepository,
    private readonly connectors: ConnectorsRepository,
    private readonly sites: SitesService,
  ) {}

  async list(access: TenantAccess, query: ListChargersQueryDto): Promise<ChargerPageDto> {
    const page = PageRequest.from(query);
    const filter = {
      scope: SitePermissionChecker.scopeOf(access, 'chargers:read'),
      siteId: query.site_id,
      statuses: query.status,
      ocppVersion: query.ocpp_version,
      authMode: query.auth_mode,
      vendor: query.vendor,
      q: query.q,
    };
    const details = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => {
        const records = await this.chargers.findPage(tx, filter, page.cursor, page.fetchSize);
        return this.withConnectors(tx, records);
      },
    );
    const { items, nextCursor } = page.cut(details, (charger) =>
      charger.ocppIdentity.toLowerCase(),
    );
    return new ChargerPageDto(
      items.map((charger) => new ChargerDto(charger)),
      nextCursor,
    );
  }

  async get(access: TenantAccess, id: string): Promise<ChargerDto> {
    const detail = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => {
        const record = await this.requireVisible(tx, access, id);
        return (await this.withConnectors(tx, [record]))[0];
      },
    );
    return new ChargerDto(detail);
  }

  /** The charger, or 404 when it does not exist or its site lies outside the caller's chargers:read scope. */
  async requireVisible(tx: Transaction, access: TenantAccess, id: string): Promise<ChargerRecord> {
    const record = UuidV7.isUuid(id) ? await this.chargers.findById(tx, id) : null;
    if (!record || !SitePermissionChecker.isAllowedAt(access, 'chargers:read', record.siteId)) {
      throw AssetErrors.chargerNotFound();
    }
    return record;
  }

  /** A site named in a request body: it must exist (422) and the caller needs chargers:write there (403). */
  async requireSiteForWrite(tx: Transaction, access: TenantAccess, siteId: string): Promise<void> {
    if (!(await this.sites.exists(tx, siteId))) {
      throw AssetErrors.siteUnknown();
    }
    SitePermissionChecker.requireAt(access, 'chargers:write', siteId);
  }

  async withConnectors(tx: Transaction, records: ChargerRecord[]): Promise<ChargerDetail[]> {
    const connectors = await this.connectors.findByChargers(
      tx,
      records.map((record) => record.id),
    );
    return records.map((record) => ({
      ...record,
      connectors: connectors.filter((connector) => connector.chargerId === record.id),
    }));
  }
}
