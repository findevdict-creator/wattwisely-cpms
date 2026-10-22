import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Branding, BrandingInput, PublicBranding } from '../../core/api/models/branding';
import { BrandColour } from './brand-colour';

/** The branding page's fields, how they become the API's body, and what drivers would see. */
export class BrandingForm {
  static readonly COLOUR = /^(#?[0-9a-fA-F]{6})?$/;
  static readonly PHONE = /^([+\d][\d\s().-]{4,29})?$/;
  static readonly URL = /^(https?:\/\/\S+)?$/;

  readonly fields = new FormGroup({
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(60)] }),
    primaryColor: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(BrandingForm.COLOUR)],
    }),
    accentColor: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(BrandingForm.COLOUR)],
    }),
    supportEmail: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    supportPhone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(BrandingForm.PHONE)],
    }),
    supportUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(BrandingForm.URL), Validators.maxLength(500)],
    }),
  });

  static from(branding: Branding): BrandingForm {
    const form = new BrandingForm();
    form.fill(branding);
    return form;
  }

  /** Shows what is saved, with the defaults as empty fields. */
  fill(branding: Branding): void {
    this.fields.setValue({
      displayName: branding.display_name ?? '',
      primaryColor: branding.primary_color ?? '',
      accentColor: branding.accent_color ?? '',
      supportEmail: branding.support_email ?? '',
      supportPhone: branding.support_phone ?? '',
      supportUrl: branding.support_url ?? '',
    });
    this.fields.markAsPristine();
  }

  isValid(): boolean {
    return this.fields.valid;
  }

  /** Every field, empty ones as null so the API puts them back to the default. */
  toRequest(): BrandingInput {
    const value = this.fields.getRawValue();
    return {
      display_name: BrandingForm.textOrNull(value.displayName),
      primary_color: BrandColour.normalise(value.primaryColor),
      accent_color: BrandColour.normalise(value.accentColor),
      support_email: BrandingForm.textOrNull(value.supportEmail),
      support_phone: BrandingForm.textOrNull(value.supportPhone),
      support_url: BrandingForm.textOrNull(value.supportUrl),
    };
  }

  /** What drivers would see with the fields as they are now, over what the API last answered. */
  preview(saved: PublicBranding, tenantName: string): PublicBranding {
    const request = this.toRequest();
    const primary = request.primary_color ?? BrandingForm.DEFAULT_PRIMARY;
    return {
      ...saved,
      name: request.display_name ?? tenantName,
      primary_color: primary,
      on_primary_color: BrandColour.textOn(primary),
      accent_color: request.accent_color ?? BrandingForm.DEFAULT_ACCENT,
      support_email: request.support_email,
      support_phone: request.support_phone,
      support_url: request.support_url,
    };
  }

  /** The platform's colours, what a cleared colour field means. */
  static readonly DEFAULT_PRIMARY = '#1b5e20';
  static readonly DEFAULT_ACCENT = '#43a047';

  private static textOrNull(text: string): string | null {
    const trimmed = text.trim();
    return trimmed === '' ? null : trimmed;
  }
}
