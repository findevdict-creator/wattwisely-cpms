import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { ChargerRecord } from './charger-record';
import { ChargerTransaction } from './charger-transaction';
import { ChargersRepository } from './chargers.repository';
import { ChargersService } from './chargers.service';
import { ChargerDto } from './dto/charger.dto';
import { UpdateChargerRequestDto } from './dto/update-charger-request.dto';

/** Edits and removes registered chargers (story AST-02), each with its audit entry. */
@Injectable()
export class ChargerChangesService {
  constructor(
    private readonly transaction: ChargerTransaction,
    private readonly chargers: ChargersRepository,
    private readonly reader: ChargersService,
  ) {}

  async update(
    auth: RequestAuth,
    id: string,
    version: number,
    request: UpdateChargerRequestDto,
  ): Promise<ChargerDto> {
    const access = auth.requireAccess();
    await this.transaction.run(auth, async (tx) => {
      const before = await this.reader.requireVisible(tx, access, id);
      SitePermissionChecker.requireAt(access, 'chargers:write', before.siteId);
      await this.checkMove(tx, access, before, request.site_id);
      const changes = {
        ...ChargerChangesService.columnsOf(request),
        updatedBy: auth.requireAccount().id,
      };
      if (!(await this.chargers.update(tx, id, version, changes))) {
        throw VersionConflict.exception();
      }
      const after = (await this.chargers.findById(tx, id)) as ChargerRecord;
      await this.transaction.record(tx, auth, 'chargers.updated', { before, after });
    });
    return this.reader.get(access, id);
  }

  /** Soft delete: the identity becomes free again; past sessions keep pointing at the row. */
  async remove(auth: RequestAuth, id: string, version: number): Promise<void> {
    const access = auth.requireAccess();
    await this.transaction.run(auth, async (tx) => {
      const before = await this.reader.requireVisible(tx, access, id);
      SitePermissionChecker.requireAt(access, 'chargers:delete', before.siteId);
      const changes = { deletedAt: new Date(), updatedBy: auth.requireAccount().id };
      if (!(await this.chargers.update(tx, id, version, changes))) {
        throw VersionConflict.exception();
      }
      await this.transaction.record(tx, auth, 'chargers.removed', { before, after: null });
    });
  }

  /** Moving to another site needs chargers:write there too, and the site must exist. */
  private async checkMove(
    tx: Transaction,
    access: TenantAccess,
    before: ChargerRecord,
    siteId: string | undefined,
  ): Promise<void> {
    if (siteId && siteId !== before.siteId) {
      await this.reader.requireSiteForWrite(tx, access, siteId);
    }
  }

  private static columnsOf(request: UpdateChargerRequestDto) {
    return {
      siteId: request.site_id,
      vendor: request.vendor === null ? null : request.vendor?.trim(),
      model: request.model === null ? null : request.model?.trim(),
      visibilityOverride: request.visibility_override,
      allowPlainWs: request.allow_plain_ws,
    };
  }
}
