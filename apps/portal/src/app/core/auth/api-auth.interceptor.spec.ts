import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RuntimeConfig } from '../config/runtime-config';
import { TenantContextService } from '../tenant/tenant-context.service';
import { ApiAuthInterceptor } from './api-auth.interceptor';
import { AuthService } from './auth.service';

describe('ApiAuthInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: ApiAuthInterceptor, multi: true },
        {
          provide: RuntimeConfig,
          useValue: new RuntimeConfig(
            'https://api.test',
            'https://auth.test',
            'wattwisely',
            'portal',
          ),
        },
        { provide: AuthService, useValue: { accessToken: () => 'token-123' } },
      ],
    });
    TestBed.inject(TenantContextService).setMe({
      id: 'user-1',
      email: 'u@test',
      name: 'U',
      is_platform_staff: false,
      tenants: [{ id: 'org-acme', alias: 'acme-charging' }],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  it('adds the token and the tenant to calls to our API', () => {
    http.get('https://api.test/v1/tenant').subscribe();

    const request = backend.expectOne('https://api.test/v1/tenant').request;
    expect(request.headers.get('Authorization')).toBe('Bearer token-123');
    expect(request.headers.get('X-Tenant-Id')).toBe('org-acme');
  });

  it('never sends the token to other sites', () => {
    http.get('https://elsewhere.test/data').subscribe();

    expect(
      backend.expectOne('https://elsewhere.test/data').request.headers.has('Authorization'),
    ).toBe(false);
  });
});
