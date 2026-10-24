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
import { DriverErrors } from '../driver-errors';
import { DriverStores } from '../driver-stores';
import { DriverRecord } from './driver-record';
import { DriverSnapshot } from './driver-snapshot';
import { DriversService } from './drivers.service';
import { CreateDriverRequestDto } from './dto/create-driver-request.dto';
import { DriverDetailDto } from './dto/driver-detail.dto';
import { UpdateDriverRequestDto } from './dto/update-driver-request.dto';

/**
 * Creates, changes and removes drivers (story DRV-01), each in one transaction with its
 * audit entry. Deleting a driver blocks their cards and takes them out of every group.
 */
@Injectable()
export class DriverChangesService {
  static readonly EMAIL_INDEX = 'drivers_email_unique';

  constructor(
    private readonly runner: TransactionRunner,
    private readonly stores: DriverStores,
    private readonly reader: DriversService,
    private readonly audit: AuditRecorder,
  ) {}

  private get drivers() {
    return this.stores.drivers;
  }

  private get groups() {
    return this.stores.groups;
  }

  async create(auth: RequestAuth, request: CreateDriverRequestDto): Promise<DriverDetailDto> {
    const access = DriverChangesService.requireWrite(auth, 'drivers:write');
    const id = UuidV7.create();
    return this.run(access, async (tx) => {
      await this.drivers.insert(tx, {
        id,
        tenantId: access.tenant.id,
        ...DriverChangesService.columnsOf(request),
        name: request.name.trim(),
        createdBy: auth.requireAccount().id,
        updatedBy: auth.requireAccount().id,
      });
      await this.setGroups(tx, access, id, request.group_ids);
      const after = await this.reader.requireVisible(tx, id);
      await this.record(tx, auth, 'drivers.created', { before: null, after });
      return this.reader.detail(tx, access, id);
    });
  }

  async update(
    auth: RequestAuth,
    id: string,
    version: number,
    request: UpdateDriverRequestDto,
  ): Promise<DriverDetailDto> {
    const access = DriverChangesService.requireWrite(auth, 'drivers:write');
    return this.run(access, async (tx) => {
      const before = await this.reader.requireVisible(tx, id);
      const changes = {
        ...DriverChangesService.columnsOf(request),
        updatedBy: auth.requireAccount().id,
      };
      if (!(await this.drivers.update(tx, id, version, changes))) {
        throw VersionConflict.exception();
      }
      await this.setGroups(tx, access, id, request.group_ids);
      const after = await this.reader.requireVisible(tx, id);
      await this.record(tx, auth, 'drivers.updated', { before, after });
      return this.reader.detail(tx, access, id);
    });
  }

  /** Blocked: every card of the driver answers Blocked at the charger. */
  async setBlocked(
    auth: RequestAuth,
    id: string,
    version: number,
    block: { isBlocked: boolean; reason: string },
  ): Promise<DriverDetailDto> {
    const access = DriverChangesService.requireWrite(auth, 'drivers:block');
    return this.run(access, async (tx) => {
      const before = await this.reader.requireVisible(tx, id);
      if ((before.status === 'blocked') === block.isBlocked) {
        throw block.isBlocked ? DriverErrors.alreadyBlocked() : DriverErrors.notBlocked();
      }
      const changes = DriverChangesService.blockColumns(auth, block);
      if (!(await this.drivers.update(tx, id, version, changes))) {
        throw VersionConflict.exception();
      }
      const after = await this.reader.requireVisible(tx, id);
      const action = block.isBlocked ? 'drivers.blocked' : 'drivers.unblocked';
      await this.record(tx, auth, action, { before, after });
      return this.reader.detail(tx, access, id);
    });
  }

  /** Soft delete: the driver leaves every list, their cards are blocked, sessions keep their name. */
  async remove(auth: RequestAuth, id: string, version: number): Promise<void> {
    const access = DriverChangesService.requireWrite(auth, 'drivers:delete');
    await this.run(access, async (tx) => {
      const before = await this.reader.requireVisible(tx, id);
      const changes = { deletedAt: new Date(), updatedBy: auth.requireAccount().id };
      if (!(await this.drivers.update(tx, id, version, changes))) {
        throw VersionConflict.exception();
      }
      await this.stores.cards.blockAllOf(tx, id);
      await this.groups.setGroupsOf(tx, access.tenant.id, id, []);
      await this.record(tx, auth, 'drivers.deleted', { before, after: null });
    });
  }

  /** Every group named must exist in the tenant; the list replaces the old one. */
  private async setGroups(
    tx: Transaction,
    access: TenantAccess,
    driverId: string,
    groupIds: string[] | undefined,
  ): Promise<void> {
    if (!groupIds) {
      return;
    }
    const ids = [...new Set(groupIds)];
    const known = await this.groups.findExistingIds(tx, ids);
    if (ids.some((groupId) => !known.has(groupId))) {
      throw DriverErrors.groupUnknown();
    }
    await this.groups.setGroupsOf(tx, access.tenant.id, driverId, ids);
  }

  private static requireWrite(
    auth: RequestAuth,
    key: 'drivers:write' | 'drivers:block' | 'drivers:delete',
  ): TenantAccess {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, key);
    return access;
  }

  private async run<T>(access: TenantAccess, work: (tx: Transaction) => Promise<T>): Promise<T> {
    try {
      return await this.runner.run(DatabaseSession.forTenant(access.tenant.id), work);
    } catch (error) {
      if (DatabaseErrors.violatedUniqueConstraint(error) === DriverChangesService.EMAIL_INDEX) {
        throw DriverErrors.emailTaken();
      }
      throw error;
    }
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    action: string,
    change: { before: DriverRecord | null; after: DriverRecord | null },
  ): Promise<void> {
    const driver = (change.after ?? change.before) as DriverRecord;
    return this.audit.record(tx, auth, {
      action,
      targetType: 'driver',
      targetId: driver.id,
      targetLabel: driver.name,
      before: DriverSnapshot.of(change.before),
      after: DriverSnapshot.of(change.after),
    });
  }

  /** The request's fields as table columns; fields that were not sent stay untouched. */
  private static columnsOf(request: CreateDriverRequestDto | UpdateDriverRequestDto) {
    return {
      name: request.name?.trim(),
      email: DriverChangesService.blankToNull(request.email),
      phone: DriverChangesService.blankToNull(request.phone),
      reference: request.reference?.trim(),
      notes: request.notes?.trim(),
    };
  }

  private static blankToNull(value: string | null | undefined): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    return value?.trim() || null;
  }

  private static blockColumns(auth: RequestAuth, block: { isBlocked: boolean; reason: string }) {
    return {
      status: block.isBlocked ? ('blocked' as const) : ('active' as const),
      blockedAt: block.isBlocked ? new Date() : null,
      blockedBy: block.isBlocked ? auth.requireAccount().id : null,
      blockReason: block.isBlocked ? block.reason : '',
      updatedBy: auth.requireAccount().id,
    };
  }
}
