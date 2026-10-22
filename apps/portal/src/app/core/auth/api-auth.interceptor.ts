import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuthService } from './auth.service';

/**
 * Adds two headers to every call to our API (and only our API):
 *   Authorization: Bearer <access token>   who is calling
 *   X-Tenant-Id: <tenant id>               which tenant they are working in
 */
@Injectable()
export class ApiAuthInterceptor implements HttpInterceptor {
  private readonly authService = inject(AuthService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly runtimeConfig = inject(RuntimeConfig);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!request.url.startsWith(this.runtimeConfig.apiUrl)) {
      return next.handle(request);
    }
    return next.handle(request.clone({ setHeaders: this.headersFor() }));
  }

  private headersFor(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.authService.accessToken()}`,
    };
    const tenantId = this.tenantContext.currentTenantId();
    if (tenantId) {
      headers['X-Tenant-Id'] = tenantId;
    }
    return headers;
  }
}
