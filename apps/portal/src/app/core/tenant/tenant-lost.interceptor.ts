import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { LastTenantStore } from './last-tenant.store';

/**
 * Someone removed from a tenant loses access within a minute (story ACC-03). When the API
 * says the tenant is gone, forget it and start over, so the user lands on another tenant
 * or the "No workspace" page instead of a broken screen.
 */
@Injectable()
export class TenantLostInterceptor implements HttpInterceptor {
  static readonly CODES = ['tenant_not_found', 'no_tenant'];

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: unknown) => {
        if (TenantLostInterceptor.isTenantLost(error)) {
          new LastTenantStore().clear();
          window.location.assign('/');
        }
        return throwError(() => error);
      }),
    );
  }

  private static isTenantLost(error: unknown): boolean {
    return (
      error instanceof HttpErrorResponse &&
      TenantLostInterceptor.CODES.includes((error.error as { code?: string } | null)?.code ?? '')
    );
  }
}
