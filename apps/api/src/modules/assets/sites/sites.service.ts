import { Injectable } from '@nestjs/common';
import { DatabaseSession } from '../../../common/database/database-session';
import { Transaction, TransactionRunner } from '../../../common/database/transaction-runner';
import { UuidV7 } from '../../../common/database/uuid-v7';
import { PageRequest } from '../../../common/paging/page-request';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { AssetErrors } from '../asset-errors';
import { ListSitesQueryDto } from './dto/list-sites-query.dto';
import { SitePageDto } from './dto/site-page.dto';
import { SiteDto } from './dto/site.dto';
import { SiteRecord, SiteSummary } from './site-record';
import { SitesRepository } from './sites.repository';

/** Reads sites (story AST-01). A site-scoped role sees only its own sites, in lists and by id. */
@Injectable()
export class SitesService {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly sites: SitesRepository,
  ) {}

  async list(access: TenantAccess, query: ListSitesQueryDto): Promise<SitePageDto> {
    const page = PageRequest.from(query);
    const filter = {
      scope: SitePermissionChecker.scopeOf(access, 'sites:read'),
      visibility: query.visibility,
      q: query.q,
    };
    const summaries = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => {
        const records = await this.sites.findPage(tx, filter, page.cursor, page.fetchSize);
        return this.withFleets(tx, records);
      },
    );
    const { items, nextCursor } = page.cut(summaries, (site) => site.name.toLowerCase());
    return new SitePageDto(
      items.map((site) => new SiteDto(site)),
      nextCursor,
    );
  }

  async get(access: TenantAccess, id: string): Promise<SiteDto> {
    const summary = await this.transactionRunner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => {
        const record = await this.requireVisible(tx, access, id);
        return (await this.withFleets(tx, [record]))[0];
      },
    );
    return new SiteDto(summary);
  }

  /** The site, or 404 when it does not exist or lies outside the caller's sites:read scope. */
  async requireVisible(tx: Transaction, access: TenantAccess, id: string): Promise<SiteRecord> {
    const record = UuidV7.isUuid(id) ? await this.sites.findById(tx, id) : null;
    if (!record || !SitePermissionChecker.isAllowedAt(access, 'sites:read', record.id)) {
      throw AssetErrors.siteNotFound();
    }
    return record;
  }

  /** Does a (non-deleted) site with this id exist in the tenant? For ids named in request bodies. */
  async exists(tx: Transaction, id: string): Promise<boolean> {
    return UuidV7.isUuid(id) && (await this.sites.findExistingIds(tx, [id])).has(id);
  }

  async withFleets(tx: Transaction, records: SiteRecord[]): Promise<SiteSummary[]> {
    const fleets = await this.sites.findFleets(
      tx,
      records.map((record) => record.id),
    );
    const empty = { chargerCount: 0, chargerStatuses: {}, connectorStatuses: {} };
    return records.map((record) => ({ ...record, fleet: fleets.get(record.id) ?? empty }));
  }
}
