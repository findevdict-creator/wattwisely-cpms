import { Injectable } from '@nestjs/common';
import {
  DatabaseErrors,
  DatabaseSession,
  Transaction,
  TransactionRunner,
  UuidV7,
} from '@wattwisely/db';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { AssetChangeRecorder } from '../asset-change.recorder';
import { AssetErrors } from '../asset-errors';
import { CreateSiteRequestDto } from './dto/create-site-request.dto';
import { SiteDto } from './dto/site.dto';
import { UpdateSiteRequestDto } from './dto/update-site-request.dto';
import { SiteRecord } from './site-record';
import { SiteSnapshot } from './site-snapshot';
import { SitesRepository } from './sites.repository';
import { SitesService } from './sites.service';

/** Creates, changes and removes sites (story AST-01), each in one transaction with its audit entry. */
@Injectable()
export class SiteChangesService {
  static readonly NAME_INDEX = 'sites_name_unique';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly sites: SitesRepository,
    private readonly reader: SitesService,
    private readonly changes: AssetChangeRecorder,
  ) {}

  /** Only someone whose sites:write covers the whole company can add a site. */
  async create(auth: RequestAuth, request: CreateSiteRequestDto): Promise<SiteDto> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'sites:write');
    const id = UuidV7.create();
    const row = {
      id,
      tenantId: access.tenant.id,
      ...SiteChangesService.columnsOf(request),
      name: request.name.trim(),
      address: request.address,
      latitude: request.latitude,
      longitude: request.longitude,
      timeZone: request.time_zone,
      createdBy: auth.requireAccount().id,
      updatedBy: auth.requireAccount().id,
    };
    await this.run(auth, async (tx) => {
      await this.sites.insert(tx, row);
      const after = (await this.sites.findById(tx, id)) as SiteRecord;
      await this.record(tx, auth, 'sites.created', { before: null, after });
    });
    return this.reader.get(access, id);
  }

  async update(
    auth: RequestAuth,
    id: string,
    version: number,
    request: UpdateSiteRequestDto,
  ): Promise<SiteDto> {
    const access = auth.requireAccess();
    await this.run(auth, async (tx) => {
      const before = await this.reader.requireVisible(tx, access, id);
      SitePermissionChecker.requireAt(access, 'sites:write', before.id);
      const changes = {
        ...SiteChangesService.columnsOf(request),
        updatedBy: auth.requireAccount().id,
      };
      if (!(await this.sites.update(tx, id, version, changes))) {
        throw VersionConflict.exception();
      }
      const after = (await this.sites.findById(tx, id)) as SiteRecord;
      await this.record(tx, auth, 'sites.updated', { before, after });
    });
    return this.reader.get(access, id);
  }

  /** Soft delete: refused while chargers are on the site; past sessions keep the site name. */
  async remove(auth: RequestAuth, id: string, version: number): Promise<void> {
    const access = auth.requireAccess();
    await this.run(auth, async (tx) => {
      const before = await this.reader.requireVisible(tx, access, id);
      SitePermissionChecker.requireAt(access, 'sites:delete', before.id);
      if ((await this.sites.countChargers(tx, id)) > 0) {
        throw AssetErrors.siteHasChargers();
      }
      const changes = { deletedAt: new Date(), updatedBy: auth.requireAccount().id };
      if (!(await this.sites.update(tx, id, version, changes))) {
        throw VersionConflict.exception();
      }
      await this.record(tx, auth, 'sites.deleted', { before, after: null });
    });
  }

  private async run(auth: RequestAuth, work: (tx: Transaction) => Promise<void>): Promise<void> {
    const session = DatabaseSession.forTenant(auth.requireAccess().tenant.id);
    try {
      await this.transactionRunner.run(session, work);
    } catch (error) {
      if (DatabaseErrors.violatedUniqueConstraint(error) === SiteChangesService.NAME_INDEX) {
        throw AssetErrors.siteNameTaken();
      }
      throw error;
    }
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    action: string,
    change: { before: SiteRecord | null; after: SiteRecord | null },
  ): Promise<void> {
    const site = (change.after ?? change.before) as SiteRecord;
    return this.changes.record(tx, auth, action, {
      target: { type: 'site', id: site.id, label: site.name },
      before: SiteSnapshot.of(change.before),
      after: SiteSnapshot.of(change.after),
    });
  }

  /** The request's fields as table columns; fields that were not sent stay untouched. */
  private static columnsOf(request: CreateSiteRequestDto | UpdateSiteRequestDto) {
    return {
      name: request.name?.trim(),
      address: request.address,
      latitude: request.latitude,
      longitude: request.longitude,
      timeZone: request.time_zone,
      openingHours: request.opening_hours,
      visibility: request.visibility,
      powerLimitKw: request.power_limit_kw,
      parkingNotes: request.parking_notes?.trim(),
    };
  }
}
