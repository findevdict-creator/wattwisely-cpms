import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { Tariff, TariffPrices } from '../../core/api/models/tariff';
import { Money } from '../../shared/money';
import { TariffBandControls, TariffBandForm } from './tariff-band-form';

/**
 * The tariff editor's fields, and how they turn into the API's prices. Amounts are typed
 * in the major unit ("0.50") and sent in minor units (50); unit prices stay decimal text.
 */
export class TariffForm {
  static readonly AMOUNT = /^\d+(\.\d{1,3})?$/;
  static readonly PERCENT = /^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/;

  readonly fields = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    currency: new FormControl('GBP', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[A-Z]{3}$/)],
    }),
    taxRate: TariffForm.text('20', TariffForm.PERCENT, true),
    isTaxIncluded: new FormControl(true, { nonNullable: true }),
    startFee: TariffForm.text('0', TariffForm.AMOUNT, true),
    idleGraceMinutes: new FormControl(15, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0), Validators.max(1440)],
    }),
    idleFeeCap: TariffForm.text('', TariffForm.AMOUNT),
    minimumPrice: TariffForm.text('', TariffForm.AMOUNT),
    maximumPrice: TariffForm.text('', TariffForm.AMOUNT),
    isFreeWithoutEnergy: new FormControl(true, { nonNullable: true }),
    note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });
  readonly bands = new FormArray<TariffBandControls>([TariffBandForm.create()]);

  static from(tariff: Tariff): TariffForm {
    const form = new TariffForm();
    const prices = tariff.current_version;
    const amount = (value: number | null) => Money.toText(value, tariff.currency);
    form.fields.setValue({
      name: tariff.name,
      currency: tariff.currency,
      taxRate: String(Number(prices.tax_rate)),
      isTaxIncluded: prices.is_tax_included,
      startFee: amount(prices.start_fee),
      idleGraceMinutes: prices.idle_grace_minutes,
      idleFeeCap: amount(prices.idle_fee_cap),
      minimumPrice: amount(prices.minimum_price),
      maximumPrice: amount(prices.maximum_price),
      isFreeWithoutEnergy: prices.is_free_without_energy,
      note: '',
    });
    form.fields.controls.currency.disable();
    form.bands.clear();
    prices.bands.forEach((band) => form.bands.push(TariffBandForm.create(band)));
    return form;
  }

  isValid(): boolean {
    return this.fields.valid && this.bands.valid && this.bands.length > 0;
  }

  markAllAsTouched(): void {
    this.fields.markAllAsTouched();
    this.bands.markAllAsTouched();
  }

  get currency(): string {
    return this.fields.getRawValue().currency;
  }

  toPrices(): TariffPrices {
    const value = this.fields.getRawValue();
    const amount = (text: string) => Money.fromText(text, value.currency);
    return {
      tax_rate: value.taxRate,
      is_tax_included: value.isTaxIncluded,
      start_fee: amount(value.startFee) ?? 0,
      idle_grace_minutes: value.idleGraceMinutes,
      idle_fee_cap: amount(value.idleFeeCap),
      minimum_price: amount(value.minimumPrice),
      maximum_price: amount(value.maximumPrice),
      is_free_without_energy: value.isFreeWithoutEnergy,
      bands: this.bands.controls.map((band) => TariffBandForm.toBand(band)),
      ...(value.note.trim() ? { note: value.note.trim() } : {}),
    };
  }

  private static text(value: string, pattern: RegExp, isRequired = false): FormControl<string> {
    const validators = [Validators.pattern(pattern), ...(isRequired ? [Validators.required] : [])];
    return new FormControl(value, { nonNullable: true, validators });
  }
}
