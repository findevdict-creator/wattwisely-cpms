import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AccessGroup, AccessGroupInput, DriverPaymentMode } from '../../core/api/models/driver';
import { Money } from '../../shared/money';

/**
 * The access group dialog's fields, and how they turn into the API's body (story AST-04).
 * The hold is typed in the major unit of `currency` ("20.00") and sent in minor units (2000).
 */
export class AccessGroupForm {
  static readonly AMOUNT = /^\d+(\.\d{1,2})?$/;

  readonly fields = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
    siteIds: new FormControl<string[]>([], { nonNullable: true }),
    driverIds: new FormControl<string[]>([], { nonNullable: true }),
    paymentMode: new FormControl<DriverPaymentMode>('inherit', { nonNullable: true }),
    holdAmount: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(AccessGroupForm.AMOUNT)],
    }),
  });

  constructor(readonly currency: string) {}

  static from(group: AccessGroup, currency: string): AccessGroupForm {
    const form = new AccessGroupForm(currency);
    form.fields.setValue({
      name: group.name,
      description: group.description,
      siteIds: group.sites.map((site) => site.id),
      driverIds: group.members.map((member) => member.id),
      paymentMode: group.payment_mode,
      holdAmount: Money.toText(group.hold_amount, currency),
    });
    return form;
  }

  isValid(): boolean {
    return this.fields.valid && this.holdAmount() !== undefined;
  }

  toInput(): AccessGroupInput {
    const value = this.fields.getRawValue();
    return {
      name: value.name.trim(),
      description: value.description.trim(),
      site_ids: value.siteIds,
      driver_ids: value.driverIds,
      payment_mode: value.paymentMode,
      hold_amount: this.holdAmount() ?? null,
    };
  }

  /** Null for an empty field (the standard hold applies); undefined when the text is not an amount. */
  private holdAmount(): number | null | undefined {
    const text = this.fields.controls.holdAmount.value.trim();
    if (!text) {
      return null;
    }
    const amount = Money.fromText(text, this.currency);
    return amount && amount > 0 ? amount : undefined;
  }
}
