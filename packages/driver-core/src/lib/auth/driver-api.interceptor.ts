import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { DriverSession } from './driver-session';

/**
 * Adds the driver's token to calls to /v1/driver (and nowhere else), while there is one.
 * The public charging routes stay anonymous: a charge key, not a login, is their proof.
 */
@Injectable()
export class DriverApiInterceptor implements HttpInterceptor {
  private readonly session = inject(DriverSession);
  private readonly runtimeConfig = inject(RuntimeConfig);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const driverRoutes = `${this.runtimeConfig.apiUrl}/v1/driver/`;
    if (!request.url.startsWith(driverRoutes) || !this.session.isLoggedIn()) {
      return next.handle(request);
    }
    return next.handle(
      request.clone({ setHeaders: { Authorization: `Bearer ${this.session.accessToken()}` } }),
    );
  }
}
