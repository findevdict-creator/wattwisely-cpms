import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Site, SiteInput, SiteVisibility } from '../../core/api/models/site';
import { OpeningHoursForm } from './opening-hours-form';

/** The site dialog's fields, and how they turn into the API's body (story AST-01). */
export class SiteForm {
  static readonly TIME_ZONES = [...Intl.supportedValuesOf('timeZone'), 'UTC'].sort();
  static readonly COUNTRY = /^[A-Z]{2}$/;

  readonly fields = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    line1: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    line2: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    postalCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    region: new FormControl('', { nonNullable: true }),
    country: new FormControl('GB', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(SiteForm.COUNTRY)],
    }),
    latitude: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(-90),
      Validators.max(90),
    ]),
    longitude: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(-180),
      Validators.max(180),
    ]),
    timeZone: new FormControl(SiteForm.defaultTimeZone(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    visibility: new FormControl<SiteVisibility>('private', { nonNullable: true }),
    powerLimitKw: new FormControl<number | null>(null, [Validators.min(0)]),
    parkingNotes: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
    tariffId: new FormControl<string | null>(null),
  });
  openingHours = new OpeningHoursForm();

  static from(site: Site): SiteForm {
    const form = new SiteForm();
    form.fields.setValue({
      name: site.name,
      line1: site.address.line1,
      line2: site.address.line2 ?? '',
      city: site.address.city,
      postalCode: site.address.postal_code,
      region: site.address.region ?? '',
      country: site.address.country,
      latitude: site.latitude,
      longitude: site.longitude,
      timeZone: site.time_zone,
      visibility: site.visibility,
      powerLimitKw: site.power_limit_kw,
      parkingNotes: site.parking_notes,
      tariffId: site.tariff_id,
    });
    form.openingHours = OpeningHoursForm.from(site.opening_hours);
    return form;
  }

  isValid(): boolean {
    return this.fields.valid && this.openingHours.isValid();
  }

  toInput(): SiteInput {
    const value = this.fields.getRawValue();
    return {
      name: value.name.trim(),
      address: {
        line1: value.line1.trim(),
        ...(value.line2.trim() ? { line2: value.line2.trim() } : {}),
        city: value.city.trim(),
        postal_code: value.postalCode.trim(),
        ...(value.region.trim() ? { region: value.region.trim() } : {}),
        country: value.country.trim().toUpperCase(),
      },
      latitude: value.latitude as number,
      longitude: value.longitude as number,
      time_zone: value.timeZone,
      opening_hours: this.openingHours.toHours(),
      visibility: value.visibility,
      power_limit_kw: value.powerLimitKw,
      parking_notes: value.parkingNotes.trim(),
      tariff_id: value.tariffId,
    };
  }

  private static defaultTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }
}
