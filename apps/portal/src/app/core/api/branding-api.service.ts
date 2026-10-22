import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { Branding, BrandingInput, LogoUpload } from './models/branding';

/** Calls /v1/branding (module 8): the company's name, colours, logo and support contact. */
@Injectable({ providedIn: 'root' })
export class BrandingApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  get(): Observable<Branding> {
    return this.http.get<Branding>(this.url('branding'));
  }

  update(input: BrandingInput, version: number): Observable<Branding> {
    return this.http.patch<Branding>(this.url('branding'), input, this.ifMatch(version));
  }

  uploadLogo(logo: LogoUpload, version: number): Observable<Branding> {
    return this.http.put<Branding>(this.url('branding/logo'), logo, this.ifMatch(version));
  }

  removeLogo(version: number): Observable<Branding> {
    return this.http.delete<Branding>(this.url('branding/logo'), this.ifMatch(version));
  }

  private ifMatch(version: number) {
    return { headers: { 'If-Match': String(version) } };
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
