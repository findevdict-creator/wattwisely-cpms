import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { PublicBranding } from '../api/models/branding';
import { BrandTheme } from './brand-theme';

/**
 * The brand the page is wearing right now: the operator's once a place or a charge is
 * loaded, the platform's on the home page. Applying a brand paints the page (CSS
 * variables on the root element), names the tab and colours the browser's own bar.
 */
@Injectable({ providedIn: 'root' })
export class BrandService {
  private readonly document = inject(DOCUMENT);
  private readonly state = signal<PublicBranding>(BrandTheme.PLATFORM);

  readonly brand = this.state.asReadonly();

  apply(brand: PublicBranding): void {
    this.state.set(brand);
    const root = this.document.documentElement;
    for (const [name, value] of Object.entries(BrandTheme.cssVariables(brand))) {
      root.style.setProperty(name, value);
    }
    this.document.title = BrandTheme.title(brand);
    this.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', brand.primary_color);
  }

  /** Back to the platform's own look. */
  reset(): void {
    this.apply(BrandTheme.PLATFORM);
  }
}
