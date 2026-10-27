import { plans } from '@wattwisely/db';
import { ModuleCatalog } from '../../common/permissions/module-catalog';
import { CatalogErrors } from './catalog-errors';
import { UpdatePlanRequestDto } from './dto/update-plan-request.dto';

/** Turns a plan request's snake_case fields into plans columns, checking the module keys. */
export class PlanColumns {
  static readonly FIELDS: Record<keyof UpdatePlanRequestDto, keyof typeof plans.$inferInsert> = {
    name: 'name',
    description: 'description',
    currency: 'currency',
    platform_fee: 'platformFee',
    ac_connector_fee: 'acConnectorFee',
    dc_connector_fee: 'dcConnectorFee',
    revenue_share_bps: 'revenueShareBps',
    connector_limit: 'connectorLimit',
    user_limit: 'userLimit',
    module_keys: 'moduleKeys',
    is_active: 'isActive',
    sort_order: 'sortOrder',
  };

  /** Only the fields the request sent. */
  static of(body: UpdatePlanRequestDto): Partial<typeof plans.$inferInsert> {
    const columns: Record<string, unknown> = {};
    for (const [field, column] of Object.entries(PlanColumns.FIELDS)) {
      const value = body[field as keyof UpdatePlanRequestDto];
      if (value !== undefined) {
        columns[column] =
          field === 'module_keys' ? PlanColumns.moduleKeys(value as string[]) : value;
      }
    }
    return columns as Partial<typeof plans.$inferInsert>;
  }

  /** The gated modules a plan may include, without duplicates, in catalogue order. */
  private static moduleKeys(keys: string[]): string[] {
    const gated = ModuleCatalog.gated().map((module) => module.key);
    for (const key of keys) {
      if (!gated.includes(key)) {
        throw CatalogErrors.unknownModule(key);
      }
    }
    return gated.filter((key) => keys.includes(key));
  }
}
