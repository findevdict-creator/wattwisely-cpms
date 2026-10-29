import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RuntimeConfig } from '../config/runtime-config';
import { DriverApiInterceptor } from './driver-api.interceptor';
import { DriverSession } from './driver-session';

describe('DriverApiInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const auth = { isLoggedIn: () => true, accessToken: () => 'token-123' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: HTTP_INTERCEPTORS, useClass: DriverApiInterceptor, multi: true },
        {
          provide: RuntimeConfig,
          useValue: new RuntimeConfig('https://api.test', 'https://auth.test', 'ww', 'driver'),
        },
        { provide: DriverSession, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  it('adds the token to the driver routes only', () => {
    http.get('https://api.test/v1/driver/me').subscribe();
    http.get('https://api.test/v1/public/places/CP-1/1').subscribe();
    http.get('https://elsewhere.test/v1/driver/me').subscribe();

    expect(
      backend.expectOne('https://api.test/v1/driver/me').request.headers.get('Authorization'),
    ).toBe('Bearer token-123');
    expect(
      backend
        .expectOne('https://api.test/v1/public/places/CP-1/1')
        .request.headers.has('Authorization'),
    ).toBe(false);
    expect(
      backend.expectOne('https://elsewhere.test/v1/driver/me').request.headers.has('Authorization'),
    ).toBe(false);
  });

  it('sends nothing while logged out, so the invitation page stays public', () => {
    auth.isLoggedIn = () => false;
    http.get('https://api.test/v1/driver/invitations/abc').subscribe();

    const request = backend.expectOne('https://api.test/v1/driver/invitations/abc').request;
    expect(request.headers.has('Authorization')).toBe(false);
  });
});
