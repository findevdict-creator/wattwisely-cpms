import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LastTenantStore } from './last-tenant.store';
import { TenantLostInterceptor } from './tenant-lost.interceptor';

describe('TenantLostInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    new LastTenantStore().write('tenant-1');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: TenantLostInterceptor, multi: true },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  const answer = (status: number, code: string) => {
    let failure: unknown;
    http.get('https://api.test/v1/tenant').subscribe({ error: (error) => (failure = error) });
    backend
      .expectOne('https://api.test/v1/tenant')
      .flush({ code }, { status, statusText: 'Error' });
    return failure;
  };

  it('forgets a tenant the user was removed from', () => {
    expect(answer(404, 'tenant_not_found')).toBeDefined();
    expect(new LastTenantStore().read()).toBeNull();
  });

  it('leaves other errors alone', () => {
    expect(answer(403, 'permission_denied')).toBeDefined();
    expect(new LastTenantStore().read()).toBe('tenant-1');
  });
});
