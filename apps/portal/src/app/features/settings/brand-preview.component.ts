import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PublicBranding } from '../../core/api/models/branding';

/** A small copy of the driver's page in the brand, so the colours can be judged before saving. */
@Component({
  selector: 'ww-brand-preview',
  imports: [MatIconModule],
  template: `
    <div class="phone" data-testid="brand-preview">
      <div
        class="bar"
        [style.background]="brand().primary_color"
        [style.color]="brand().on_primary_color"
      >
        @if (brand().logo_url; as logoUrl) {
          <img class="logo" [src]="logoUrl" [alt]="brand().name" />
        } @else {
          <mat-icon svgIcon="zap" />
          <span>{{ brand().name }}</span>
        }
      </div>
      <div class="page">
        <div class="site">Riverside Car Park</div>
        <div class="hint">{{ brand().name }} · 12 Thames Path, London</div>
        <div class="card">
          <div class="plug">
            <span>Plug A</span>
            <span class="chip" [style.color]="brand().accent_color">Ready to charge</span>
          </div>
        </div>
        <div class="card">
          <div class="price">0.30 / kWh</div>
          <div class="hint">Off-peak, until 17:00</div>
          <div
            class="button"
            [style.background]="brand().primary_color"
            [style.color]="brand().on_primary_color"
          >
            Pay and charge
          </div>
          @if (brand().support_email || brand().support_phone || brand().support_url) {
            <div class="hint">
              Questions? Contact
              <span [style.color]="brand().accent_color">{{
                brand().support_email || brand().support_phone || brand().support_url
              }}</span>
            </div>
          }
        </div>
        <div class="hint powered">Powered by {{ brand().platform_name }}</div>
      </div>
    </div>
  `,
  styles: `
    .phone {
      width: 260px;
      border: 8px solid var(--ww-ink);
      border-radius: 28px;
      overflow: hidden;
      background: var(--ww-background);
      font-size: 12px;
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 40px;
      padding: 0 12px;
      font-weight: 500;
      font-size: 14px;
    }
    .logo {
      height: 24px;
      max-width: 140px;
      object-fit: contain;
    }
    .page {
      padding: 12px;
    }
    .site {
      font-size: 16px;
      font-weight: 500;
    }
    .hint {
      color: var(--ww-text2);
      font-size: 11px;
    }
    .card {
      background: var(--ww-white);
      border-radius: 12px;
      padding: 10px;
      margin: 8px 0;
      border: 1px solid var(--ww-line);
    }
    .plug {
      display: flex;
      justify-content: space-between;
      font-weight: 500;
    }
    .chip {
      font-weight: 500;
    }
    .price {
      font-size: 18px;
      font-weight: 500;
    }
    .button {
      margin: 8px 0;
      padding: 8px;
      border-radius: 999px;
      text-align: center;
      font-weight: 500;
    }
    .powered {
      text-align: center;
      padding-top: 4px;
    }
  `,
})
export class BrandPreviewComponent {
  readonly brand = input.required<PublicBranding>();
}
