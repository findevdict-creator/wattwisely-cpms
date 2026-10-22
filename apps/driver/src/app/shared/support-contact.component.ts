import { Component, computed, input } from '@angular/core';
import { PublicBranding } from '../core/api/models/branding';

/** How to reach the operator, as links: whatever of e-mail, phone and web address it gave. */
@Component({
  selector: 'ww-support-contact',
  template: `
    @if (links().length > 0) {
      <p class="hint contact" data-testid="support-contact">
        {{ lead() }}
        @for (link of links(); track link.href; let last = $last) {
          <a [href]="link.href" target="_blank" rel="noopener">{{ link.label }}</a
          >{{ last ? '' : ' · ' }}
        }
      </p>
    } @else {
      <p class="hint contact">{{ lead() }} {{ brand().name }}.</p>
    }
  `,
  styles: `
    .contact {
      margin: 8px 0 0;
    }
    a {
      color: var(--ww-accent, var(--mat-sys-primary));
      font-weight: 500;
    }
  `,
})
export class SupportContactComponent {
  readonly brand = input.required<PublicBranding>();
  /** The words before the links, e.g. "Questions about this charge? Contact". */
  readonly lead = input('Questions? Contact');

  protected readonly links = computed(() => SupportContactComponent.linksOf(this.brand()));

  static linksOf(brand: PublicBranding): { label: string; href: string }[] {
    const links = [];
    if (brand.support_email) {
      links.push({ label: brand.support_email, href: `mailto:${brand.support_email}` });
    }
    if (brand.support_phone) {
      links.push({
        label: brand.support_phone,
        href: `tel:${brand.support_phone.replace(/\s/g, '')}`,
      });
    }
    if (brand.support_url) {
      links.push({ label: brand.support_url.replace(/^https?:\/\//, ''), href: brand.support_url });
    }
    return links;
  }
}
