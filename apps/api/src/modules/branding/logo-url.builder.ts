import { Injectable } from '@nestjs/common';
import { LogoUrl } from '@wattwisely/mail';
import { ApiConfig } from '../../config/api.config';

/**
 * Where a tenant's logo is served: a public address on the API, keyed by the tenant's slug,
 * with the logo's fingerprint as a cache key so a new logo gets a new address.
 */
@Injectable()
export class LogoUrlBuilder {
  constructor(private readonly config: ApiConfig) {}

  for(slug: string, etag: string): string {
    return LogoUrl.of(this.config.apiUrl, slug, etag);
  }
}
