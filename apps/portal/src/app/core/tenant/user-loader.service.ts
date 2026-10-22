import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MeApiService } from '../api/me-api.service';
import { TenantContextService } from './tenant-context.service';

/** Fetches GET /v1/me the first time it is needed and stores it in TenantContextService. */
@Injectable({ providedIn: 'root' })
export class UserLoaderService {
  private readonly meApi = inject(MeApiService);
  private readonly tenantContext = inject(TenantContextService);

  async ensureLoaded(): Promise<void> {
    if (!this.tenantContext.isLoaded()) {
      this.tenantContext.setMe(await firstValueFrom(this.meApi.getMe()));
    }
  }
}
