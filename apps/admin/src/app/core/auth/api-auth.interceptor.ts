import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { AuthService } from './auth.service';

/**
 * Adds the access token to every call to our API (and only our API). The console never
 * sends X-Tenant-Id: admin routes work across tenants, with the caller's staff role.
 */
@Injectable()
export class ApiAuthInterceptor implements HttpInterceptor {
  private readonly authService = inject(AuthService);
  private readonly runtimeConfig = inject(RuntimeConfig);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!request.url.startsWith(this.runtimeConfig.apiUrl)) {
      return next.handle(request);
    }
    const headers = { Authorization: `Bearer ${this.authService.accessToken()}` };
    return next.handle(request.clone({ setHeaders: headers }));
  }
}
