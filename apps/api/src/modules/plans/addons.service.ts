import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { PlatformTransaction } from '../../common/platform/platform-transaction';
import { VersionConflict } from '../../common/problem/version-conflict';
import { RequestAuth } from '../../common/request/request-auth';
import { AddonsRepository } from './addons.repository';
import { CatalogErrors } from './catalog-errors';
import { AddonDto } from './dto/addon.dto';
import { AddonRecord } from './plan-record';
import { UpdateAddonRequestDto } from './dto/update-addon-request.dto';

/** Add-on prices (story ADM-03). The add-ons themselves come from ModuleCatalog and migration 0014. */
@Injectable()
export class AddonsService {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly addons: AddonsRepository,
    private readonly audit: AuditRecorder,
  ) {}

  async list(auth: RequestAuth): Promise<AddonDto[]> {
    const records = await this.platform.run(auth, (tx) => this.addons.findAll(tx));
    return records.map((record) => new AddonDto(record));
  }

  async update(
    auth: RequestAuth,
    key: string,
    version: number,
    body: UpdateAddonRequestDto,
  ): Promise<AddonDto> {
    return this.platform.run(auth, async (tx) => {
      const before = await this.addons.findByKey(tx, key);
      if (!before) {
        throw CatalogErrors.addonNotFound();
      }
      if (!(await this.addons.update(tx, before.id, version, AddonsService.columns(body)))) {
        throw VersionConflict.exception();
      }
      const after = (await this.addons.findByKey(tx, key)) as AddonRecord;
      await this.record(tx, auth, before, after);
      return new AddonDto(after);
    });
  }

  private static columns(body: UpdateAddonRequestDto): Partial<AddonRecord> {
    return {
      price: body.price,
      currency: body.currency,
      pricingUnit: body.pricing_unit,
      isActive: body.is_active,
      sortOrder: body.sort_order,
    };
  }

  private record(tx: Transaction, auth: RequestAuth, before: AddonRecord, after: AddonRecord) {
    return this.audit.record(
      tx,
      auth,
      {
        action: 'plans.addon_changed',
        targetType: 'addon',
        targetId: before.id,
        targetLabel: before.key,
        before: new AddonDto(before),
        after: new AddonDto(after),
      },
      null,
    );
  }
}
