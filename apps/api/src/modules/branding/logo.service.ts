import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { SitePermissionChecker } from '../../common/permissions/site-permission.checker';
import { RequestAuth } from '../../common/request/request-auth';
import { BrandingErrors } from './branding-errors';
import { BrandingRecord } from './branding-record';
import { BrandingRepository } from './branding.repository';
import { BrandingSaver } from './branding.saver';
import { BrandingService } from './branding.service';
import { BrandingDto } from './dto/branding.dto';
import { UploadLogoRequestDto } from './dto/upload-logo-request.dto';
import { LogoPolicy } from './logo-policy';

/** The company's logo: uploaded as base64 JSON (no multipart), checked, stored, removed. */
@Injectable()
export class LogoService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly repository: BrandingRepository,
    private readonly saver: BrandingSaver,
    private readonly branding: BrandingService,
  ) {}

  async upload(
    auth: RequestAuth,
    version: number,
    body: UploadLogoRequestDto,
  ): Promise<BrandingDto> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'settings:write');
    const data = Buffer.from(body.data, 'base64');
    LogoPolicy.check(body.content_type, data);
    const etag = LogoPolicy.etagOf(data);
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const current = await this.repository.findSettings(tx);
      await this.saver.save(tx, auth, version, {
        columns: {
          logoContentType: body.content_type,
          logoData: data,
          logoEtag: etag,
          logoSizeBytes: data.length,
        },
        action: 'settings.logo_changed',
        before: LogoService.logoOf(current),
        after: { content_type: body.content_type, size_bytes: data.length, etag },
      });
      return this.branding.describe(tx, access);
    });
  }

  async remove(auth: RequestAuth, version: number): Promise<BrandingDto> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'settings:write');
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const current = await this.repository.findSettings(tx);
      if (!current?.logoEtag) {
        throw BrandingErrors.noLogo();
      }
      await this.saver.save(tx, auth, version, {
        columns: { logoContentType: null, logoData: null, logoEtag: null, logoSizeBytes: null },
        action: 'settings.logo_removed',
        before: LogoService.logoOf(current),
        after: null,
      });
      return this.branding.describe(tx, access);
    });
  }

  private static logoOf(record: BrandingRecord | null): unknown {
    return record?.logoEtag
      ? {
          content_type: record.logoContentType,
          size_bytes: record.logoSizeBytes,
          etag: record.logoEtag,
        }
      : null;
  }
}
