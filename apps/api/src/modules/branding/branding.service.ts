import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { SitePermissionChecker } from '../../common/permissions/site-permission.checker';
import { RequestAuth } from '../../common/request/request-auth';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { BrandColour } from './brand-colour';
import { BrandingErrors } from './branding-errors';
import { BrandingRecord } from './branding-record';
import { BrandingRepository } from './branding.repository';
import { BrandingSaver } from './branding.saver';
import { BrandingDto } from './dto/branding.dto';
import { UpdateBrandingRequestDto } from './dto/update-branding-request.dto';
import { TenantBrandLookup } from './tenant-brand.lookup';

/** The text settings a company can change: everything but the logo. */
type BrandingFields = Pick<
  BrandingRecord,
  'displayName' | 'primaryColor' | 'accentColor' | 'supportEmail' | 'supportPhone' | 'supportUrl'
>;

/**
 * The company's branding settings (white-labelling design, "Branded" level): the name,
 * colours and support contact drivers see. Reading needs settings:read; changing needs
 * settings:write for the whole company and the version last seen.
 */
@Injectable()
export class BrandingService {
  static readonly FIELDS: Record<keyof UpdateBrandingRequestDto, keyof BrandingFields> = {
    display_name: 'displayName',
    primary_color: 'primaryColor',
    accent_color: 'accentColor',
    support_email: 'supportEmail',
    support_phone: 'supportPhone',
    support_url: 'supportUrl',
  };

  constructor(
    private readonly runner: TransactionRunner,
    private readonly repository: BrandingRepository,
    private readonly saver: BrandingSaver,
    private readonly brands: TenantBrandLookup,
  ) {}

  async get(access: TenantAccess): Promise<BrandingDto> {
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.describe(tx, access),
    );
  }

  async update(
    auth: RequestAuth,
    version: number,
    body: UpdateBrandingRequestDto,
  ): Promise<BrandingDto> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'settings:write');
    const columns = BrandingService.columnsOf(body);
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const current = await this.repository.findSettings(tx);
      await this.saver.save(tx, auth, version, {
        columns,
        action: 'settings.branding_changed',
        before: BrandingService.fieldsOf(current, Object.keys(columns) as (keyof BrandingFields)[]),
        after: columns,
      });
      return this.describe(tx, access);
    });
  }

  /** The settings and the resulting brand, inside a transaction of the tenant. */
  async describe(tx: Transaction, access: TenantAccess): Promise<BrandingDto> {
    const record = await this.repository.findSettings(tx);
    return new BrandingDto(record, await this.brands.current(tx, access.tenant.id));
  }

  /** Only the fields sent; empty strings and null clear a field; colours are normalised. */
  private static columnsOf(body: UpdateBrandingRequestDto): Partial<BrandingFields> {
    const columns: Partial<BrandingFields> = {};
    for (const [field, column] of Object.entries(BrandingService.FIELDS)) {
      const value = body[field as keyof UpdateBrandingRequestDto];
      if (value !== undefined) {
        columns[column] = BrandingService.valueOf(field, value);
      }
    }
    return columns;
  }

  private static valueOf(field: string, value: string | null): string | null {
    const text = value?.trim() ?? '';
    if (text === '') {
      return null;
    }
    if (!field.endsWith('_color')) {
      return text;
    }
    const colour = BrandColour.normalise(text);
    if (!colour) {
      throw BrandingErrors.invalidColour(field);
    }
    return colour;
  }

  private static fieldsOf(
    record: BrandingRecord | null,
    keys: (keyof BrandingFields)[],
  ): Partial<BrandingFields> {
    const fields: Partial<BrandingFields> = {};
    for (const key of keys) {
      fields[key] = record?.[key] ?? null;
    }
    return fields;
  }
}
