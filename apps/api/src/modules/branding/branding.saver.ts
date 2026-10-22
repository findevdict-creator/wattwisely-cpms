import { Injectable } from '@nestjs/common';
import { tenantBranding, Transaction, UuidV7 } from '@wattwisely/db';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { VersionConflict } from '../../common/problem/version-conflict';
import { RequestAuth } from '../../common/request/request-auth';
import { BrandingRecord } from './branding-record';
import { BrandingRepository } from './branding.repository';
import { BrandingDto } from './dto/branding.dto';

/** One change to the branding row: the columns, and how the audit log describes it. */
export interface BrandingChange {
  columns: Partial<typeof tenantBranding.$inferInsert>;
  action: string;
  before: unknown;
  after: unknown;
}

/**
 * Writes the tenant's one branding row: created on the first save, changed with the
 * version the client saw afterwards (If-Match), and every change audited in the same
 * transaction.
 */
@Injectable()
export class BrandingSaver {
  constructor(
    private readonly repository: BrandingRepository,
    private readonly audit: AuditRecorder,
  ) {}

  async save(
    tx: Transaction,
    auth: RequestAuth,
    version: number,
    change: BrandingChange,
  ): Promise<BrandingRecord> {
    const current = await this.repository.findSettings(tx);
    const id = current
      ? await this.change(tx, current, version, change)
      : await this.create(tx, auth, version, change);
    await this.audit.record(tx, auth, {
      action: change.action,
      targetType: 'branding',
      targetId: id,
      targetLabel: auth.requireAccess().tenant.name,
      before: change.before,
      after: change.after,
    });
    return (await this.repository.findSettings(tx)) as BrandingRecord;
  }

  private async create(
    tx: Transaction,
    auth: RequestAuth,
    version: number,
    change: BrandingChange,
  ): Promise<string> {
    if (version !== BrandingDto.UNSAVED_VERSION) {
      throw VersionConflict.exception();
    }
    const id = UuidV7.create();
    await this.repository.insert(tx, {
      id,
      tenantId: auth.requireAccess().tenant.id,
      ...change.columns,
      updatedBy: auth.requireAccount().id,
      version: BrandingDto.UNSAVED_VERSION + 1,
    });
    return id;
  }

  private async change(
    tx: Transaction,
    current: BrandingRecord,
    version: number,
    change: BrandingChange,
  ): Promise<string> {
    const columns = { ...change.columns, updatedBy: current.updatedBy };
    if (!(await this.repository.update(tx, current.id, version, columns))) {
      throw VersionConflict.exception();
    }
    return current.id;
  }
}
