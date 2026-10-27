import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Driver, DriverInput, DriverPaymentMode } from '../../core/api/models/driver';

/** The driver dialog's fields, and how they turn into the API's body (story DRV-01). */
export class DriverForm {
  readonly fields = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.email, Validators.maxLength(254)],
    }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(40)] }),
    reference: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
    groupIds: new FormControl<string[]>([], { nonNullable: true }),
    paymentMode: new FormControl<DriverPaymentMode>('inherit', { nonNullable: true }),
  });

  static from(driver: Driver): DriverForm {
    const form = new DriverForm();
    form.fields.setValue({
      name: driver.name,
      email: driver.email ?? '',
      phone: driver.phone ?? '',
      reference: driver.reference,
      notes: driver.notes,
      groupIds: driver.groups.map((group) => group.id),
      paymentMode: driver.payment_mode,
    });
    return form;
  }

  isValid(): boolean {
    return this.fields.valid;
  }

  /** Blank e-mail and phone become null, so a PATCH clears them. */
  toInput(): DriverInput {
    const value = this.fields.getRawValue();
    return {
      name: value.name.trim(),
      email: value.email.trim() || null,
      phone: value.phone.trim() || null,
      reference: value.reference.trim(),
      notes: value.notes.trim(),
      group_ids: value.groupIds,
      payment_mode: value.paymentMode,
    };
  }
}
