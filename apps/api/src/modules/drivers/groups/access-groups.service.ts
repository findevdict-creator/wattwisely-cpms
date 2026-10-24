import { Injectable } from '@nestjs/common';
import {
  DatabaseErrors,
  DatabaseSession,
  Transaction,
  TransactionRunner,
  UuidV7,
} from '@wattwisely/db';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { AssetErrors } from '../../assets/asset-errors';
import { SitesRepository } from '../../assets/sites/sites.repository';
import { DriverErrors } from '../driver-errors';
import { DriverStores } from '../driver-stores';
import { AccessGroupRecord } from './access-group-record';
import { AccessGroupListDto } from './dto/access-group-list.dto';
import { AccessGroupDto } from './dto/access-group.dto';
import { SaveAccessGroupRequestDto } from './dto/save-access-group-request.dto';

/**
 * Access groups (story AST-04): which drivers may charge at which private sites. Changing
 * groups needs drivers:write for the whole company, as drivers are not tied to a site.
 */
@Injectable()
export class AccessGroupsService {
  static readonly NAME_INDEX = 'access_groups_name_unique';

  constructor(
    private readonly runner: TransactionRunner,
    private readonly stores: DriverStores,
    private readonly sites: SitesRepository,
    private readonly audit: AuditRecorder,
  ) {}

  private get groups() {
    return this.stores.groups;
  }

  async list(access: TenantAccess): Promise<AccessGroupListDto> {
    const records = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.groups.findAll(tx),
    );
    return new AccessGroupListDto(records.map((group) => new AccessGroupDto(group)));
  }

  async get(access: TenantAccess, id: string): Promise<AccessGroupDto> {
    return this.runner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => new AccessGroupDto(await this.require(tx, id)),
    );
  }

  async create(auth: RequestAuth, request: SaveAccessGroupRequestDto): Promise<AccessGroupDto> {
    const access = this.requireWrite(auth);
    const id = UuidV7.create();
    return this.run(access, async (tx) => {
      await this.groups.insert(tx, {
        id,
        tenantId: access.tenant.id,
        name: request.name?.trim() || 'New group',
        description: request.description?.trim() ?? '',
        createdBy: auth.requireAccount().id,
        updatedBy: auth.requireAccount().id,
      });
      await this.applyLists(tx, access, id, request);
      const after = await this.require(tx, id);
      await this.record(tx, auth, 'access_groups.created', { before: null, after });
      return new AccessGroupDto(after);
    });
  }

  async update(
    auth: RequestAuth,
    id: string,
    version: number,
    request: SaveAccessGroupRequestDto,
  ): Promise<AccessGroupDto> {
    const access = this.requireWrite(auth);
    return this.run(access, async (tx) => {
      const before = await this.require(tx, id);
      const changes = {
        name: request.name?.trim(),
        description: request.description?.trim(),
        updatedBy: auth.requireAccount().id,
      };
      if (!(await this.groups.update(tx, id, version, changes))) {
        throw VersionConflict.exception();
      }
      await this.applyLists(tx, access, id, request);
      const after = await this.require(tx, id);
      await this.record(tx, auth, 'access_groups.updated', { before, after });
      return new AccessGroupDto(after);
    });
  }

  async remove(auth: RequestAuth, id: string, version: number): Promise<void> {
    const access = this.requireWrite(auth);
    await this.run(access, async (tx) => {
      const before = await this.require(tx, id);
      if (before.version !== version) {
        throw VersionConflict.exception();
      }
      await this.groups.remove(tx, id);
      await this.record(tx, auth, 'access_groups.deleted', { before, after: null });
    });
  }

  /** 404 for a group that does not exist in the tenant. */
  async require(tx: Transaction, id: string): Promise<AccessGroupRecord> {
    const group = UuidV7.isUuid(id) ? await this.groups.findById(tx, id) : null;
    if (!group) {
      throw DriverErrors.groupNotFound();
    }
    return group;
  }

  /** Every site and driver named must exist in the tenant; the lists replace the old ones. */
  private async applyLists(
    tx: Transaction,
    access: TenantAccess,
    groupId: string,
    request: SaveAccessGroupRequestDto,
  ): Promise<void> {
    if (request.site_ids) {
      const siteIds = [...new Set(request.site_ids)];
      const known = await this.sites.findExistingIds(tx, siteIds);
      if (siteIds.some((siteId) => !known.has(siteId))) {
        throw AssetErrors.siteUnknown();
      }
      await this.groups.setSites(tx, access.tenant.id, groupId, siteIds);
    }
    if (request.driver_ids) {
      const driverIds = [...new Set(request.driver_ids)];
      const known = await this.stores.drivers.findExistingIds(tx, driverIds);
      if (driverIds.some((driverId) => !known.has(driverId))) {
        throw DriverErrors.unknown();
      }
      await this.groups.setMembers(tx, access.tenant.id, groupId, driverIds);
    }
  }

  private requireWrite(auth: RequestAuth): TenantAccess {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'drivers:write');
    return access;
  }

  private async run<T>(access: TenantAccess, work: (tx: Transaction) => Promise<T>): Promise<T> {
    try {
      return await this.runner.run(DatabaseSession.forTenant(access.tenant.id), work);
    } catch (error) {
      if (DatabaseErrors.violatedUniqueConstraint(error) === AccessGroupsService.NAME_INDEX) {
        throw DriverErrors.groupNameTaken();
      }
      throw error;
    }
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    action: string,
    change: { before: AccessGroupRecord | null; after: AccessGroupRecord | null },
  ): Promise<void> {
    const group = (change.after ?? change.before) as AccessGroupRecord;
    const snapshot = (record: AccessGroupRecord | null) =>
      record && {
        name: record.name,
        description: record.description,
        sites: record.sites.map((site) => site.name),
        members: record.members.map((member) => member.name),
      };
    return this.audit.record(tx, auth, {
      action,
      targetType: 'access_group',
      targetId: group.id,
      targetLabel: group.name,
      before: snapshot(change.before),
      after: snapshot(change.after),
    });
  }
}
